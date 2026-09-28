import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Leitor dos logs locais (.jsonl) do Claude Code.
 *
 * REGRAS OBRIGATORIAS (ver secao 4, Tool 4, do plano):
 *  - So le campos de uso (message.usage) e o modelo (message.model). Nunca
 *    devolve o conteudo das mensagens.
 *  - Deduplica por message.id: a mesma resposta pode aparecer em varias
 *    linhas com o mesmo usage, e somar todas inflaria o resultado.
 *  - So le arquivos dentro do diretorio de configuracao do Claude Code
 *    (protegido contra path traversal).
 *  - Linhas malformadas sao ignoradas, e a contagem de quantas foram
 *    ignoradas e devolvida para transparencia.
 *
 * O formato desses logs e interno ao Claude Code e pode mudar sem aviso.
 * Todo o conhecimento sobre esse formato fica isolado neste arquivo.
 */

export interface UsageEntry {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

export interface SessionUsageResult {
  entries_by_model: Record<string, UsageEntry>;
  totals: UsageEntry;
  sessions_read: string[];
  malformed_lines_ignored: number;
  messages_deduplicated: number;
}

export class ClaudeCodeLogsError extends Error {}

function getClaudeConfigDir(): string {
  const fromEnv = process.env.CLAUDE_CONFIG_DIR;
  if (fromEnv && fromEnv.trim() !== "") return path.resolve(fromEnv);
  return path.join(homedir(), ".claude");
}

/**
 * Reproduz o esquema de codificacao de caminho usado pelo Claude Code para
 * nomear a pasta de projeto: cada separador de caminho (":", "/", "\") vira
 * um traco, sem colapsar tracos consecutivos.
 */
export function encodeProjectPath(projectPath: string): string {
  const resolved = path.resolve(projectPath);
  return resolved.replace(/[\\/:]/g, "-");
}

/** Garante que um caminho resolvido continua dentro do diretorio base (evita path traversal). */
function assertWithinBase(base: string, target: string): void {
  const relative = path.relative(base, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ClaudeCodeLogsError(
      `Acesso negado: caminho fora do diretorio de configuracao do Claude Code.`,
    );
  }
}

async function resolveProjectDir(projectPath: string): Promise<string> {
  const configDir = getClaudeConfigDir();
  const projectsDir = path.join(configDir, "projects");
  const encoded = encodeProjectPath(projectPath);
  const projectDir = path.join(projectsDir, encoded);
  assertWithinBase(projectsDir, projectDir);
  return projectDir;
}

async function listSessionFiles(projectDir: string): Promise<string[]> {
  try {
    const files = await readdir(projectDir);
    return files.filter((f) => f.endsWith(".jsonl"));
  } catch {
    return [];
  }
}

async function pickSessionFiles(
  projectDir: string,
  sessionId: string | undefined,
  since: string | undefined,
): Promise<string[]> {
  const allFiles = await listSessionFiles(projectDir);

  if (sessionId) {
    // basename() remove qualquer componente de diretorio (ex.: "../../x"),
    // impedindo que session_id escape do diretorio do projeto.
    const safeName = path.basename(sessionId.endsWith(".jsonl") ? sessionId : `${sessionId}.jsonl`);
    const target = path.join(projectDir, safeName);
    assertWithinBase(projectDir, target);
    return allFiles.includes(safeName) ? [safeName] : [];
  }

  if (since) {
    // Com "since", agregamos todas as sessoes (o filtro por data e aplicado
    // linha a linha, usando o timestamp de cada mensagem).
    return allFiles;
  }

  // Sem session_id nem since: usa a sessao mais recente (por mtime).
  const withStats = await Promise.all(
    allFiles.map(async (f) => ({ f, mtime: (await stat(path.join(projectDir, f))).mtimeMs })),
  );
  withStats.sort((a, b) => b.mtime - a.mtime);
  return withStats.length > 0 ? [withStats[0].f] : [];
}

function emptyUsage(model = ""): UsageEntry {
  return {
    model,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
  };
}

interface RawLogLine {
  type?: string;
  timestamp?: string;
  message?: {
    id?: string;
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

export async function readClaudeCodeSessionUsage(options: {
  projectPath: string;
  sessionId?: string;
  since?: string;
}): Promise<SessionUsageResult> {
  const projectDir = await resolveProjectDir(options.projectPath);
  const sessionFiles = await pickSessionFiles(projectDir, options.sessionId, options.since);

  const sinceTime = options.since ? Date.parse(options.since) : undefined;

  const entriesByModel: Record<string, UsageEntry> = {};
  const seenMessageIds = new Set<string>();
  let malformedLinesIgnored = 0;
  let messagesDeduplicated = 0;

  for (const fileName of sessionFiles) {
    const filePath = path.join(projectDir, fileName);
    assertWithinBase(projectDir, filePath);

    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "") continue;

      let record: RawLogLine;
      try {
        record = JSON.parse(trimmed);
      } catch {
        malformedLinesIgnored++;
        continue;
      }

      if (record.type !== "assistant" || !record.message?.usage) continue;

      if (sinceTime !== undefined) {
        const ts = record.timestamp ? Date.parse(record.timestamp) : NaN;
        if (Number.isNaN(ts) || ts < sinceTime) continue;
      }

      const messageId = record.message.id;
      if (messageId) {
        if (seenMessageIds.has(messageId)) {
          messagesDeduplicated++;
          continue;
        }
        seenMessageIds.add(messageId);
      }

      const model = record.message.model ?? "desconhecido";
      const usage = record.message.usage;

      if (!entriesByModel[model]) entriesByModel[model] = emptyUsage(model);
      entriesByModel[model].input_tokens += usage.input_tokens ?? 0;
      entriesByModel[model].output_tokens += usage.output_tokens ?? 0;
      entriesByModel[model].cache_read_tokens += usage.cache_read_input_tokens ?? 0;
      entriesByModel[model].cache_write_tokens += usage.cache_creation_input_tokens ?? 0;
    }
  }

  const totals = Object.values(entriesByModel).reduce<UsageEntry>((acc, entry) => {
    acc.input_tokens += entry.input_tokens;
    acc.output_tokens += entry.output_tokens;
    acc.cache_read_tokens += entry.cache_read_tokens;
    acc.cache_write_tokens += entry.cache_write_tokens;
    return acc;
  }, emptyUsage("total"));

  return {
    entries_by_model: entriesByModel,
    totals,
    sessions_read: sessionFiles,
    malformed_lines_ignored: malformedLinesIgnored,
    messages_deduplicated: messagesDeduplicated,
  };
}

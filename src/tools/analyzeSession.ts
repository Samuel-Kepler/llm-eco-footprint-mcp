import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addRanges, buildFootprintResult, calculateEquivalences } from "../math/calculator.js";
import { formatCarbon, formatEnergy, formatEquivalences, formatRange, formatWater } from "../math/format.js";
import {
  readClaudeCodeSessionUsage,
  ClaudeCodeLogsError,
  type SessionUsageResult,
} from "../session/claudeCodeLogs.js";
import { analyzeSessionInputShape } from "../types/index.js";
import type { CoolingSystem, Range, Region } from "../types/index.js";

/**
 * Monta a saida da Tool 4 a partir do uso ja lido dos logs. Funcao pura
 * (nenhum I/O), extraida para ser testavel sem depender do McpServer.
 */
export function buildAnalyzeSessionOutput(
  usage: SessionUsageResult,
  args: { cooling_system: CoolingSystem; region: Region },
) {
  const perModelResults: Record<string, unknown> = {};
  let totalTiKwh: Range = { min: 0, central: 0, max: 0 };
  let totalKwh: Range = { min: 0, central: 0, max: 0 };
  let totalOnsiteL: Range = { min: 0, central: 0, max: 0 };
  let totalOffsiteL: Range = { min: 0, central: 0, max: 0 };
  let totalWaterL: Range = { min: 0, central: 0, max: 0 };
  let totalCarbonG: Range = { min: 0, central: 0, max: 0 };

  for (const [model, entry] of Object.entries(usage.entries_by_model)) {
    const modelResult = buildFootprintResult({
      inputTokens: entry.input_tokens,
      outputTokens: entry.output_tokens,
      cacheReadTokens: entry.cache_read_tokens,
      cacheWriteTokens: entry.cache_write_tokens,
      model,
      coolingSystem: args.cooling_system,
      region: args.region,
      includeOffsiteWater: true,
    });

    perModelResults[model] = {
      tokens: entry,
      familia_modelo: modelResult.premissas.familia_modelo,
      energia_total_kwh: modelResult.energia.total_kwh,
      agua_total_l: modelResult.agua.total_l,
      carbono_g: modelResult.carbono.co2e_g,
      equivalencias: modelResult.equivalencias,
      formatado: {
        energia_total: modelResult.formatado.energia.total,
        agua_total: modelResult.formatado.agua.total,
        carbono: modelResult.formatado.carbono.co2e,
        equivalencias: modelResult.formatado.equivalencias,
      },
    };

    totalTiKwh = addRanges(totalTiKwh, modelResult.energia.ti_kwh);
    totalKwh = addRanges(totalKwh, modelResult.energia.total_kwh);
    totalOnsiteL = addRanges(totalOnsiteL, modelResult.agua.onsite_l);
    totalOffsiteL = addRanges(totalOffsiteL, modelResult.agua.offsite_l);
    totalWaterL = addRanges(totalWaterL, modelResult.agua.total_l);
    totalCarbonG = addRanges(totalCarbonG, modelResult.carbono.co2e_g);
  }

  // Equivalencias agregadas: recalculadas sobre os totais somados (nao e a
  // soma das equivalencias por modelo, pois a equivalencia em si nao e
  // aditiva — depende so da agua/energia totais, ja aditivas).
  const totalEquivalences = calculateEquivalences(totalWaterL.central, totalKwh.central);

  return {
    sessoes_lidas: usage.sessions_read,
    linhas_malformadas_ignoradas: usage.malformed_lines_ignored,
    mensagens_deduplicadas: usage.messages_deduplicated,
    tokens_totais: usage.totals,
    relatorio_por_modelo: perModelResults,
    relatorio_agregado: {
      energia: { ti_kwh: totalTiKwh, total_kwh: totalKwh },
      agua: { onsite_l: totalOnsiteL, offsite_l: totalOffsiteL, total_l: totalWaterL },
      carbono: { co2e_g: totalCarbonG },
      equivalencias: totalEquivalences,
      formatado: {
        energia: { ti: formatRange(totalTiKwh, formatEnergy), total: formatRange(totalKwh, formatEnergy) },
        agua: {
          onsite: formatRange(totalOnsiteL, formatWater),
          offsite: formatRange(totalOffsiteL, formatWater),
          total: formatRange(totalWaterL, formatWater),
        },
        carbono: { co2e: formatRange(totalCarbonG, formatCarbon) },
        equivalencias: formatEquivalences(totalEquivalences),
      },
    },
  };
}

export function registerAnalyzeSessionTool(server: McpServer): void {
  server.registerTool(
    "analyze_claude_code_session",
    {
      title: "Analisar sessao do Claude Code",
      description:
        "Le os logs locais do Claude Code e calcula a pegada ecologica com os " +
        "tokens REAIS registrados na sessao, em vez de numeros estimados.",
      inputSchema: analyzeSessionInputShape,
    },
    async (args) => {
      const projectPath = args.project_path ?? process.cwd();

      let usage;
      try {
        usage = await readClaudeCodeSessionUsage({
          projectPath,
          sessionId: args.session_id,
          since: args.since,
        });
      } catch (error) {
        const message = error instanceof ClaudeCodeLogsError ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Erro ao ler logs do Claude Code: ${message}` }],
        };
      }

      if (usage.sessions_read.length === 0) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text:
                "Nenhuma sessao encontrada para este projeto. Verifique project_path, " +
                "session_id e se ~/.claude/projects (ou CLAUDE_CONFIG_DIR) existe.",
            },
          ],
        };
      }

      const output = buildAnalyzeSessionOutput(usage, {
        cooling_system: args.cooling_system,
        region: args.region,
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
      };
    },
  );
}

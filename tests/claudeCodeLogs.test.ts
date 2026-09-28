import { mkdtemp, mkdir, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { encodeProjectPath, readClaudeCodeSessionUsage } from "../src/session/claudeCodeLogs.js";

const FIXTURE_FILE = path.join(process.cwd(), "tests", "fixtures", "session-sample.jsonl");
const FAKE_PROJECT_PATH = path.join(tmpdir(), "fake-eco-footprint-project");

let configDir: string;
const originalConfigDir = process.env.CLAUDE_CONFIG_DIR;

beforeEach(async () => {
  configDir = await mkdtemp(path.join(tmpdir(), "claude-code-logs-test-"));
  process.env.CLAUDE_CONFIG_DIR = configDir;

  const encoded = encodeProjectPath(FAKE_PROJECT_PATH);
  const projectDir = path.join(configDir, "projects", encoded);
  await mkdir(projectDir, { recursive: true });
  await copyFile(FIXTURE_FILE, path.join(projectDir, "session-1.jsonl"));
});

afterEach(async () => {
  await rm(configDir, { recursive: true, force: true });
  if (originalConfigDir === undefined) {
    delete process.env.CLAUDE_CONFIG_DIR;
  } else {
    process.env.CLAUDE_CONFIG_DIR = originalConfigDir;
  }
});

describe("readClaudeCodeSessionUsage", () => {
  it("deduplica mensagens com o mesmo message.id e ignora linhas malformadas", async () => {
    const result = await readClaudeCodeSessionUsage({ projectPath: FAKE_PROJECT_PATH });

    expect(result.sessions_read).toEqual(["session-1.jsonl"]);
    expect(result.malformed_lines_ignored).toBe(1);
    expect(result.messages_deduplicated).toBe(1);

    expect(result.entries_by_model["claude-sonnet-5"]).toEqual({
      model: "claude-sonnet-5",
      input_tokens: 100,
      output_tokens: 200,
      cache_read_tokens: 5,
      cache_write_tokens: 10,
    });

    expect(result.entries_by_model["claude-opus-4"]).toEqual({
      model: "claude-opus-4",
      input_tokens: 50,
      output_tokens: 75,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
    });

    expect(result.totals.input_tokens).toBe(150);
    expect(result.totals.output_tokens).toBe(275);
  });

  it("retorna lista vazia de sessoes quando o projeto nao existe", async () => {
    const result = await readClaudeCodeSessionUsage({
      projectPath: path.join(tmpdir(), "projeto-inexistente-xyz"),
    });

    expect(result.sessions_read).toEqual([]);
    expect(result.totals.input_tokens).toBe(0);
  });

  it("session_id com tentativa de path traversal nao escapa do diretorio do projeto", async () => {
    const result = await readClaudeCodeSessionUsage({
      projectPath: FAKE_PROJECT_PATH,
      sessionId: "../../../../etc/passwd",
    });

    expect(result.sessions_read).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { buildFootprintResult } from "../src/math/calculator.js";
import { buildAnalyzeSessionOutput } from "../src/tools/analyzeSession.js";
import { buildCompareCoolingOutput } from "../src/tools/compareCooling.js";
import { LED_BULB_POWER_W } from "../src/math/benchmarks.js";
import type { SessionUsageResult } from "../src/session/claudeCodeLogs.js";

/** Converte uma string formatada pt-BR ("10,3 Wh" ou "1,5 kWh") de volta para Wh. */
function parseFormattedEnergyToWh(formatted: string): number {
  const match = formatted.match(/^(-?[\d,]+) (kWh|Wh)$/);
  if (!match) throw new Error(`Formato de energia inesperado: "${formatted}"`);
  const [, rawValue, unit] = match;
  const value = Number(rawValue.replace(",", "."));
  return unit === "kWh" ? value * 1000 : value;
}

/** Extrai o primeiro numero (pt-BR) de uma string formatada de equivalencia. */
function parseFirstNumberPtBr(formatted: string): number {
  const match = formatted.match(/^(-?[\d,]+)/);
  if (!match) throw new Error(`Nao foi possivel extrair numero de: "${formatted}"`);
  return Number(match[1].replace(",", "."));
}

describe("calculate_ecological_footprint: equivalencias formatadas", () => {
  const result = buildFootprintResult({
    inputTokens: 4,
    outputTokens: 234,
    cacheReadTokens: 103_939,
    cacheWriteTokens: 14_530,
    model: "claude-sonnet-5",
    coolingSystem: "evaporative",
    region: "brazil",
    includeOffsiteWater: true,
  });

  it("formatado.equivalencias existe, com as tres chaves em pt-BR", () => {
    expect(result.formatado.equivalencias).toBeDefined();
    expect(result.formatado.equivalencias.garrafas_500ml).toEqual(expect.any(String));
    expect(result.formatado.equivalencias.horas_lampada_led_10w).toEqual(expect.any(String));
    expect(result.formatado.equivalencias.cargas_smartphone).toEqual(expect.any(String));
  });

  it("horas_lampada_led_10w formatada bate com energia total (Wh) / 10", () => {
    const energiaTotalWh = parseFormattedEnergyToWh(result.formatado.energia.total.central);
    const horasFormatadas = parseFirstNumberPtBr(result.formatado.equivalencias.horas_lampada_led_10w);
    expect(horasFormatadas).toBeCloseTo(energiaTotalWh / LED_BULB_POWER_W, 1);
  });
});

describe("analyze_claude_code_session: equivalencias por modelo e agregadas", () => {
  const usage: SessionUsageResult = {
    entries_by_model: {
      "claude-sonnet-5": {
        model: "claude-sonnet-5",
        input_tokens: 4,
        output_tokens: 234,
        cache_read_tokens: 103_939,
        cache_write_tokens: 14_530,
      },
    },
    totals: {
      model: "total",
      input_tokens: 4,
      output_tokens: 234,
      cache_read_tokens: 103_939,
      cache_write_tokens: 14_530,
    },
    sessions_read: ["session-1.jsonl"],
    malformed_lines_ignored: 0,
    messages_deduplicated: 0,
  };

  const output = buildAnalyzeSessionOutput(usage, {
    cooling_system: "evaporative",
    region: "global",
  });

  it("relatorio_por_modelo traz equivalencias formatadas", () => {
    const modelReport = output.relatorio_por_modelo["claude-sonnet-5"] as {
      formatado: { equivalencias?: { horas_lampada_led_10w: string } };
    };
    expect(modelReport.formatado.equivalencias).toBeDefined();
  });

  it("relatorio_agregado traz equivalencias formatadas consistentes com a energia total agregada", () => {
    expect(output.relatorio_agregado.formatado.equivalencias).toBeDefined();

    const energiaTotalWh = parseFormattedEnergyToWh(output.relatorio_agregado.formatado.energia.total.central);
    const horasFormatadas = parseFirstNumberPtBr(
      output.relatorio_agregado.formatado.equivalencias.horas_lampada_led_10w,
    );
    expect(horasFormatadas).toBeCloseTo(energiaTotalWh / LED_BULB_POWER_W, 1);
  });
});

describe("compare_cooling_systems: equivalencias formatadas por sistema", () => {
  const args = {
    input_tokens: 0,
    output_tokens: 1_000_000,
    model: "claude-sonnet-5",
    region: "global" as const,
  };
  const output = buildCompareCoolingOutput(args);

  it("cada linha da comparacao traz equivalencias formatadas", () => {
    for (const row of output.comparacao) {
      expect(row.formatado.equivalencias).toBeDefined();

      const reference = buildFootprintResult({
        inputTokens: args.input_tokens,
        outputTokens: args.output_tokens,
        model: args.model,
        coolingSystem: row.cooling_system,
        region: args.region,
        includeOffsiteWater: true,
      });

      const energiaTotalWh = parseFormattedEnergyToWh(reference.formatado.energia.total.central);
      const horasFormatadas = parseFirstNumberPtBr(row.formatado.equivalencias.horas_lampada_led_10w);
      expect(horasFormatadas).toBeCloseTo(energiaTotalWh / LED_BULB_POWER_W, 1);
    }
  });
});

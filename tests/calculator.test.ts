import { describe, expect, it } from "vitest";
import {
  buildFootprintResult,
  calculateCarbon,
  calculateEnergyIT,
  calculateEnergyTotal,
  calculateTokensEquivalent,
  calculateWaterOffsite,
  calculateWaterOnsite,
  calculateWaterTotal,
} from "../src/math/calculator.js";
import { LED_BULB_POWER_W } from "../src/math/benchmarks.js";

/** Converte uma string formatada pt-BR ("10,3 Wh" ou "1,5 kWh") de volta para Wh. */
function parseFormattedEnergyToWh(formatted: string): number {
  const match = formatted.match(/^(-?[\d,]+) (kWh|Wh)$/);
  if (!match) throw new Error(`Formato de energia inesperado: "${formatted}"`);
  const [, rawValue, unit] = match;
  const value = Number(rawValue.replace(",", "."));
  if (unit === "kWh") return value * 1000;
  return value;
}

describe("Cenario A: 1.000.000 tokens de SAIDA, sonnet, evaporative, PUE 1.2", () => {
  const tokensEq = calculateTokensEquivalent({ inputTokens: 0, outputTokens: 1_000_000 });
  const energyIT = calculateEnergyIT(tokensEq, "medium");
  const energyTotal = calculateEnergyTotal(energyIT);
  const waterOnsite = calculateWaterOnsite(energyIT, "evaporative");
  const waterOffsite = calculateWaterOffsite(energyTotal, "global", true);
  const carbon = calculateCarbon(energyTotal, "global");

  it("E_it (central) = 0.6 kWh", () => {
    expect(energyIT.central).toBeCloseTo(0.6, 6);
  });

  it("E_total (central) = 0.72 kWh", () => {
    expect(energyTotal.central).toBeCloseTo(0.72, 6);
  });

  it("W_onsite (central) = 720 mL", () => {
    expect(waterOnsite.central).toBeCloseTo(0.72, 6);
  });

  it("faixa on-site vai de 360 mL (min) a 1.200 mL (max)", () => {
    expect(waterOnsite.min).toBeCloseTo(0.36, 6);
    expect(waterOnsite.max).toBeCloseTo(1.2, 6);
  });

  it("W_offsite (global) = 2.232 L", () => {
    expect(waterOffsite.central).toBeCloseTo(2.232, 6);
  });

  it("CO2 (global) = 345.6 g", () => {
    expect(carbon.central).toBeCloseTo(345.6, 6);
  });
});

describe("Cenario B: mesmo caso de A, mas closed_loop", () => {
  const tokensEq = calculateTokensEquivalent({ inputTokens: 0, outputTokens: 1_000_000 });
  const energyIT = calculateEnergyIT(tokensEq, "medium");
  const energyTotal = calculateEnergyTotal(energyIT);
  const waterOnsite = calculateWaterOnsite(energyIT, "closed_loop");
  const waterOffsite = calculateWaterOffsite(energyTotal, "global", true);

  it("W_onsite < 50 mL", () => {
    expect(waterOnsite.central).toBeLessThan(0.05);
    expect(waterOnsite.central).toBeCloseTo(0.03, 6);
  });

  it("W_offsite > 0 (impacto NAO e zero)", () => {
    expect(waterOffsite.central).toBeGreaterThan(0);
    expect(waterOffsite.central).toBeCloseTo(2.232, 6);
  });
});

describe("Cenario C: 1.000.000 tokens de ENTRADA, sonnet", () => {
  it("tokens_eq = 250.000 e E_it (central) = 1/4 da energia do Cenario A", () => {
    const tokensEq = calculateTokensEquivalent({ inputTokens: 1_000_000, outputTokens: 0 });
    expect(tokensEq).toBeCloseTo(250_000, 6);

    const energyIT = calculateEnergyIT(tokensEq, "medium");
    expect(energyIT.central).toBeCloseTo(0.15, 6);
    expect(energyIT.central).toBeCloseTo(0.6 / 4, 6);
  });
});

describe("Cenario D: regiao brazil vs. global, mesmos tokens", () => {
  it("CO2 brazil = (90/480) do global", () => {
    const tokensEq = calculateTokensEquivalent({ inputTokens: 0, outputTokens: 1_000_000 });
    const energyIT = calculateEnergyIT(tokensEq, "medium");
    const energyTotal = calculateEnergyTotal(energyIT);

    const carbonGlobal = calculateCarbon(energyTotal, "global");
    const carbonBrazil = calculateCarbon(energyTotal, "brazil");

    expect(carbonBrazil.central).toBeCloseTo(carbonGlobal.central * (90 / 480), 6);
  });
});

describe("Bordas", () => {
  it("0 tokens retorna tudo zero, sem erro", () => {
    const result = buildFootprintResult({
      inputTokens: 0,
      outputTokens: 0,
      model: "claude-sonnet-5",
      coolingSystem: "evaporative",
      region: "global",
      includeOffsiteWater: true,
    });

    expect(result.tokens_equivalentes).toBe(0);
    expect(result.energia.ti_kwh.central).toBe(0);
    expect(result.agua.total_l.central).toBe(0);
    expect(result.carbono.co2e_g.central).toBe(0);
  });

  it("100 milhoes de tokens produz resultado finito e proporcional (linearidade)", () => {
    const base = buildFootprintResult({
      inputTokens: 0,
      outputTokens: 1_000_000,
      model: "claude-sonnet-5",
      coolingSystem: "evaporative",
      region: "global",
      includeOffsiteWater: true,
    });
    const scaled = buildFootprintResult({
      inputTokens: 0,
      outputTokens: 100_000_000,
      model: "claude-sonnet-5",
      coolingSystem: "evaporative",
      region: "global",
      includeOffsiteWater: true,
    });

    expect(Number.isFinite(scaled.carbono.co2e_g.central)).toBe(true);
    expect(scaled.carbono.co2e_g.central).toBeCloseTo(base.carbono.co2e_g.central * 100, 4);
  });

  it("include_offsite_water = false zera a agua off-site", () => {
    const result = buildFootprintResult({
      inputTokens: 0,
      outputTokens: 1_000_000,
      model: "claude-sonnet-5",
      coolingSystem: "evaporative",
      region: "global",
      includeOffsiteWater: false,
    });

    expect(result.agua.offsite_l.central).toBe(0);
    expect(result.agua.total_l.central).toBeCloseTo(result.agua.onsite_l.central, 6);
  });
});

describe("Blindagem: consistencia entre unidade formatada e equivalencia de LED", () => {
  const casos = [
    { inputTokens: 4, outputTokens: 234, cacheReadTokens: 103_939, cacheWriteTokens: 14_530 },
    { inputTokens: 0, outputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0 },
    { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    { inputTokens: 500, outputTokens: 500, cacheReadTokens: 5_000_000, cacheWriteTokens: 200_000 },
  ];

  for (const [i, tokens] of casos.entries()) {
    it(`caso ${i + 1}: horas_lampada_led_10w == energia_total_em_Wh / LED_BULB_POWER_W`, () => {
      const result = buildFootprintResult({
        ...tokens,
        model: "claude-sonnet-5",
        coolingSystem: "evaporative",
        region: "brazil",
        includeOffsiteWater: true,
      });

      const energiaTotalWh = parseFormattedEnergyToWh(result.formatado.energia.total.central);
      const horasLedEsperado = energiaTotalWh / LED_BULB_POWER_W;

      // Tolerancia larga: formatEnergy arredonda para 3 algarismos significativos,
      // entao o valor recuperado do texto nao e identico ao Wh exato internamente.
      expect(result.equivalencias.horas_lampada_led_10w).toBeCloseTo(horasLedEsperado, 1);

      // O rotulo "mWh" nunca deve aparecer em nenhum ponto da faixa formatada.
      expect(result.formatado.energia.total.min).not.toContain("mWh");
      expect(result.formatado.energia.total.central).not.toContain("mWh");
      expect(result.formatado.energia.total.max).not.toContain("mWh");
    });
  }
});

describe("Cenario real da sessao (input 4, output 234, cache lido 103939, cache escrito 14530, brazil)", () => {
  it('energia total central formatada e exatamente "10,3 Wh"', () => {
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

    expect(result.formatado.energia.total.central).toBe("10,3 Wh");
  });
});

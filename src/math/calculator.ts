import {
  BOTTLE_VOLUME_L,
  E_TOKEN_PER_1K_OUTPUT,
  INPUT_WEIGHT,
  CACHE_READ_WEIGHT,
  LED_BULB_POWER_W,
  PUE,
  REGION_PRESETS,
  SMARTPHONE_CHARGE_WH,
  TRANSPARENCY_NOTE,
  WUE_ONSITE,
} from "./benchmarks.js";
import { formatCarbon, formatEnergy, formatEquivalences, formatRange, formatWater } from "./format.js";
import { resolveModelFamily } from "../profiles/models.js";
import type {
  CoolingSystem,
  FootprintResult,
  ModelFamily,
  Range,
  Region,
} from "../types/index.js";

/**
 * Funcoes puras de calculo. Nenhuma faz I/O.
 *
 * Somente a energia por token (e_token) varia em tres pontos (min/central/max).
 * PUE, WUE, EWIF e intensidade de carbono sao usados pelo valor central do
 * preset escolhido — os proprios presets documentam a faixa tipica de cada
 * constante, mas a faixa final do resultado vem exclusivamente da incerteza
 * de e_token, propagada linearmente (ver secao 3.5 do plano).
 */

export function mapRange(range: Range, fn: (v: number) => number): Range {
  return { min: fn(range.min), central: fn(range.central), max: fn(range.max) };
}

export function addRanges(a: Range, b: Range): Range {
  return { min: a.min + b.min, central: a.central + b.central, max: a.max + b.max };
}

const ZERO_RANGE: Range = { min: 0, central: 0, max: 0 };

/** tokens_eq = output + input*INPUT_WEIGHT + cache_write*INPUT_WEIGHT + cache_read*CACHE_READ_WEIGHT */
export function calculateTokensEquivalent(params: {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}): number {
  const cacheReadTokens = params.cacheReadTokens ?? 0;
  const cacheWriteTokens = params.cacheWriteTokens ?? 0;
  return (
    params.outputTokens +
    params.inputTokens * INPUT_WEIGHT +
    cacheWriteTokens * INPUT_WEIGHT +
    cacheReadTokens * CACHE_READ_WEIGHT
  );
}

/** E_it = (tokens_eq / 1000) * e_token[familia] */
export function calculateEnergyIT(tokensEq: number, family: ModelFamily): Range {
  const eToken = E_TOKEN_PER_1K_OUTPUT[family];
  const factor = tokensEq / 1000;
  return mapRange(eToken, (v) => factor * v);
}

/** E_total = E_it * PUE (PUE pelo valor central do preset) */
export function calculateEnergyTotal(energyIT: Range, pue: number = PUE.central): Range {
  return mapRange(energyIT, (v) => v * pue);
}

/** W_onsite = E_it * WUE[resfriamento] — WUE aplicado sobre a energia de TI, nao a total */
export function calculateWaterOnsite(energyIT: Range, coolingSystem: CoolingSystem): Range {
  const wue = WUE_ONSITE[coolingSystem].central;
  return mapRange(energyIT, (v) => v * wue);
}

/** W_offsite = E_total * EWIF[regiao] */
export function calculateWaterOffsite(
  energyTotal: Range,
  region: Region,
  include: boolean,
): Range {
  if (!include) return ZERO_RANGE;
  const ewif = REGION_PRESETS[region].ewif_l_per_kwh;
  return mapRange(energyTotal, (v) => v * ewif);
}

/** W_total = W_onsite + W_offsite */
export function calculateWaterTotal(onsite: Range, offsite: Range): Range {
  return addRanges(onsite, offsite);
}

/** CO2 = E_total * CI[regiao] (em gCO2e) */
export function calculateCarbon(energyTotal: Range, region: Region): Range {
  const ci = REGION_PRESETS[region].carbon_intensity_g_per_kwh;
  return mapRange(energyTotal, (v) => v * ci);
}

/** Equivalencias praticas calculadas sobre o valor central. */
export function calculateEquivalences(waterTotalL: number, energyTotalKwh: number) {
  return {
    garrafas_500ml: waterTotalL / BOTTLE_VOLUME_L,
    horas_lampada_led_10w: (energyTotalKwh * 1000) / LED_BULB_POWER_W,
    cargas_smartphone: (energyTotalKwh * 1000) / SMARTPHONE_CHARGE_WH,
  };
}

/**
 * Monta o relatorio completo de pegada ecologica (usado pela Tool 1 e pela
 * Tool 4) a partir dos tokens brutos e das premissas escolhidas.
 */
export function buildFootprintResult(params: {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  model?: string;
  coolingSystem: CoolingSystem;
  region: Region;
  includeOffsiteWater: boolean;
}): FootprintResult {
  const { family, fallback_used, warning } = resolveModelFamily(params.model);

  const tokensEq = calculateTokensEquivalent({
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cacheReadTokens: params.cacheReadTokens,
    cacheWriteTokens: params.cacheWriteTokens,
  });

  const energyIT = calculateEnergyIT(tokensEq, family);
  const energyTotal = calculateEnergyTotal(energyIT, PUE.central);
  const waterOnsite = calculateWaterOnsite(energyIT, params.coolingSystem);
  const waterOffsite = calculateWaterOffsite(
    energyTotal,
    params.region,
    params.includeOffsiteWater,
  );
  const waterTotal = calculateWaterTotal(waterOnsite, waterOffsite);
  const carbon = calculateCarbon(energyTotal, params.region);
  const equivalences = calculateEquivalences(waterTotal.central, energyTotal.central);
  const regionPreset = REGION_PRESETS[params.region];

  return {
    tokens_equivalentes: tokensEq,
    energia: { ti_kwh: energyIT, total_kwh: energyTotal },
    agua: { onsite_l: waterOnsite, offsite_l: waterOffsite, total_l: waterTotal },
    carbono: { co2e_g: carbon },
    equivalencias: equivalences,
    formatado: {
      energia: {
        ti: formatRange(energyIT, formatEnergy),
        total: formatRange(energyTotal, formatEnergy),
      },
      agua: {
        onsite: formatRange(waterOnsite, formatWater),
        offsite: formatRange(waterOffsite, formatWater),
        total: formatRange(waterTotal, formatWater),
      },
      carbono: { co2e: formatRange(carbon, formatCarbon) },
      equivalencias: formatEquivalences(equivalences),
    },
    premissas: {
      modelo_informado: params.model,
      familia_modelo: family,
      fallback_usado: fallback_used,
      pue: PUE.central,
      wue_onsite_l_por_kwh: WUE_ONSITE[params.coolingSystem].central,
      ewif_l_por_kwh: regionPreset.ewif_l_per_kwh,
      intensidade_carbono_g_por_kwh: regionPreset.carbon_intensity_g_per_kwh,
      cooling_system: params.coolingSystem,
      region: params.region,
      include_offsite_water: params.includeOffsiteWater,
    },
    ...(warning ? { aviso_fallback: warning } : {}),
    nota_transparencia: TRANSPARENCY_NOTE,
  };
}

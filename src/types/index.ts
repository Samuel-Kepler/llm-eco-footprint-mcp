import { z } from "zod";
import type { FormattedEquivalences } from "../math/format.js";

// Limite superior de tokens aceito por chamada (soma de todos os campos de tokens)
export const MAX_TOTAL_TOKENS = 1e12;

export const CoolingSystemEnum = z.enum([
  "evaporative",
  "hybrid",
  "closed_loop",
  "direct_to_chip",
]);
export type CoolingSystem = z.infer<typeof CoolingSystemEnum>;

export const RegionEnum = z.enum(["global", "us", "eu", "brazil"]);
export type Region = z.infer<typeof RegionEnum>;

export const ModelFamilyEnum = z.enum(["large", "medium", "small"]);
export type ModelFamily = z.infer<typeof ModelFamilyEnum>;

// Faixa de estimativa: minimo, valor central e maximo.
// Nunca deve ser tratada como uma medicao exata.
export interface Range {
  min: number;
  central: number;
  max: number;
}

// Mesma faixa, com cada ponto ja formatado (unidade adaptativa, ex.: "10,3 Wh").
export interface FormattedRange {
  min: string;
  central: string;
  max: string;
}

export const calculateFootprintInputShape = {
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  cache_read_tokens: z.number().int().min(0).optional().default(0),
  cache_write_tokens: z.number().int().min(0).optional().default(0),
  model: z.string().optional(),
  cooling_system: CoolingSystemEnum.optional().default("evaporative"),
  region: RegionEnum.optional().default("global"),
  include_offsite_water: z.boolean().optional().default(true),
};
export const CalculateFootprintInputSchema = z.object(
  calculateFootprintInputShape,
);
export type CalculateFootprintInput = z.infer<
  typeof CalculateFootprintInputSchema
>;

export const compareCoolingInputShape = {
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  model: z.string().optional(),
  region: RegionEnum.optional().default("global"),
};
export const CompareCoolingInputSchema = z.object(compareCoolingInputShape);
export type CompareCoolingInput = z.infer<typeof CompareCoolingInputSchema>;

export const analyzeSessionInputShape = {
  project_path: z.string().optional(),
  session_id: z.string().optional(),
  since: z.string().datetime().optional().or(z.string().date().optional()),
  cooling_system: CoolingSystemEnum.optional().default("evaporative"),
  region: RegionEnum.optional().default("global"),
};
export const AnalyzeSessionInputSchema = z.object(analyzeSessionInputShape);
export type AnalyzeSessionInput = z.infer<typeof AnalyzeSessionInputSchema>;

// Resultado agregado de um calculo de pegada ecologica
export interface FootprintResult {
  // Numero exato (nao e uma faixa: so a energia por token varia em min/central/max)
  tokens_equivalentes: number;
  energia: {
    ti_kwh: Range;
    total_kwh: Range;
  };
  agua: {
    onsite_l: Range;
    offsite_l: Range;
    total_l: Range;
  };
  carbono: {
    co2e_g: Range;
  };
  equivalencias: {
    garrafas_500ml: number;
    horas_lampada_led_10w: number;
    cargas_smartphone: number;
  };
  premissas: {
    modelo_informado?: string;
    familia_modelo: ModelFamily;
    fallback_usado: boolean;
    pue: number;
    wue_onsite_l_por_kwh: number;
    ewif_l_por_kwh: number;
    intensidade_carbono_g_por_kwh: number;
    cooling_system: CoolingSystem;
    region: Region;
    include_offsite_water: boolean;
  };
  formatado: {
    energia: { ti: FormattedRange; total: FormattedRange };
    agua: { onsite: FormattedRange; offsite: FormattedRange; total: FormattedRange };
    carbono: { co2e: FormattedRange };
    equivalencias: FormattedEquivalences;
  };
  aviso_fallback?: string;
  nota_transparencia: string;
}

import { z } from "zod";
import type { FormattedEquivalences } from "../math/format.js";

// Limite superior de tokens aceito por chamada (soma de todos os campos de tokens)
export const MAX_TOTAL_TOKENS = 1e12;

// Nome de modelo: allow-list de caracteres (sem espacos nem pontuacao de
// frase) e tamanho maximo. Ids reais (ex.: "claude-sonnet-5-5",
// "us.anthropic.claude-opus-4-1:0", "claude-opus-4[1m]") passam; uma frase
// com instrucao embutida nao. O nome e devolvido na saida das tools, entao
// texto livre aqui chegaria de volta ao assistente (injecao indireta).
export const MODEL_NAME_MAX_LENGTH = 64;
const MODEL_NAME_PATTERN = /^[A-Za-z0-9._:/[\]-]+$/;

export function isSafeModelName(name: string): boolean {
  return name.length <= MODEL_NAME_MAX_LENGTH && MODEL_NAME_PATTERN.test(name);
}

export const ModelNameSchema = z
  .string()
  .max(MODEL_NAME_MAX_LENGTH)
  .regex(MODEL_NAME_PATTERN, "model so aceita letras, numeros e . _ : / [ ] -");

// Mensagem de erro fixa para enums: o padrao do Zod inclui "received '<valor>'",
// o que devolveria ao assistente o texto que o chamador enviou.
const enumErrorMap = (field: string, options: readonly string[]) => ({
  errorMap: () => ({ message: `${field} invalido; use um de: ${options.join(", ")}` }),
});

const COOLING_SYSTEMS = ["evaporative", "hybrid", "closed_loop", "direct_to_chip"] as const;
export const CoolingSystemEnum = z.enum(COOLING_SYSTEMS, enumErrorMap("cooling_system", COOLING_SYSTEMS));
export type CoolingSystem = z.infer<typeof CoolingSystemEnum>;

const REGIONS = ["global", "us", "eu", "brazil"] as const;
export const RegionEnum = z.enum(REGIONS, enumErrorMap("region", REGIONS));
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
  model: ModelNameSchema.optional(),
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
  model: ModelNameSchema.optional(),
  region: RegionEnum.optional().default("global"),
};
export const CompareCoolingInputSchema = z.object(compareCoolingInputShape);
export type CompareCoolingInput = z.infer<typeof CompareCoolingInputSchema>;

export const analyzeSessionInputShape = {
  project_path: z.string().min(1).max(1024).optional(),
  // Ids de sessao sao UUIDs (com ".jsonl" opcional): letras, numeros, . _ -
  session_id: z
    .string()
    .regex(/^[A-Za-z0-9._-]{1,128}$/, "session_id so aceita letras, numeros e . _ -")
    .optional(),
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

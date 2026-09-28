import type { ModelFamily } from "../types/index.js";

export interface ModelResolution {
  family: ModelFamily;
  fallback_used: boolean;
  warning?: string;
}

// Regras de reconhecimento por substring, avaliadas em ordem.
// A ordem importa: padroes mais especificos (ex.: "mini") devem vir antes
// de padroes mais genericos (ex.: "gpt-4o") que os contem.
const RECOGNIZED_PATTERNS: Array<{ pattern: RegExp; family: ModelFamily }> = [
  // Claude
  { pattern: /haiku/, family: "small" },
  { pattern: /opus/, family: "large" },
  { pattern: /sonnet/, family: "medium" },
  // Outros provedores (heuristica, para permitir comparacoes)
  { pattern: /mini|nano/, family: "small" },
  { pattern: /gpt-3\.5/, family: "small" },
  { pattern: /gpt-4o|gpt-4|^o1$|o1-preview/, family: "medium" },
  { pattern: /ultra/, family: "large" },
];

const DEFAULT_FAMILY: ModelFamily = "medium";

/**
 * Mapeia o nome de um modelo para a familia usada nas constantes de energia
 * (large/medium/small). Nomes de modelo mudam com frequencia, entao o
 * mapeamento e feito por familia (opus/sonnet/haiku) em vez de versoes
 * exatas, com fallback explicito quando nada e reconhecido.
 */
export function resolveModelFamily(model?: string): ModelResolution {
  if (!model || model.trim() === "") {
    return {
      family: DEFAULT_FAMILY,
      fallback_used: true,
      warning:
        "Nenhum modelo informado; usando a familia 'medium' (sonnet) como padrao.",
    };
  }

  const normalized = model.trim().toLowerCase();

  for (const rule of RECOGNIZED_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      return { family: rule.family, fallback_used: false };
    }
  }

  return {
    family: DEFAULT_FAMILY,
    fallback_used: true,
    warning: `Modelo "${model}" nao reconhecido; usando a familia 'medium' (sonnet) como padrao.`,
  };
}

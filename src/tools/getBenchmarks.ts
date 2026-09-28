import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  BOTTLE_VOLUME_L,
  E_TOKEN_PER_1K_OUTPUT,
  INPUT_WEIGHT,
  CACHE_READ_WEIGHT,
  LED_BULB_POWER_W,
  PUE,
  REGION_PRESETS,
  SANITY_CHECK_NOTE,
  SMARTPHONE_CHARGE_WH,
  TRANSPARENCY_NOTE,
  WUE_ONSITE,
} from "../math/benchmarks.js";
import { MAX_TOTAL_TOKENS } from "../types/index.js";

export function registerGetBenchmarksTool(server: McpServer): void {
  server.registerTool(
    "get_ecological_benchmarks",
    {
      title: "Obter constantes e premissas",
      description:
        "Retorna todas as constantes, formulas, presets e limitacoes usadas nos " +
        "calculos, para auditoria e transparencia.",
      inputSchema: {},
    },
    async () => {
      const output = {
        aviso: "Nao ha dados oficiais publicos de energia por token para os modelos " +
          "Claude. Estas constantes sao premissas de ordem de grandeza.",
        energia_por_1000_tokens_saida_kwh: E_TOKEN_PER_1K_OUTPUT,
        peso_tokens_entrada: INPUT_WEIGHT,
        peso_tokens_cache_lido: CACHE_READ_WEIGHT,
        pue: PUE,
        wue_onsite_l_por_kwh: WUE_ONSITE,
        presets_regionais: REGION_PRESETS,
        equivalencias_praticas: {
          volume_garrafa_l: BOTTLE_VOLUME_L,
          potencia_lampada_led_w: LED_BULB_POWER_W,
          carga_smartphone_wh: SMARTPHONE_CHARGE_WH,
        },
        limite_maximo_tokens_por_chamada: MAX_TOTAL_TOKENS,
        formulas: {
          tokens_equivalentes:
            "output_tokens + input_tokens*INPUT_WEIGHT + cache_write_tokens*INPUT_WEIGHT + cache_read_tokens*CACHE_READ_WEIGHT",
          energia_ti_kwh: "(tokens_eq / 1000) * e_token[familia]",
          energia_total_kwh: "energia_ti_kwh * PUE",
          agua_onsite_l: "energia_ti_kwh * WUE[resfriamento] (sobre a energia de TI, nao a total)",
          agua_offsite_l: "energia_total_kwh * EWIF[regiao]",
          agua_total_l: "agua_onsite_l + agua_offsite_l",
          carbono_gco2e: "energia_total_kwh * intensidade_carbono[regiao]",
        },
        checagem_de_sanidade: SANITY_CHECK_NOTE,
        nota_transparencia: TRANSPARENCY_NOTE,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
      };
    },
  );
}

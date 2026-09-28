import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildFootprintResult } from "../math/calculator.js";
import { compareCoolingInputShape } from "../types/index.js";
import { CoolingSystemEnum } from "../types/index.js";
import type { Region } from "../types/index.js";

const ALL_COOLING_SYSTEMS = CoolingSystemEnum.options;

/**
 * Monta a saida da Tool 3. Funcao pura, extraida para ser testavel sem
 * depender do McpServer.
 */
export function buildCompareCoolingOutput(args: {
  input_tokens: number;
  output_tokens: number;
  model?: string;
  region: Region;
}) {
  const comparison = ALL_COOLING_SYSTEMS.map((cooling) => {
    const result = buildFootprintResult({
      inputTokens: args.input_tokens,
      outputTokens: args.output_tokens,
      model: args.model,
      coolingSystem: cooling,
      region: args.region,
      includeOffsiteWater: true,
    });
    return {
      cooling_system: cooling,
      agua_onsite_l: result.agua.onsite_l,
      agua_offsite_l: result.agua.offsite_l,
      agua_total_l: result.agua.total_l,
      equivalencias: result.equivalencias,
      formatado: {
        energia_total: result.formatado.energia.total,
        onsite: result.formatado.agua.onsite,
        offsite: result.formatado.agua.offsite,
        total: result.formatado.agua.total,
        equivalencias: result.formatado.equivalencias,
      },
    };
  });

  return {
    aviso: "A agua off-site (geracao de eletricidade) e a mesma em todas as linhas: " +
      "so a agua on-site (resfriamento do data center) muda entre sistemas.",
    comparacao: comparison,
  };
}

export function registerCompareCoolingTool(server: McpServer): void {
  server.registerTool(
    "compare_cooling_systems",
    {
      title: "Comparar sistemas de resfriamento",
      description:
        "Compara a mesma carga de tokens entre os quatro sistemas de resfriamento. " +
        "A agua off-site NAO muda com o resfriamento — apenas a agua on-site varia.",
      inputSchema: compareCoolingInputShape,
    },
    async (args) => {
      const output = buildCompareCoolingOutput(args);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
      };
    },
  );
}

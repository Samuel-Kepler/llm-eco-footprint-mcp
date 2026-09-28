import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildFootprintResult } from "../math/calculator.js";
import { calculateFootprintInputShape, MAX_TOTAL_TOKENS } from "../types/index.js";

export function registerCalculateFootprintTool(server: McpServer): void {
  server.registerTool(
    "calculate_ecological_footprint",
    {
      title: "Calcular pegada ecologica",
      description:
        "Estima agua (direta e indireta), energia e CO2 para uma quantidade de " +
        "tokens informada, sempre como faixas de estimativa (nunca como medicao).",
      inputSchema: calculateFootprintInputShape,
    },
    async (args) => {
      const totalTokens =
        args.input_tokens + args.output_tokens + args.cache_read_tokens + args.cache_write_tokens;

      if (totalTokens > MAX_TOTAL_TOKENS) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Erro de validacao: a soma de tokens (${totalTokens}) excede o limite de ${MAX_TOTAL_TOKENS}.`,
            },
          ],
        };
      }

      const result = buildFootprintResult({
        inputTokens: args.input_tokens,
        outputTokens: args.output_tokens,
        cacheReadTokens: args.cache_read_tokens,
        cacheWriteTokens: args.cache_write_tokens,
        model: args.model,
        coolingSystem: args.cooling_system,
        region: args.region,
        includeOffsiteWater: args.include_offsite_water,
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}

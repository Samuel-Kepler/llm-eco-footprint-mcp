#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCalculateFootprintTool } from "./tools/calculateFootprint.js";
import { registerCompareCoolingTool } from "./tools/compareCooling.js";
import { registerGetBenchmarksTool } from "./tools/getBenchmarks.js";
import { registerAnalyzeSessionTool } from "./tools/analyzeSession.js";

// REGRA CRITICA: nunca use console.log aqui. No transporte stdio, o stdout e
// o canal do protocolo MCP, e qualquer texto extra corrompe a comunicacao.
// Para logs, use sempre console.error (que vai para stderr).

const server = new McpServer({
  name: "llm-eco-footprint-mcp",
  version: "0.2.0",
});

registerCalculateFootprintTool(server);
registerCompareCoolingTool(server);
registerGetBenchmarksTool(server);
registerAnalyzeSessionTool(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("llm-eco-footprint-mcp: servidor MCP conectado via stdio.");
}

main().catch((error) => {
  console.error("llm-eco-footprint-mcp: erro fatal ao iniciar o servidor.", error);
  process.exit(1);
});

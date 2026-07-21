import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: "explain-anything",
  version: "0.1.0",
  description: "Plain-language project understanding for non-technical people",
});

registerTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Explain Anything MCP Server started (stdio)");
}

main().catch((err) => {
  console.error("MCP Server failed to start:", err.message);
  process.exit(1);
});

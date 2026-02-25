import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type Database from '@ansvar/mcp-sqlite';

// Tool implementations will be imported here in later tasks.
// For now, the registry registers an empty tool list.

export const TOOLS: Tool[] = [];

export function registerTools(
  server: Server,
  _db: InstanceType<typeof Database>,
): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;

    return {
      content: [{ type: 'text', text: `Error: Unknown tool "${name}".` }],
      isError: true,
    };
  });
}

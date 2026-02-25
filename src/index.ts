#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { closeDatabase, getDatabase } from './database.js';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';
import { registerTools } from './tools/registry.js';

async function main(): Promise<void> {
  const db = getDatabase();

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  registerTools(server, db);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[${SERVER_NAME}] running on stdio`);

  const cleanup = () => {
    closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((error) => {
  console.error(`[${SERVER_NAME}] fatal error`, error);
  process.exit(1);
});

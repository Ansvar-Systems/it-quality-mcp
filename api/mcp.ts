import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import Database from '@ansvar/mcp-sqlite';
import { copyFileSync, existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

import { registerTools } from '../src/tools/registry.js';
import { DB_ENV_VAR, SERVER_NAME, SERVER_VERSION } from '../src/constants.js';

const SOURCE_DB = process.env[DB_ENV_VAR] || join(process.cwd(), 'data', 'database.db');
const TMP_DB = '/tmp/it-quality-database.db';
const TMP_DB_META = '/tmp/it-quality-database.meta.json';

let db: InstanceType<typeof Database> | null = null;

interface TmpDbMeta {
  source_db: string;
  source_signature: string;
}

function computeSourceSignature(): string {
  const stats = statSync(SOURCE_DB);
  return `${stats.size}:${Math.trunc(stats.mtimeMs)}`;
}

function readTmpMeta(): TmpDbMeta | null {
  if (!existsSync(TMP_DB_META)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(TMP_DB_META, 'utf-8')) as Partial<TmpDbMeta>;
    if (parsed.source_db && parsed.source_signature) {
      return {
        source_db: parsed.source_db,
        source_signature: parsed.source_signature,
      };
    }
  } catch {
    // Ignore corrupted metadata and refresh temp DB.
  }

  return null;
}

function clearTmpArtifacts(): void {
  rmSync(TMP_DB, { force: true });
  rmSync(`${TMP_DB}-wal`, { force: true });
  rmSync(`${TMP_DB}-shm`, { force: true });
  rmSync(TMP_DB_META, { force: true });
}

function ensureTempDbIsFresh(): void {
  const sourceSignature = computeSourceSignature();
  const tmpMeta = readTmpMeta();

  const needsRefresh =
    !existsSync(TMP_DB)
    || !tmpMeta
    || tmpMeta.source_db !== SOURCE_DB
    || tmpMeta.source_signature !== sourceSignature;

  if (needsRefresh) {
    clearTmpArtifacts();
    copyFileSync(SOURCE_DB, TMP_DB);

    writeFileSync(
      TMP_DB_META,
      JSON.stringify({ source_db: SOURCE_DB, source_signature: sourceSignature }),
      'utf-8',
    );
  }
}

function getDatabase(): InstanceType<typeof Database> {
  if (!db) {
    ensureTempDbIsFresh();
    db = new Database(TMP_DB, { readonly: true });
    db.pragma('foreign_keys = ON');
  }

  return db;
}

function fingerprintDb(): string {
  try {
    const content = readFileSync(SOURCE_DB);
    return createHash('sha256').update(content).digest('hex').slice(0, 12);
  } catch {
    return 'unknown';
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      fingerprint: fingerprintDb(),
      protocol: 'mcp-streamable-http',
    });
    return;
  }

  try {
    if (!existsSync(SOURCE_DB)) {
      res.status(500).json({ error: `Database not found at ${SOURCE_DB}` });
      return;
    }

    const database = getDatabase();

    const server = new Server(
      { name: SERVER_NAME, version: SERVER_VERSION },
      { capabilities: { tools: {} } },
    );

    registerTools(server, database);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${SERVER_NAME}] MCP handler error:`, message);

    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
}

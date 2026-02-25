import Database from '@ansvar/mcp-sqlite';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { DB_ENV_VAR } from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: InstanceType<typeof Database> | null = null;

export function resolveDatabasePath(): string {
  if (process.env[DB_ENV_VAR]) {
    return process.env[DB_ENV_VAR] as string;
  }
  return join(__dirname, '..', 'data', 'database.db');
}

export function getDatabase(): InstanceType<typeof Database> {
  if (!db) {
    db = new Database(resolveDatabasePath(), { readonly: true });
    db.pragma('foreign_keys = ON');
    db.pragma('cache_size = -64000');
    db.pragma('temp_store = MEMORY');
  }

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export interface ResponseMetadata {
  schema_version: string;
  built_at: string;
  dataset_license: string;
}

export function getResponseMetadata(database: InstanceType<typeof Database>): ResponseMetadata {
  const rows = database.prepare('SELECT key, value FROM db_metadata').all() as Array<{ key: string; value: string }>;
  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    schema_version: map.get('schema_version') ?? 'unknown',
    built_at: map.get('built_at') ?? 'unknown',
    dataset_license: map.get('dataset_license') ?? 'Apache-2.0',
  };
}

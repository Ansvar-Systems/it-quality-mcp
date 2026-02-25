import type { Database } from '@ansvar/mcp-sqlite';

import { responseMeta } from '../utils/response-meta.js';

interface FrameworkRow {
  id: string;
  name: string;
  version: string;
  authority: string;
  domain: string;
  description: string;
  url: string;
  license_note: string;
  item_count: number;
  last_reviewed: string;
}

export async function listFrameworks(
  db: Database,
): Promise<Record<string, unknown>> {
  const rows = db.prepare(
    'SELECT * FROM frameworks ORDER BY domain, name',
  ).all() as FrameworkRow[];

  return { frameworks: rows, ...responseMeta(db) };
}

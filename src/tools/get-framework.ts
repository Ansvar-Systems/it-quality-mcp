import type { Database } from '@ansvar/mcp-sqlite';

import { responseMeta } from '../utils/response-meta.js';
import { buildCitation } from '../citation-universal.js';

export interface GetFrameworkInput {
  framework_id: string;
  include_items?: boolean;
}

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

interface ItemSummary {
  item_id: string;
  title: string;
  domain: string;
  category: string;
  description: string;
}

export async function getFramework(
  db: Database,
  input: GetFrameworkInput,
): Promise<Record<string, unknown>> {
  if (!input.framework_id || input.framework_id.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: framework_id is required.' }],
      isError: true,
      ...responseMeta(db),
    };
  }

  const fid = input.framework_id.trim();
  const row = db.prepare('SELECT * FROM frameworks WHERE id = ?').get(fid) as FrameworkRow | undefined;

  if (!row) {
    return {
      content: [{ type: 'text', text: `Error: Framework "${fid}" not found.` }],
      isError: true,
      ...responseMeta(db),
    };
  }

  const _citation = buildCitation(
    row.id,
    `${row.name} ${row.version}`,
    'get_framework',
    { framework_id: fid },
    row.url || undefined,
  );

  const result: Record<string, unknown> = {
    ...row,
    _citation,
    ...responseMeta(db),
  };

  if (input.include_items) {
    const items = db.prepare(
      'SELECT item_id, title, domain, category, description FROM items WHERE framework_id = ? ORDER BY item_id',
    ).all(fid) as ItemSummary[];
    result.items = items;
  }

  return result;
}

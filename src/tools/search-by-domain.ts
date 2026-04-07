import type { Database } from '@ansvar/mcp-sqlite';

import type { Domain } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';
import { buildCitation } from '../citation-universal.js';

export interface SearchByDomainInput {
  domain: Domain;
  category?: string;
  limit?: number;
}

interface DomainItemResult {
  item_id: string;
  title: string;
  framework_id: string;
  domain: string;
  category: string;
  description: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function searchByDomain(
  db: Database,
  input: SearchByDomainInput,
): Promise<Record<string, unknown>> {
  if (!input.domain || input.domain.trim().length === 0) {
    return {
      results: [],
      ...responseMeta(db),
    };
  }

  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  let sql = 'SELECT item_id, title, framework_id, domain, category, description FROM items WHERE domain = ?';
  const params: Array<string | number> = [input.domain.trim()];

  if (input.category) {
    sql += ' AND category = ?';
    params.push(input.category.trim());
  }

  sql += ' ORDER BY framework_id, item_id LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as DomainItemResult[];

  const _citations = rows.map((r) =>
    buildCitation(
      `${r.framework_id} ${r.item_id}`,
      `${r.title} (${r.framework_id})`,
      'get_practice',
      { item_id: r.item_id },
    ),
  );

  return { results: rows, _citations, ...responseMeta(db) };
}

import type { Database } from '@ansvar/mcp-sqlite';

import { MAX_QUERY_LENGTH, type Domain, type FrameworkId } from '../constants.js';
import { buildFtsQueryVariants } from '../utils/fts-query.js';
import { responseMeta } from '../utils/response-meta.js';

export interface SearchPracticesInput {
  query: string;
  domain?: Domain;
  framework?: FrameworkId;
  limit?: number;
}

export interface SearchPracticeResult {
  item_id: string;
  title: string;
  framework_id: string;
  domain: string;
  category: string;
  description: string;
  snippet: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DESC_TRUNCATE = 300;

function runFtsSearch(
  db: Database,
  ftsQuery: string,
  domain: string | undefined,
  framework: string | undefined,
  limit: number,
): SearchPracticeResult[] {
  let sql = `
    SELECT
      i.item_id,
      i.title,
      i.framework_id,
      i.domain,
      i.category,
      i.description,
      snippet(items_fts, 4, '>>>', '<<<', '...', 28) AS snippet
    FROM items_fts
    JOIN items i ON i.item_id = items_fts.item_id
    WHERE items_fts MATCH ?
  `;

  const params: Array<string | number> = [ftsQuery];

  if (domain) {
    sql += ' AND i.domain = ?';
    params.push(domain);
  }

  if (framework) {
    sql += ' AND i.framework_id = ?';
    params.push(framework);
  }

  sql += ' ORDER BY bm25(items_fts) LIMIT ?';
  params.push(limit);

  try {
    const rows = db.prepare(sql).all(...params) as SearchPracticeResult[];
    return rows.map((r) => ({
      ...r,
      description: r.description.length > DESC_TRUNCATE
        ? r.description.slice(0, DESC_TRUNCATE) + '...'
        : r.description,
    }));
  } catch {
    return [];
  }
}

function runLikeFallback(
  db: Database,
  rawQuery: string,
  domain: string | undefined,
  framework: string | undefined,
  limit: number,
): SearchPracticeResult[] {
  let sql = `
    SELECT
      item_id,
      title,
      framework_id,
      domain,
      category,
      description,
      substr(description, 1, ${DESC_TRUNCATE}) AS snippet
    FROM items
    WHERE (
      item_id LIKE ? OR
      title LIKE ? OR
      description LIKE ? OR
      tags LIKE ?
    )
  `;

  const like = `%${rawQuery}%`;
  const params: Array<string | number> = [like, like, like, like];

  if (domain) {
    sql += ' AND domain = ?';
    params.push(domain);
  }

  if (framework) {
    sql += ' AND framework_id = ?';
    params.push(framework);
  }

  sql += ' ORDER BY item_id LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as SearchPracticeResult[];
  return rows.map((r) => ({
    ...r,
    description: r.description.length > DESC_TRUNCATE
      ? r.description.slice(0, DESC_TRUNCATE) + '...'
      : r.description,
  }));
}

export async function searchPractices(
  db: Database,
  input: SearchPracticesInput,
): Promise<Record<string, unknown>> {
  if (!input.query || input.query.trim().length === 0) {
    return { results: [], ...responseMeta(db) };
  }

  const query = input.query.slice(0, MAX_QUERY_LENGTH);
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const variants = buildFtsQueryVariants(query);

  let results = runFtsSearch(db, variants.primary, input.domain, input.framework, limit);

  if (results.length === 0 && variants.fallback) {
    results = runFtsSearch(db, variants.fallback, input.domain, input.framework, limit);
  }

  if (results.length === 0) {
    results = runLikeFallback(db, query.trim(), input.domain, input.framework, limit);
  }

  const resultsWithCitation = results.map((r) => ({
    ...r,
    _citation: {
      canonical_ref: r.item_id,
      display_text: `${r.title} (${r.framework_id})`,
      lookup: { tool: 'get_practice', args: { item_id: r.item_id } },
    },
  }));

  return { results: resultsWithCitation, ...responseMeta(db) };
}

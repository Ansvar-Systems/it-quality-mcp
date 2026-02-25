import type { Database } from '@ansvar/mcp-sqlite';

import { MAX_QUERY_LENGTH } from '../constants.js';
import { buildFtsQueryVariants } from '../utils/fts-query.js';
import { responseMeta } from '../utils/response-meta.js';

/* ------------------------------------------------------------------ */
/*  Tool 6: get_maturity_model                                        */
/* ------------------------------------------------------------------ */

export interface GetMaturityModelInput {
  framework_id: string;
}

interface MaturityRow {
  id: number;
  framework_id: string;
  level: number;
  level_name: string;
  description: string;
  characteristics: string;
}

function safeJsonParse(value: string, fallback: unknown = []): unknown {
  if (!value || value === '' || value === '[]') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function getMaturityModel(
  db: Database,
  input: GetMaturityModelInput,
): Promise<Record<string, unknown>> {
  if (!input.framework_id || input.framework_id.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: framework_id is required.' }],
      isError: true,
      ...responseMeta(db),
    };
  }

  const fid = input.framework_id.trim();
  const rows = db.prepare(
    'SELECT * FROM maturity_definitions WHERE framework_id = ? ORDER BY level',
  ).all(fid) as MaturityRow[];

  if (rows.length === 0) {
    return {
      content: [{ type: 'text', text: `Error: No maturity model found for framework "${fid}".` }],
      isError: true,
      ...responseMeta(db),
    };
  }

  return {
    framework_id: fid,
    levels: rows.map((r) => ({
      level: r.level,
      level_name: r.level_name,
      description: r.description,
      characteristics: safeJsonParse(r.characteristics, []),
    })),
    ...responseMeta(db),
  };
}

/* ------------------------------------------------------------------ */
/*  Tool 7: assess_maturity                                           */
/* ------------------------------------------------------------------ */

export interface AssessMaturityInput {
  capability: string;
}

interface ItemRow {
  item_id: string;
  title: string;
  framework_id: string;
  domain: string;
  category: string;
  description: string;
}

export async function assessMaturity(
  db: Database,
  input: AssessMaturityInput,
): Promise<Record<string, unknown>> {
  if (!input.capability || input.capability.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: capability is required.' }],
      isError: true,
      ...responseMeta(db),
    };
  }

  const query = input.capability.slice(0, MAX_QUERY_LENGTH);
  const variants = buildFtsQueryVariants(query);

  let items: ItemRow[] = [];

  // FTS primary
  try {
    items = db.prepare(`
      SELECT i.item_id, i.title, i.framework_id, i.domain, i.category, i.description
      FROM items_fts
      JOIN items i ON i.item_id = items_fts.item_id
      WHERE items_fts MATCH ?
      ORDER BY bm25(items_fts)
      LIMIT 20
    `).all(variants.primary) as ItemRow[];
  } catch {
    // FTS syntax error
  }

  // FTS fallback
  if (items.length === 0 && variants.fallback) {
    try {
      items = db.prepare(`
        SELECT i.item_id, i.title, i.framework_id, i.domain, i.category, i.description
        FROM items_fts
        JOIN items i ON i.item_id = items_fts.item_id
        WHERE items_fts MATCH ?
        ORDER BY bm25(items_fts)
        LIMIT 20
      `).all(variants.fallback) as ItemRow[];
    } catch {
      // ignore
    }
  }

  // LIKE fallback
  if (items.length === 0) {
    const like = `%${query.trim()}%`;
    items = db.prepare(`
      SELECT item_id, title, framework_id, domain, category, description
      FROM items
      WHERE title LIKE ? OR description LIKE ? OR tags LIKE ?
      ORDER BY item_id
      LIMIT 20
    `).all(like, like, like) as ItemRow[];
  }

  if (items.length === 0) {
    return {
      message: `No items found matching capability "${input.capability}".`,
      frameworks: [],
      ...responseMeta(db),
    };
  }

  // Group by framework and attach maturity definitions
  const frameworkIds = [...new Set(items.map((i) => i.framework_id))];
  const frameworks: Array<Record<string, unknown>> = [];

  for (const fid of frameworkIds) {
    const maturityRows = db.prepare(
      'SELECT * FROM maturity_definitions WHERE framework_id = ? ORDER BY level',
    ).all(fid) as MaturityRow[];

    const matchingItems = items.filter((i) => i.framework_id === fid);

    frameworks.push({
      framework_id: fid,
      matching_items: matchingItems.map((i) => ({
        item_id: i.item_id,
        title: i.title,
        category: i.category,
      })),
      maturity_levels: maturityRows.length > 0
        ? maturityRows.map((r) => ({
            level: r.level,
            level_name: r.level_name,
            description: r.description,
            characteristics: safeJsonParse(r.characteristics, []),
          }))
        : null,
    });
  }

  return {
    capability: input.capability,
    total_matches: items.length,
    frameworks,
    ...responseMeta(db),
  };
}

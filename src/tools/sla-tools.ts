import type { Database } from '@ansvar/mcp-sqlite';

import { MAX_QUERY_LENGTH } from '../constants.js';
import { buildFtsQueryVariants } from '../utils/fts-query.js';
import { responseMeta } from '../utils/response-meta.js';

export interface GetSlaTemplatesInput {
  category?: string;
  query?: string;
  limit?: number;
}

interface SlaMetricRow {
  id: number;
  metric_id: string;
  name: string;
  category: string;
  description: string;
  formula: string;
  unit: string;
  typical_targets: string;
  measurement_guidance: string;
  related_itil_practice: string;
  tags: string;
}

interface SlaMetricResult {
  metric_id: string;
  name: string;
  category: string;
  description: string;
  formula: string;
  unit: string;
  typical_targets: unknown;
  measurement_guidance: string;
  related_itil_practice: string;
  tags: unknown;
  _citation: {
    canonical_ref: string;
    display_text: string;
    lookup: { tool: string; args: { query: string } };
  };
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function safeJsonParse(value: string, fallback: unknown = null): unknown {
  if (!value || value === '' || value === '{}' || value === '[]') {
    return value === '{}' ? {} : value === '[]' ? [] : fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatRow(row: SlaMetricRow): SlaMetricResult {
  return {
    metric_id: row.metric_id,
    name: row.name,
    category: row.category,
    description: row.description,
    formula: row.formula,
    unit: row.unit,
    typical_targets: safeJsonParse(row.typical_targets, {}),
    measurement_guidance: row.measurement_guidance,
    related_itil_practice: row.related_itil_practice,
    tags: safeJsonParse(row.tags, []),
    _citation: {
      canonical_ref: row.metric_id,
      display_text: `${row.name} (${row.category})`,
      lookup: { tool: 'get_sla_templates', args: { query: row.metric_id } },
    },
  };
}

export async function getSlaTemplates(
  db: Database,
  input: GetSlaTemplatesInput,
): Promise<Record<string, unknown>> {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  // If there's a text query, use FTS
  if (input.query && input.query.trim().length > 0) {
    const query = input.query.slice(0, MAX_QUERY_LENGTH);
    const variants = buildFtsQueryVariants(query);

    let rows = runFtsSearch(db, variants.primary, input.category, limit);

    if (rows.length === 0 && variants.fallback) {
      rows = runFtsSearch(db, variants.fallback, input.category, limit);
    }

    if (rows.length === 0) {
      rows = runLikeFallback(db, query.trim(), input.category, limit);
    }

    return { results: rows.map(formatRow), ...responseMeta(db) };
  }

  // Category-only filter (or list all)
  let sql = 'SELECT * FROM sla_metrics';
  const params: Array<string | number> = [];

  if (input.category) {
    sql += ' WHERE category = ?';
    params.push(input.category.trim());
  }

  sql += ' ORDER BY category, metric_id LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as SlaMetricRow[];
  return { results: rows.map(formatRow), ...responseMeta(db) };
}

function runFtsSearch(
  db: Database,
  ftsQuery: string,
  category: string | undefined,
  limit: number,
): SlaMetricRow[] {
  let sql = `
    SELECT sm.*
    FROM sla_metrics_fts
    JOIN sla_metrics sm ON sm.metric_id = sla_metrics_fts.metric_id
    WHERE sla_metrics_fts MATCH ?
  `;

  const params: Array<string | number> = [ftsQuery];

  if (category) {
    sql += ' AND sm.category = ?';
    params.push(category.trim());
  }

  sql += ' ORDER BY bm25(sla_metrics_fts) LIMIT ?';
  params.push(limit);

  try {
    return db.prepare(sql).all(...params) as SlaMetricRow[];
  } catch {
    return [];
  }
}

function runLikeFallback(
  db: Database,
  rawQuery: string,
  category: string | undefined,
  limit: number,
): SlaMetricRow[] {
  let sql = `
    SELECT * FROM sla_metrics
    WHERE (
      metric_id LIKE ? OR
      name LIKE ? OR
      description LIKE ? OR
      measurement_guidance LIKE ? OR
      tags LIKE ?
    )
  `;

  const like = `%${rawQuery}%`;
  const params: Array<string | number> = [like, like, like, like, like];

  if (category) {
    sql += ' AND category = ?';
    params.push(category.trim());
  }

  sql += ' ORDER BY metric_id LIMIT ?';
  params.push(limit);

  return db.prepare(sql).all(...params) as SlaMetricRow[];
}

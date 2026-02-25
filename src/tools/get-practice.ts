import type { Database } from '@ansvar/mcp-sqlite';

import { responseMeta } from '../utils/response-meta.js';

export interface GetPracticeInput {
  item_id: string;
}

interface ItemRow {
  id: number;
  framework_id: string;
  item_id: string;
  title: string;
  domain: string;
  category: string;
  description: string;
  purpose: string;
  inputs: string;
  outputs: string;
  kpis: string;
  raci: string;
  maturity_levels: string;
  related_items: string;
  external_mappings: string;
  tags: string;
  source_standard: string;
  source_clause: string;
  last_reviewed: string;
}

interface MappingRow {
  id: number;
  source_item_id: string;
  target_item_id: string;
  target_external_mcp: string;
  target_external_id: string;
  relationship: string;
  confidence: number;
  notes: string;
}

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

export async function getPractice(
  db: Database,
  input: GetPracticeInput,
): Promise<Record<string, unknown>> {
  if (!input.item_id || input.item_id.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: item_id is required.' }],
      isError: true,
      ...responseMeta(db),
    };
  }

  const row = db.prepare('SELECT * FROM items WHERE item_id = ?').get(input.item_id.trim()) as ItemRow | undefined;

  if (!row) {
    return {
      content: [{ type: 'text', text: `Error: Item "${input.item_id}" not found.` }],
      isError: true,
      ...responseMeta(db),
    };
  }

  const mappings = db.prepare(
    'SELECT * FROM mappings WHERE source_item_id = ?',
  ).all(row.item_id) as MappingRow[];

  return {
    item_id: row.item_id,
    title: row.title,
    framework_id: row.framework_id,
    domain: row.domain,
    category: row.category,
    description: row.description,
    purpose: row.purpose,
    inputs: safeJsonParse(row.inputs, []),
    outputs: safeJsonParse(row.outputs, []),
    kpis: safeJsonParse(row.kpis, []),
    raci: safeJsonParse(row.raci, {}),
    maturity_levels: safeJsonParse(row.maturity_levels, {}),
    related_items: safeJsonParse(row.related_items, []),
    external_mappings: safeJsonParse(row.external_mappings, []),
    tags: safeJsonParse(row.tags, []),
    source_standard: row.source_standard,
    source_clause: row.source_clause,
    last_reviewed: row.last_reviewed,
    mappings: mappings.map((m) => ({
      target_item_id: m.target_item_id || undefined,
      target_external_mcp: m.target_external_mcp || undefined,
      target_external_id: m.target_external_id || undefined,
      relationship: m.relationship,
      confidence: m.confidence,
      notes: m.notes,
    })),
    ...responseMeta(db),
  };
}

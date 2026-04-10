import type { Database } from '@ansvar/mcp-sqlite';

import { responseMeta } from '../utils/response-meta.js';

export interface GetProcessDesignInput {
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
}

interface MappingRow {
  source_item_id: string;
  target_item_id: string;
  target_external_mcp: string;
  target_external_id: string;
  relationship: string;
  confidence: number;
  notes: string;
}

interface RelatedItemInfo {
  item_id: string;
  title: string;
  framework_id: string;
  domain: string;
  category: string;
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

export async function getProcessDesign(
  db: Database,
  input: GetProcessDesignInput,
): Promise<Record<string, unknown>> {
  if (!input.item_id || input.item_id.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: item_id is required.' }],
      isError: true,
      _error_type: 'validation_error',
      ...responseMeta(db),
    };
  }

  const row = db.prepare('SELECT * FROM items WHERE item_id = ?').get(input.item_id.trim()) as ItemRow | undefined;

  if (!row) {
    return {
      content: [{ type: 'text', text: `Error: Item "${input.item_id}" not found.` }],
      isError: true,
      _error_type: 'not_found',
      ...responseMeta(db),
    };
  }

  // Parse JSON fields
  const inputs = safeJsonParse(row.inputs, []) as string[];
  const outputs = safeJsonParse(row.outputs, []) as string[];
  const kpis = safeJsonParse(row.kpis, []) as string[];
  const raci = safeJsonParse(row.raci, {}) as Record<string, unknown>;
  const maturityLevels = safeJsonParse(row.maturity_levels, {}) as Record<string, unknown>;
  const relatedItemIds = safeJsonParse(row.related_items, []) as string[];

  // Resolve related items
  const relatedItems: RelatedItemInfo[] = [];
  if (relatedItemIds.length > 0) {
    const placeholders = relatedItemIds.map(() => '?').join(',');
    const related = db.prepare(
      `SELECT item_id, title, framework_id, domain, category FROM items WHERE item_id IN (${placeholders})`,
    ).all(...relatedItemIds) as RelatedItemInfo[];
    relatedItems.push(...related);
  }

  // Get mappings
  const mappings = db.prepare(
    'SELECT * FROM mappings WHERE source_item_id = ?',
  ).all(row.item_id) as MappingRow[];

  const internalMappings = mappings
    .filter((m) => m.target_item_id !== '')
    .map((m) => ({
      target_item_id: m.target_item_id,
      relationship: m.relationship,
      confidence: m.confidence,
      notes: m.notes,
    }));

  const externalMappings = mappings
    .filter((m) => m.target_external_mcp !== '')
    .map((m) => ({
      target_mcp: m.target_external_mcp,
      target_id: m.target_external_id,
      relationship: m.relationship,
      confidence: m.confidence,
      notes: m.notes,
    }));

  return {
    process: {
      item_id: row.item_id,
      title: row.title,
      framework_id: row.framework_id,
      domain: row.domain,
      category: row.category,
      purpose: row.purpose,
      description: row.description,
    },
    design: {
      inputs,
      outputs,
      kpis,
      raci,
      maturity_levels: maturityLevels,
    },
    relationships: {
      related_items: relatedItems,
      internal_mappings: internalMappings,
      external_mappings: externalMappings,
    },
    source: {
      standard: row.source_standard || undefined,
      clause: row.source_clause || undefined,
    },
    _citation: {
      canonical_ref: row.item_id,
      display_text: `${row.title} (${row.framework_id})`,
      lookup: { tool: 'get_practice', args: { item_id: row.item_id } },
    },
    ...responseMeta(db),
  };
}

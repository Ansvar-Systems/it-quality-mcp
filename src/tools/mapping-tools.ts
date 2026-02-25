import type { Database } from '@ansvar/mcp-sqlite';

import { responseMeta } from '../utils/response-meta.js';

/* ------------------------------------------------------------------ */
/*  Tool 8: map_controls                                              */
/* ------------------------------------------------------------------ */

export interface MapControlsInput {
  source_item_id?: string;
  source_framework?: string;
  target_framework: string;
  relationship?: string;
}

interface MappingWithContext {
  source_item_id: string;
  source_title: string;
  source_framework_id: string;
  target_item_id: string;
  target_title: string;
  target_framework_id: string;
  relationship: string;
  confidence: number;
  notes: string;
}

export async function mapControls(
  db: Database,
  input: MapControlsInput,
): Promise<Record<string, unknown>> {
  if (!input.target_framework || input.target_framework.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: target_framework is required.' }],
      isError: true,
      ...responseMeta(db),
    };
  }

  let sql = `
    SELECT
      m.source_item_id,
      si.title AS source_title,
      si.framework_id AS source_framework_id,
      m.target_item_id,
      ti.title AS target_title,
      ti.framework_id AS target_framework_id,
      m.relationship,
      m.confidence,
      m.notes
    FROM mappings m
    JOIN items si ON si.item_id = m.source_item_id
    JOIN items ti ON ti.item_id = m.target_item_id
    WHERE ti.framework_id = ?
      AND m.target_item_id != ''
  `;

  const params: Array<string | number> = [input.target_framework.trim()];

  if (input.source_item_id) {
    sql += ' AND m.source_item_id = ?';
    params.push(input.source_item_id.trim());
  }

  if (input.source_framework) {
    sql += ' AND si.framework_id = ?';
    params.push(input.source_framework.trim());
  }

  if (input.relationship) {
    sql += ' AND m.relationship = ?';
    params.push(input.relationship.trim());
  }

  sql += ' ORDER BY m.source_item_id, m.target_item_id';

  const rows = db.prepare(sql).all(...params) as MappingWithContext[];

  return {
    target_framework: input.target_framework,
    total_mappings: rows.length,
    mappings: rows,
    ...responseMeta(db),
  };
}

/* ------------------------------------------------------------------ */
/*  Tool 9: map_to_security                                           */
/* ------------------------------------------------------------------ */

export interface MapToSecurityInput {
  item_id?: string;
  domain?: string;
  target_framework?: string;
}

interface ExternalMappingRow {
  source_item_id: string;
  source_title: string;
  source_framework_id: string;
  source_domain: string;
  target_external_mcp: string;
  target_external_id: string;
  relationship: string;
  confidence: number;
  notes: string;
}

export async function mapToSecurity(
  db: Database,
  input: MapToSecurityInput,
): Promise<Record<string, unknown>> {
  let sql = `
    SELECT
      m.source_item_id,
      i.title AS source_title,
      i.framework_id AS source_framework_id,
      i.domain AS source_domain,
      m.target_external_mcp,
      m.target_external_id,
      m.relationship,
      m.confidence,
      m.notes
    FROM mappings m
    JOIN items i ON i.item_id = m.source_item_id
    WHERE m.target_external_mcp != ''
  `;

  const params: Array<string | number> = [];

  if (input.item_id) {
    sql += ' AND m.source_item_id = ?';
    params.push(input.item_id.trim());
  }

  if (input.domain) {
    sql += ' AND i.domain = ?';
    params.push(input.domain.trim());
  }

  if (input.target_framework) {
    // Match against external IDs that start with the framework prefix (e.g., "ISO27001", "NIST80053")
    sql += ' AND m.target_external_id LIKE ?';
    params.push(`${input.target_framework.trim()}%`);
  }

  sql += ' ORDER BY m.source_item_id, m.target_external_id';

  const rows = db.prepare(sql).all(...params) as ExternalMappingRow[];

  return {
    total_mappings: rows.length,
    mappings: rows,
    ...responseMeta(db),
  };
}

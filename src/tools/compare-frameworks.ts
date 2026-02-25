import type { Database } from '@ansvar/mcp-sqlite';

import { responseMeta } from '../utils/response-meta.js';

export interface CompareFrameworksInput {
  framework_a: string;
  framework_b: string;
  domain?: string;
}

interface ItemRow {
  item_id: string;
  title: string;
  framework_id: string;
  domain: string;
  category: string;
}

interface FrameworkInfo {
  id: string;
  name: string;
  domain: string;
  item_count: number;
}

export async function compareFrameworks(
  db: Database,
  input: CompareFrameworksInput,
): Promise<Record<string, unknown>> {
  if (!input.framework_a || !input.framework_b) {
    return {
      content: [{ type: 'text', text: 'Error: Both framework_a and framework_b are required.' }],
      isError: true,
      ...responseMeta(db),
    };
  }

  const fA = input.framework_a.trim();
  const fB = input.framework_b.trim();

  // Get framework info
  const infoA = db.prepare('SELECT id, name, domain, item_count FROM frameworks WHERE id = ?').get(fA) as FrameworkInfo | undefined;
  const infoB = db.prepare('SELECT id, name, domain, item_count FROM frameworks WHERE id = ?').get(fB) as FrameworkInfo | undefined;

  if (!infoA) {
    return {
      content: [{ type: 'text', text: `Error: Framework "${fA}" not found.` }],
      isError: true,
      ...responseMeta(db),
    };
  }

  if (!infoB) {
    return {
      content: [{ type: 'text', text: `Error: Framework "${fB}" not found.` }],
      isError: true,
      ...responseMeta(db),
    };
  }

  // Get items for both frameworks
  let sql = 'SELECT item_id, title, framework_id, domain, category FROM items WHERE framework_id IN (?, ?)';
  const params: Array<string | number> = [fA, fB];

  if (input.domain) {
    sql += ' AND domain = ?';
    params.push(input.domain.trim());
  }

  sql += ' ORDER BY framework_id, category, item_id';
  const allItems = db.prepare(sql).all(...params) as ItemRow[];

  const itemsA = allItems.filter((i) => i.framework_id === fA);
  const itemsB = allItems.filter((i) => i.framework_id === fB);

  // Group by domain > category
  const categoriesA = new Set(itemsA.map((i) => i.category));
  const categoriesB = new Set(itemsB.map((i) => i.category));
  const allCategories = [...new Set([...categoriesA, ...categoriesB])].sort();

  // Get cross-mappings between the two frameworks
  const crossMappings = db.prepare(`
    SELECT m.source_item_id, m.target_item_id, m.relationship, m.confidence
    FROM mappings m
    JOIN items si ON si.item_id = m.source_item_id
    JOIN items ti ON ti.item_id = m.target_item_id
    WHERE (si.framework_id = ? AND ti.framework_id = ?)
       OR (si.framework_id = ? AND ti.framework_id = ?)
  `).all(fA, fB, fB, fA) as Array<{
    source_item_id: string;
    target_item_id: string;
    relationship: string;
    confidence: number;
  }>;

  const comparison = allCategories.map((cat) => ({
    category: cat,
    [fA]: itemsA
      .filter((i) => i.category === cat)
      .map((i) => ({ item_id: i.item_id, title: i.title })),
    [fB]: itemsB
      .filter((i) => i.category === cat)
      .map((i) => ({ item_id: i.item_id, title: i.title })),
  }));

  return {
    framework_a: { id: infoA.id, name: infoA.name, domain: infoA.domain, item_count: itemsA.length },
    framework_b: { id: infoB.id, name: infoB.name, domain: infoB.domain, item_count: itemsB.length },
    domain_filter: input.domain ?? null,
    categories: comparison,
    cross_mappings: crossMappings,
    ...responseMeta(db),
  };
}

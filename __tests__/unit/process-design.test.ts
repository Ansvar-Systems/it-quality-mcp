import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getProcessDesign } from '../../src/tools/get-process-design.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
});

afterAll(() => {
  db.close();
});

describe('get_process_design', () => {
  it('returns structured process design for a known item', async () => {
    const result = await getProcessDesign(db as any, { item_id: 'ITIL4-IM' });
    expect(result.isError).toBeUndefined();
    expect(result.process).toBeDefined();
    expect(result.design).toBeDefined();
    expect(result.relationships).toBeDefined();
  });

  it('process section has required fields', async () => {
    const result = await getProcessDesign(db as any, { item_id: 'ITIL4-IM' });
    const process = result.process as any;
    expect(process.item_id).toBe('ITIL4-IM');
    expect(process.title).toBeDefined();
    expect(process.framework_id).toBe('itil4');
    expect(process.domain).toBeDefined();
    expect(process.purpose).toBeDefined();
    expect(process.description).toBeDefined();
  });

  it('design section has structured data', async () => {
    const result = await getProcessDesign(db as any, { item_id: 'ITIL4-IM' });
    const design = result.design as any;
    expect(design).toHaveProperty('inputs');
    expect(design).toHaveProperty('outputs');
    expect(design).toHaveProperty('kpis');
    expect(design).toHaveProperty('raci');
    expect(design).toHaveProperty('maturity_levels');
  });

  it('relationships section has mapping arrays', async () => {
    const result = await getProcessDesign(db as any, { item_id: 'COBIT-APO13' });
    const relationships = result.relationships as any;
    expect(relationships).toHaveProperty('related_items');
    expect(relationships).toHaveProperty('internal_mappings');
    expect(relationships).toHaveProperty('external_mappings');
    expect(Array.isArray(relationships.related_items)).toBe(true);
    expect(Array.isArray(relationships.internal_mappings)).toBe(true);
    expect(Array.isArray(relationships.external_mappings)).toBe(true);
  });

  it('returns isError for unknown item', async () => {
    const result = await getProcessDesign(db as any, { item_id: 'NONEXISTENT-999' });
    expect(result.isError).toBe(true);
  });

  it('returns isError for empty item_id', async () => {
    const result = await getProcessDesign(db as any, { item_id: '' });
    expect(result.isError).toBe(true);
  });

  it('includes _meta', async () => {
    const result = await getProcessDesign(db as any, { item_id: 'ITIL4-IM' });
    expect(result._meta).toBeDefined();
  });

  it('includes source section', async () => {
    const result = await getProcessDesign(db as any, { item_id: 'ITIL4-IM' });
    expect(result.source).toBeDefined();
  });
});

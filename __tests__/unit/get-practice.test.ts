import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getPractice } from '../../src/tools/get-practice.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
});

afterAll(() => {
  db.close();
});

describe('get_practice', () => {
  it('returns a known item with full details', async () => {
    const result = await getPractice(db as any, { item_id: 'ITIL4-IM' });
    expect(result.isError).toBeUndefined();
    expect(result.item_id).toBe('ITIL4-IM');
    expect(result.title).toBeDefined();
    expect(result.framework_id).toBe('itil4');
    expect(result.domain).toBeDefined();
    expect(result.category).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.purpose).toBeDefined();
  });

  it('parses JSON fields correctly', async () => {
    const result = await getPractice(db as any, { item_id: 'ITIL4-IM' });
    // kpis should be parsed as array
    expect(Array.isArray(result.kpis)).toBe(true);
    // tags should be parsed as array
    expect(Array.isArray(result.tags)).toBe(true);
    // mappings should be an array
    expect(Array.isArray(result.mappings)).toBe(true);
  });

  it('returns isError for unknown item', async () => {
    const result = await getPractice(db as any, { item_id: 'NONEXISTENT-999' });
    expect(result.isError).toBe(true);
    const content = result.content as any[];
    expect(content[0].text).toContain('not found');
  });

  it('returns isError for empty item_id', async () => {
    const result = await getPractice(db as any, { item_id: '' });
    expect(result.isError).toBe(true);
  });

  it('includes _meta in response', async () => {
    const result = await getPractice(db as any, { item_id: 'ITIL4-IM' });
    expect(result._meta).toBeDefined();
  });

  it('includes mappings array', async () => {
    // COBIT items often have mappings
    const result = await getPractice(db as any, { item_id: 'COBIT-APO13' });
    expect(result.isError).toBeUndefined();
    expect(Array.isArray(result.mappings)).toBe(true);
  });

  it('handles item with empty JSON fields', async () => {
    // CMMI items tend to have empty inputs/outputs
    const result = await getPractice(db as any, { item_id: 'CMMI-REQD' });
    expect(result.isError).toBeUndefined();
    expect(result.inputs).toEqual([]);
    expect(result.outputs).toEqual([]);
  });
});

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { searchPractices } from '../../src/tools/search-practices.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
});

afterAll(() => {
  db.close();
});

describe('search_practices', () => {
  it('returns results for a known query', async () => {
    const result = await searchPractices(db as any, { query: 'incident management' });
    expect(result.results).toBeDefined();
    const results = result.results as any[];
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('item_id');
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('framework_id');
    expect(results[0]).toHaveProperty('domain');
    expect(results[0]).toHaveProperty('snippet');
  });

  it('filters by domain', async () => {
    const result = await searchPractices(db as any, { query: 'service', domain: 'itsm' });
    const results = result.results as any[];
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.domain).toBe('itsm');
    }
  });

  it('filters by framework', async () => {
    const result = await searchPractices(db as any, { query: 'management', framework: 'itil4' });
    const results = result.results as any[];
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.framework_id).toBe('itil4');
    }
  });

  it('returns empty results for empty query', async () => {
    const result = await searchPractices(db as any, { query: '' });
    const results = result.results as any[];
    expect(results).toEqual([]);
  });

  it('returns empty results for whitespace-only query', async () => {
    const result = await searchPractices(db as any, { query: '   ' });
    const results = result.results as any[];
    expect(results).toEqual([]);
  });

  it('respects limit parameter', async () => {
    const result = await searchPractices(db as any, { query: 'management', limit: 3 });
    const results = result.results as any[];
    expect(results.length).toBeLessThanOrEqual(3);
    expect(results.length).toBeGreaterThan(0);
  });

  it('clamps limit to maximum', async () => {
    const result = await searchPractices(db as any, { query: 'service', limit: 999 });
    const results = result.results as any[];
    // Should not exceed MAX_LIMIT (100)
    expect(results.length).toBeLessThanOrEqual(100);
  });

  it('truncates descriptions to 300 characters', async () => {
    const result = await searchPractices(db as any, { query: 'management', limit: 50 });
    const results = result.results as any[];
    for (const r of results) {
      // 300 + '...' = 303 max
      expect(r.description.length).toBeLessThanOrEqual(303);
    }
  });

  it('includes _meta in response', async () => {
    const result = await searchPractices(db as any, { query: 'risk' });
    expect(result._meta).toBeDefined();
    expect((result._meta as any).disclaimer).toBeDefined();
    expect((result._meta as any).data_age).toBeDefined();
  });

  it('handles FTS5 syntax in query', async () => {
    const result = await searchPractices(db as any, { query: '"change control"' });
    // Should not throw, even if 0 results
    expect(result.results).toBeDefined();
  });
});

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { listFrameworks } from '../../src/tools/list-frameworks.js';
import { getFramework } from '../../src/tools/get-framework.js';
import { searchByDomain } from '../../src/tools/search-by-domain.js';
import { compareFrameworks } from '../../src/tools/compare-frameworks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
});

afterAll(() => {
  db.close();
});

describe('list_frameworks', () => {
  it('returns all 12 frameworks', async () => {
    const result = await listFrameworks(db as any);
    const frameworks = result.frameworks as any[];
    expect(frameworks.length).toBe(12);
  });

  it('each framework has required fields', async () => {
    const result = await listFrameworks(db as any);
    const frameworks = result.frameworks as any[];
    for (const f of frameworks) {
      expect(f.id).toBeDefined();
      expect(f.name).toBeDefined();
      expect(f.version).toBeDefined();
      expect(f.authority).toBeDefined();
      expect(f.domain).toBeDefined();
      expect(f.item_count).toBeGreaterThan(0);
    }
  });

  it('includes _meta', async () => {
    const result = await listFrameworks(db as any);
    expect(result._meta).toBeDefined();
  });
});

describe('get_framework', () => {
  it('returns framework details', async () => {
    const result = await getFramework(db as any, { framework_id: 'itil4' });
    expect(result.isError).toBeUndefined();
    expect(result.id).toBe('itil4');
    expect(result.name).toContain('ITIL');
    expect(result.domain).toBe('itsm');
  });

  it('returns items when include_items is true', async () => {
    const result = await getFramework(db as any, { framework_id: 'itil4', include_items: true });
    expect(result.items).toBeDefined();
    const items = result.items as any[];
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('item_id');
    expect(items[0]).toHaveProperty('title');
  });

  it('does not return items when include_items is false', async () => {
    const result = await getFramework(db as any, { framework_id: 'itil4', include_items: false });
    expect(result.items).toBeUndefined();
  });

  it('returns isError for unknown framework', async () => {
    const result = await getFramework(db as any, { framework_id: 'nonexistent' });
    expect(result.isError).toBe(true);
  });

  it('returns isError for empty framework_id', async () => {
    const result = await getFramework(db as any, { framework_id: '' });
    expect(result.isError).toBe(true);
  });
});

describe('search_by_domain', () => {
  it('returns items for a known domain', async () => {
    const result = await searchByDomain(db as any, { domain: 'itsm' });
    const results = result.results as any[];
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.domain).toBe('itsm');
    }
  });

  it('filters by category', async () => {
    const result = await searchByDomain(db as any, { domain: 'governance', category: 'APO' });
    const results = result.results as any[];
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.domain).toBe('governance');
      expect(r.category).toBe('APO');
    }
  });

  it('returns empty for invalid domain', async () => {
    const result = await searchByDomain(db as any, { domain: 'nonexistent' as any });
    const results = result.results as any[];
    expect(results).toEqual([]);
  });

  it('respects limit', async () => {
    const result = await searchByDomain(db as any, { domain: 'itsm', limit: 5 });
    const results = result.results as any[];
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('includes _meta', async () => {
    const result = await searchByDomain(db as any, { domain: 'sdlc' });
    expect(result._meta).toBeDefined();
  });
});

describe('compare_frameworks', () => {
  it('compares two frameworks', async () => {
    const result = await compareFrameworks(db as any, {
      framework_a: 'itil4',
      framework_b: 'iso20000',
    });
    expect(result.isError).toBeUndefined();
    expect(result.framework_a).toBeDefined();
    expect(result.framework_b).toBeDefined();
    expect(result.categories).toBeDefined();
    expect(Array.isArray(result.categories)).toBe(true);
  });

  it('includes cross mappings', async () => {
    const result = await compareFrameworks(db as any, {
      framework_a: 'cobit2019',
      framework_b: 'itil4',
    });
    expect(result.cross_mappings).toBeDefined();
    expect(Array.isArray(result.cross_mappings)).toBe(true);
  });

  it('filters by domain', async () => {
    const result = await compareFrameworks(db as any, {
      framework_a: 'itil4',
      framework_b: 'fitsm',
      domain: 'itsm',
    });
    expect(result.domain_filter).toBe('itsm');
  });

  it('returns isError for unknown framework', async () => {
    const result = await compareFrameworks(db as any, {
      framework_a: 'itil4',
      framework_b: 'nonexistent',
    });
    expect(result.isError).toBe(true);
  });

  it('returns isError when missing parameters', async () => {
    const result = await compareFrameworks(db as any, {
      framework_a: '',
      framework_b: 'itil4',
    });
    expect(result.isError).toBe(true);
  });
});

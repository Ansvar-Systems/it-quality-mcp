import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getSlaTemplates } from '../../src/tools/sla-tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
});

afterAll(() => {
  db.close();
});

describe('get_sla_templates', () => {
  it('returns SLA metrics by category', async () => {
    const result = await getSlaTemplates(db as any, { category: 'availability' });
    const results = result.results as any[];
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.category).toBe('availability');
    }
  });

  it('returns SLA metrics by query', async () => {
    const result = await getSlaTemplates(db as any, { query: 'response time' });
    const results = result.results as any[];
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('metric_id');
    expect(results[0]).toHaveProperty('name');
    expect(results[0]).toHaveProperty('formula');
  });

  it('parses typical_targets as object', async () => {
    const result = await getSlaTemplates(db as any, { category: 'availability', limit: 1 });
    const results = result.results as any[];
    expect(results.length).toBeGreaterThan(0);
    expect(typeof results[0].typical_targets).toBe('object');
    expect(results[0].typical_targets).not.toBeNull();
  });

  it('parses tags as array', async () => {
    const result = await getSlaTemplates(db as any, { category: 'incident', limit: 1 });
    const results = result.results as any[];
    expect(results.length).toBeGreaterThan(0);
    expect(Array.isArray(results[0].tags)).toBe(true);
  });

  it('returns all metrics when no filter', async () => {
    const result = await getSlaTemplates(db as any, { limit: 100 });
    const results = result.results as any[];
    expect(results.length).toBe(52);
  });

  it('respects limit', async () => {
    const result = await getSlaTemplates(db as any, { limit: 3 });
    const results = result.results as any[];
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('combines category and query filters', async () => {
    const result = await getSlaTemplates(db as any, { category: 'incident', query: 'resolution' });
    const results = result.results as any[];
    for (const r of results) {
      expect(r.category).toBe('incident');
    }
  });

  it('includes _meta', async () => {
    const result = await getSlaTemplates(db as any, { category: 'performance' });
    expect(result._meta).toBeDefined();
  });

  it('each metric has required fields', async () => {
    const result = await getSlaTemplates(db as any, { limit: 5 });
    const results = result.results as any[];
    for (const r of results) {
      expect(r.metric_id).toBeDefined();
      expect(r.name).toBeDefined();
      expect(r.category).toBeDefined();
      expect(r.description).toBeDefined();
      expect(r.formula).toBeDefined();
      expect(r.unit).toBeDefined();
      expect(r.measurement_guidance).toBeDefined();
    }
  });
});

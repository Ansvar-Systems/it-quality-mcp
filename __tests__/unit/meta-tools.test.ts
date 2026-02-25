import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { about, listSources, checkDataFreshness } from '../../src/tools/meta-tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
});

afterAll(() => {
  db.close();
});

describe('about', () => {
  it('returns server metadata', async () => {
    const result = await about(db as any);
    expect(result.server).toBe('it-quality-mcp');
    expect(result.version).toBe('1.0.0');
    expect(result.datasets).toBeDefined();
    expect(result.dataset_license).toBe('Apache-2.0');
    expect(result.repository).toBeDefined();
  });

  it('includes correct dataset counts', async () => {
    const result = await about(db as any);
    const datasets = result.datasets as any;
    expect(datasets.items).toBe(368);
    expect(datasets.frameworks).toBe(12);
    expect(datasets.mappings).toBe(111);
    expect(datasets.sla_metrics).toBe(52);
    expect(datasets.maturity_definitions).toBe(17);
  });

  it('includes database_built timestamp', async () => {
    const result = await about(db as any);
    expect(result.database_built).toBeDefined();
    expect(result.database_built).not.toBe('unknown');
  });

  it('includes network info (none)', async () => {
    const result = await about(db as any);
    expect(result.network).toContain('none');
  });

  it('includes _meta', async () => {
    const result = await about(db as any);
    expect(result._meta).toBeDefined();
  });
});

describe('list_sources', () => {
  it('returns all 12 sources', async () => {
    const result = await listSources(db as any);
    const sources = result.sources as any[];
    expect(sources.length).toBe(12);
  });

  it('each source has required fields', async () => {
    const result = await listSources(db as any);
    const sources = result.sources as any[];
    for (const s of sources) {
      expect(s.framework_id).toBeDefined();
      expect(s.name).toBeDefined();
      expect(s.version).toBeDefined();
      expect(s.authority).toBeDefined();
      expect(s.domain).toBeDefined();
      expect(s.url).toBeDefined();
      expect(s.license_note).toBeDefined();
      expect(s.item_count).toBeGreaterThan(0);
      expect(s.last_reviewed).toBeDefined();
    }
  });

  it('includes dataset_license', async () => {
    const result = await listSources(db as any);
    expect(result.dataset_license).toBe('Apache-2.0');
  });

  it('includes _meta', async () => {
    const result = await listSources(db as any);
    expect(result._meta).toBeDefined();
  });
});

describe('check_data_freshness', () => {
  it('returns freshness report', async () => {
    const result = await checkDataFreshness(db as any);
    expect(result.database_built).toBeDefined();
    expect(result.max_age_days).toBe(180);
    expect(result.summary).toBeDefined();
    expect(result.frameworks).toBeDefined();
  });

  it('summary has correct counts', async () => {
    const result = await checkDataFreshness(db as any);
    const summary = result.summary as any;
    expect(summary.total).toBe(12);
    expect(summary.current + summary.due + summary.overdue).toBe(12);
  });

  it('each framework has freshness status', async () => {
    const result = await checkDataFreshness(db as any);
    const frameworks = result.frameworks as any[];
    for (const f of frameworks) {
      expect(f.framework_id).toBeDefined();
      expect(f.name).toBeDefined();
      expect(f.last_reviewed).toBeDefined();
      expect(f.days_since_review).toBeGreaterThanOrEqual(0);
      expect(f.max_age_days).toBe(180);
      expect(['Current', 'Due', 'OVERDUE']).toContain(f.status);
    }
  });

  it('recently built database shows Current status', async () => {
    const result = await checkDataFreshness(db as any);
    const frameworks = result.frameworks as any[];
    // Database was built recently, so all should be Current
    const current = frameworks.filter((f: any) => f.status === 'Current');
    expect(current.length).toBe(12);
  });

  it('includes _meta', async () => {
    const result = await checkDataFreshness(db as any);
    expect(result._meta).toBeDefined();
  });
});

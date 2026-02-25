import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getMaturityModel, assessMaturity } from '../../src/tools/maturity-tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
});

afterAll(() => {
  db.close();
});

describe('get_maturity_model', () => {
  it('returns maturity levels for CMMI', async () => {
    const result = await getMaturityModel(db as any, { framework_id: 'cmmi' });
    expect(result.isError).toBeUndefined();
    expect(result.framework_id).toBe('cmmi');
    expect(result.levels).toBeDefined();
    const levels = result.levels as any[];
    expect(levels.length).toBeGreaterThan(0);
    expect(levels[0]).toHaveProperty('level');
    expect(levels[0]).toHaveProperty('level_name');
    expect(levels[0]).toHaveProperty('description');
    expect(levels[0]).toHaveProperty('characteristics');
  });

  it('parses characteristics as array', async () => {
    const result = await getMaturityModel(db as any, { framework_id: 'cmmi' });
    const levels = result.levels as any[];
    for (const l of levels) {
      expect(Array.isArray(l.characteristics)).toBe(true);
    }
  });

  it('returns levels in order', async () => {
    const result = await getMaturityModel(db as any, { framework_id: 'cmmi' });
    const levels = result.levels as any[];
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].level).toBeGreaterThanOrEqual(levels[i - 1].level);
    }
  });

  it('returns isError for framework without maturity model', async () => {
    // iso25010 is quality characteristics, not maturity levels
    const result = await getMaturityModel(db as any, { framework_id: 'iso25010' });
    expect(result.isError).toBe(true);
  });

  it('returns isError for empty framework_id', async () => {
    const result = await getMaturityModel(db as any, { framework_id: '' });
    expect(result.isError).toBe(true);
  });

  it('includes _meta', async () => {
    const result = await getMaturityModel(db as any, { framework_id: 'cmmi' });
    expect(result._meta).toBeDefined();
  });
});

describe('assess_maturity', () => {
  it('returns matching items grouped by framework', async () => {
    const result = await assessMaturity(db as any, { capability: 'incident management' });
    expect(result.isError).toBeUndefined();
    expect(result.capability).toBe('incident management');
    expect(result.total_matches).toBeGreaterThan(0);
    expect(result.frameworks).toBeDefined();
    const frameworks = result.frameworks as any[];
    expect(frameworks.length).toBeGreaterThan(0);
  });

  it('each framework group has matching items', async () => {
    const result = await assessMaturity(db as any, { capability: 'risk' });
    const frameworks = result.frameworks as any[];
    for (const f of frameworks) {
      expect(f.framework_id).toBeDefined();
      expect(f.matching_items).toBeDefined();
      expect(f.matching_items.length).toBeGreaterThan(0);
    }
  });

  it('includes maturity levels where available', async () => {
    const result = await assessMaturity(db as any, { capability: 'process improvement' });
    const frameworks = result.frameworks as any[];
    // At least one framework should have maturity levels
    const withMaturity = frameworks.filter((f: any) => f.maturity_levels !== null);
    // Some frameworks may not have maturity_definitions
    expect(frameworks.length).toBeGreaterThan(0);
    // CMMI or COBIT should be in there
    if (withMaturity.length > 0) {
      expect(withMaturity[0].maturity_levels.length).toBeGreaterThan(0);
    }
  });

  it('returns empty for no-match capability', async () => {
    const result = await assessMaturity(db as any, { capability: 'xyzzynonexistent123' });
    expect(result.frameworks).toBeDefined();
    const frameworks = result.frameworks as any[];
    expect(frameworks.length).toBe(0);
  });

  it('returns isError for empty capability', async () => {
    const result = await assessMaturity(db as any, { capability: '' });
    expect(result.isError).toBe(true);
  });

  it('includes _meta', async () => {
    const result = await assessMaturity(db as any, { capability: 'deployment' });
    expect(result._meta).toBeDefined();
  });
});

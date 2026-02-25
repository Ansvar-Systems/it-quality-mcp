import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { mapControls, mapToSecurity } from '../../src/tools/mapping-tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
});

afterAll(() => {
  db.close();
});

describe('map_controls', () => {
  it('returns internal mappings to a target framework', async () => {
    const result = await mapControls(db as any, { target_framework: 'itil4' });
    expect(result.isError).toBeUndefined();
    expect(result.target_framework).toBe('itil4');
    expect(result.total_mappings).toBeDefined();
    const mappings = result.mappings as any[];
    expect(Array.isArray(mappings)).toBe(true);
  });

  it('mappings have required fields', async () => {
    const result = await mapControls(db as any, { target_framework: 'itil4' });
    const mappings = result.mappings as any[];
    if (mappings.length > 0) {
      expect(mappings[0]).toHaveProperty('source_item_id');
      expect(mappings[0]).toHaveProperty('source_title');
      expect(mappings[0]).toHaveProperty('target_item_id');
      expect(mappings[0]).toHaveProperty('target_title');
      expect(mappings[0]).toHaveProperty('relationship');
      expect(mappings[0]).toHaveProperty('confidence');
    }
  });

  it('filters by source framework', async () => {
    const result = await mapControls(db as any, {
      source_framework: 'cobit2019',
      target_framework: 'itil4',
    });
    const mappings = result.mappings as any[];
    for (const m of mappings) {
      expect(m.source_framework_id).toBe('cobit2019');
      expect(m.target_framework_id).toBe('itil4');
    }
  });

  it('filters by source item', async () => {
    const result = await mapControls(db as any, {
      source_item_id: 'COBIT-EDM03',
      target_framework: 'itil4',
    });
    const mappings = result.mappings as any[];
    for (const m of mappings) {
      expect(m.source_item_id).toBe('COBIT-EDM03');
    }
  });

  it('filters by relationship', async () => {
    const result = await mapControls(db as any, {
      target_framework: 'itil4',
      relationship: 'supports',
    });
    const mappings = result.mappings as any[];
    for (const m of mappings) {
      expect(m.relationship).toBe('supports');
    }
  });

  it('returns isError for missing target_framework', async () => {
    const result = await mapControls(db as any, { target_framework: '' });
    expect(result.isError).toBe(true);
  });

  it('includes _meta', async () => {
    const result = await mapControls(db as any, { target_framework: 'itil4' });
    expect(result._meta).toBeDefined();
  });
});

describe('map_to_security', () => {
  it('returns external security mappings', async () => {
    const result = await mapToSecurity(db as any, {});
    expect(result.isError).toBeUndefined();
    expect(result.total_mappings).toBeDefined();
    const mappings = result.mappings as any[];
    expect(Array.isArray(mappings)).toBe(true);
    expect(mappings.length).toBeGreaterThan(0);
  });

  it('mappings have external MCP references', async () => {
    const result = await mapToSecurity(db as any, {});
    const mappings = result.mappings as any[];
    for (const m of mappings) {
      expect(m.target_external_mcp).toBeDefined();
      expect(m.target_external_mcp.length).toBeGreaterThan(0);
      expect(m.target_external_id).toBeDefined();
    }
  });

  it('filters by item_id', async () => {
    const result = await mapToSecurity(db as any, { item_id: 'COBIT-APO13' });
    const mappings = result.mappings as any[];
    for (const m of mappings) {
      expect(m.source_item_id).toBe('COBIT-APO13');
    }
  });

  it('filters by domain', async () => {
    const result = await mapToSecurity(db as any, { domain: 'governance' });
    const mappings = result.mappings as any[];
    for (const m of mappings) {
      expect(m.source_domain).toBe('governance');
    }
  });

  it('filters by target framework prefix', async () => {
    const result = await mapToSecurity(db as any, { target_framework: 'ISO27001' });
    const mappings = result.mappings as any[];
    for (const m of mappings) {
      expect(m.target_external_id).toMatch(/^ISO27001/);
    }
  });

  it('includes _meta', async () => {
    const result = await mapToSecurity(db as any, {});
    expect(result._meta).toBeDefined();
  });
});

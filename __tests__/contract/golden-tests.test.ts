/**
 * Golden contract tests for IT Quality MCP.
 *
 * Reads fixtures/golden-tests.json, calls each tool function directly,
 * and validates assertions against the result.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from '@ansvar/mcp-sqlite';

import { searchPractices } from '../../src/tools/search-practices.js';
import { getPractice } from '../../src/tools/get-practice.js';
import { listFrameworks } from '../../src/tools/list-frameworks.js';
import { getFramework } from '../../src/tools/get-framework.js';
import { searchByDomain } from '../../src/tools/search-by-domain.js';
import { getMaturityModel, assessMaturity } from '../../src/tools/maturity-tools.js';
import { mapControls, mapToSecurity } from '../../src/tools/mapping-tools.js';
import { compareFrameworks } from '../../src/tools/compare-frameworks.js';
import { getSlaTemplates } from '../../src/tools/sla-tools.js';
import { getProcessDesign } from '../../src/tools/get-process-design.js';
import { about, listSources, checkDataFreshness } from '../../src/tools/meta-tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// ─── Types ───────────────────────────────────────────────────────────

interface GoldenAssertion {
  result_not_empty?: boolean;
  result_empty?: boolean;
  text_contains?: string[];
  min_results?: number;
  is_error?: boolean;
}

interface GoldenTest {
  id: string;
  category: string;
  description: string;
  tool: string;
  input: Record<string, unknown>;
  assertions: GoldenAssertion;
}

interface GoldenFixture {
  version: string;
  mcp_name: string;
  tests: GoldenTest[];
}

// ─── Tool dispatcher ─────────────────────────────────────────────────

type ToolFn = (db: InstanceType<typeof Database>, input: never) => Promise<Record<string, unknown>>;

const TOOL_MAP: Record<string, ToolFn> = {
  search_practices: searchPractices as ToolFn,
  get_practice: getPractice as ToolFn,
  list_frameworks: listFrameworks as unknown as ToolFn,
  get_framework: getFramework as ToolFn,
  search_by_domain: searchByDomain as ToolFn,
  get_maturity_model: getMaturityModel as ToolFn,
  assess_maturity: assessMaturity as ToolFn,
  map_controls: mapControls as ToolFn,
  map_to_security: mapToSecurity as ToolFn,
  compare_frameworks: compareFrameworks as ToolFn,
  get_sla_templates: getSlaTemplates as ToolFn,
  get_process_design: getProcessDesign as ToolFn,
  about: about as unknown as ToolFn,
  list_sources: listSources as unknown as ToolFn,
  check_data_freshness: checkDataFreshness as unknown as ToolFn,
};

// ─── Helpers ─────────────────────────────────────────────────────────

function resultToText(result: Record<string, unknown>): string {
  return JSON.stringify(result);
}

function countResults(result: Record<string, unknown>): number {
  // Check common array field names used across tools
  for (const key of ['results', 'mappings', 'frameworks', 'sources', 'levels']) {
    const val = result[key];
    if (Array.isArray(val)) return val.length;
  }
  // For map_controls, check total_mappings
  if (typeof result.total_mappings === 'number') return result.total_mappings;
  return 0;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('Golden contract tests', () => {
  let db: InstanceType<typeof Database>;
  let fixture: GoldenFixture;

  beforeAll(() => {
    const dbPath = join(ROOT, 'data', 'database.db');
    db = new Database(dbPath, { readonly: true });
    db.pragma('foreign_keys = ON');

    const fixtureRaw = readFileSync(join(ROOT, 'fixtures', 'golden-tests.json'), 'utf-8');
    fixture = JSON.parse(fixtureRaw) as GoldenFixture;
  });

  afterAll(() => {
    db?.close();
  });

  it('loads fixture with expected structure', () => {
    expect(fixture.version).toBe('1.0');
    expect(fixture.tests.length).toBeGreaterThanOrEqual(12);
  });

  // Dynamically generate a test for each golden test entry
  describe('tool invocations', () => {
    // We need to defer test generation until beforeAll has run.
    // Vitest supports this pattern via a factory approach.
    // But since vitest collects tests synchronously, we load the fixture inline.
    const fixtureRaw = readFileSync(join(ROOT, 'fixtures', 'golden-tests.json'), 'utf-8');
    const fixtureData = JSON.parse(fixtureRaw) as GoldenFixture;

    for (const test of fixtureData.tests) {
      it(`[${test.id}] ${test.description}`, async () => {
        const fn = TOOL_MAP[test.tool];
        expect(fn, `Unknown tool: ${test.tool}`).toBeDefined();

        const result = await fn(db, test.input as never);
        const text = resultToText(result);
        const assertions = test.assertions;

        // is_error: the result should contain isError: true
        if (assertions.is_error) {
          expect(result.isError).toBe(true);
          return; // Error tests don't need further checks
        }

        // result_not_empty: the serialized result should have meaningful content
        if (assertions.result_not_empty) {
          expect(text.length).toBeGreaterThan(10);
          expect(result.isError).not.toBe(true);
        }

        // result_empty: results array should be empty
        if (assertions.result_empty) {
          const count = countResults(result);
          expect(count).toBe(0);
        }

        // text_contains: check that each substring appears somewhere in the result
        if (assertions.text_contains) {
          for (const needle of assertions.text_contains) {
            expect(text).toContain(needle);
          }
        }

        // min_results: check the count of results
        if (assertions.min_results !== undefined) {
          const count = countResults(result);
          expect(count).toBeGreaterThanOrEqual(assertions.min_results);
        }
      });
    }
  });
});

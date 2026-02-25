#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const SEED_DIR = path.resolve(DATA_DIR, 'seed');
const DB_PATH = path.resolve(DATA_DIR, 'database.db');

// ── Schema ──────────────────────────────────────────────────────────

const SCHEMA = `
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS items_fts;
DROP TABLE IF EXISTS sla_metrics_fts;
DROP TABLE IF EXISTS mappings;
DROP TABLE IF EXISTS maturity_definitions;
DROP TABLE IF EXISTS sla_metrics;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS frameworks;
DROP TABLE IF EXISTS db_metadata;

-- Frameworks table: one row per framework/standard
CREATE TABLE frameworks (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  version       TEXT NOT NULL,
  authority     TEXT NOT NULL,
  domain        TEXT NOT NULL,
  description   TEXT NOT NULL,
  url           TEXT NOT NULL,
  license_note  TEXT NOT NULL DEFAULT '',
  item_count    INTEGER NOT NULL DEFAULT 0,
  last_reviewed TEXT NOT NULL DEFAULT ''
);

-- Items table: practices, processes, controls, etc.
CREATE TABLE items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  framework_id      TEXT NOT NULL REFERENCES frameworks(id),
  item_id           TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  domain            TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL,
  purpose           TEXT NOT NULL DEFAULT '',
  inputs            TEXT NOT NULL DEFAULT '[]',
  outputs           TEXT NOT NULL DEFAULT '[]',
  kpis              TEXT NOT NULL DEFAULT '[]',
  raci              TEXT NOT NULL DEFAULT '{}',
  maturity_levels   TEXT NOT NULL DEFAULT '{}',
  related_items     TEXT NOT NULL DEFAULT '[]',
  external_mappings TEXT NOT NULL DEFAULT '[]',
  tags              TEXT NOT NULL DEFAULT '[]',
  source_standard   TEXT NOT NULL DEFAULT '',
  source_clause     TEXT NOT NULL DEFAULT '',
  last_reviewed     TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_items_framework ON items(framework_id);
CREATE INDEX idx_items_domain ON items(domain);
CREATE INDEX idx_items_category ON items(category);

CREATE VIRTUAL TABLE items_fts USING fts5(
  item_id UNINDEXED,
  title,
  domain,
  category,
  description,
  purpose,
  tags,
  tokenize = 'unicode61'
);

-- Cross-framework mappings
CREATE TABLE mappings (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  source_item_id      TEXT NOT NULL,
  target_item_id      TEXT NOT NULL DEFAULT '',
  target_external_mcp TEXT NOT NULL DEFAULT '',
  target_external_id  TEXT NOT NULL DEFAULT '',
  relationship        TEXT NOT NULL DEFAULT 'related',
  confidence          REAL NOT NULL DEFAULT 0.8,
  notes               TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_mappings_source ON mappings(source_item_id);
CREATE INDEX idx_mappings_target ON mappings(target_item_id);
CREATE INDEX idx_mappings_external ON mappings(target_external_mcp, target_external_id);

-- SLA metrics
CREATE TABLE sla_metrics (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_id             TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL,
  description           TEXT NOT NULL,
  formula               TEXT NOT NULL DEFAULT '',
  unit                  TEXT NOT NULL DEFAULT '',
  typical_targets       TEXT NOT NULL DEFAULT '{}',
  measurement_guidance  TEXT NOT NULL DEFAULT '',
  related_itil_practice TEXT NOT NULL DEFAULT '',
  tags                  TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_sla_category ON sla_metrics(category);

CREATE VIRTUAL TABLE sla_metrics_fts USING fts5(
  metric_id UNINDEXED,
  name,
  category,
  description,
  measurement_guidance,
  tags,
  tokenize = 'unicode61'
);

-- Maturity model definitions
CREATE TABLE maturity_definitions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  framework_id    TEXT NOT NULL REFERENCES frameworks(id),
  level           INTEGER NOT NULL,
  level_name      TEXT NOT NULL,
  description     TEXT NOT NULL,
  characteristics TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_maturity_framework ON maturity_definitions(framework_id);
CREATE INDEX idx_maturity_level ON maturity_definitions(framework_id, level);

-- Database metadata
CREATE TABLE db_metadata (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

// ── Seed types ──────────────────────────────────────────────────────

interface FrameworkSeed {
  id: string;
  name: string;
  version: string;
  authority: string;
  domain: string;
  description: string;
  url: string;
  license_note?: string;
  last_reviewed?: string;
  items: ItemSeed[];
}

interface ItemSeed {
  item_id: string;
  title: string;
  domain: string;
  category?: string;
  description: string;
  purpose?: string;
  inputs?: string[];
  outputs?: string[];
  kpis?: string[];
  raci?: Record<string, string>;
  maturity_levels?: Record<string, string>;
  related_items?: string[];
  external_mappings?: Array<{ mcp: string; id: string }>;
  tags?: string[];
  source_standard?: string;
  source_clause?: string;
  last_reviewed?: string;
}

interface SlaSeed {
  metric_id: string;
  name: string;
  category: string;
  description: string;
  formula?: string;
  unit?: string;
  typical_targets?: Record<string, string>;
  measurement_guidance?: string;
  related_itil_practice?: string;
  tags?: string[];
}

interface MaturitySeed {
  framework_id: string;
  levels: Array<{
    level: number;
    level_name: string;
    description: string;
    characteristics?: string[];
  }>;
}

interface MappingSeed {
  source_item_id: string;
  target_item_id?: string;
  target_external_mcp?: string;
  target_external_id?: string;
  relationship?: string;
  confidence?: number;
  notes?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function readJsonFile<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    return [] as unknown as T;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function globSeedFiles(prefix: string): string[] {
  if (!fs.existsSync(SEED_DIR)) return [];
  return fs.readdirSync(SEED_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .sort()
    .map(f => path.join(SEED_DIR, f));
}

// ── Main ────────────────────────────────────────────────────────────

function main(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const db = new Database(DB_PATH);

  try {
    // Create schema
    db.exec(SCHEMA);

    // ── Load frameworks + items ─────────────────────────────────
    const frameworkFiles = globSeedFiles('framework-');
    let totalItems = 0;

    const insertFramework = db.prepare(`
      INSERT INTO frameworks (id, name, version, authority, domain, description, url, license_note, item_count, last_reviewed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO items (framework_id, item_id, title, domain, category, description, purpose, inputs, outputs, kpis, raci, maturity_levels, related_items, external_mappings, tags, source_standard, source_clause, last_reviewed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItemFts = db.prepare(`
      INSERT INTO items_fts (item_id, title, domain, category, description, purpose, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const file of frameworkFiles) {
      const framework = readJsonFile<FrameworkSeed>(file);
      if (!framework.id) continue;

      insertFramework.run(
        framework.id,
        framework.name,
        framework.version,
        framework.authority,
        framework.domain,
        framework.description,
        framework.url,
        framework.license_note ?? '',
        0,
        framework.last_reviewed ?? '',
      );

      for (const item of framework.items ?? []) {
        const tagsJson = JSON.stringify(item.tags ?? []);
        insertItem.run(
          framework.id,
          item.item_id,
          item.title,
          item.domain,
          item.category ?? '',
          item.description,
          item.purpose ?? '',
          JSON.stringify(item.inputs ?? []),
          JSON.stringify(item.outputs ?? []),
          JSON.stringify(item.kpis ?? []),
          JSON.stringify(item.raci ?? {}),
          JSON.stringify(item.maturity_levels ?? {}),
          JSON.stringify(item.related_items ?? []),
          JSON.stringify(item.external_mappings ?? []),
          tagsJson,
          item.source_standard ?? '',
          item.source_clause ?? '',
          item.last_reviewed ?? '',
        );

        insertItemFts.run(
          item.item_id,
          item.title,
          item.domain,
          item.category ?? '',
          item.description,
          item.purpose ?? '',
          tagsJson,
        );

        totalItems++;
      }
    }

    // ── Load SLA metrics ────────────────────────────────────────
    const slaFiles = globSeedFiles('sla-');
    let totalSla = 0;

    const insertSla = db.prepare(`
      INSERT INTO sla_metrics (metric_id, name, category, description, formula, unit, typical_targets, measurement_guidance, related_itil_practice, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSlaFts = db.prepare(`
      INSERT INTO sla_metrics_fts (metric_id, name, category, description, measurement_guidance, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const file of slaFiles) {
      const metrics = readJsonFile<SlaSeed[]>(file);
      for (const m of metrics) {
        const tagsJson = JSON.stringify(m.tags ?? []);
        insertSla.run(
          m.metric_id,
          m.name,
          m.category,
          m.description,
          m.formula ?? '',
          m.unit ?? '',
          JSON.stringify(m.typical_targets ?? {}),
          m.measurement_guidance ?? '',
          m.related_itil_practice ?? '',
          tagsJson,
        );

        insertSlaFts.run(
          m.metric_id,
          m.name,
          m.category,
          m.description,
          m.measurement_guidance ?? '',
          tagsJson,
        );

        totalSla++;
      }
    }

    // ── Load maturity definitions ───────────────────────────────
    const maturityFiles = globSeedFiles('maturity-');
    let totalMaturity = 0;

    const insertMaturity = db.prepare(`
      INSERT INTO maturity_definitions (framework_id, level, level_name, description, characteristics)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const file of maturityFiles) {
      const defs = readJsonFile<MaturitySeed[]>(file);
      for (const def of defs) {
        for (const lvl of def.levels) {
          insertMaturity.run(
            def.framework_id,
            lvl.level,
            lvl.level_name,
            lvl.description,
            JSON.stringify(lvl.characteristics ?? []),
          );
          totalMaturity++;
        }
      }
    }

    // ── Load mappings ───────────────────────────────────────────
    const mappingFiles = globSeedFiles('mapping-');
    let totalMappings = 0;

    const insertMapping = db.prepare(`
      INSERT INTO mappings (source_item_id, target_item_id, target_external_mcp, target_external_id, relationship, confidence, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const file of mappingFiles) {
      const mappings = readJsonFile<MappingSeed[]>(file);
      for (const m of mappings) {
        insertMapping.run(
          m.source_item_id,
          m.target_item_id ?? '',
          m.target_external_mcp ?? '',
          m.target_external_id ?? '',
          m.relationship ?? 'related',
          m.confidence ?? 0.8,
          m.notes ?? '',
        );
        totalMappings++;
      }
    }

    // ── Update framework item counts ────────────────────────────
    db.prepare(`
      UPDATE frameworks SET item_count = (
        SELECT COUNT(*) FROM items WHERE items.framework_id = frameworks.id
      )
    `).run();

    // ── Rebuild FTS indexes ─────────────────────────────────────
    db.prepare("INSERT INTO items_fts(items_fts) VALUES('rebuild')").run();
    db.prepare("INSERT INTO sla_metrics_fts(sla_metrics_fts) VALUES('rebuild')").run();

    // ── Metadata ────────────────────────────────────────────────
    const insertMetadata = db.prepare(`
      INSERT INTO db_metadata (key, value) VALUES (?, ?)
    `);

    insertMetadata.run('schema_version', '1.0');
    insertMetadata.run('database_built', new Date().toISOString());
    insertMetadata.run('dataset_license', 'Apache-2.0');
    insertMetadata.run('build_tool', 'scripts/build-db.ts');

    // ── Integrity check ─────────────────────────────────────────
    const integrity = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
    if (integrity[0]?.integrity_check !== 'ok') {
      throw new Error(`Integrity check failed: ${JSON.stringify(integrity)}`);
    }

    // ── Finalize ────────────────────────────────────────────────
    db.pragma('journal_mode = DELETE');
    db.exec('VACUUM');

    console.log('Database built successfully.');
    console.log(`  DB path:              ${DB_PATH}`);
    console.log(`  Frameworks:           ${frameworkFiles.length}`);
    console.log(`  Items (practices):    ${totalItems}`);
    console.log(`  SLA metrics:          ${totalSla}`);
    console.log(`  Maturity definitions: ${totalMaturity}`);
    console.log(`  Mappings:             ${totalMappings}`);
  } finally {
    db.close();
  }
}

main();

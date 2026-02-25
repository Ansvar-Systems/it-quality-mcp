import type { Database } from '@ansvar/mcp-sqlite';

import {
  SERVER_NAME,
  SERVER_VERSION,
  REPOSITORY_URL,
  REPORT_ISSUE_URL,
  DATASET_LICENSE,
  MAX_AGE_DAYS,
} from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

/* ------------------------------------------------------------------ */
/*  Tool 13: about                                                    */
/* ------------------------------------------------------------------ */

export async function about(
  db: Database,
): Promise<Record<string, unknown>> {
  const itemCount = (db.prepare('SELECT COUNT(*) as c FROM items').get() as { c: number }).c;
  const frameworkCount = (db.prepare('SELECT COUNT(*) as c FROM frameworks').get() as { c: number }).c;
  const mappingCount = (db.prepare('SELECT COUNT(*) as c FROM mappings').get() as { c: number }).c;
  const slaCount = (db.prepare('SELECT COUNT(*) as c FROM sla_metrics').get() as { c: number }).c;
  const maturityCount = (db.prepare('SELECT COUNT(*) as c FROM maturity_definitions').get() as { c: number }).c;

  const metaRows = db.prepare('SELECT key, value FROM db_metadata').all() as Array<{ key: string; value: string }>;
  const meta = new Map(metaRows.map((r) => [r.key, r.value]));

  return {
    server: SERVER_NAME,
    version: SERVER_VERSION,
    datasets: {
      items: itemCount,
      frameworks: frameworkCount,
      mappings: mappingCount,
      sla_metrics: slaCount,
      maturity_definitions: maturityCount,
    },
    data_sources: 'ITIL 4, COBIT 2019, ISO 20000, ISO 22301, ISO 25010, ISO 38500, ISO 12207, ISO 15288, CMMI v2.0, FitSM, DORA Metrics, DAMA-DMBOK',
    schema_version: meta.get('schema_version') ?? 'unknown',
    database_built: meta.get('database_built') ?? 'unknown',
    dataset_license: DATASET_LICENSE,
    network: 'none — all data is local in the SQLite database. No network requests are made.',
    repository: REPOSITORY_URL,
    report_issue: REPORT_ISSUE_URL,
    ...responseMeta(db),
  };
}

/* ------------------------------------------------------------------ */
/*  Tool 14: list_sources                                             */
/* ------------------------------------------------------------------ */

interface FrameworkSourceRow {
  id: string;
  name: string;
  version: string;
  authority: string;
  domain: string;
  url: string;
  license_note: string;
  item_count: number;
  last_reviewed: string;
}

export async function listSources(
  db: Database,
): Promise<Record<string, unknown>> {
  const rows = db.prepare(
    'SELECT id, name, version, authority, domain, url, license_note, item_count, last_reviewed FROM frameworks ORDER BY domain, name',
  ).all() as FrameworkSourceRow[];

  return {
    sources: rows.map((r) => ({
      framework_id: r.id,
      name: r.name,
      version: r.version,
      authority: r.authority,
      domain: r.domain,
      url: r.url,
      license_note: r.license_note,
      item_count: r.item_count,
      last_reviewed: r.last_reviewed,
    })),
    dataset_license: DATASET_LICENSE,
    ...responseMeta(db),
  };
}

/* ------------------------------------------------------------------ */
/*  Tool 15: check_data_freshness                                     */
/* ------------------------------------------------------------------ */

interface FreshnessResult {
  framework_id: string;
  name: string;
  last_reviewed: string;
  days_since_review: number;
  max_age_days: number;
  status: 'Current' | 'Due' | 'OVERDUE';
}

export async function checkDataFreshness(
  db: Database,
): Promise<Record<string, unknown>> {
  const builtRow = db.prepare("SELECT value FROM db_metadata WHERE key = 'database_built'").get() as { value: string } | undefined;
  const databaseBuilt = builtRow?.value ?? 'unknown';

  const frameworks = db.prepare(
    'SELECT id, name, last_reviewed FROM frameworks ORDER BY id',
  ).all() as Array<{ id: string; name: string; last_reviewed: string }>;

  const now = new Date();
  const results: FreshnessResult[] = frameworks.map((f) => {
    const reviewed = new Date(f.last_reviewed);
    const daysSince = Math.floor((now.getTime() - reviewed.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'Current' | 'Due' | 'OVERDUE';
    if (daysSince <= MAX_AGE_DAYS * 0.8) {
      status = 'Current';
    } else if (daysSince <= MAX_AGE_DAYS) {
      status = 'Due';
    } else {
      status = 'OVERDUE';
    }

    return {
      framework_id: f.id,
      name: f.name,
      last_reviewed: f.last_reviewed,
      days_since_review: daysSince,
      max_age_days: MAX_AGE_DAYS,
      status,
    };
  });

  const overdue = results.filter((r) => r.status === 'OVERDUE').length;
  const due = results.filter((r) => r.status === 'Due').length;
  const current = results.filter((r) => r.status === 'Current').length;

  return {
    database_built: databaseBuilt,
    max_age_days: MAX_AGE_DAYS,
    summary: {
      total: results.length,
      current,
      due,
      overdue,
    },
    frameworks: results,
    ...responseMeta(db),
  };
}

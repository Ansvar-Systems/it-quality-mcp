import type { VercelRequest, VercelResponse } from '@vercel/node';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

import { DB_ENV_VAR, MAX_AGE_DAYS, REPORT_ISSUE_URL, REPOSITORY_URL, SERVER_NAME, SERVER_VERSION } from '../src/constants.js';

const SOURCE_DB = process.env[DB_ENV_VAR] || join(process.cwd(), 'data', 'database.db');

function getGitSha(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown';
}

function getBuildTimestamp(): string {
  return process.env.VERCEL_GIT_COMMIT_DATE ?? new Date().toISOString();
}

function getDataFreshness(): {
  last_ingested: string;
  age_days: number;
  max_age_days: number;
  source_count: number;
  record_count: number | null;
} {
  let lastIngested = 'unknown';

  try {
    const stats = statSync(SOURCE_DB);
    lastIngested = stats.mtime.toISOString().slice(0, 10);
  } catch {
    // DB not found
  }

  const ageDays = lastIngested !== 'unknown'
    ? Math.floor((Date.now() - new Date(lastIngested).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  return {
    last_ingested: lastIngested,
    age_days: ageDays,
    max_age_days: MAX_AGE_DAYS,
    source_count: 12,
    record_count: null,
  };
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const url = new URL(req.url ?? '/', `https://${req.headers.host}`);

  if (url.pathname === '/version' || url.searchParams.has('version')) {
    res.status(200).json({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      git_sha: getGitSha(),
      build_timestamp: getBuildTimestamp(),
      node_version: process.version,
      transport: ['stdio', 'streamable-http'],
      mcp_sdk_version: '1.25.3',
      capabilities: ['itil4', 'cobit', 'iso20000', 'iso22301', 'cmmi', 'sla'],
      tier: 'free',
      source_schema_version: '1.0',
      repo_url: REPOSITORY_URL,
      report_issue_url: REPORT_ISSUE_URL,
    });
    return;
  }

  const dbExists = existsSync(SOURCE_DB);

  if (!dbExists) {
    res.status(503).json({
      status: 'degraded',
      server: SERVER_NAME,
      error: 'Database not loaded (cannot serve queries)',
    });
    return;
  }

  const freshness = getDataFreshness();
  const status = freshness.age_days > MAX_AGE_DAYS ? 'stale' : 'ok';

  res.status(200).json({
    status,
    server: SERVER_NAME,
    version: SERVER_VERSION,
    git_sha: getGitSha(),
    uptime_seconds: Math.floor(process.uptime()),
    build_timestamp: getBuildTimestamp(),
    data_freshness: freshness,
    capabilities: ['itil4', 'cobit', 'iso20000', 'iso22301', 'cmmi', 'sla'],
    tier: 'free',
  });
}

import type Database from '@ansvar/mcp-sqlite';

const DISCLAIMER = 'Reference tool only. Not professional advice. Verify against authoritative sources.';

export function responseMeta(db: InstanceType<typeof Database>): Record<string, unknown> {
  const row = db.prepare("SELECT value FROM db_metadata WHERE key = 'database_built'").get() as { value: string } | undefined;
  return {
    _meta: {
      disclaimer: DISCLAIMER,
      data_age: row?.value ?? 'unknown',
    },
  };
}

const EXPLICIT_FTS_SYNTAX = /["*]|\b(AND|OR|NOT|NEAR)\b/i;

export interface FtsQueryVariants {
  primary: string;
  fallback?: string;
}

export function buildFtsQueryVariants(query: string): FtsQueryVariants {
  const trimmed = query.trim();

  if (!trimmed) {
    return { primary: '' };
  }

  if (EXPLICIT_FTS_SYNTAX.test(trimmed)) {
    return { primary: trimmed };
  }

  const tokens = trimmed
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}_:\-.]/gu, ''))
    .filter(Boolean);

  if (tokens.length === 0) {
    return { primary: trimmed };
  }

  const primary = tokens.map((token) => `"${token}"*`).join(' ');
  const fallback = tokens.map((token) => `${token}*`).join(' OR ');

  return { primary, fallback };
}

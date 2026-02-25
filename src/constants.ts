export const SERVER_NAME = 'it-quality-mcp';
export const SERVER_VERSION = '1.0.0';
export const DB_ENV_VAR = 'IT_QUALITY_MCP_DB_PATH';
export const REPOSITORY_URL = 'https://github.com/Ansvar-Systems/it-quality-mcp';
export const REPORT_ISSUE_URL = 'https://github.com/Ansvar-Systems/it-quality-mcp/issues/new';
export const MAX_AGE_DAYS = 180;
export const DATASET_LICENSE = 'Apache-2.0';

export const TOOL_NAMES = {
  SEARCH_PRACTICES: 'search_practices',
  GET_PRACTICE: 'get_practice',
  LIST_FRAMEWORKS: 'list_frameworks',
  GET_FRAMEWORK: 'get_framework',
  SEARCH_BY_DOMAIN: 'search_by_domain',
  GET_MATURITY_MODEL: 'get_maturity_model',
  ASSESS_MATURITY: 'assess_maturity',
  MAP_CONTROLS: 'map_controls',
  MAP_TO_SECURITY: 'map_to_security',
  GET_SLA_TEMPLATES: 'get_sla_templates',
  COMPARE_FRAMEWORKS: 'compare_frameworks',
  GET_PROCESS_DESIGN: 'get_process_design',
  ABOUT: 'about',
  LIST_SOURCES: 'list_sources',
  CHECK_DATA_FRESHNESS: 'check_data_freshness',
} as const;

export const MAX_QUERY_LENGTH = 500;

export const DOMAINS = ['itsm', 'governance', 'quality', 'bc', 'sdlc', 'data', 'sla'] as const;
export type Domain = typeof DOMAINS[number];

export const FRAMEWORK_IDS = [
  'itil4', 'cobit2019', 'iso20000', 'iso38500', 'iso25010',
  'iso22301', 'iso12207', 'iso15288', 'cmmi', 'fitsm',
  'dora_metrics', 'dama_dmbok',
] as const;
export type FrameworkId = typeof FRAMEWORK_IDS[number];

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type Database from '@ansvar/mcp-sqlite';

import { TOOL_NAMES, DOMAINS, FRAMEWORK_IDS } from '../constants.js';
import { searchPractices, type SearchPracticesInput } from './search-practices.js';
import { getPractice, type GetPracticeInput } from './get-practice.js';
import { listFrameworks } from './list-frameworks.js';
import { getFramework, type GetFrameworkInput } from './get-framework.js';
import { searchByDomain, type SearchByDomainInput } from './search-by-domain.js';
import { getMaturityModel, assessMaturity, type GetMaturityModelInput, type AssessMaturityInput } from './maturity-tools.js';
import { mapControls, mapToSecurity, type MapControlsInput, type MapToSecurityInput } from './mapping-tools.js';
import { compareFrameworks, type CompareFrameworksInput } from './compare-frameworks.js';
import { getSlaTemplates, type GetSlaTemplatesInput } from './sla-tools.js';
import { getProcessDesign, type GetProcessDesignInput } from './get-process-design.js';
import { about, listSources, checkDataFreshness } from './meta-tools.js';

export const TOOLS: Tool[] = [
  /* ---- Tool 1: search_practices ---- */
  {
    name: TOOL_NAMES.SEARCH_PRACTICES,
    description:
      'Full-text search across 368 IT quality practices from 12 frameworks (ITIL 4, COBIT 2019, ISO 20000, ISO 22301, ISO 25010, ISO 38500, ISO 12207, ISO 15288, CMMI, FitSM, DORA Metrics, DAMA-DMBOK). Returns BM25-ranked results with snippets. Example queries: "incident management", "change control", "service level", "risk assessment".',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Full-text search query. Supports FTS5 syntax: quoted phrases ("incident management"), AND/OR/NOT operators, prefix wildcards (change*). Plain natural language also works.',
          maxLength: 500,
        },
        domain: {
          type: 'string',
          description: 'Filter results to a specific domain.',
          enum: [...DOMAINS],
        },
        framework: {
          type: 'string',
          description: 'Filter results to a specific framework.',
          enum: [...FRAMEWORK_IDS],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20, max: 100).',
          default: 20,
          minimum: 1,
          maximum: 100,
        },
      },
      required: ['query'],
    },
  },

  /* ---- Tool 2: get_practice ---- */
  {
    name: TOOL_NAMES.GET_PRACTICE,
    description:
      'Retrieve a single IT quality practice by its item_id with full details: description, purpose, inputs, outputs, KPIs, RACI matrix, maturity levels, related items, and cross-framework mappings. Example IDs: ITIL4-IM (Incident Management), COBIT-APO13 (Managed Security), ISO20000-8.2 (Service Portfolio), CMMI-REQD (Requirements Development).',
    inputSchema: {
      type: 'object',
      properties: {
        item_id: {
          type: 'string',
          description: 'The unique item identifier (e.g., ITIL4-IM, COBIT-APO13, ISO22301-8.2).',
          maxLength: 50,
        },
      },
      required: ['item_id'],
    },
  },

  /* ---- Tool 3: list_frameworks ---- */
  {
    name: TOOL_NAMES.LIST_FRAMEWORKS,
    description:
      'List all 12 IT quality frameworks with their metadata: name, version, authority, domain, item count, and last review date. Frameworks cover ITSM, governance, quality, business continuity, SDLC, and data management.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  /* ---- Tool 4: get_framework ---- */
  {
    name: TOOL_NAMES.GET_FRAMEWORK,
    description:
      'Get detailed information about a specific framework including description, authority, and optionally all its items. Use include_items=true to get the full catalog of practices for that framework.',
    inputSchema: {
      type: 'object',
      properties: {
        framework_id: {
          type: 'string',
          description: 'Framework identifier.',
          enum: [...FRAMEWORK_IDS],
        },
        include_items: {
          type: 'boolean',
          description: 'Include all items belonging to this framework (default: false).',
          default: false,
        },
      },
      required: ['framework_id'],
    },
  },

  /* ---- Tool 5: search_by_domain ---- */
  {
    name: TOOL_NAMES.SEARCH_BY_DOMAIN,
    description:
      'Browse IT quality practices by domain. Domains: itsm (IT service management — ITIL 4, ISO 20000, FitSM), governance (IT governance — COBIT 2019, ISO 38500), quality (software quality — ISO 25010), bc (business continuity — ISO 22301), sdlc (software/systems lifecycle — ISO 12207, ISO 15288, CMMI, DORA), data (data management — DAMA-DMBOK). Optionally filter by category within the domain.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain to browse.',
          enum: [...DOMAINS],
        },
        category: {
          type: 'string',
          description: 'Optional category within the domain (e.g., "service", "core", "APO", "doing").',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 50, max: 200).',
          default: 50,
          minimum: 1,
          maximum: 200,
        },
      },
      required: ['domain'],
    },
  },

  /* ---- Tool 6: get_maturity_model ---- */
  {
    name: TOOL_NAMES.GET_MATURITY_MODEL,
    description:
      'Get the maturity level definitions for a framework. Returns level numbers, names, descriptions, and characteristics. Available for: CMMI (levels 0-5), COBIT 2019 (levels 0-5), FitSM (levels 0-4). Use this to understand what each maturity level means and how to assess organizational capability.',
    inputSchema: {
      type: 'object',
      properties: {
        framework_id: {
          type: 'string',
          description: 'Framework whose maturity model to retrieve.',
          enum: [...FRAMEWORK_IDS],
        },
      },
      required: ['framework_id'],
    },
  },

  /* ---- Tool 7: assess_maturity ---- */
  {
    name: TOOL_NAMES.ASSESS_MATURITY,
    description:
      'Find practices matching a capability keyword and return their maturity context. Searches across all frameworks, then groups results by framework with applicable maturity level definitions. Example capabilities: "incident management", "change control", "deployment", "risk".',
    inputSchema: {
      type: 'object',
      properties: {
        capability: {
          type: 'string',
          description: 'Capability or process area to assess (e.g., "incident management", "deployment frequency").',
          maxLength: 500,
        },
      },
      required: ['capability'],
    },
  },

  /* ---- Tool 8: map_controls ---- */
  {
    name: TOOL_NAMES.MAP_CONTROLS,
    description:
      'Map practices between IT quality frameworks within this MCP. Shows how practices in one framework relate to another (e.g., COBIT to ITIL, ISO 20000 to ITIL). Filter by source item, source framework, target framework, or relationship type (implements, supports, aligned, related).',
    inputSchema: {
      type: 'object',
      properties: {
        source_item_id: {
          type: 'string',
          description: 'Source item ID to map from (e.g., COBIT-EDM01).',
        },
        source_framework: {
          type: 'string',
          description: 'Source framework to map from.',
          enum: [...FRAMEWORK_IDS],
        },
        target_framework: {
          type: 'string',
          description: 'Target framework to map to.',
          enum: [...FRAMEWORK_IDS],
        },
        relationship: {
          type: 'string',
          description: 'Filter by relationship type.',
          enum: ['implements', 'supports', 'aligned', 'related'],
        },
      },
      required: ['target_framework'],
    },
  },

  /* ---- Tool 9: map_to_security ---- */
  {
    name: TOOL_NAMES.MAP_TO_SECURITY,
    description:
      'Map IT quality practices to external security control frameworks (ISO 27001, NIST 800-53) via the security-controls-mcp. Shows which IT quality practices support or implement specific security controls. Filter by item_id, domain, or target security framework prefix (e.g., "ISO27001", "NIST80053").',
    inputSchema: {
      type: 'object',
      properties: {
        item_id: {
          type: 'string',
          description: 'Filter to mappings from a specific item (e.g., COBIT-APO13).',
        },
        domain: {
          type: 'string',
          description: 'Filter to mappings from a specific domain.',
          enum: [...DOMAINS],
        },
        target_framework: {
          type: 'string',
          description: 'Filter by security framework prefix in the external ID (e.g., "ISO27001", "NIST80053").',
        },
      },
    },
  },

  /* ---- Tool 10: compare_frameworks ---- */
  {
    name: TOOL_NAMES.COMPARE_FRAMEWORKS,
    description:
      'Side-by-side comparison of two IT quality frameworks. Shows items grouped by category, coverage differences, and any cross-framework mappings between them. Useful for understanding overlap (e.g., ITIL 4 vs ISO 20000, COBIT 2019 vs ISO 38500).',
    inputSchema: {
      type: 'object',
      properties: {
        framework_a: {
          type: 'string',
          description: 'First framework to compare.',
          enum: [...FRAMEWORK_IDS],
        },
        framework_b: {
          type: 'string',
          description: 'Second framework to compare.',
          enum: [...FRAMEWORK_IDS],
        },
        domain: {
          type: 'string',
          description: 'Optional domain filter to narrow comparison.',
          enum: [...DOMAINS],
        },
      },
      required: ['framework_a', 'framework_b'],
    },
  },

  /* ---- Tool 11: get_sla_templates ---- */
  {
    name: TOOL_NAMES.GET_SLA_TEMPLATES,
    description:
      'Search 52 SLA metric templates covering availability, performance, incident, change, capacity, continuity, security, problem, and service request categories. Each metric includes formula, unit, typical bronze/silver/gold targets, and measurement guidance. Example queries: "response time", "availability", "MTTR".',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by SLA category.',
          enum: ['availability', 'capacity', 'change', 'continuity', 'incident', 'performance', 'problem', 'security', 'service_request'],
        },
        query: {
          type: 'string',
          description: 'Full-text search query across metric names, descriptions, and guidance.',
          maxLength: 500,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 20, max: 100).',
          default: 20,
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },

  /* ---- Tool 12: get_process_design ---- */
  {
    name: TOOL_NAMES.GET_PROCESS_DESIGN,
    description:
      'Get a structured process design view for an IT quality practice. Returns the practice purpose, inputs, outputs, KPIs, RACI matrix, maturity levels, related items (resolved), and cross-framework mappings. Use this when designing or implementing a specific process.',
    inputSchema: {
      type: 'object',
      properties: {
        item_id: {
          type: 'string',
          description: 'The item_id to get process design for (e.g., ITIL4-IM, COBIT-BAI06).',
          maxLength: 50,
        },
      },
      required: ['item_id'],
    },
  },

  /* ---- Tool 13: about ---- */
  {
    name: TOOL_NAMES.ABOUT,
    description:
      'Get server metadata: name, version, dataset counts (368 items, 12 frameworks, 111 mappings, 52 SLA metrics), build timestamp, schema version, license, and network info. Use this to understand the scope and freshness of the data.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  /* ---- Tool 14: list_sources ---- */
  {
    name: TOOL_NAMES.LIST_SOURCES,
    description:
      'List all 12 data sources with authority, version, license, item count, and last review date. Use this to understand provenance and how current each framework dataset is.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  /* ---- Tool 15: check_data_freshness ---- */
  {
    name: TOOL_NAMES.CHECK_DATA_FRESHNESS,
    description:
      'Staleness report for all framework datasets. Compares each framework last_reviewed date against the 180-day maximum age threshold. Reports status as Current (<80% of max age), Due (80-100%), or OVERDUE (>100%). Use this to verify data is up to date before relying on results.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export function registerTools(
  server: Server,
  db: InstanceType<typeof Database>,
): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case TOOL_NAMES.SEARCH_PRACTICES:
          result = await searchPractices(db, (args ?? {}) as unknown as SearchPracticesInput);
          break;

        case TOOL_NAMES.GET_PRACTICE:
          result = await getPractice(db, (args ?? {}) as unknown as GetPracticeInput);
          break;

        case TOOL_NAMES.LIST_FRAMEWORKS:
          result = await listFrameworks(db);
          break;

        case TOOL_NAMES.GET_FRAMEWORK:
          result = await getFramework(db, (args ?? {}) as unknown as GetFrameworkInput);
          break;

        case TOOL_NAMES.SEARCH_BY_DOMAIN:
          result = await searchByDomain(db, (args ?? {}) as unknown as SearchByDomainInput);
          break;

        case TOOL_NAMES.GET_MATURITY_MODEL:
          result = await getMaturityModel(db, (args ?? {}) as unknown as GetMaturityModelInput);
          break;

        case TOOL_NAMES.ASSESS_MATURITY:
          result = await assessMaturity(db, (args ?? {}) as unknown as AssessMaturityInput);
          break;

        case TOOL_NAMES.MAP_CONTROLS:
          result = await mapControls(db, (args ?? {}) as unknown as MapControlsInput);
          break;

        case TOOL_NAMES.MAP_TO_SECURITY:
          result = await mapToSecurity(db, (args ?? {}) as unknown as MapToSecurityInput);
          break;

        case TOOL_NAMES.COMPARE_FRAMEWORKS:
          result = await compareFrameworks(db, (args ?? {}) as unknown as CompareFrameworksInput);
          break;

        case TOOL_NAMES.GET_SLA_TEMPLATES:
          result = await getSlaTemplates(db, (args ?? {}) as unknown as GetSlaTemplatesInput);
          break;

        case TOOL_NAMES.GET_PROCESS_DESIGN:
          result = await getProcessDesign(db, (args ?? {}) as unknown as GetProcessDesignInput);
          break;

        case TOOL_NAMES.ABOUT:
          result = await about(db);
          break;

        case TOOL_NAMES.LIST_SOURCES:
          result = await listSources(db);
          break;

        case TOOL_NAMES.CHECK_DATA_FRESHNESS:
          result = await checkDataFreshness(db);
          break;

        default:
          return {
            content: [{ type: 'text', text: `Error: Unknown tool "${name}".` }],
            isError: true,
          };
      }

      // If the result already has isError (from tool-level validation), serialize the full
      // result object (including _meta and _error_type) so callers receive complete context.
      const resultObj = result as Record<string, unknown>;
      if (resultObj.isError) {
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  });
}

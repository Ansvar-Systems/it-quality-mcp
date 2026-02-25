# Tools Reference

The IT Quality MCP exposes **15 tools** organized into five groups.

---

## Search & Discovery

### `search_practices`

Full-text search across 368 IT quality practices from 12 frameworks using BM25 ranking.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | FTS5 search query. Supports quoted phrases, AND/OR/NOT, prefix wildcards. Max 500 chars. |
| `domain` | string | No | Filter by domain: `itsm`, `governance`, `quality`, `bc`, `sdlc`, `data`, `sla`. |
| `framework` | string | No | Filter by framework ID (e.g., `itil4`, `cobit2019`, `cmmi`). |
| `limit` | number | No | Max results (default: 20, max: 100). |

**Returns:** Array of matching practices with item_id, title, framework, domain, snippet with highlighted matches, and relevance score.

**Example:**
```json
{ "query": "incident management", "domain": "itsm", "limit": 10 }
```

**Limitations:** Search operates on metadata descriptions, not copyrighted standard text.

---

### `get_practice`

Retrieve a single practice by its item_id with full details.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `item_id` | string | Yes | Unique item identifier (e.g., `ITIL4-IM`, `COBIT-APO13`). Max 50 chars. |

**Returns:** Full practice record including description, purpose, inputs, outputs, KPIs, RACI matrix, maturity levels, related items, and cross-framework mappings.

**Example:**
```json
{ "item_id": "ITIL4-IM" }
```

**Limitations:** Returns empty result if item_id does not exist. No fuzzy matching on IDs.

---

### `list_frameworks`

List all 12 IT quality frameworks with metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| _(none)_ | | | |

**Returns:** Array of frameworks with id, name, version, authority, domain, item count, and last review date.

**Limitations:** None.

---

### `get_framework`

Get detailed information about a specific framework.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `framework_id` | string | Yes | Framework identifier (e.g., `itil4`, `cobit2019`, `iso20000`). |
| `include_items` | boolean | No | Include all items belonging to this framework (default: false). |

**Returns:** Framework metadata plus optionally all items. Large responses when `include_items=true`.

**Example:**
```json
{ "framework_id": "cobit2019", "include_items": true }
```

**Limitations:** Token-heavy when include_items is true for large frameworks (ITIL 4: 34, ISO 20000: 45).

---

### `search_by_domain`

Browse practices by domain with optional category filter.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | Domain: `itsm`, `governance`, `quality`, `bc`, `sdlc`, `data`, `sla`. |
| `category` | string | No | Category within the domain (e.g., `service`, `core`, `APO`, `doing`). |
| `limit` | number | No | Max results (default: 50, max: 200). |

**Returns:** Array of practices in the specified domain, grouped by framework.

**Example:**
```json
{ "domain": "governance", "category": "EDM" }
```

**Limitations:** Category values are framework-specific and not standardized across frameworks.

---

## Maturity & Assessment

### `get_maturity_model`

Get maturity level definitions for a framework.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `framework_id` | string | Yes | Framework whose maturity model to retrieve. |

**Returns:** Array of maturity levels with level number, name, description, and characteristics. Available for CMMI (levels 0-5), COBIT 2019 (levels 0-5), ITIL 4 (levels 1-5).

**Example:**
```json
{ "framework_id": "cmmi" }
```

**Limitations:** Not all 12 frameworks have maturity models. Returns empty for frameworks without maturity definitions.

---

### `assess_maturity`

Find practices matching a capability keyword and return maturity context.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `capability` | string | Yes | Capability or process area to assess (e.g., `incident management`). Max 500 chars. |

**Returns:** Matching practices grouped by framework with applicable maturity level definitions.

**Example:**
```json
{ "capability": "deployment frequency" }
```

**Limitations:** Results depend on search term quality. Generic terms may return many results across all frameworks.

---

## Cross-Mapping

### `map_controls`

Map practices between IT quality frameworks within this MCP.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source_item_id` | string | No | Source item ID to map from (e.g., `COBIT-EDM01`). |
| `source_framework` | string | No | Source framework to map from. |
| `target_framework` | string | Yes | Target framework to map to. |
| `relationship` | string | No | Filter by type: `implements`, `supports`, `aligned`, `related`. |

**Returns:** Array of mappings with source item, target item, relationship type, and descriptions.

**Example:**
```json
{ "source_framework": "cobit2019", "target_framework": "itil4" }
```

**Limitations:** 111 internal mappings cover major framework pairs (COBIT-ITIL, ISO 20000-ITIL, COBIT-ISO 27001, ISO 22301-ISO 27001, ITIL-NIST). Not all framework pairs have mappings.

---

### `map_to_security`

Map IT quality practices to external security control frameworks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `item_id` | string | No | Filter to mappings from a specific item (e.g., `COBIT-APO13`). |
| `domain` | string | No | Filter to mappings from a specific domain. |
| `target_framework` | string | No | Filter by security framework prefix (e.g., `ISO27001`, `NIST80053`). |

**Returns:** Array of mappings from IT quality practices to security controls (ISO 27001, NIST 800-53).

**Example:**
```json
{ "item_id": "COBIT-APO13", "target_framework": "ISO27001" }
```

**Limitations:** Security control mappings reference external framework IDs. Use alongside the security-controls-mcp for full control details.

---

### `compare_frameworks`

Side-by-side comparison of two IT quality frameworks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `framework_a` | string | Yes | First framework to compare. |
| `framework_b` | string | Yes | Second framework to compare. |
| `domain` | string | No | Optional domain filter to narrow comparison. |

**Returns:** Items grouped by category for each framework, coverage differences, and any cross-framework mappings between them.

**Example:**
```json
{ "framework_a": "itil4", "framework_b": "iso20000" }
```

**Limitations:** Comparison is structural (items side-by-side), not semantic. Useful for identifying overlap, not equivalence.

---

## SLA & Process

### `get_sla_templates`

Search 52 SLA metric templates.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | SLA category: `availability`, `capacity`, `change`, `continuity`, `incident`, `performance`, `problem`, `security`, `service_request`. |
| `query` | string | No | Full-text search across metric names, descriptions, and guidance. Max 500 chars. |
| `limit` | number | No | Max results (default: 20, max: 100). |

**Returns:** Array of SLA metrics with name, formula, unit, bronze/silver/gold targets, and measurement guidance.

**Example:**
```json
{ "category": "incident", "query": "response time" }
```

**Limitations:** Templates provide typical targets. Actual SLA values should be negotiated based on business requirements.

---

### `get_process_design`

Get a structured process design view for a practice.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `item_id` | string | Yes | Item ID to get process design for (e.g., `ITIL4-IM`). Max 50 chars. |

**Returns:** Practice purpose, inputs, outputs, KPIs, RACI matrix, maturity levels, resolved related items, and cross-framework mappings.

**Example:**
```json
{ "item_id": "ITIL4-CHM" }
```

**Limitations:** Process design data completeness varies by framework. Some items may have partial RACI or KPI data.

---

## Meta

### `about`

Get server metadata and dataset statistics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| _(none)_ | | | |

**Returns:** Server name, version, dataset counts (368 items, 12 frameworks, 111 mappings, 52 SLA metrics), build timestamp, schema version, license, and network info.

---

### `list_sources`

List all 12 data sources with provenance metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| _(none)_ | | | |

**Returns:** Array of sources with name, authority, version, license, item count, and last review date.

---

### `check_data_freshness`

Staleness report for all framework datasets.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| _(none)_ | | | |

**Returns:** Per-framework freshness status (Current / Due / OVERDUE) based on 180-day maximum age threshold.

**Limitations:** Freshness is based on manual review dates, not automated upstream monitoring.

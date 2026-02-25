# IT Quality MCP

ITIL 4, COBIT 2019, ISO 20000, ISO 22301, CMMI, and 7 more IT quality frameworks -- structured and searchable via the [Model Context Protocol](https://modelcontextprotocol.io).

[![CI](https://github.com/Ansvar-Systems/it-quality-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/it-quality-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@ansvar/it-quality-mcp)](https://www.npmjs.com/package/@ansvar/it-quality-mcp)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

## Quick Start

### Remote (Streamable HTTP)

No installation required. Add to your MCP client config:

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "it-quality": {
      "url": "https://it-quality-mcp.vercel.app/mcp"
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "it-quality": {
      "url": "https://it-quality-mcp.vercel.app/mcp"
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):
```json
{
  "servers": {
    "it-quality": {
      "url": "https://it-quality-mcp.vercel.app/mcp"
    }
  }
}
```

### Local (stdio via npm)

```bash
npx @ansvar/it-quality-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "it-quality": {
      "command": "npx",
      "args": ["-y", "@ansvar/it-quality-mcp"]
    }
  }
}
```

## What's Included

| Category | Count | Details |
|----------|-------|---------|
| **Frameworks** | 12 | ITIL 4, COBIT 2019, ISO 20000, ISO 22301, ISO 25010, ISO 38500, ISO 12207, ISO 15288, CMMI v2.0, FitSM, DORA Metrics, DAMA-DMBOK |
| **Items** | 368 | Practices, objectives, clauses, processes, quality characteristics |
| **SLA Metrics** | 52 | Templates with formulas, units, and bronze/silver/gold targets |
| **Mappings** | 111 | Cross-framework + security control mappings |
| **Maturity Levels** | 17 | CMMI (0-5), COBIT (0-5), ITIL (1-5) |

## Available Tools

| Tool | Description |
|------|-------------|
| `search_practices` | Full-text search across 368 practices with BM25 ranking |
| `get_practice` | Retrieve a single practice with full details (KPIs, RACI, inputs/outputs) |
| `list_frameworks` | List all 12 frameworks with metadata |
| `get_framework` | Get framework details, optionally with all items |
| `search_by_domain` | Browse practices by domain (itsm, governance, quality, bc, sdlc, data) |
| `get_maturity_model` | Get maturity level definitions for a framework |
| `assess_maturity` | Find practices for a capability with maturity context |
| `map_controls` | Map practices between frameworks (e.g., COBIT to ITIL) |
| `map_to_security` | Map IT quality practices to ISO 27001 / NIST 800-53 |
| `compare_frameworks` | Side-by-side framework comparison |
| `get_sla_templates` | Search 52 SLA metric templates with tiered targets |
| `get_process_design` | Structured process design view (inputs, outputs, KPIs, RACI) |
| `about` | Server metadata and dataset statistics |
| `list_sources` | Data source provenance for all 12 frameworks |
| `check_data_freshness` | Staleness report for all datasets |

> Full parameter documentation: [TOOLS.md](TOOLS.md)

## Data Sources

| Framework | Authority | Version |
|-----------|-----------|---------|
| ITIL 4 | AXELOS / PeopleCert | 2019 |
| COBIT 2019 | ISACA | 2019 |
| ISO/IEC 20000-1 | ISO/IEC | 2018 |
| ISO 22301 | ISO | 2019 |
| ISO/IEC 25010 SQuaRE | ISO/IEC | 2011 |
| ISO/IEC 38500 | ISO/IEC | 2015 |
| ISO/IEC/IEEE 12207 | ISO/IEC | 2017 |
| ISO/IEC/IEEE 15288 | ISO/IEC | 2023 |
| CMMI v2.0 | ISACA (CMMI Institute) | 2.0 |
| FitSM | FitSM Community (GEANT) | 2.4 |
| DORA Metrics & SPACE | DORA Team (Google Cloud) | 2023 |
| DAMA-DMBOK2 | DAMA International | 2 |

> Full provenance metadata: [`sources.yml`](./sources.yml)

## What's NOT Included

- **PRINCE2** -- Project management methodology (different domain)
- **TOGAF** -- Enterprise architecture framework
- **Six Sigma** -- Quality management methodology
- **ISO 27001 / NIST CSF / 800-53** -- Covered by [security-controls-mcp](https://github.com/Ansvar-Systems/security-controls-mcp)

> Full coverage details: [COVERAGE.md](COVERAGE.md)

## Security

This repository uses 6-layer security scanning:

- **CodeQL** -- Static analysis (weekly + push/PR)
- **Semgrep** -- SAST rules (push/PR)
- **Trivy** -- Vulnerability scanning (weekly)
- **Gitleaks** -- Secret detection (push/PR)
- **OSSF Scorecard** -- Supply chain security (weekly)
- **Dependabot** -- Dependency updates (weekly)

> Vulnerability reporting: [SECURITY.md](SECURITY.md)

## Disclaimer

This MCP server is a **reference tool** providing structured metadata about IT quality frameworks. It does not constitute professional IT consulting, audit, or compliance advice. All descriptions are original summaries -- no copyrighted standard text is reproduced. See [DISCLAIMER.md](DISCLAIMER.md) for full details.

## Ansvar MCP Network

This server is part of the [Ansvar MCP Network](https://ansvar.ai/mcp) -- a collection of MCP servers covering EU regulations, national law, security frameworks, OWASP standards, and IT quality frameworks.

## Development

### Branch Strategy

```
feature-branch -> PR to dev -> verify on dev -> PR to main -> deploy
```

All changes target the `dev` branch first. The `main` branch triggers npm publish and Vercel deployment.

### Setup

```bash
git clone https://github.com/Ansvar-Systems/it-quality-mcp.git
cd it-quality-mcp
git checkout dev
npm install
npm run build
npm test
npm run test:contract
```

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Compile TypeScript |
| `npm run build:db` | Build SQLite database from seed data |
| `npm test` | Run unit tests (91 tests) |
| `npm run test:contract` | Run contract tests (16 tests) |
| `npm run validate` | Build + unit tests + contract tests |
| `npm run dev` | Run MCP server with tsx |
| `npm start` | Run compiled MCP server |

## License

[Apache License 2.0](LICENSE) -- Copyright 2026 Ansvar Systems AB.

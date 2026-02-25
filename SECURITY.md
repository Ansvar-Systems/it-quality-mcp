# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Email:** security@ansvar.eu

**Do NOT:**
- Open a public GitHub issue for security vulnerabilities
- Disclose vulnerabilities publicly before they are fixed

**Response time:** We aim to acknowledge reports within 48 hours and provide a fix timeline within 7 days.

## Scope

This policy covers the `@ansvar/it-quality-mcp` npm package and its source code.

## Security Scanning

This repository uses automated security scanning:
- CodeQL (weekly + on push/PR)
- Semgrep (on push/PR)
- Trivy (weekly container scanning)
- Gitleaks (secret detection on push/PR)
- OSSF Scorecard (weekly)
- Dependabot (weekly dependency updates)

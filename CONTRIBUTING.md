# Contributing to IT Quality MCP

Thank you for your interest in contributing to the IT Quality MCP.

## How to Contribute

### Reporting Issues

- Use the [GitHub Issues](https://github.com/Ansvar-Systems/it-quality-mcp/issues) tracker
- Search existing issues before creating a new one
- Include reproduction steps, expected behavior, and actual behavior

### Submitting Changes

1. **Fork** the repository
2. **Branch** from `dev` (never from `main`)
3. **Make your changes** with clear, descriptive commits
4. **Run tests** before submitting:
   ```bash
   npm run build
   npm test
   npm run test:contract
   ```
5. **Open a Pull Request** targeting the `dev` branch

### Branch Strategy

```
feature-branch -> PR to dev -> verify on dev -> PR to main -> deploy
```

- `main` is production-ready. Only receives merges from `dev` via PR.
- `dev` is the integration branch. All changes land here first.
- Feature branches are created from `dev` for individual tasks.

### Code Standards

- TypeScript strict mode
- All tools must have unit tests
- New tools must be added to the golden contract tests (`fixtures/golden-tests.json`)
- No copyrighted standard text in the database -- only our own structured metadata

### Data Contributions

If you want to add a new framework or update existing data:

1. Add or update seed files in `data/seed/`
2. Rebuild the database: `npm run build:db`
3. Add corresponding tool tests
4. Update `COVERAGE.md` and `TOOLS.md`

## Developer Certificate of Origin (DCO)

By contributing to this project, you agree that your contributions are your own original work and that you have the right to submit them under the Apache 2.0 license. All contributions are subject to the [Apache License 2.0](LICENSE).

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Questions?

Open a [Discussion](https://github.com/Ansvar-Systems/it-quality-mcp/discussions) or reach out at hello@ansvar.ai.

# Open Source Release Preparation Design

**Date:** 2026-01-19
**Status:** Approved
**Goal:** Prepare clockwork-mcp for full open source release with community adoption, contributions, and professional credibility in mind.

## Scope

Three targeted improvements to address gaps before release:

1. **ESLint v9 Migration** — Fix broken linting configuration
2. **GitHub Templates** — Add issue and PR templates for contributors
3. **CHANGELOG Sync** — Document v0.1.1 release properly

## 1. ESLint v9 Migration

### Problem

ESLint v9.39.2 is installed but the project lacks `eslint.config.js` (flat config format). The `npm run lint` command fails.

### Solution

Create `eslint.config.js` with:
- `@eslint/js` recommended rules
- `typescript-eslint` for TypeScript support
- Target `src/**/*.ts` files only
- Ignore `dist/`, `node_modules/`, `coverage/`

Key rules:
- No unused variables (allow underscore-prefixed args)
- No explicit `any` (warning level)
- Consistent type imports
- No console statements (warning)

### CI Integration

Add lint step to `.github/workflows/ci.yml` after typecheck:
```yaml
- name: Lint
  run: npm run lint
```

## 2. GitHub Templates

### Structure

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── PULL_REQUEST_TEMPLATE.md
```

### Bug Report Template

Fields:
- clockwork-mcp version
- Node.js version
- Laravel/Clockwork version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Additional context

### Feature Request Template

Fields:
- Use case / problem description
- Proposed solution (optional)
- Alternatives considered (optional)

### PR Template

Checklist:
- [ ] Description of changes
- [ ] Tests added/updated
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test:run` passes
- Related issue (if any)

## 3. CHANGELOG Sync

### Problem

`package.json` shows v0.1.1 but `CHANGELOG.md` only documents v0.1.0.

### Solution

Add entry for v0.1.1 based on commits since v0.1.0:

```markdown
## [0.1.1] - 2026-01-XX

### Added
- Usage examples section in README

### Fixed
- mcpServers wrapper in .mcp.json schema
- Source path reference
- Plugin discovery via marketplace.json
```

## Out of Scope

Per decision, the following are not included:
- Coverage threshold enforcement
- Pre-commit hooks (husky/lint-staged)
- GitHub FUNDING.yml

## Success Criteria

- [ ] `npm run lint` passes
- [ ] CI workflow includes lint step and passes
- [ ] GitHub issue templates appear when creating new issues
- [ ] GitHub PR template appears when creating new PRs
- [ ] CHANGELOG.md documents both v0.1.0 and v0.1.1

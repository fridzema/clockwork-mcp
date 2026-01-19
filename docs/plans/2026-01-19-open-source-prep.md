# Open Source Release Preparation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare clockwork-mcp for full open source release by fixing ESLint, adding GitHub templates, and syncing the changelog.

**Architecture:** Three independent improvements that can be implemented and committed separately. No code changes to the main application - only configuration and documentation.

**Tech Stack:** ESLint v9 flat config, TypeScript-ESLint v8, GitHub Markdown templates

---

## Task 1: ESLint v9 Flat Config Migration

**Files:**
- Create: `eslint.config.js`
- Modify: `.github/workflows/ci.yml:29` (add lint step)

### Step 1: Create eslint.config.js

Create file `eslint.config.js` with this exact content:

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.config.js'],
  }
);
```

### Step 2: Install missing dependency

Run:
```bash
npm install -D @eslint/js typescript-eslint
```

Expected: Packages added to devDependencies

### Step 3: Run lint to verify configuration works

Run:
```bash
npm run lint
```

Expected: Either PASS with no errors, or warnings only (no configuration errors). If there are lint errors, fix them before proceeding.

### Step 4: Add lint step to CI workflow

Modify `.github/workflows/ci.yml` - add after "Type check" step (line 30):

```yaml
      - name: Lint
        run: npm run lint
```

### Step 5: Commit ESLint changes

Run:
```bash
git add eslint.config.js package.json package-lock.json .github/workflows/ci.yml
git commit -m "build: migrate to ESLint v9 flat config

- Add eslint.config.js with typescript-eslint support
- Add @eslint/js and typescript-eslint dependencies
- Add lint step to CI workflow"
```

---

## Task 2: GitHub Issue and PR Templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

### Step 1: Create bug report template

Create file `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug Report
about: Report a bug to help us improve
title: ''
labels: bug
assignees: ''
---

## Environment

- **clockwork-mcp version:**
- **Node.js version:**
- **Laravel version:**
- **Clockwork version:**
- **OS:**

## Description

A clear description of the bug.

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Additional Context

Any other context, logs, or screenshots.
```

### Step 2: Create feature request template

Create file `.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature Request
about: Suggest a new feature or improvement
title: ''
labels: enhancement
assignees: ''
---

## Use Case

Describe the problem or use case this feature would address.

## Proposed Solution

If you have a specific solution in mind, describe it here.

## Alternatives Considered

Any alternative solutions or features you've considered.

## Additional Context

Any other context or examples.
```

### Step 3: Create PR template

Create file `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Description

Brief description of the changes.

## Related Issue

Fixes #(issue number)

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other (describe):

## Checklist

- [ ] I have read the [CONTRIBUTING](CONTRIBUTING.md) guidelines
- [ ] My code follows the project's code style
- [ ] I have added tests for my changes
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test:run` passes
- [ ] I have updated documentation if needed
```

### Step 4: Commit GitHub templates

Run:
```bash
git add .github/ISSUE_TEMPLATE/ .github/PULL_REQUEST_TEMPLATE.md
git commit -m "docs: add GitHub issue and PR templates

- Add bug report template with environment details
- Add feature request template
- Add PR template with checklist"
```

---

## Task 3: CHANGELOG Version Sync

**Files:**
- Modify: `CHANGELOG.md:5` (add v0.1.1 section)

### Step 1: Add v0.1.1 entry to CHANGELOG

Insert after line 4 (before the 0.1.0 section) in `CHANGELOG.md`:

```markdown
## [0.1.1] - 2026-01-16

### Added
- Usage examples section in README

### Fixed
- mcpServers wrapper in .mcp.json schema
- Source path reference for relative imports
- Plugin discovery via marketplace.json

```

### Step 2: Commit CHANGELOG update

Run:
```bash
git add CHANGELOG.md
git commit -m "docs: add v0.1.1 to CHANGELOG"
```

---

## Verification

After all tasks are complete, verify:

1. **Lint passes:**
   ```bash
   npm run lint
   ```

2. **All tests pass:**
   ```bash
   npm run test:run
   ```

3. **Typecheck passes:**
   ```bash
   npm run typecheck
   ```

4. **Build succeeds:**
   ```bash
   npm run build
   ```

5. **Git status is clean:**
   ```bash
   git status
   ```

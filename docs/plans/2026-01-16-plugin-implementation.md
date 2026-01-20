# Implementation Plan: Claude Code Plugin for clockwork-mcp

## Overview

Add Claude Code plugin structure to clockwork-mcp so users can install with:
```
/plugin install github:fridzema/clockwork-mcp
```

## Tasks

---

### Task 1: Create plugin manifest

**File:** `.claude-plugin/plugin.json`

**Create directory and file:**

```bash
mkdir -p .claude-plugin
```

**Content:**

```json
{
  "name": "clockwork",
  "description": "Debug Laravel apps with Clockwork - N+1 detection, slow queries, performance analysis",
  "version": "0.1.0",
  "author": {
    "name": "Robert Fridzema"
  },
  "repository": "https://github.com/fridzema/clockwork-mcp",
  "license": "MIT"
}
```

**Verification:** File exists at `.claude-plugin/plugin.json`

---

### Task 2: Create MCP server configuration

**File:** `.mcp.json` (at project root, NOT inside .claude-plugin)

**Content:**

```json
{
  "clockwork": {
    "command": "npx",
    "args": ["-y", "clockwork-mcp"]
  }
}
```

**Verification:** File exists at `.mcp.json`

---

### Task 3: Create /clockwork:status command

**File:** `commands/status.md`

**Create directory:**

```bash
mkdir -p commands
```

**Content:**

```markdown
---
description: Check Clockwork storage status and statistics
---

Use the `get_clockwork_status` MCP tool to check the Clockwork storage.

Output a summary in this format:

## Clockwork Status

- **Storage found:** Yes/No
- **Path:** /path/to/storage/clockwork
- **Total requests:** N
- **Oldest request:** YYYY-MM-DD HH:MM:SS
- **Newest request:** YYYY-MM-DD HH:MM:SS
- **Storage size:** X.XX MB

If storage is not found, suggest checking that:
1. Clockwork is installed (`composer require itsgoingd/clockwork`)
2. The Laravel app has made requests with Clockwork enabled
3. You're in the Laravel project directory
```

**Verification:** File exists at `commands/status.md`

---

### Task 4: Create /clockwork:latest command

**File:** `commands/latest.md`

**Content:**

```markdown
---
description: Show summary of the most recent request
---

Use the `get_latest_request` MCP tool to get the most recent Clockwork request.

Output a summary in this format:

## Latest Request

**[METHOD] /uri/path** → STATUS (XXXms)

| Metric | Value |
|--------|-------|
| Controller | ControllerName@action |
| Duration | XXX ms |
| Memory | XX.X MB |
| Queries | N queries (XXX ms total) |
| Cache | N hits, N misses |

### Middleware
- middleware1
- middleware2

If there are any errors in the logs, show them:

### Errors
- Error message here

If no requests are found, suggest making a request to the Laravel app first.
```

**Verification:** File exists at `commands/latest.md`

---

### Task 5: Create /clockwork:slow command

**File:** `commands/slow.md`

**Content:**

```markdown
---
description: Find slow queries (>100ms) in the latest request
---

First use `get_latest_request` to get the latest request ID.
Then use `analyze_slow_queries` with that request ID and threshold of 100ms.

Output a summary in this format:

## Slow Queries (>100ms)

Found N slow queries in request [METHOD] /uri/path

| # | Duration | Query |
|---|----------|-------|
| 1 | XXX ms | SELECT ... |
| 2 | XXX ms | UPDATE ... |

### Recommendations
- Add indexes for frequently queried columns
- Consider caching for repeated queries
- Use eager loading to reduce query count

If no slow queries are found, output:

## Slow Queries (>100ms)

No slow queries found in the latest request. All queries executed under 100ms.
```

**Verification:** File exists at `commands/slow.md`

---

### Task 6: Create /clockwork:n+1 command

**File:** `commands/n+1.md`

**Content:**

```markdown
---
description: Detect N+1 query patterns in the latest request
---

First use `get_latest_request` to get the latest request ID.
Then use `detect_n_plus_one` with that request ID.

Output a summary in this format:

## N+1 Query Detection

Found N potential N+1 patterns in request [METHOD] /uri/path

### Pattern 1: X occurrences
```sql
SELECT * FROM table WHERE id = ?
```
**Fix:** Use eager loading with `->with('relation')` or `->load('relation')`

### Pattern 2: Y occurrences
```sql
SELECT * FROM other_table WHERE foreign_id = ?
```
**Fix:** Add to your eager loading chain

## How to Fix N+1 Queries

In your controller or query:
```php
// Before (N+1)
$users = User::all();
foreach ($users as $user) {
    echo $user->posts; // Triggers query for each user
}

// After (eager loaded)
$users = User::with('posts')->get();
foreach ($users as $user) {
    echo $user->posts; // No additional queries
}
```

If no N+1 patterns are found, output:

## N+1 Query Detection

No N+1 patterns detected in the latest request.
```

**Verification:** File exists at `commands/n+1.md`

---

### Task 7: Update package.json

**File:** `package.json`

**Changes:**
1. Update `author` field to `"Robert Fridzema"`
2. Update `repository.url` to `"git+https://github.com/fridzema/clockwork-mcp.git"`
3. Add `"homepage": "https://github.com/fridzema/clockwork-mcp#readme"`
4. Update `files` array to include plugin files: `["dist", ".claude-plugin", ".mcp.json", "commands"]`

**Verification:** `npm run build` succeeds

---

### Task 8: Update README with plugin installation

**File:** `README.md`

**Add new section after "Quick Start" heading, before the existing "1. Install Clockwork":**

```markdown
## Installation

### Option 1: Claude Code Plugin (Recommended)

```
/plugin install github:fridzema/clockwork-mcp
```

This installs the MCP server and adds convenience commands:
- `/clockwork:status` - Check storage status
- `/clockwork:latest` - Show latest request summary
- `/clockwork:slow` - Find slow queries
- `/clockwork:n+1` - Detect N+1 patterns

### Option 2: Manual MCP Configuration

Add to your Claude Code MCP settings:
```

**Then update the existing "Configure Claude Code" section to be under Option 2.**

**Verification:** README renders correctly

---

### Task 9: Update .gitignore

**File:** `.gitignore`

**Ensure these are NOT ignored (plugin files should be committed):**
- `.claude-plugin/`
- `.mcp.json`
- `commands/`

**Verification:** `git status` shows new plugin files as untracked

---

### Task 10: Commit plugin structure

**Commands:**

```bash
git add .claude-plugin/ .mcp.json commands/ package.json README.md
git commit -m "feat: add Claude Code plugin structure

- Add plugin manifest (.claude-plugin/plugin.json)
- Add MCP server config (.mcp.json)
- Add slash commands: status, latest, slow, n+1
- Update README with plugin installation instructions"
```

**Verification:** `git status` shows clean working directory

---

### Task 11: Publish to npm

**Commands:**

```bash
npm version patch  # or keep 0.1.0 if first publish
npm publish
```

**Verification:** Package visible at https://www.npmjs.com/package/clockwork-mcp

---

### Task 12: Push to GitHub

**Commands:**

```bash
git push origin main
git push origin --tags
```

**Verification:**
- GitHub repo shows new commits
- `/plugin install github:fridzema/clockwork-mcp` works in Claude Code

---

## Summary

**Files to create:**
- `.claude-plugin/plugin.json`
- `.mcp.json`
- `commands/status.md`
- `commands/latest.md`
- `commands/slow.md`
- `commands/n+1.md`

**Files to update:**
- `package.json`
- `README.md`

**Total tasks:** 12

**After completion, users install with:**
```
/plugin install github:fridzema/clockwork-mcp
```

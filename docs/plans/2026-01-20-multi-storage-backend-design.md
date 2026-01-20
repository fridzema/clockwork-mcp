# Multi-Storage Backend Support

**Date:** 2026-01-20
**Status:** Approved

## Problem

The MCP server currently only supports file-based storage, reading directly from `storage/clockwork/*.json`. However, Laravel's Clockwork package supports multiple storage backends:

- File (default)
- SQLite
- MySQL
- PostgreSQL
- Redis

Users who configure Clockwork to use SQL or Redis storage cannot use this MCP server.

## Solution

Replace direct file I/O with `php artisan tinker` commands that use Clockwork's own storage classes. This enables support for all storage backends with zero new Node.js dependencies.

### Architecture

**Current:**
```
MCP Server → reads files directly → storage/clockwork/*.json
```

**New:**
```
MCP Server → runs artisan tinker → Clockwork storage classes → any backend
```

### Why Artisan Tinker?

1. **Zero dependencies** - No new npm packages (no `better-sqlite3`, `mysql2`, `pg`, `ioredis`)
2. **Zero user setup** - No artisan commands to install in Laravel app
3. **Full backend support** - Works with File, SQLite, MySQL, PostgreSQL, Redis automatically
4. **Uses Clockwork's code** - No reimplementation of storage reading logic
5. **Auto-detects config** - Uses whatever storage is configured in `config/clockwork.php`
6. **Works offline** - Doesn't require the Laravel web server to be running

## Implementation

### PHP Commands

Each storage operation maps to a tinker command:

```bash
# Get single request
php artisan tinker --execute="echo json_encode(app('clockwork')->storage()->find('request-id')?->toArray());"

# Get latest request
php artisan tinker --execute="echo json_encode(app('clockwork')->storage()->latest()?->toArray());"

# List all requests
php artisan tinker --execute="echo json_encode(array_map(fn(\$r) => \$r->toArray(), app('clockwork')->storage()->all()));"

# Batch fetch multiple requests
php artisan tinker --execute="echo json_encode(array_map(fn(\$id) => app('clockwork')->storage()->find(\$id)?->toArray(), ['id1','id2','id3']));"
```

### File Structure

```
src/storage/
├── locator.ts          # existing - finds Laravel project
├── reader.ts           # existing - file-based reading (kept as fallback)
├── index-parser.ts     # existing - parses file index (kept as fallback)
├── artisan.ts          # NEW - executes artisan tinker commands
└── storage.ts          # NEW - unified interface, auto-selects method
```

### New Module: `artisan.ts`

Responsibilities:
- `executePhp(projectPath, phpCode)` - runs tinker, returns parsed JSON
- `getRequest(projectPath, id)` - wraps `find()` call
- `getLatestRequest(projectPath)` - wraps `latest()` call
- `getRequests(projectPath, ids)` - batch fetch multiple requests
- `listRequests(projectPath, search?)` - wraps `all()` call

### New Module: `storage.ts`

Unified storage interface:
- `createStorage(options)` - factory that returns storage interface
- Auto-detects whether to use artisan or file-based method
- Consistent API regardless of underlying method:
  - `storage.find(id)`
  - `storage.latest()`
  - `storage.list(search?)`
  - `storage.previous(id, count)`

### Detection Flow

1. Check `CLOCKWORK_STORAGE_DRIVER` env var → if set, use that method
2. Detect Laravel project root (existing `locator.ts` logic)
3. Verify `php` and `artisan` are available
4. Use artisan-based storage

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `CLOCKWORK_STORAGE_DRIVER` | Force specific driver | `artisan`, `file` |
| `CLOCKWORK_PROJECT_PATH` | Laravel project path (existing) | `/path/to/laravel` |
| `CLOCKWORK_PHP_PATH` | Custom PHP binary path | `/usr/local/bin/php` |

Most users need zero configuration.

### Error Handling

The Node.js side will:
1. Capture both stdout and stderr from PHP execution
2. Parse stdout as JSON
3. If JSON parsing fails or stderr contains errors, throw descriptive error
4. Handle common issues: PHP not found, artisan not found, Clockwork not installed

### Performance

Each artisan tinker call has ~200-500ms overhead (PHP bootstrap). For operations needing multiple requests, batch them into a single tinker call.

## Testing

### Test Files

```
src/storage/
├── artisan.test.ts     # NEW - tests PHP execution, output parsing
├── storage.test.ts     # NEW - tests unified interface, auto-detection
├── reader.test.ts      # existing - keeps testing file-based reading
```

### Test Scenarios

**artisan.ts:**
- Successful PHP execution returns parsed JSON
- PHP syntax errors produce clear error messages
- Missing artisan file detected and reported
- Timeout handling for hung PHP processes
- Batch operations combine multiple requests correctly

**storage.ts:**
- Auto-detection selects correct storage method
- Falls back appropriately when artisan unavailable
- Unified interface returns consistent data structures

## Migration

1. Build new artisan-based storage alongside existing file-based code
2. Update tools to use new unified `storage.ts` interface
3. Keep file-based code available via `CLOCKWORK_STORAGE_DRIVER=file`
4. No breaking changes to MCP tool interfaces

## Outcome

After implementation:
- Users with file storage: works
- Users with SQLite storage: works
- Users with MySQL storage: works
- Users with PostgreSQL storage: works
- Users with Redis storage: works

All without any user configuration changes - the MCP server automatically uses whatever backend Clockwork is configured to use.

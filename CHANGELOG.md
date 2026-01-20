# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-01-20

### Added
- Multi-request analysis support for all analysis commands
  - New scope parameters: `count`, `since`, `all`, `uri`, `requestId`
  - Time duration parsing: `30m`, `1h`, `2d`, `1w`
  - Results aggregated by query pattern across multiple requests
  - Max 100 HTTP requests per analysis (artisan commands excluded from limit)
- `/clockwork:slow` now supports analyzing multiple requests with pattern grouping
- `/clockwork:n+1` now supports analyzing multiple requests with pattern grouping
- New utility functions: `parseTimeDuration()`, `filterRequestsByScope()`

### Changed
- `analyze_slow_queries` returns aggregated results with summary statistics
- `detect_n_plus_one` returns aggregated results with summary statistics
- Both tools now show affected requests for each pattern

## [0.2.4] - 2026-01-20

### Fixed
- SQL storage memory exhaustion: Use `previous()` instead of `all()` to avoid loading all requests into memory
  - Clockwork's `SqlStorage::all()` doesn't support pagination, causing OOM on large datasets
  - Now uses `latest()` + `previous()` which properly uses SQL LIMIT

## [0.2.3] - 2026-01-20

### Fixed
- Shell escaping issues with multi-line PHP code in artisan commands

## [0.2.2] - 2026-01-20

### Fixed
- Memory exhaustion when listing requests via artisan (only extract index fields, limit to 100)

## [0.2.1] - 2026-01-20

### Fixed
- Duplicate shebang in build output causing MCP server startup failure

## [0.2.0] - 2026-01-20

### Added
- Multi-storage backend support via `php artisan tinker`
  - File storage (default)
  - SQLite
  - MySQL
  - PostgreSQL
  - Redis
- Unified Storage interface for consistent data access
- Auto-detection of Laravel project and storage driver
- New environment variables:
  - `CLOCKWORK_STORAGE_DRIVER` - Force storage driver (`artisan` or `file`)
  - `CLOCKWORK_PHP_PATH` - Custom PHP binary path
- Integration tests for artisan storage driver

### Changed
- All tools now use the unified Storage interface
- Improved storage auto-detection (prefers artisan driver when Laravel project found)

## [0.1.1] - 2026-01-16

### Added
- Usage examples section in README

### Fixed
- mcpServers wrapper in .mcp.json schema
- Source path reference for relative imports
- Plugin discovery via marketplace.json

## [0.1.0] - 2026-01-16

### Added
- Initial release
- Request discovery tools (list, get, search)
- Database analysis tools (queries, slow queries, N+1 detection)
- Performance tools (summary, timeline, compare)
- Cache and Redis tools
- Context tools (logs, events, views, HTTP requests)
- Artisan command tools
- Utility tools (status, request flow)
- Auto-detection of Laravel Clockwork storage
- Full test coverage

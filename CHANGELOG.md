# Changelog

All notable changes to this project will be documented in this file.

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

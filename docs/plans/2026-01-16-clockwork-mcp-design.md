# Clockwork MCP Design Document

**Date:** 2026-01-16
**Status:** Approved
**Author:** Claude (with human collaboration)

## Overview

An MCP server that gives Claude Code deep insight into Laravel application runtime via Clockwork data. Enables debugging, performance analysis, and understanding request flow.

**Project Name:** `clockwork-mcp`
**License:** MIT
**Stack:** TypeScript + Official MCP SDK

## Goals

1. **Debugging assistant** - Help debug slow queries, N+1 problems, cache misses, errors
2. **Performance monitoring** - Track response times, query counts, memory usage trends
3. **Development companion** - Understand request flow, see runtime behavior during development

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Claude Code                        │
└─────────────────────┬───────────────────────────────┘
                      │ MCP Protocol (stdio)
┌─────────────────────▼───────────────────────────────┐
│               clockwork-mcp server                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Storage   │  │   Parser    │  │  Analyzer   │  │
│  │   Locator   │  │  (JSON→TS)  │  │  (Insights) │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │ File System
┌─────────────────────▼───────────────────────────────┐
│            storage/clockwork/                        │
│  ├── index (CSV request registry)                   │
│  ├── {request-id}.json                              │
│  └── ...                                            │
└─────────────────────────────────────────────────────┘
```

**Key Components:**
- **Storage Locator:** Auto-detects Laravel project and Clockwork storage path, with env override
- **Parser:** Reads and parses Clockwork JSON files into typed TypeScript objects
- **Analyzer:** Provides smart analysis functions (N+1 detection, slow query analysis, etc.)
- **Tools:** MCP tools that expose capabilities to Claude

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data access | Direct file storage | Fastest, works offline, no server needed, Claude Code already has filesystem access |
| Tool approach | Comprehensive (22 tools) | LLMs work better with specific, well-named tools |
| Stack | TypeScript + MCP SDK | Best documentation, type safety, easy npm publishing |
| Analysis level | Raw data + smart analysis | Flexibility for investigation, efficiency for common tasks |
| Storage location | Auto-detect with override | Zero-config for standard setups, flexible for edge cases |
| Request types (v1) | HTTP + Artisan | Covers 90%+ of debugging scenarios |
| Behavior | Reactive only | Simple, predictable, avoids alert fatigue |

## MCP Tools (22 total)

### Request Discovery (4 tools)

| Tool | Description |
|------|-------------|
| `list_requests` | List recent requests with filtering (type, status, uri, time range). Returns summary: id, method, uri, status, duration. |
| `get_request` | Get full details of a specific request by ID. Returns all Clockwork data for that request. |
| `get_latest_request` | Get the most recent request. Shortcut for common debugging flow. |
| `search_requests` | Search requests by controller, uri pattern, status code, or duration threshold. |

### Database Analysis (4 tools)

| Tool | Description |
|------|-------------|
| `get_queries` | Get all database queries for a request. Includes SQL, bindings, duration, connection. |
| `analyze_slow_queries` | Find queries exceeding threshold (default 100ms). Groups by query pattern, shows frequency. |
| `detect_n_plus_one` | Analyze queries for N+1 patterns. Returns detected patterns with query, count, and affected models. |
| `get_query_stats` | Aggregate stats: total queries, total time, slowest query, queries by table. |

### Performance Analysis (3 tools)

| Tool | Description |
|------|-------------|
| `get_performance_summary` | Overview: response time, memory, query count, cache hits/misses for a request or time range. |
| `get_timeline` | Get timeline events for a request. Shows execution flow with durations. |
| `compare_requests` | Compare two requests side-by-side: duration diff, query diff, memory diff. |

### Cache & Redis (3 tools)

| Tool | Description |
|------|-------------|
| `get_cache_operations` | Get cache queries for a request: reads, writes, hits, misses, deletes. |
| `get_cache_stats` | Aggregate cache stats: hit ratio, most accessed keys, total operations. |
| `get_redis_commands` | Get Redis commands executed during a request with duration. |

### Application Context (4 tools)

| Tool | Description |
|------|-------------|
| `get_logs` | Get log entries for a request. Filter by level (debug, info, warning, error). |
| `get_events` | Get dispatched events for a request with listeners and payload summary. |
| `get_views` | Get rendered views for a request with render time and data passed. |
| `get_http_requests` | Get outgoing HTTP requests made during the request (Guzzle, Http facade). |

### Artisan Commands (2 tools)

| Tool | Description |
|------|-------------|
| `list_commands` | List profiled Artisan command executions with exit codes and duration. |
| `get_command` | Get full details of a command execution: arguments, options, output, queries, logs. |

### Utility (2 tools)

| Tool | Description |
|------|-------------|
| `get_clockwork_status` | Check if Clockwork storage is found, return stats: request count, date range, storage size. |
| `explain_request_flow` | High-level summary of what happened in a request: route → middleware → controller → queries → response. |

## Core Data Types

```typescript
// Request types
type RequestType = 'request' | 'command' | 'queue-job' | 'test';

interface ClockworkRequest {
  id: string;
  type: RequestType;
  time: number;

  // HTTP request specific
  method?: string;
  uri?: string;
  url?: string;
  controller?: string;
  responseStatus?: number;
  responseDuration?: number;
  memoryUsage?: number;
  middleware?: string[];

  // Command specific
  commandName?: string;
  commandArguments?: Record<string, unknown>;
  commandExitCode?: number;
  commandOutput?: string;

  // Collected data
  databaseQueries?: DatabaseQuery[];
  cacheQueries?: CacheQuery[];
  redisCommands?: RedisCommand[];
  log?: LogEntry[];
  events?: Event[];
  views?: View[];
  timelineData?: TimelineEvent[];
  httpRequests?: OutgoingHttpRequest[];
}

interface DatabaseQuery {
  query: string;
  bindings?: unknown[];
  duration: number;
  connection?: string;
  file?: string;
  line?: number;
  model?: string;
}

interface CacheQuery {
  type: 'hit' | 'miss' | 'write' | 'delete';
  key: string;
  value?: unknown;
  duration?: number;
}

interface TimelineEvent {
  description: string;
  start: number;
  end: number;
  duration: number;
  color?: string;
}

interface LogEntry {
  level: string;
  message: string;
  context?: Record<string, unknown>;
  time?: number;
}

interface Event {
  event: string;
  listeners?: string[];
  data?: unknown;
  time?: number;
}

interface View {
  name: string;
  data?: Record<string, unknown>;
  duration?: number;
}

interface RedisCommand {
  command: string;
  parameters?: unknown[];
  duration?: number;
}

interface OutgoingHttpRequest {
  method: string;
  url: string;
  duration?: number;
  responseStatus?: number;
}
```

## Repository Structure

```
clockwork-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── server.ts             # MCP server setup and tool registration
│   ├── storage/
│   │   ├── locator.ts        # Auto-detect Laravel project & storage path
│   │   ├── reader.ts         # Read & parse Clockwork JSON files
│   │   └── index-parser.ts   # Parse the CSV index file
│   ├── types/
│   │   ├── clockwork.ts      # Clockwork data types
│   │   └── tools.ts          # Tool input/output types
│   ├── tools/
│   │   ├── requests.ts       # Request discovery tools
│   │   ├── database.ts       # Database analysis tools
│   │   ├── performance.ts    # Performance analysis tools
│   │   ├── cache.ts          # Cache & Redis tools
│   │   ├── context.ts        # App context tools (logs, events, views)
│   │   ├── commands.ts       # Artisan command tools
│   │   └── utility.ts        # Utility tools
│   └── analyzers/
│       ├── n-plus-one.ts     # N+1 query detection logic
│       ├── slow-queries.ts   # Slow query analysis
│       └── patterns.ts       # Query pattern grouping
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE                   # MIT
├── CONTRIBUTING.md
├── CHANGELOG.md
└── .github/
    └── workflows/
        └── ci.yml            # Build, lint, test on PR
```

## Configuration

### Installation (Claude Code)

```json
{
  "mcpServers": {
    "clockwork": {
      "command": "npx",
      "args": ["-y", "clockwork-mcp"],
      "env": {
        "CLOCKWORK_STORAGE_PATH": "/optional/custom/path"
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLOCKWORK_STORAGE_PATH` | Auto-detect | Explicit path to Clockwork storage directory |
| `CLOCKWORK_PROJECT_PATH` | `cwd` | Laravel project root (for auto-detection) |
| `CLOCKWORK_SLOW_THRESHOLD` | `100` | Default slow query threshold in ms |
| `CLOCKWORK_MAX_REQUESTS` | `100` | Max requests returned by list operations |

### Auto-detection Logic

1. Check `CLOCKWORK_STORAGE_PATH` env var
2. Check `CLOCKWORK_PROJECT_PATH/storage/clockwork/`
3. Look for `storage/clockwork/` in current directory
4. Traverse up to find Laravel project (look for `artisan` file)
5. If found, use `{project}/storage/clockwork/`

## Dependencies

**Runtime:**
- `@modelcontextprotocol/sdk` - Official MCP SDK
- `zod` - Schema validation for tool inputs

**Development:**
- `typescript`
- `tsup` - Build tool
- `vitest` - Testing
- `eslint` + `prettier` - Linting/formatting

## Out of Scope (v1)

- Queue job profiling
- Test profiling
- REST API connection (only file storage)
- Proactive alerting/notifications
- Browser extension integration

## Future Considerations (v2+)

- Queue job and test profiling support
- REST API connection for remote debugging
- Proactive alerts when errors/slow requests detected
- Integration with Laravel Telescope data
- Query optimization suggestions

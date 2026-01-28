# clockwork-mcp

[![CI](https://github.com/fridzema/clockwork-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/fridzema/clockwork-mcp/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/clockwork-mcp.svg)](https://www.npmjs.com/package/clockwork-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for Laravel Clockwork - debug Laravel apps with Claude Code.

## What it does

This MCP server gives Claude Code access to your Laravel application's Clockwork debugging data, enabling:

- **Debugging** - Find slow queries, N+1 problems, cache issues, errors
- **Performance analysis** - Track response times, query counts, memory usage
- **Development insight** - Understand request flow, see runtime behavior

## Installation

### Option 1: Claude Code Plugin (Recommended)

```
/marketplace add github:fridzema/clockwork-mcp
/plugin install clockwork
```

This installs the MCP server and adds convenience commands:
- `/clockwork:status` - Check storage status
- `/clockwork:latest` - Show latest request summary
- `/clockwork:slow` - Find slow queries
- `/clockwork:n+1` - Detect N+1 patterns

### Option 2: Manual MCP Configuration

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "clockwork": {
      "command": "npx",
      "args": ["-y", "clockwork-mcp"]
    }
  }
}
```

## Quick Start

### 1. Install Clockwork in your Laravel app

```bash
composer require itsgoingd/clockwork
```

### 2. Start debugging

Ask Claude to analyze your requests:

- "Show me the latest request"
- "Find slow queries in the last request"
- "Check for N+1 query problems"
- "Compare this request with the previous one"

Or use the slash commands:
- `/clockwork:status`
- `/clockwork:latest`
- `/clockwork:slow`
- `/clockwork:n+1`

## Usage Examples

### Debugging a Slow Endpoint

```
You: "The /api/orders endpoint is slow, can you analyze it?"
```

Claude will use the MCP tools to:
1. Find the latest request to `/api/orders`
2. Analyze query performance
3. Detect N+1 patterns
4. Suggest fixes like eager loading or caching

### Investigating a 500 Error

```
You: "I just got a 500 error on the checkout page, what happened?"
```

Claude will:
1. Find the latest failed request
2. Show error logs and exception details
3. Identify the problematic code path

### Optimizing Database Queries

```
You: "Check if there are N+1 issues on the products page"
```

Claude will:
1. Analyze recent requests to the products route
2. Detect repeated query patterns
3. Suggest eager loading with `->with('relation')`

### More Natural Language Examples

**Performance:**
- "Compare the last two requests to /api/users"
- "Which queries are taking the longest?"
- "Show me the cache hit ratio"

**Debugging:**
- "What middleware ran on the last request?"
- "Show me all log entries with errors"
- "List the events that were dispatched"

**Analysis:**
- "Give me a performance summary of the latest request"
- "Show the full request timeline"
- "What views were rendered?"

**Exception & Error Analysis:**
- "Show me exception patterns from the last hour"
- "What errors have been occurring?"
- "Group recent exceptions by type"

**Route Performance:**
- "Which routes are slowest? Show p95 response times"
- "Analyze route performance for the past day"
- "Compare response times across endpoints"

**Memory Issues:**
- "Are there any memory issues?"
- "Detect memory leaks or growth patterns"
- "Which requests are using the most memory?"

**Queue Jobs:**
- "List failed queue jobs"
- "Show me recent job executions"
- "What jobs are pending?"

**Test Execution:**
- "List recent test runs"
- "Show failed tests"
- "What tests are being skipped?"

## Tools

### Request Discovery
| Tool | Description |
|------|-------------|
| `list_requests` | List recent requests with filtering |
| `get_request` | Get full request details by ID |
| `get_latest_request` | Get the most recent request |
| `search_requests` | Search by controller, URI, status, duration |

### Database Analysis
| Tool | Description |
|------|-------------|
| `get_queries` | Get all database queries for a request |
| `analyze_slow_queries` | Find queries above threshold |
| `detect_n_plus_one` | Detect N+1 query patterns |
| `get_query_stats` | Get aggregate query statistics |

### Performance
| Tool | Description |
|------|-------------|
| `get_performance_summary` | Response time, memory, query overview |
| `get_timeline` | Execution timeline events |
| `compare_requests` | Compare two requests side by side |

### Cache & Redis
| Tool | Description |
|------|-------------|
| `get_cache_operations` | Cache hits, misses, writes |
| `get_cache_stats` | Hit ratio and totals |
| `get_redis_commands` | Redis commands executed |

### Application Context
| Tool | Description |
|------|-------------|
| `get_logs` | Log entries with level filtering |
| `get_events` | Dispatched events and listeners |
| `get_views` | Rendered views |
| `get_http_requests` | Outgoing HTTP requests |

### Artisan Commands
| Tool | Description |
|------|-------------|
| `list_commands` | List profiled command executions |
| `get_command` | Full command execution details |

### Traces & Execution Flow
| Tool | Description |
|------|-------------|
| `get_call_graph` | Hierarchical execution tree from timeline events |
| `get_query_stack_trace` | Source location for a database query |
| `get_log_stack_trace` | Source location for a log entry |

### Profiling (Xdebug)
| Tool | Description |
|------|-------------|
| `get_xdebug_profile` | Xdebug profiling data (stub) |
| `get_xdebug_hotspots` | Xdebug hotspots (stub) |

### Queue Jobs
| Tool | Description |
|------|-------------|
| `list_queue_jobs` | List queue jobs with filtering |
| `get_queue_job` | Full queue job details |

### Test Execution
| Tool | Description |
|------|-------------|
| `list_tests` | List test executions with filtering |
| `get_test` | Full test execution details |

### Request Context
| Tool | Description |
|------|-------------|
| `get_auth_user` | Authenticated user for a request |
| `get_session_data` | Session data for a request |
| `get_middleware_chain` | Middleware chain for a request |
| `get_route_details` | Route details for a request |

### Multi-Request Analysis
| Tool | Description |
|------|-------------|
| `analyze_exceptions` | Group exceptions by message pattern |
| `analyze_route_performance` | Route performance with percentiles (p50/p95/p99) |
| `detect_memory_issues` | Detect high memory usage and growth patterns |

### Utility
| Tool | Description |
|------|-------------|
| `get_clockwork_status` | Storage status and statistics |
| `explain_request_flow` | High-level request summary |

## Configuration

### Storage Backends

By default, Clockwork MCP auto-detects your Laravel project and uses `php artisan tinker` to read Clockwork data. This works with **all** Clockwork storage backends:

- File (default)
- SQLite
- MySQL
- PostgreSQL
- Redis

When you configure Clockwork to use SQL or Redis storage in your Laravel app (`config/clockwork.php`), the MCP server automatically uses the same storage by running PHP commands through `artisan tinker`. No additional configuration required.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLOCKWORK_PROJECT_PATH` | Auto-detect | Path to Laravel project root |
| `CLOCKWORK_STORAGE_DRIVER` | Auto-detect | Force storage driver (`artisan` or `file`) |
| `CLOCKWORK_PHP_PATH` | `php` | Custom PHP binary path |
| `CLOCKWORK_STORAGE_PATH` | Auto-detect | Direct path to storage (file driver only) |

### Auto-detection

The MCP server automatically finds Clockwork storage by:
1. Checking `CLOCKWORK_PROJECT_PATH` environment variable
2. Looking for Laravel project (has `artisan` file) in current directory
3. Traversing up to find a Laravel project

When a Laravel project is found, the **artisan driver** is used by default, which supports all Clockwork storage backends. The **file driver** is used as a fallback when only a direct storage path is available.

## Requirements

- Node.js 18+
- Laravel project with Clockwork installed
- Claude Code with MCP support

## License

MIT

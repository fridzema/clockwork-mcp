# clockwork-mcp

[![npm version](https://badge.fury.io/js/clockwork-mcp.svg)](https://www.npmjs.com/package/clockwork-mcp)
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
/plugin install github:fridzema/clockwork-mcp
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

### Utility
| Tool | Description |
|------|-------------|
| `get_clockwork_status` | Storage status and statistics |
| `explain_request_flow` | High-level request summary |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLOCKWORK_STORAGE_PATH` | Auto-detect | Path to Clockwork storage |
| `CLOCKWORK_PROJECT_PATH` | cwd | Laravel project root |

### Auto-detection

The MCP server automatically finds Clockwork storage by:
1. Checking `CLOCKWORK_STORAGE_PATH` environment variable
2. Looking for `storage/clockwork/` in current directory
3. Traversing up to find a Laravel project (has `artisan` file)

## Requirements

- Node.js 18+
- Laravel project with Clockwork installed
- Claude Code with MCP support

## License

MIT

---
description: Find slow queries (>100ms) in recent requests
---

Use the `analyze_slow_queries` MCP tool to find slow database queries.

## Scope Options

By default, analyzes only the latest request. Use these options to analyze multiple requests:

- `count`: Number of recent HTTP requests (e.g., `count: 10`)
- `since`: Time duration to look back (e.g., `since: "1h"`, `since: "30m"`, `since: "2d"`)
- `all`: Analyze all available requests (max 100)
- `uri`: Filter by URI pattern (e.g., `uri: "/api/users"`)
- `requestId`: Analyze specific request by ID

Examples:
- Latest request only: `analyze_slow_queries` (no scope params)
- Last 10 requests: `analyze_slow_queries` with `count: 10`
- Last hour: `analyze_slow_queries` with `since: "1h"`
- Specific endpoint: `analyze_slow_queries` with `count: 20, uri: "/api/orders"`

## Output Format

For single request:

## Slow Queries (>100ms)

Found N slow queries in request [METHOD] /uri/path

| # | Duration | Query |
|---|----------|-------|
| 1 | XXX ms | SELECT ... |

For multiple requests:

## Slow Queries (>100ms) - Last N Requests

Analyzed N requests, found M slow queries in K requests

### Pattern 1: X occurrences (max XXX ms)
```sql
SELECT * FROM table WHERE column = ?
```
Affected: GET /api/users (3x), POST /api/orders (2x)

### Pattern 2: Y occurrences (max XXX ms)
```sql
UPDATE table SET column = ? WHERE id = ?
```
Affected: PUT /api/users/1

### Recommendations
- Add indexes for frequently queried columns
- Consider caching for repeated queries
- Use eager loading to reduce query count

If no slow queries are found:

## Slow Queries (>100ms)

No slow queries found. All queries executed under 100ms.

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

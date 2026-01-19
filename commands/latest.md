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

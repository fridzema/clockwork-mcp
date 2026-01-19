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

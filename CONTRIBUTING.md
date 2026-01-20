# Contributing to clockwork-mcp

Thank you for your interest in contributing!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/clockwork-mcp.git
   cd clockwork-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Testing Locally with Claude Code

1. Build the project:
   ```bash
   npm run build
   ```

2. Add to your Claude Code MCP settings:
   ```json
   {
     "mcpServers": {
       "clockwork-dev": {
         "command": "node",
         "args": ["/path/to/clockwork-mcp/dist/index.js"],
         "env": {
           "CLOCKWORK_STORAGE_PATH": "/path/to/your/laravel/storage/clockwork"
         }
       }
     }
   }
   ```

3. Restart Claude Code and test your changes.

## Pull Request Guidelines

1. **Fork and branch** - Create a feature branch from `main`
2. **Write tests** - All new features should have tests
3. **Run checks** - Ensure `npm test` and `npm run build` pass
4. **Conventional commits** - Use conventional commit messages:
   - `feat: add new feature`
   - `fix: resolve bug`
   - `docs: update documentation`
   - `chore: maintenance tasks`

## Code Style

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting

Run all checks before submitting:
```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:run
```

## Debugging MCP Tools

When developing or debugging MCP tools, you can test them in isolation:

1. **Use the test fixtures** - See `src/__fixtures__/` for sample Clockwork data
2. **Write unit tests** - Each tool has a corresponding `.test.ts` file
3. **Test with a real Laravel app** - Point `CLOCKWORK_STORAGE_PATH` to your app's storage

Example test setup:
```typescript
import { describe, it, expect } from 'vitest';
import { getLatestRequest } from './tools/requests';

describe('getLatestRequest', () => {
  it('returns null for empty storage', () => {
    const result = getLatestRequest('/path/to/empty/storage');
    expect(result).toBeNull();
  });
});
```

## Testing with a Real Laravel App

1. Install Clockwork in your Laravel app:
   ```bash
   composer require itsgoingd/clockwork
   ```

2. Make some requests to generate profiling data

3. Set the storage path and run the MCP server:
   ```bash
   CLOCKWORK_STORAGE_PATH=/path/to/laravel/storage/clockwork node dist/index.js
   ```

4. Or add to your Claude Code MCP config for interactive testing

## Troubleshooting

### "Clockwork storage not found" error

The MCP server looks for Clockwork storage in this order:
1. `CLOCKWORK_STORAGE_PATH` environment variable
2. `CLOCKWORK_PROJECT_PATH` + `/storage/clockwork`
3. Current directory's `storage/clockwork`
4. Traversing up to find a Laravel project with `storage/clockwork`

Fix: Set `CLOCKWORK_STORAGE_PATH` explicitly, or run from your Laravel project directory.

### Tests failing with file not found

Make sure you're running tests from the project root:
```bash
npm run test:run
```

The test fixtures use relative paths from the project root.

### Build errors after changes

1. Clean the build:
   ```bash
   rm -rf dist/
   npm run build
   ```

2. Check for type errors:
   ```bash
   npm run typecheck
   ```

## Questions?

Open an issue for discussion before starting major changes.

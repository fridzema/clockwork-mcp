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
- Prettier for formatting (if configured)

## Questions?

Open an issue for discussion before starting major changes.

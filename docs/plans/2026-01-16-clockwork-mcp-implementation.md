# Clockwork MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server that gives Claude Code access to Laravel Clockwork debugging data.

**Architecture:** TypeScript MCP server using stdio transport. Reads Clockwork JSON files directly from `storage/clockwork/`. Auto-detects Laravel projects with env override. 22 tools organized by domain.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, zod, tsup (build), vitest (test)

---

## Phase 1: Project Setup

### Task 1: Initialize npm package

**Files:**
- Create: `package.json`

**Step 1: Initialize package.json**

```bash
npm init -y
```

**Step 2: Update package.json with correct metadata**

Replace contents of `package.json`:

```json
{
  "name": "clockwork-mcp",
  "version": "0.1.0",
  "description": "MCP server for Laravel Clockwork - debug Laravel apps with Claude Code",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "clockwork-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["mcp", "clockwork", "laravel", "debugging", "claude", "ai"],
  "author": "",
  "license": "MIT",
  "engines": {
    "node": ">=18"
  },
  "files": ["dist"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/clockwork-mcp.git"
  }
}
```

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: initialize npm package"
```

---

### Task 2: Add dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install production dependencies**

```bash
npm install @modelcontextprotocol/sdk zod
```

**Step 2: Install dev dependencies**

```bash
npm install -D typescript tsup vitest @types/node eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add dependencies"
```

---

### Task 3: Configure TypeScript

**Files:**
- Create: `tsconfig.json`

**Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "chore: configure TypeScript"
```

---

### Task 4: Configure tsup build

**Files:**
- Create: `tsup.config.ts`

**Step 1: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

**Step 2: Commit**

```bash
git add tsup.config.ts
git commit -m "chore: configure tsup build"
```

---

### Task 5: Configure vitest

**Files:**
- Create: `vitest.config.ts`

**Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
```

**Step 2: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: configure vitest"
```

---

### Task 6: Create directory structure

**Files:**
- Create: `src/index.ts` (placeholder)
- Create: `src/types/clockwork.ts` (placeholder)

**Step 1: Create directories and placeholder files**

```bash
mkdir -p src/storage src/types src/tools src/analyzers
```

**Step 2: Create minimal entry point**

Create `src/index.ts`:

```typescript
console.log('clockwork-mcp');
```

**Step 3: Verify build works**

```bash
npm run build
```

Expected: Build succeeds, creates `dist/index.js`

**Step 4: Commit**

```bash
git add src/
git commit -m "chore: create directory structure"
```

---

## Phase 2: Core Types

### Task 7: Define Clockwork request types

**Files:**
- Create: `src/types/clockwork.ts`

**Step 1: Create the Clockwork types file**

```typescript
export type RequestType = 'request' | 'command' | 'queue-job' | 'test';

export interface DatabaseQuery {
  query: string;
  bindings?: unknown[];
  duration: number;
  connection?: string;
  file?: string;
  line?: number;
  model?: string;
  tags?: string[];
}

export interface CacheQuery {
  type: 'hit' | 'miss' | 'write' | 'delete' | 'read';
  key: string;
  value?: unknown;
  duration?: number;
  connection?: string;
}

export interface RedisCommand {
  command: string;
  parameters?: unknown[];
  duration?: number;
  connection?: string;
}

export interface LogEntry {
  level: string;
  message: string;
  context?: Record<string, unknown>;
  time?: number;
  file?: string;
  line?: number;
}

export interface TimelineEvent {
  description: string;
  start: number;
  end: number;
  duration: number;
  color?: string;
  data?: Record<string, unknown>;
}

export interface DispatchedEvent {
  event: string;
  listeners?: string[];
  data?: unknown;
  time?: number;
  duration?: number;
}

export interface RenderedView {
  name: string;
  path?: string;
  data?: Record<string, unknown>;
  duration?: number;
}

export interface OutgoingHttpRequest {
  method: string;
  url: string;
  duration?: number;
  responseStatus?: number;
  request?: {
    headers?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    headers?: Record<string, string>;
    body?: unknown;
  };
}

export interface ClockworkRequest {
  id: string;
  version: number;
  type: RequestType;
  time: number;

  // HTTP request fields
  method?: string;
  uri?: string;
  url?: string;
  controller?: string;
  headers?: Record<string, string>;
  getData?: Record<string, unknown>;
  postData?: Record<string, unknown>;
  requestData?: Record<string, unknown>;
  responseStatus?: number;
  responseDuration?: number;
  memoryUsage?: number;
  middleware?: string[];

  // Route info
  route?: string;
  routeName?: string;

  // Command fields
  commandName?: string;
  commandArguments?: Record<string, unknown>;
  commandArgumentsDefaults?: Record<string, unknown>;
  commandOptions?: Record<string, unknown>;
  commandOptionsDefaults?: Record<string, unknown>;
  commandExitCode?: number;
  commandOutput?: string;

  // Collected data
  databaseQueries?: DatabaseQuery[];
  databaseQueriesCount?: number;
  databaseSlowQueries?: number;
  databaseSelects?: number;
  databaseInserts?: number;
  databaseUpdates?: number;
  databaseDeletes?: number;
  databaseOthers?: number;
  databaseDuration?: number;

  cacheQueries?: CacheQuery[];
  cacheReads?: number;
  cacheHits?: number;
  cacheWrites?: number;
  cacheDeletes?: number;
  cacheDuration?: number;

  redisCommands?: RedisCommand[];

  log?: LogEntry[];

  events?: DispatchedEvent[];

  views?: RenderedView[];
  viewsData?: RenderedView[];

  timelineData?: TimelineEvent[];

  httpRequests?: OutgoingHttpRequest[];

  // User info
  authenticatedUser?: {
    id?: string | number;
    email?: string;
    name?: string;
    [key: string]: unknown;
  };

  // Session
  sessionData?: Record<string, unknown>;
}

export interface IndexEntry {
  id: string;
  time: number;
  method?: string;
  uri?: string;
  controller?: string;
  responseStatus?: number;
  responseDuration?: number;
  type: RequestType;
  commandName?: string;
}
```

**Step 2: Commit**

```bash
git add src/types/clockwork.ts
git commit -m "feat: add Clockwork data types"
```

---

### Task 8: Define tool input/output types

**Files:**
- Create: `src/types/tools.ts`

**Step 1: Create the tool types file**

```typescript
import { z } from 'zod';

// Common schemas
export const requestIdSchema = z.string().describe('Clockwork request ID');

export const timeRangeSchema = z.object({
  from: z.number().optional().describe('Unix timestamp start'),
  to: z.number().optional().describe('Unix timestamp end'),
});

export const paginationSchema = z.object({
  limit: z.number().default(20).describe('Max results to return'),
  offset: z.number().default(0).describe('Number of results to skip'),
});

// Request discovery tool schemas
export const listRequestsSchema = z.object({
  type: z.enum(['request', 'command']).optional().describe('Filter by request type'),
  status: z.number().optional().describe('Filter by HTTP status code'),
  uri: z.string().optional().describe('Filter by URI pattern (substring match)'),
  method: z.string().optional().describe('Filter by HTTP method'),
  ...timeRangeSchema.shape,
  ...paginationSchema.shape,
});

export const searchRequestsSchema = z.object({
  controller: z.string().optional().describe('Filter by controller name'),
  uri: z.string().optional().describe('Filter by URI pattern'),
  status: z.number().optional().describe('Filter by HTTP status code'),
  minDuration: z.number().optional().describe('Minimum response duration in ms'),
  maxDuration: z.number().optional().describe('Maximum response duration in ms'),
  ...paginationSchema.shape,
});

// Database tool schemas
export const getQueriesSchema = z.object({
  requestId: requestIdSchema,
  slow: z.boolean().optional().describe('Only return slow queries'),
  threshold: z.number().optional().describe('Slow query threshold in ms'),
});

export const analyzeSlowQueriesSchema = z.object({
  requestId: requestIdSchema.optional().describe('Analyze specific request, or all recent if omitted'),
  threshold: z.number().default(100).describe('Slow query threshold in ms'),
  limit: z.number().default(20).describe('Max queries to return'),
});

export const detectNPlusOneSchema = z.object({
  requestId: requestIdSchema,
  threshold: z.number().default(2).describe('Min repetitions to flag as N+1'),
});

export const getQueryStatsSchema = z.object({
  requestId: requestIdSchema.optional().describe('Stats for specific request, or aggregate if omitted'),
  ...timeRangeSchema.shape,
});

// Performance tool schemas
export const getPerformanceSummarySchema = z.object({
  requestId: requestIdSchema.optional(),
  ...timeRangeSchema.shape,
});

export const getTimelineSchema = z.object({
  requestId: requestIdSchema,
});

export const compareRequestsSchema = z.object({
  requestId1: requestIdSchema.describe('First request ID'),
  requestId2: requestIdSchema.describe('Second request ID'),
});

// Cache tool schemas
export const getCacheOperationsSchema = z.object({
  requestId: requestIdSchema,
});

export const getCacheStatsSchema = z.object({
  requestId: requestIdSchema.optional(),
  ...timeRangeSchema.shape,
});

export const getRedisCommandsSchema = z.object({
  requestId: requestIdSchema,
});

// Context tool schemas
export const getLogsSchema = z.object({
  requestId: requestIdSchema,
  level: z.enum(['debug', 'info', 'warning', 'error']).optional().describe('Minimum log level'),
});

export const getEventsSchema = z.object({
  requestId: requestIdSchema,
});

export const getViewsSchema = z.object({
  requestId: requestIdSchema,
});

export const getHttpRequestsSchema = z.object({
  requestId: requestIdSchema,
});

// Command tool schemas
export const listCommandsSchema = z.object({
  name: z.string().optional().describe('Filter by command name'),
  ...timeRangeSchema.shape,
  ...paginationSchema.shape,
});

export const getCommandSchema = z.object({
  requestId: requestIdSchema,
});

// Export all schema types
export type ListRequestsInput = z.infer<typeof listRequestsSchema>;
export type SearchRequestsInput = z.infer<typeof searchRequestsSchema>;
export type GetQueriesInput = z.infer<typeof getQueriesSchema>;
export type AnalyzeSlowQueriesInput = z.infer<typeof analyzeSlowQueriesSchema>;
export type DetectNPlusOneInput = z.infer<typeof detectNPlusOneSchema>;
export type GetQueryStatsInput = z.infer<typeof getQueryStatsSchema>;
export type GetPerformanceSummaryInput = z.infer<typeof getPerformanceSummarySchema>;
export type GetTimelineInput = z.infer<typeof getTimelineSchema>;
export type CompareRequestsInput = z.infer<typeof compareRequestsSchema>;
export type GetCacheOperationsInput = z.infer<typeof getCacheOperationsSchema>;
export type GetCacheStatsInput = z.infer<typeof getCacheStatsSchema>;
export type GetRedisCommandsInput = z.infer<typeof getRedisCommandsSchema>;
export type GetLogsInput = z.infer<typeof getLogsSchema>;
export type GetEventsInput = z.infer<typeof getEventsSchema>;
export type GetViewsInput = z.infer<typeof getViewsSchema>;
export type GetHttpRequestsInput = z.infer<typeof getHttpRequestsSchema>;
export type ListCommandsInput = z.infer<typeof listCommandsSchema>;
export type GetCommandInput = z.infer<typeof getCommandSchema>;
```

**Step 2: Commit**

```bash
git add src/types/tools.ts
git commit -m "feat: add tool input/output schemas"
```

---

### Task 9: Create types barrel export

**Files:**
- Create: `src/types/index.ts`

**Step 1: Create barrel export**

```typescript
export * from './clockwork.js';
export * from './tools.js';
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "chore: add types barrel export"
```

---

## Phase 3: Storage Layer

### Task 10: Implement storage locator with tests

**Files:**
- Create: `src/storage/locator.ts`
- Create: `src/storage/locator.test.ts`

**Step 1: Write the failing test**

Create `src/storage/locator.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findStoragePath, isLaravelProject } from './locator.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Storage Locator', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('isLaravelProject', () => {
    it('returns true when artisan file exists', () => {
      writeFileSync(join(testDir, 'artisan'), '<?php');
      expect(isLaravelProject(testDir)).toBe(true);
    });

    it('returns false when artisan file does not exist', () => {
      expect(isLaravelProject(testDir)).toBe(false);
    });
  });

  describe('findStoragePath', () => {
    it('returns env path when CLOCKWORK_STORAGE_PATH is set', () => {
      const envPath = join(testDir, 'custom-storage');
      mkdirSync(envPath, { recursive: true });

      const result = findStoragePath({ CLOCKWORK_STORAGE_PATH: envPath });
      expect(result).toBe(envPath);
    });

    it('returns null when env path does not exist', () => {
      const result = findStoragePath({ CLOCKWORK_STORAGE_PATH: '/nonexistent/path' });
      expect(result).toBeNull();
    });

    it('finds storage/clockwork in Laravel project', () => {
      writeFileSync(join(testDir, 'artisan'), '<?php');
      const storagePath = join(testDir, 'storage', 'clockwork');
      mkdirSync(storagePath, { recursive: true });

      const result = findStoragePath({}, testDir);
      expect(result).toBe(storagePath);
    });

    it('returns null when no storage found', () => {
      const result = findStoragePath({}, testDir);
      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/storage/locator.test.ts
```

Expected: FAIL with "Cannot find module './locator.js'"

**Step 3: Write minimal implementation**

Create `src/storage/locator.ts`:

```typescript
import { existsSync } from 'fs';
import { join, dirname } from 'path';

export interface LocatorEnv {
  CLOCKWORK_STORAGE_PATH?: string;
  CLOCKWORK_PROJECT_PATH?: string;
}

export function isLaravelProject(dir: string): boolean {
  return existsSync(join(dir, 'artisan'));
}

export function findStoragePath(env: LocatorEnv = {}, cwd?: string): string | null {
  // 1. Check explicit env path
  if (env.CLOCKWORK_STORAGE_PATH) {
    if (existsSync(env.CLOCKWORK_STORAGE_PATH)) {
      return env.CLOCKWORK_STORAGE_PATH;
    }
    return null;
  }

  // 2. Check project path from env
  if (env.CLOCKWORK_PROJECT_PATH) {
    const storagePath = join(env.CLOCKWORK_PROJECT_PATH, 'storage', 'clockwork');
    if (existsSync(storagePath)) {
      return storagePath;
    }
  }

  // 3. Check current directory
  const startDir = cwd || process.cwd();
  const cwdStorage = join(startDir, 'storage', 'clockwork');
  if (existsSync(cwdStorage)) {
    return cwdStorage;
  }

  // 4. Traverse up to find Laravel project
  let currentDir = startDir;
  const root = dirname(currentDir);

  while (currentDir !== root) {
    if (isLaravelProject(currentDir)) {
      const storagePath = join(currentDir, 'storage', 'clockwork');
      if (existsSync(storagePath)) {
        return storagePath;
      }
    }
    currentDir = dirname(currentDir);
  }

  return null;
}

export function getStoragePathOrThrow(env: LocatorEnv = {}, cwd?: string): string {
  const path = findStoragePath(env, cwd);
  if (!path) {
    throw new Error(
      'Clockwork storage not found. Ensure you are in a Laravel project with Clockwork installed, ' +
      'or set CLOCKWORK_STORAGE_PATH environment variable.'
    );
  }
  return path;
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/storage/locator.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/storage/locator.ts src/storage/locator.test.ts
git commit -m "feat: implement storage locator with auto-detection"
```

---

### Task 11: Implement index parser with tests

**Files:**
- Create: `src/storage/index-parser.ts`
- Create: `src/storage/index-parser.test.ts`

**Step 1: Write the failing test**

Create `src/storage/index-parser.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseIndex } from './index-parser.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Index Parser', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-index-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('parses HTTP request entries', () => {
    const indexContent = [
      '1705312345-abc123\t1705312345\tGET\t/api/users\tUserController@index\t200\t45.5\trequest',
      '1705312346-def456\t1705312346\tPOST\t/api/users\tUserController@store\t201\t120.3\trequest',
    ].join('\n');

    writeFileSync(join(testDir, 'index'), indexContent);

    const entries = parseIndex(testDir);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      id: '1705312345-abc123',
      time: 1705312345,
      method: 'GET',
      uri: '/api/users',
      controller: 'UserController@index',
      responseStatus: 200,
      responseDuration: 45.5,
      type: 'request',
    });
  });

  it('parses command entries', () => {
    const indexContent = '1705312345-abc123\t1705312345\t\tmigrate\t\t0\t500\tcommand';
    writeFileSync(join(testDir, 'index'), indexContent);

    const entries = parseIndex(testDir);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      id: '1705312345-abc123',
      time: 1705312345,
      method: undefined,
      uri: undefined,
      controller: undefined,
      responseStatus: 0,
      responseDuration: 500,
      type: 'command',
      commandName: 'migrate',
    });
  });

  it('returns empty array when index does not exist', () => {
    const entries = parseIndex(testDir);
    expect(entries).toEqual([]);
  });

  it('returns entries in reverse chronological order', () => {
    const indexContent = [
      '1705312345-abc\t1705312345\tGET\t/first\t\t200\t10\trequest',
      '1705312347-ghi\t1705312347\tGET\t/third\t\t200\t10\trequest',
      '1705312346-def\t1705312346\tGET\t/second\t\t200\t10\trequest',
    ].join('\n');

    writeFileSync(join(testDir, 'index'), indexContent);

    const entries = parseIndex(testDir);

    expect(entries[0].uri).toBe('/third');
    expect(entries[1].uri).toBe('/second');
    expect(entries[2].uri).toBe('/first');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/storage/index-parser.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/storage/index-parser.ts`:

```typescript
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { IndexEntry, RequestType } from '../types/clockwork.js';

export function parseIndex(storagePath: string): IndexEntry[] {
  const indexPath = join(storagePath, 'index');

  if (!existsSync(indexPath)) {
    return [];
  }

  const content = readFileSync(indexPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  const entries: IndexEntry[] = lines.map(line => {
    const parts = line.split('\t');
    const type = parts[7] as RequestType;

    const entry: IndexEntry = {
      id: parts[0],
      time: parseFloat(parts[1]),
      type,
      responseStatus: parts[5] ? parseInt(parts[5], 10) : undefined,
      responseDuration: parts[6] ? parseFloat(parts[6]) : undefined,
    };

    if (type === 'command') {
      entry.commandName = parts[3] || undefined;
    } else {
      entry.method = parts[2] || undefined;
      entry.uri = parts[3] || undefined;
      entry.controller = parts[4] || undefined;
    }

    return entry;
  });

  // Sort by time descending (most recent first)
  return entries.sort((a, b) => b.time - a.time);
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/storage/index-parser.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/storage/index-parser.ts src/storage/index-parser.test.ts
git commit -m "feat: implement index parser"
```

---

### Task 12: Implement request reader with tests

**Files:**
- Create: `src/storage/reader.ts`
- Create: `src/storage/reader.test.ts`

**Step 1: Write the failing test**

Create `src/storage/reader.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readRequest, requestExists } from './reader.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Request Reader', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-reader-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('requestExists', () => {
    it('returns true when request file exists', () => {
      writeFileSync(join(testDir, 'abc123.json'), '{}');
      expect(requestExists(testDir, 'abc123')).toBe(true);
    });

    it('returns false when request file does not exist', () => {
      expect(requestExists(testDir, 'nonexistent')).toBe(false);
    });
  });

  describe('readRequest', () => {
    it('reads and parses request JSON', () => {
      const request = {
        id: 'abc123',
        type: 'request',
        time: 1705312345,
        method: 'GET',
        uri: '/api/users',
        responseStatus: 200,
        responseDuration: 45.5,
        databaseQueries: [
          { query: 'SELECT * FROM users', duration: 5.2 }
        ],
      };

      writeFileSync(join(testDir, 'abc123.json'), JSON.stringify(request));

      const result = readRequest(testDir, 'abc123');

      expect(result).toEqual(request);
    });

    it('returns null when request does not exist', () => {
      const result = readRequest(testDir, 'nonexistent');
      expect(result).toBeNull();
    });

    it('handles malformed JSON gracefully', () => {
      writeFileSync(join(testDir, 'bad.json'), 'not valid json');

      expect(() => readRequest(testDir, 'bad')).toThrow();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/storage/reader.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/storage/reader.ts`:

```typescript
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ClockworkRequest } from '../types/clockwork.js';

export function requestExists(storagePath: string, requestId: string): boolean {
  const filePath = join(storagePath, `${requestId}.json`);
  return existsSync(filePath);
}

export function readRequest(storagePath: string, requestId: string): ClockworkRequest | null {
  const filePath = join(storagePath, `${requestId}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as ClockworkRequest;
}

export function readRequests(storagePath: string, requestIds: string[]): ClockworkRequest[] {
  const requests: ClockworkRequest[] = [];

  for (const id of requestIds) {
    const request = readRequest(storagePath, id);
    if (request) {
      requests.push(request);
    }
  }

  return requests;
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/storage/reader.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/storage/reader.ts src/storage/reader.test.ts
git commit -m "feat: implement request reader"
```

---

### Task 13: Create storage barrel export

**Files:**
- Create: `src/storage/index.ts`

**Step 1: Create barrel export**

```typescript
export * from './locator.js';
export * from './index-parser.js';
export * from './reader.js';
```

**Step 2: Commit**

```bash
git add src/storage/index.ts
git commit -m "chore: add storage barrel export"
```

---

## Phase 4: Analyzers

### Task 14: Implement N+1 query detector with tests

**Files:**
- Create: `src/analyzers/n-plus-one.ts`
- Create: `src/analyzers/n-plus-one.test.ts`

**Step 1: Write the failing test**

Create `src/analyzers/n-plus-one.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { detectNPlusOne, normalizeQuery } from './n-plus-one.js';
import type { DatabaseQuery } from '../types/clockwork.js';

describe('N+1 Query Detector', () => {
  describe('normalizeQuery', () => {
    it('replaces numeric values with ?', () => {
      const query = 'SELECT * FROM users WHERE id = 123';
      expect(normalizeQuery(query)).toBe('SELECT * FROM users WHERE id = ?');
    });

    it('replaces string values with ?', () => {
      const query = "SELECT * FROM users WHERE email = 'test@example.com'";
      expect(normalizeQuery(query)).toBe('SELECT * FROM users WHERE email = ?');
    });

    it('replaces IN clauses with ?', () => {
      const query = 'SELECT * FROM users WHERE id IN (1, 2, 3)';
      expect(normalizeQuery(query)).toBe('SELECT * FROM users WHERE id IN (?)');
    });
  });

  describe('detectNPlusOne', () => {
    it('detects repeated queries', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM posts WHERE user_id = 1', duration: 5 },
        { query: 'SELECT * FROM posts WHERE user_id = 2', duration: 5 },
        { query: 'SELECT * FROM posts WHERE user_id = 3', duration: 5 },
      ];

      const result = detectNPlusOne(queries, 2);

      expect(result).toHaveLength(1);
      expect(result[0].pattern).toBe('SELECT * FROM posts WHERE user_id = ?');
      expect(result[0].count).toBe(3);
      expect(result[0].totalDuration).toBe(15);
    });

    it('does not flag queries below threshold', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM posts WHERE user_id = 1', duration: 5 },
        { query: 'SELECT * FROM posts WHERE user_id = 2', duration: 5 },
      ];

      const result = detectNPlusOne(queries, 3);

      expect(result).toHaveLength(0);
    });

    it('groups by normalized pattern', () => {
      const queries: DatabaseQuery[] = [
        { query: "SELECT * FROM users WHERE email = 'a@test.com'", duration: 5 },
        { query: "SELECT * FROM users WHERE email = 'b@test.com'", duration: 5 },
        { query: 'SELECT * FROM posts WHERE id = 1', duration: 3 },
        { query: 'SELECT * FROM posts WHERE id = 2', duration: 3 },
        { query: 'SELECT * FROM posts WHERE id = 3', duration: 3 },
      ];

      const result = detectNPlusOne(queries, 2);

      expect(result).toHaveLength(2);
    });

    it('includes example queries in result', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM posts WHERE user_id = 1', duration: 5 },
        { query: 'SELECT * FROM posts WHERE user_id = 2', duration: 5 },
        { query: 'SELECT * FROM posts WHERE user_id = 3', duration: 5 },
      ];

      const result = detectNPlusOne(queries, 2);

      expect(result[0].examples).toHaveLength(3);
      expect(result[0].examples).toContain('SELECT * FROM posts WHERE user_id = 1');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/analyzers/n-plus-one.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/analyzers/n-plus-one.ts`:

```typescript
import type { DatabaseQuery } from '../types/clockwork.js';

export interface NPlusOnePattern {
  pattern: string;
  count: number;
  totalDuration: number;
  examples: string[];
}

export function normalizeQuery(query: string): string {
  return query
    // Replace string literals
    .replace(/'[^']*'/g, '?')
    // Replace numeric values
    .replace(/\b\d+\b/g, '?')
    // Normalize IN clauses
    .replace(/IN\s*\([^)]+\)/gi, 'IN (?)');
}

export function detectNPlusOne(queries: DatabaseQuery[], threshold: number = 2): NPlusOnePattern[] {
  const patterns = new Map<string, { count: number; totalDuration: number; examples: string[] }>();

  for (const query of queries) {
    const normalized = normalizeQuery(query.query);

    if (!patterns.has(normalized)) {
      patterns.set(normalized, { count: 0, totalDuration: 0, examples: [] });
    }

    const pattern = patterns.get(normalized)!;
    pattern.count++;
    pattern.totalDuration += query.duration;
    pattern.examples.push(query.query);
  }

  const results: NPlusOnePattern[] = [];

  for (const [pattern, data] of patterns) {
    if (data.count >= threshold) {
      results.push({
        pattern,
        count: data.count,
        totalDuration: data.totalDuration,
        examples: data.examples,
      });
    }
  }

  // Sort by count descending
  return results.sort((a, b) => b.count - a.count);
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/analyzers/n-plus-one.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/analyzers/n-plus-one.ts src/analyzers/n-plus-one.test.ts
git commit -m "feat: implement N+1 query detector"
```

---

### Task 15: Implement slow query analyzer with tests

**Files:**
- Create: `src/analyzers/slow-queries.ts`
- Create: `src/analyzers/slow-queries.test.ts`

**Step 1: Write the failing test**

Create `src/analyzers/slow-queries.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { analyzeSlowQueries, groupByPattern } from './slow-queries.js';
import type { DatabaseQuery } from '../types/clockwork.js';

describe('Slow Query Analyzer', () => {
  describe('analyzeSlowQueries', () => {
    it('filters queries above threshold', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM users', duration: 50 },
        { query: 'SELECT * FROM posts', duration: 150 },
        { query: 'SELECT * FROM comments', duration: 200 },
      ];

      const result = analyzeSlowQueries(queries, 100);

      expect(result).toHaveLength(2);
      expect(result[0].query).toBe('SELECT * FROM comments');
      expect(result[1].query).toBe('SELECT * FROM posts');
    });

    it('returns empty array when no slow queries', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM users', duration: 5 },
        { query: 'SELECT * FROM posts', duration: 10 },
      ];

      const result = analyzeSlowQueries(queries, 100);

      expect(result).toHaveLength(0);
    });

    it('sorts by duration descending', () => {
      const queries: DatabaseQuery[] = [
        { query: 'Query A', duration: 150 },
        { query: 'Query B', duration: 300 },
        { query: 'Query C', duration: 200 },
      ];

      const result = analyzeSlowQueries(queries, 100);

      expect(result[0].duration).toBe(300);
      expect(result[1].duration).toBe(200);
      expect(result[2].duration).toBe(150);
    });
  });

  describe('groupByPattern', () => {
    it('groups queries by normalized pattern', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM users WHERE id = 1', duration: 100 },
        { query: 'SELECT * FROM users WHERE id = 2', duration: 150 },
        { query: 'SELECT * FROM posts WHERE id = 1', duration: 200 },
      ];

      const result = groupByPattern(queries);

      expect(result).toHaveLength(2);

      const userPattern = result.find(g => g.pattern.includes('users'));
      expect(userPattern?.count).toBe(2);
      expect(userPattern?.totalDuration).toBe(250);
      expect(userPattern?.avgDuration).toBe(125);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/analyzers/slow-queries.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/analyzers/slow-queries.ts`:

```typescript
import type { DatabaseQuery } from '../types/clockwork.js';
import { normalizeQuery } from './n-plus-one.js';

export interface QueryGroup {
  pattern: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  examples: DatabaseQuery[];
}

export function analyzeSlowQueries(queries: DatabaseQuery[], threshold: number): DatabaseQuery[] {
  return queries
    .filter(q => q.duration >= threshold)
    .sort((a, b) => b.duration - a.duration);
}

export function groupByPattern(queries: DatabaseQuery[]): QueryGroup[] {
  const groups = new Map<string, {
    count: number;
    totalDuration: number;
    maxDuration: number;
    examples: DatabaseQuery[];
  }>();

  for (const query of queries) {
    const pattern = normalizeQuery(query.query);

    if (!groups.has(pattern)) {
      groups.set(pattern, {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        examples: [],
      });
    }

    const group = groups.get(pattern)!;
    group.count++;
    group.totalDuration += query.duration;
    group.maxDuration = Math.max(group.maxDuration, query.duration);
    group.examples.push(query);
  }

  const results: QueryGroup[] = [];

  for (const [pattern, data] of groups) {
    results.push({
      pattern,
      count: data.count,
      totalDuration: data.totalDuration,
      avgDuration: data.totalDuration / data.count,
      maxDuration: data.maxDuration,
      examples: data.examples,
    });
  }

  return results.sort((a, b) => b.totalDuration - a.totalDuration);
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/analyzers/slow-queries.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/analyzers/slow-queries.ts src/analyzers/slow-queries.test.ts
git commit -m "feat: implement slow query analyzer"
```

---

### Task 16: Create analyzers barrel export

**Files:**
- Create: `src/analyzers/index.ts`

**Step 1: Create barrel export**

```typescript
export * from './n-plus-one.js';
export * from './slow-queries.js';
```

**Step 2: Commit**

```bash
git add src/analyzers/index.ts
git commit -m "chore: add analyzers barrel export"
```

---

## Phase 5: MCP Tools (Part 1 - Request Discovery)

### Task 17: Implement request discovery tools

**Files:**
- Create: `src/tools/requests.ts`
- Create: `src/tools/requests.test.ts`

**Step 1: Write the failing test**

Create `src/tools/requests.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listRequests, getRequest, getLatestRequest, searchRequests } from './requests.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Request Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-requests-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create index
    const indexContent = [
      '1705312347-third\t1705312347\tPOST\t/api/users\tUserController@store\t201\t120\trequest',
      '1705312346-second\t1705312346\tGET\t/api/users\tUserController@index\t200\t45\trequest',
      '1705312345-first\t1705312345\tGET\t/\tHomeController@index\t200\t30\trequest',
    ].join('\n');
    writeFileSync(join(testDir, 'index'), indexContent);

    // Create request files
    writeFileSync(join(testDir, '1705312345-first.json'), JSON.stringify({
      id: '1705312345-first',
      type: 'request',
      time: 1705312345,
      method: 'GET',
      uri: '/',
      controller: 'HomeController@index',
      responseStatus: 200,
      responseDuration: 30,
    }));

    writeFileSync(join(testDir, '1705312346-second.json'), JSON.stringify({
      id: '1705312346-second',
      type: 'request',
      time: 1705312346,
      method: 'GET',
      uri: '/api/users',
      controller: 'UserController@index',
      responseStatus: 200,
      responseDuration: 45,
    }));

    writeFileSync(join(testDir, '1705312347-third.json'), JSON.stringify({
      id: '1705312347-third',
      type: 'request',
      time: 1705312347,
      method: 'POST',
      uri: '/api/users',
      controller: 'UserController@store',
      responseStatus: 201,
      responseDuration: 120,
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('listRequests', () => {
    it('returns all requests', () => {
      const result = listRequests(testDir, {});
      expect(result).toHaveLength(3);
    });

    it('filters by method', () => {
      const result = listRequests(testDir, { method: 'POST' });
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('POST');
    });

    it('filters by uri pattern', () => {
      const result = listRequests(testDir, { uri: '/api' });
      expect(result).toHaveLength(2);
    });

    it('respects limit', () => {
      const result = listRequests(testDir, { limit: 2 });
      expect(result).toHaveLength(2);
    });
  });

  describe('getRequest', () => {
    it('returns full request data', () => {
      const result = getRequest(testDir, '1705312345-first');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('1705312345-first');
      expect(result?.controller).toBe('HomeController@index');
    });

    it('returns null for non-existent request', () => {
      const result = getRequest(testDir, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getLatestRequest', () => {
    it('returns most recent request', () => {
      const result = getLatestRequest(testDir);
      expect(result?.id).toBe('1705312347-third');
    });
  });

  describe('searchRequests', () => {
    it('searches by controller', () => {
      const result = searchRequests(testDir, { controller: 'UserController' });
      expect(result).toHaveLength(2);
    });

    it('searches by min duration', () => {
      const result = searchRequests(testDir, { minDuration: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].responseDuration).toBe(120);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/tools/requests.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/tools/requests.ts`:

```typescript
import { parseIndex } from '../storage/index-parser.js';
import { readRequest } from '../storage/reader.js';
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import type { ListRequestsInput, SearchRequestsInput } from '../types/tools.js';

export function listRequests(
  storagePath: string,
  input: ListRequestsInput
): IndexEntry[] {
  let entries = parseIndex(storagePath);

  // Apply filters
  if (input.type) {
    entries = entries.filter(e => e.type === input.type);
  }
  if (input.status !== undefined) {
    entries = entries.filter(e => e.responseStatus === input.status);
  }
  if (input.uri) {
    entries = entries.filter(e => e.uri?.includes(input.uri!));
  }
  if (input.method) {
    entries = entries.filter(e => e.method === input.method);
  }
  if (input.from !== undefined) {
    entries = entries.filter(e => e.time >= input.from!);
  }
  if (input.to !== undefined) {
    entries = entries.filter(e => e.time <= input.to!);
  }

  // Apply pagination
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

export function getRequest(
  storagePath: string,
  requestId: string
): ClockworkRequest | null {
  return readRequest(storagePath, requestId);
}

export function getLatestRequest(storagePath: string): ClockworkRequest | null {
  const entries = parseIndex(storagePath);

  if (entries.length === 0) {
    return null;
  }

  return readRequest(storagePath, entries[0].id);
}

export function searchRequests(
  storagePath: string,
  input: SearchRequestsInput
): IndexEntry[] {
  let entries = parseIndex(storagePath);

  if (input.controller) {
    entries = entries.filter(e => e.controller?.includes(input.controller!));
  }
  if (input.uri) {
    entries = entries.filter(e => e.uri?.includes(input.uri!));
  }
  if (input.status !== undefined) {
    entries = entries.filter(e => e.responseStatus === input.status);
  }
  if (input.minDuration !== undefined) {
    entries = entries.filter(e => (e.responseDuration ?? 0) >= input.minDuration!);
  }
  if (input.maxDuration !== undefined) {
    entries = entries.filter(e => (e.responseDuration ?? 0) <= input.maxDuration!);
  }

  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/tools/requests.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/requests.ts src/tools/requests.test.ts
git commit -m "feat: implement request discovery tools"
```

---

### Task 18: Implement database analysis tools

**Files:**
- Create: `src/tools/database.ts`
- Create: `src/tools/database.test.ts`

**Step 1: Write the failing test**

Create `src/tools/database.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getQueries, getQueryStats, analyzeSlowQueriesForRequest, detectNPlusOneForRequest } from './database.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Database Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-db-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    const request = {
      id: 'test-request',
      type: 'request',
      time: 1705312345,
      databaseQueries: [
        { query: 'SELECT * FROM users WHERE id = 1', duration: 5 },
        { query: 'SELECT * FROM users WHERE id = 2', duration: 150 },
        { query: 'SELECT * FROM users WHERE id = 3', duration: 8 },
        { query: 'SELECT * FROM posts', duration: 200 },
      ],
    };

    writeFileSync(join(testDir, 'test-request.json'), JSON.stringify(request));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getQueries', () => {
    it('returns all queries for a request', () => {
      const result = getQueries(testDir, { requestId: 'test-request' });
      expect(result).toHaveLength(4);
    });

    it('filters slow queries when threshold provided', () => {
      const result = getQueries(testDir, { requestId: 'test-request', slow: true, threshold: 100 });
      expect(result).toHaveLength(2);
    });

    it('returns empty array for non-existent request', () => {
      const result = getQueries(testDir, { requestId: 'nonexistent' });
      expect(result).toHaveLength(0);
    });
  });

  describe('getQueryStats', () => {
    it('returns aggregate statistics', () => {
      const result = getQueryStats(testDir, { requestId: 'test-request' });
      expect(result.totalQueries).toBe(4);
      expect(result.totalDuration).toBe(363);
      expect(result.slowestQuery.duration).toBe(200);
    });
  });

  describe('analyzeSlowQueriesForRequest', () => {
    it('finds slow queries', () => {
      const result = analyzeSlowQueriesForRequest(testDir, { requestId: 'test-request', threshold: 100 });
      expect(result).toHaveLength(2);
      expect(result[0].duration).toBe(200);
    });
  });

  describe('detectNPlusOneForRequest', () => {
    it('detects N+1 patterns', () => {
      const result = detectNPlusOneForRequest(testDir, { requestId: 'test-request', threshold: 2 });
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(3);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/tools/database.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/tools/database.ts`:

```typescript
import { readRequest } from '../storage/reader.js';
import { detectNPlusOne } from '../analyzers/n-plus-one.js';
import { analyzeSlowQueries } from '../analyzers/slow-queries.js';
import type { DatabaseQuery } from '../types/clockwork.js';
import type { GetQueriesInput, GetQueryStatsInput, AnalyzeSlowQueriesInput, DetectNPlusOneInput } from '../types/tools.js';

export interface QueryStats {
  totalQueries: number;
  totalDuration: number;
  avgDuration: number;
  slowestQuery: DatabaseQuery | null;
  queriesByType: {
    select: number;
    insert: number;
    update: number;
    delete: number;
    other: number;
  };
}

export function getQueries(storagePath: string, input: GetQueriesInput): DatabaseQuery[] {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.databaseQueries) {
    return [];
  }

  let queries = request.databaseQueries;

  if (input.slow && input.threshold) {
    queries = queries.filter(q => q.duration >= input.threshold!);
  }

  return queries;
}

export function getQueryStats(storagePath: string, input: GetQueryStatsInput): QueryStats {
  const defaultStats: QueryStats = {
    totalQueries: 0,
    totalDuration: 0,
    avgDuration: 0,
    slowestQuery: null,
    queriesByType: { select: 0, insert: 0, update: 0, delete: 0, other: 0 },
  };

  if (!input.requestId) {
    return defaultStats;
  }

  const request = readRequest(storagePath, input.requestId);

  if (!request?.databaseQueries || request.databaseQueries.length === 0) {
    return defaultStats;
  }

  const queries = request.databaseQueries;
  const totalDuration = queries.reduce((sum, q) => sum + q.duration, 0);
  const slowest = queries.reduce((max, q) => (q.duration > (max?.duration ?? 0) ? q : max), queries[0]);

  const queriesByType = { select: 0, insert: 0, update: 0, delete: 0, other: 0 };
  for (const q of queries) {
    const upper = q.query.trim().toUpperCase();
    if (upper.startsWith('SELECT')) queriesByType.select++;
    else if (upper.startsWith('INSERT')) queriesByType.insert++;
    else if (upper.startsWith('UPDATE')) queriesByType.update++;
    else if (upper.startsWith('DELETE')) queriesByType.delete++;
    else queriesByType.other++;
  }

  return {
    totalQueries: queries.length,
    totalDuration,
    avgDuration: totalDuration / queries.length,
    slowestQuery: slowest,
    queriesByType,
  };
}

export function analyzeSlowQueriesForRequest(
  storagePath: string,
  input: AnalyzeSlowQueriesInput
): DatabaseQuery[] {
  if (!input.requestId) {
    return [];
  }

  const request = readRequest(storagePath, input.requestId);

  if (!request?.databaseQueries) {
    return [];
  }

  return analyzeSlowQueries(request.databaseQueries, input.threshold);
}

export function detectNPlusOneForRequest(
  storagePath: string,
  input: DetectNPlusOneInput
) {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.databaseQueries) {
    return [];
  }

  return detectNPlusOne(request.databaseQueries, input.threshold);
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/tools/database.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/database.ts src/tools/database.test.ts
git commit -m "feat: implement database analysis tools"
```

---

### Task 19: Implement performance analysis tools

**Files:**
- Create: `src/tools/performance.ts`
- Create: `src/tools/performance.test.ts`

**Step 1: Write the failing test**

Create `src/tools/performance.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPerformanceSummary, getTimeline, compareRequests } from './performance.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Performance Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-perf-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    writeFileSync(join(testDir, 'req-1.json'), JSON.stringify({
      id: 'req-1',
      type: 'request',
      time: 1705312345,
      responseDuration: 150,
      memoryUsage: 10485760,
      databaseQueriesCount: 5,
      databaseDuration: 45,
      cacheHits: 3,
      cacheReads: 5,
      timelineData: [
        { description: 'Boot', start: 0, end: 50, duration: 50 },
        { description: 'Controller', start: 50, end: 120, duration: 70 },
      ],
    }));

    writeFileSync(join(testDir, 'req-2.json'), JSON.stringify({
      id: 'req-2',
      type: 'request',
      time: 1705312400,
      responseDuration: 300,
      memoryUsage: 20971520,
      databaseQueriesCount: 15,
      databaseDuration: 180,
      cacheHits: 1,
      cacheReads: 10,
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getPerformanceSummary', () => {
    it('returns performance metrics for a request', () => {
      const result = getPerformanceSummary(testDir, { requestId: 'req-1' });
      expect(result.responseDuration).toBe(150);
      expect(result.memoryUsageMB).toBeCloseTo(10);
      expect(result.databaseQueries).toBe(5);
      expect(result.cacheHitRatio).toBe(0.6);
    });
  });

  describe('getTimeline', () => {
    it('returns timeline events', () => {
      const result = getTimeline(testDir, { requestId: 'req-1' });
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('Boot');
    });

    it('returns empty array when no timeline', () => {
      const result = getTimeline(testDir, { requestId: 'req-2' });
      expect(result).toHaveLength(0);
    });
  });

  describe('compareRequests', () => {
    it('compares two requests', () => {
      const result = compareRequests(testDir, { requestId1: 'req-1', requestId2: 'req-2' });
      expect(result.durationDiff).toBe(150);
      expect(result.queryCountDiff).toBe(10);
      expect(result.memoryDiff).toBeCloseTo(10);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/tools/performance.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/tools/performance.ts`:

```typescript
import { readRequest } from '../storage/reader.js';
import type { TimelineEvent } from '../types/clockwork.js';
import type { GetPerformanceSummaryInput, GetTimelineInput, CompareRequestsInput } from '../types/tools.js';

export interface PerformanceSummary {
  responseDuration: number;
  memoryUsageMB: number;
  databaseQueries: number;
  databaseDuration: number;
  cacheHits: number;
  cacheReads: number;
  cacheHitRatio: number;
}

export interface RequestComparison {
  request1: { id: string; duration: number; queries: number; memoryMB: number };
  request2: { id: string; duration: number; queries: number; memoryMB: number };
  durationDiff: number;
  queryCountDiff: number;
  memoryDiff: number;
}

export function getPerformanceSummary(
  storagePath: string,
  input: GetPerformanceSummaryInput
): PerformanceSummary {
  const defaultSummary: PerformanceSummary = {
    responseDuration: 0,
    memoryUsageMB: 0,
    databaseQueries: 0,
    databaseDuration: 0,
    cacheHits: 0,
    cacheReads: 0,
    cacheHitRatio: 0,
  };

  if (!input.requestId) {
    return defaultSummary;
  }

  const request = readRequest(storagePath, input.requestId);

  if (!request) {
    return defaultSummary;
  }

  const cacheReads = request.cacheReads ?? 0;
  const cacheHits = request.cacheHits ?? 0;

  return {
    responseDuration: request.responseDuration ?? 0,
    memoryUsageMB: (request.memoryUsage ?? 0) / (1024 * 1024),
    databaseQueries: request.databaseQueriesCount ?? 0,
    databaseDuration: request.databaseDuration ?? 0,
    cacheHits,
    cacheReads,
    cacheHitRatio: cacheReads > 0 ? cacheHits / cacheReads : 0,
  };
}

export function getTimeline(storagePath: string, input: GetTimelineInput): TimelineEvent[] {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.timelineData) {
    return [];
  }

  return request.timelineData;
}

export function compareRequests(
  storagePath: string,
  input: CompareRequestsInput
): RequestComparison {
  const req1 = readRequest(storagePath, input.requestId1);
  const req2 = readRequest(storagePath, input.requestId2);

  const r1 = {
    id: input.requestId1,
    duration: req1?.responseDuration ?? 0,
    queries: req1?.databaseQueriesCount ?? 0,
    memoryMB: (req1?.memoryUsage ?? 0) / (1024 * 1024),
  };

  const r2 = {
    id: input.requestId2,
    duration: req2?.responseDuration ?? 0,
    queries: req2?.databaseQueriesCount ?? 0,
    memoryMB: (req2?.memoryUsage ?? 0) / (1024 * 1024),
  };

  return {
    request1: r1,
    request2: r2,
    durationDiff: r2.duration - r1.duration,
    queryCountDiff: r2.queries - r1.queries,
    memoryDiff: r2.memoryMB - r1.memoryMB,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/tools/performance.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/performance.ts src/tools/performance.test.ts
git commit -m "feat: implement performance analysis tools"
```

---

### Task 20: Implement cache tools

**Files:**
- Create: `src/tools/cache.ts`
- Create: `src/tools/cache.test.ts`

**Step 1: Write the failing test**

Create `src/tools/cache.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCacheOperations, getCacheStats, getRedisCommands } from './cache.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Cache Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-cache-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    writeFileSync(join(testDir, 'cache-req.json'), JSON.stringify({
      id: 'cache-req',
      type: 'request',
      time: 1705312345,
      cacheQueries: [
        { type: 'hit', key: 'user:1', duration: 1 },
        { type: 'miss', key: 'user:2', duration: 2 },
        { type: 'write', key: 'user:2', duration: 5 },
        { type: 'hit', key: 'config', duration: 0.5 },
      ],
      redisCommands: [
        { command: 'GET', parameters: ['session:abc'], duration: 1 },
        { command: 'SET', parameters: ['session:abc', 'data'], duration: 2 },
      ],
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getCacheOperations', () => {
    it('returns all cache operations', () => {
      const result = getCacheOperations(testDir, { requestId: 'cache-req' });
      expect(result).toHaveLength(4);
    });
  });

  describe('getCacheStats', () => {
    it('returns cache statistics', () => {
      const result = getCacheStats(testDir, { requestId: 'cache-req' });
      expect(result.hits).toBe(2);
      expect(result.misses).toBe(1);
      expect(result.writes).toBe(1);
      expect(result.hitRatio).toBeCloseTo(0.67, 1);
    });
  });

  describe('getRedisCommands', () => {
    it('returns redis commands', () => {
      const result = getRedisCommands(testDir, { requestId: 'cache-req' });
      expect(result).toHaveLength(2);
      expect(result[0].command).toBe('GET');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/tools/cache.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/tools/cache.ts`:

```typescript
import { readRequest } from '../storage/reader.js';
import type { CacheQuery, RedisCommand } from '../types/clockwork.js';
import type { GetCacheOperationsInput, GetCacheStatsInput, GetRedisCommandsInput } from '../types/tools.js';

export interface CacheStats {
  hits: number;
  misses: number;
  writes: number;
  deletes: number;
  totalOperations: number;
  hitRatio: number;
  totalDuration: number;
}

export function getCacheOperations(storagePath: string, input: GetCacheOperationsInput): CacheQuery[] {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.cacheQueries) {
    return [];
  }

  return request.cacheQueries;
}

export function getCacheStats(storagePath: string, input: GetCacheStatsInput): CacheStats {
  const defaultStats: CacheStats = {
    hits: 0,
    misses: 0,
    writes: 0,
    deletes: 0,
    totalOperations: 0,
    hitRatio: 0,
    totalDuration: 0,
  };

  if (!input.requestId) {
    return defaultStats;
  }

  const request = readRequest(storagePath, input.requestId);

  if (!request?.cacheQueries || request.cacheQueries.length === 0) {
    return defaultStats;
  }

  const queries = request.cacheQueries;
  let hits = 0, misses = 0, writes = 0, deletes = 0, totalDuration = 0;

  for (const q of queries) {
    totalDuration += q.duration ?? 0;
    switch (q.type) {
      case 'hit': hits++; break;
      case 'miss': misses++; break;
      case 'write': writes++; break;
      case 'delete': deletes++; break;
    }
  }

  const reads = hits + misses;

  return {
    hits,
    misses,
    writes,
    deletes,
    totalOperations: queries.length,
    hitRatio: reads > 0 ? hits / reads : 0,
    totalDuration,
  };
}

export function getRedisCommands(storagePath: string, input: GetRedisCommandsInput): RedisCommand[] {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.redisCommands) {
    return [];
  }

  return request.redisCommands;
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/tools/cache.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/cache.ts src/tools/cache.test.ts
git commit -m "feat: implement cache and redis tools"
```

---

### Task 21: Implement context tools (logs, events, views, http)

**Files:**
- Create: `src/tools/context.ts`
- Create: `src/tools/context.test.ts`

**Step 1: Write the failing test**

Create `src/tools/context.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLogs, getEvents, getViews, getHttpRequests } from './context.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Context Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-context-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    writeFileSync(join(testDir, 'ctx-req.json'), JSON.stringify({
      id: 'ctx-req',
      type: 'request',
      time: 1705312345,
      log: [
        { level: 'debug', message: 'Debug message' },
        { level: 'info', message: 'Info message' },
        { level: 'warning', message: 'Warning message' },
        { level: 'error', message: 'Error message' },
      ],
      events: [
        { event: 'UserCreated', listeners: ['SendWelcomeEmail'] },
        { event: 'OrderPlaced', listeners: ['ProcessPayment', 'SendReceipt'] },
      ],
      views: [
        { name: 'layouts.app', duration: 10 },
        { name: 'users.index', duration: 5 },
      ],
      httpRequests: [
        { method: 'GET', url: 'https://api.example.com/users', duration: 150, responseStatus: 200 },
      ],
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getLogs', () => {
    it('returns all logs', () => {
      const result = getLogs(testDir, { requestId: 'ctx-req' });
      expect(result).toHaveLength(4);
    });

    it('filters by minimum level', () => {
      const result = getLogs(testDir, { requestId: 'ctx-req', level: 'warning' });
      expect(result).toHaveLength(2);
      expect(result.map(l => l.level)).toEqual(['warning', 'error']);
    });
  });

  describe('getEvents', () => {
    it('returns all events', () => {
      const result = getEvents(testDir, { requestId: 'ctx-req' });
      expect(result).toHaveLength(2);
      expect(result[0].event).toBe('UserCreated');
    });
  });

  describe('getViews', () => {
    it('returns all views', () => {
      const result = getViews(testDir, { requestId: 'ctx-req' });
      expect(result).toHaveLength(2);
    });
  });

  describe('getHttpRequests', () => {
    it('returns outgoing http requests', () => {
      const result = getHttpRequests(testDir, { requestId: 'ctx-req' });
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://api.example.com/users');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/tools/context.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/tools/context.ts`:

```typescript
import { readRequest } from '../storage/reader.js';
import type { LogEntry, DispatchedEvent, RenderedView, OutgoingHttpRequest } from '../types/clockwork.js';
import type { GetLogsInput, GetEventsInput, GetViewsInput, GetHttpRequestsInput } from '../types/tools.js';

const LOG_LEVELS = ['debug', 'info', 'warning', 'error'] as const;

export function getLogs(storagePath: string, input: GetLogsInput): LogEntry[] {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.log) {
    return [];
  }

  let logs = request.log;

  if (input.level) {
    const minLevelIndex = LOG_LEVELS.indexOf(input.level);
    logs = logs.filter(l => {
      const logLevelIndex = LOG_LEVELS.indexOf(l.level as typeof LOG_LEVELS[number]);
      return logLevelIndex >= minLevelIndex;
    });
  }

  return logs;
}

export function getEvents(storagePath: string, input: GetEventsInput): DispatchedEvent[] {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.events) {
    return [];
  }

  return request.events;
}

export function getViews(storagePath: string, input: GetViewsInput): RenderedView[] {
  const request = readRequest(storagePath, input.requestId);

  // Clockwork stores views in either 'views' or 'viewsData'
  const views = request?.views ?? request?.viewsData;

  if (!views) {
    return [];
  }

  return views;
}

export function getHttpRequests(storagePath: string, input: GetHttpRequestsInput): OutgoingHttpRequest[] {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.httpRequests) {
    return [];
  }

  return request.httpRequests;
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/tools/context.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/context.ts src/tools/context.test.ts
git commit -m "feat: implement context tools (logs, events, views, http)"
```

---

### Task 22: Implement command tools

**Files:**
- Create: `src/tools/commands.ts`
- Create: `src/tools/commands.test.ts`

**Step 1: Write the failing test**

Create `src/tools/commands.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listCommands, getCommand } from './commands.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Command Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-cmd-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create index with commands
    const indexContent = [
      'cmd-1\t1705312345\t\tmigrate\t\t0\t500\tcommand',
      'cmd-2\t1705312400\t\tdb:seed\t\t0\t1200\tcommand',
      'req-1\t1705312350\tGET\t/api/users\tUserController\t200\t50\trequest',
    ].join('\n');
    writeFileSync(join(testDir, 'index'), indexContent);

    writeFileSync(join(testDir, 'cmd-1.json'), JSON.stringify({
      id: 'cmd-1',
      type: 'command',
      time: 1705312345,
      commandName: 'migrate',
      commandArguments: {},
      commandOptions: { force: true },
      commandExitCode: 0,
      commandOutput: 'Migration completed successfully',
      databaseQueries: [
        { query: 'CREATE TABLE users', duration: 50 },
      ],
    }));

    writeFileSync(join(testDir, 'cmd-2.json'), JSON.stringify({
      id: 'cmd-2',
      type: 'command',
      time: 1705312400,
      commandName: 'db:seed',
      commandExitCode: 0,
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('listCommands', () => {
    it('returns only command entries', () => {
      const result = listCommands(testDir, {});
      expect(result).toHaveLength(2);
      expect(result.every(e => e.type === 'command')).toBe(true);
    });

    it('filters by command name', () => {
      const result = listCommands(testDir, { name: 'migrate' });
      expect(result).toHaveLength(1);
      expect(result[0].commandName).toBe('migrate');
    });
  });

  describe('getCommand', () => {
    it('returns full command data', () => {
      const result = getCommand(testDir, { requestId: 'cmd-1' });
      expect(result).not.toBeNull();
      expect(result?.commandName).toBe('migrate');
      expect(result?.commandOutput).toBe('Migration completed successfully');
      expect(result?.databaseQueries).toHaveLength(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/tools/commands.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/tools/commands.ts`:

```typescript
import { parseIndex } from '../storage/index-parser.js';
import { readRequest } from '../storage/reader.js';
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import type { ListCommandsInput, GetCommandInput } from '../types/tools.js';

export function listCommands(storagePath: string, input: ListCommandsInput): IndexEntry[] {
  let entries = parseIndex(storagePath);

  // Filter to commands only
  entries = entries.filter(e => e.type === 'command');

  if (input.name) {
    entries = entries.filter(e => e.commandName?.includes(input.name!));
  }

  if (input.from !== undefined) {
    entries = entries.filter(e => e.time >= input.from!);
  }

  if (input.to !== undefined) {
    entries = entries.filter(e => e.time <= input.to!);
  }

  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

export function getCommand(storagePath: string, input: GetCommandInput): ClockworkRequest | null {
  return readRequest(storagePath, input.requestId);
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/tools/commands.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/commands.ts src/tools/commands.test.ts
git commit -m "feat: implement command tools"
```

---

### Task 23: Implement utility tools

**Files:**
- Create: `src/tools/utility.ts`
- Create: `src/tools/utility.test.ts`

**Step 1: Write the failing test**

Create `src/tools/utility.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getClockworkStatus, explainRequestFlow } from './utility.js';
import { mkdirSync, rmSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Utility Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-util-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    const indexContent = [
      'req-1\t1705312345\tGET\t/api/users\tUserController@index\t200\t50\trequest',
      'req-2\t1705312400\tPOST\t/api/users\tUserController@store\t201\t120\trequest',
    ].join('\n');
    writeFileSync(join(testDir, 'index'), indexContent);

    writeFileSync(join(testDir, 'req-1.json'), JSON.stringify({
      id: 'req-1',
      type: 'request',
      time: 1705312345,
      method: 'GET',
      uri: '/api/users',
      controller: 'UserController@index',
      responseStatus: 200,
      responseDuration: 50,
      middleware: ['auth', 'api'],
      databaseQueries: [
        { query: 'SELECT * FROM users', duration: 10 },
      ],
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getClockworkStatus', () => {
    it('returns storage status', () => {
      const result = getClockworkStatus(testDir);
      expect(result.found).toBe(true);
      expect(result.requestCount).toBe(2);
      expect(result.storagePath).toBe(testDir);
    });

    it('returns not found for invalid path', () => {
      const result = getClockworkStatus('/nonexistent/path');
      expect(result.found).toBe(false);
    });
  });

  describe('explainRequestFlow', () => {
    it('returns request flow summary', () => {
      const result = explainRequestFlow(testDir, 'req-1');
      expect(result.method).toBe('GET');
      expect(result.uri).toBe('/api/users');
      expect(result.controller).toBe('UserController@index');
      expect(result.middleware).toEqual(['auth', 'api']);
      expect(result.queryCount).toBe(1);
      expect(result.status).toBe(200);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/tools/utility.test.ts
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/tools/utility.ts`:

```typescript
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { parseIndex } from '../storage/index-parser.js';
import { readRequest } from '../storage/reader.js';

export interface ClockworkStatus {
  found: boolean;
  storagePath: string;
  requestCount: number;
  oldestRequest?: number;
  newestRequest?: number;
  storageSizeBytes?: number;
}

export interface RequestFlowSummary {
  id: string;
  method?: string;
  uri?: string;
  controller?: string;
  middleware?: string[];
  queryCount: number;
  totalQueryDuration: number;
  status?: number;
  duration?: number;
  memoryMB?: number;
}

export function getClockworkStatus(storagePath: string): ClockworkStatus {
  if (!existsSync(storagePath)) {
    return {
      found: false,
      storagePath,
      requestCount: 0,
    };
  }

  const entries = parseIndex(storagePath);

  let storageSizeBytes = 0;
  try {
    const files = readdirSync(storagePath);
    for (const file of files) {
      const stat = statSync(join(storagePath, file));
      storageSizeBytes += stat.size;
    }
  } catch {
    // Ignore errors
  }

  return {
    found: true,
    storagePath,
    requestCount: entries.length,
    oldestRequest: entries.length > 0 ? entries[entries.length - 1].time : undefined,
    newestRequest: entries.length > 0 ? entries[0].time : undefined,
    storageSizeBytes,
  };
}

export function explainRequestFlow(storagePath: string, requestId: string): RequestFlowSummary {
  const request = readRequest(storagePath, requestId);

  if (!request) {
    return {
      id: requestId,
      queryCount: 0,
      totalQueryDuration: 0,
    };
  }

  const queries = request.databaseQueries ?? [];
  const totalQueryDuration = queries.reduce((sum, q) => sum + q.duration, 0);

  return {
    id: request.id,
    method: request.method,
    uri: request.uri,
    controller: request.controller,
    middleware: request.middleware,
    queryCount: queries.length,
    totalQueryDuration,
    status: request.responseStatus,
    duration: request.responseDuration,
    memoryMB: request.memoryUsage ? request.memoryUsage / (1024 * 1024) : undefined,
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/tools/utility.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/utility.ts src/tools/utility.test.ts
git commit -m "feat: implement utility tools"
```

---

### Task 24: Create tools barrel export

**Files:**
- Create: `src/tools/index.ts`

**Step 1: Create barrel export**

```typescript
export * from './requests.js';
export * from './database.js';
export * from './performance.js';
export * from './cache.js';
export * from './context.js';
export * from './commands.js';
export * from './utility.js';
```

**Step 2: Commit**

```bash
git add src/tools/index.ts
git commit -m "chore: add tools barrel export"
```

---

## Phase 6: MCP Server

### Task 25: Implement MCP server setup

**Files:**
- Create: `src/server.ts`

**Step 1: Create the MCP server**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { findStoragePath } from './storage/locator.js';
import * as requestTools from './tools/requests.js';
import * as dbTools from './tools/database.js';
import * as perfTools from './tools/performance.js';
import * as cacheTools from './tools/cache.js';
import * as contextTools from './tools/context.js';
import * as cmdTools from './tools/commands.js';
import * as utilTools from './tools/utility.js';
import * as schemas from './types/tools.js';

export function createServer() {
  const server = new McpServer({
    name: 'clockwork-mcp',
    version: '0.1.0',
  });

  // Get storage path - will be resolved when tools are called
  const getStoragePath = (): string => {
    const path = findStoragePath({
      CLOCKWORK_STORAGE_PATH: process.env.CLOCKWORK_STORAGE_PATH,
      CLOCKWORK_PROJECT_PATH: process.env.CLOCKWORK_PROJECT_PATH,
    });

    if (!path) {
      throw new Error(
        'Clockwork storage not found. Set CLOCKWORK_STORAGE_PATH or run from a Laravel project.'
      );
    }

    return path;
  };

  // Request discovery tools
  server.tool(
    'list_requests',
    'List recent Clockwork requests with optional filtering',
    schemas.listRequestsSchema.shape,
    async (input) => {
      const result = requestTools.listRequests(getStoragePath(), input as schemas.ListRequestsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_request',
    'Get full details of a specific request by ID',
    { requestId: z.string().describe('Clockwork request ID') },
    async ({ requestId }) => {
      const result = requestTools.getRequest(getStoragePath(), requestId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_latest_request',
    'Get the most recent Clockwork request',
    {},
    async () => {
      const result = requestTools.getLatestRequest(getStoragePath());
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'search_requests',
    'Search requests by controller, URI, status, or duration',
    schemas.searchRequestsSchema.shape,
    async (input) => {
      const result = requestTools.searchRequests(getStoragePath(), input as schemas.SearchRequestsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Database tools
  server.tool(
    'get_queries',
    'Get database queries for a request',
    schemas.getQueriesSchema.shape,
    async (input) => {
      const result = dbTools.getQueries(getStoragePath(), input as schemas.GetQueriesInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'analyze_slow_queries',
    'Find slow database queries above threshold',
    schemas.analyzeSlowQueriesSchema.shape,
    async (input) => {
      const result = dbTools.analyzeSlowQueriesForRequest(getStoragePath(), input as schemas.AnalyzeSlowQueriesInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'detect_n_plus_one',
    'Detect N+1 query patterns in a request',
    schemas.detectNPlusOneSchema.shape,
    async (input) => {
      const result = dbTools.detectNPlusOneForRequest(getStoragePath(), input as schemas.DetectNPlusOneInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_query_stats',
    'Get aggregate query statistics for a request',
    schemas.getQueryStatsSchema.shape,
    async (input) => {
      const result = dbTools.getQueryStats(getStoragePath(), input as schemas.GetQueryStatsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Performance tools
  server.tool(
    'get_performance_summary',
    'Get performance overview for a request',
    schemas.getPerformanceSummarySchema.shape,
    async (input) => {
      const result = perfTools.getPerformanceSummary(getStoragePath(), input as schemas.GetPerformanceSummaryInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_timeline',
    'Get timeline events for a request',
    schemas.getTimelineSchema.shape,
    async (input) => {
      const result = perfTools.getTimeline(getStoragePath(), input as schemas.GetTimelineInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'compare_requests',
    'Compare two requests side by side',
    schemas.compareRequestsSchema.shape,
    async (input) => {
      const result = perfTools.compareRequests(getStoragePath(), input as schemas.CompareRequestsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Cache tools
  server.tool(
    'get_cache_operations',
    'Get cache operations for a request',
    schemas.getCacheOperationsSchema.shape,
    async (input) => {
      const result = cacheTools.getCacheOperations(getStoragePath(), input as schemas.GetCacheOperationsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_cache_stats',
    'Get cache statistics (hit ratio, totals)',
    schemas.getCacheStatsSchema.shape,
    async (input) => {
      const result = cacheTools.getCacheStats(getStoragePath(), input as schemas.GetCacheStatsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_redis_commands',
    'Get Redis commands for a request',
    schemas.getRedisCommandsSchema.shape,
    async (input) => {
      const result = cacheTools.getRedisCommands(getStoragePath(), input as schemas.GetRedisCommandsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Context tools
  server.tool(
    'get_logs',
    'Get log entries for a request',
    schemas.getLogsSchema.shape,
    async (input) => {
      const result = contextTools.getLogs(getStoragePath(), input as schemas.GetLogsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_events',
    'Get dispatched events for a request',
    schemas.getEventsSchema.shape,
    async (input) => {
      const result = contextTools.getEvents(getStoragePath(), input as schemas.GetEventsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_views',
    'Get rendered views for a request',
    schemas.getViewsSchema.shape,
    async (input) => {
      const result = contextTools.getViews(getStoragePath(), input as schemas.GetViewsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_http_requests',
    'Get outgoing HTTP requests made during a request',
    schemas.getHttpRequestsSchema.shape,
    async (input) => {
      const result = contextTools.getHttpRequests(getStoragePath(), input as schemas.GetHttpRequestsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Command tools
  server.tool(
    'list_commands',
    'List profiled Artisan command executions',
    schemas.listCommandsSchema.shape,
    async (input) => {
      const result = cmdTools.listCommands(getStoragePath(), input as schemas.ListCommandsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_command',
    'Get full details of an Artisan command execution',
    schemas.getCommandSchema.shape,
    async (input) => {
      const result = cmdTools.getCommand(getStoragePath(), input as schemas.GetCommandInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Utility tools
  server.tool(
    'get_clockwork_status',
    'Check Clockwork storage status and statistics',
    {},
    async () => {
      const path = findStoragePath({
        CLOCKWORK_STORAGE_PATH: process.env.CLOCKWORK_STORAGE_PATH,
        CLOCKWORK_PROJECT_PATH: process.env.CLOCKWORK_PROJECT_PATH,
      });
      const result = utilTools.getClockworkStatus(path ?? '');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'explain_request_flow',
    'Get high-level summary of what happened in a request',
    { requestId: z.string().describe('Clockwork request ID') },
    async ({ requestId }) => {
      const result = utilTools.explainRequestFlow(getStoragePath(), requestId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}

export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

**Step 2: Commit**

```bash
git add src/server.ts
git commit -m "feat: implement MCP server with all tools"
```

---

### Task 26: Create entry point

**Files:**
- Modify: `src/index.ts`

**Step 1: Update entry point**

Replace `src/index.ts`:

```typescript
#!/usr/bin/env node
import { startServer } from './server.js';

startServer().catch((error) => {
  console.error('Failed to start clockwork-mcp server:', error);
  process.exit(1);
});
```

**Step 2: Verify build works**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add MCP server entry point"
```

---

## Phase 7: Open Source Files

### Task 27: Create README

**Files:**
- Create: `README.md`

**Step 1: Create README.md**

```markdown
# clockwork-mcp

[![npm version](https://badge.fury.io/js/clockwork-mcp.svg)](https://www.npmjs.com/package/clockwork-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for Laravel Clockwork - debug Laravel apps with Claude Code.

## What it does

This MCP server gives Claude Code access to your Laravel application's Clockwork debugging data, enabling:

- **Debugging** - Find slow queries, N+1 problems, cache issues, errors
- **Performance analysis** - Track response times, query counts, memory usage
- **Development insight** - Understand request flow, see runtime behavior

## Quick Start

### 1. Install Clockwork in your Laravel app

```bash
composer require itsgoingd/clockwork
```

### 2. Configure Claude Code

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

### 3. Start debugging

Ask Claude to analyze your requests:

- "Show me the latest request"
- "Find slow queries in the last request"
- "Check for N+1 query problems"
- "Compare this request with the previous one"

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
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

### Task 28: Create LICENSE

**Files:**
- Create: `LICENSE`

**Step 1: Create LICENSE file**

```
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 2: Commit**

```bash
git add LICENSE
git commit -m "docs: add MIT license"
```

---

### Task 29: Create CONTRIBUTING guide

**Files:**
- Create: `CONTRIBUTING.md`

**Step 1: Create CONTRIBUTING.md**

```markdown
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
```

**Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributing guide"
```

---

### Task 30: Create .gitignore

**Files:**
- Create: `.gitignore`

**Step 1: Create .gitignore**

```
# Dependencies
node_modules/

# Build output
dist/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add gitignore"
```

---

### Task 31: Create GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create CI workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Run tests
        run: npm run test:run

      - name: Build
        run: npm run build
```

**Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow"
```

---

## Phase 8: Final Verification

### Task 32: Run all tests

**Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: All tests pass

**Step 2: Run type check**

```bash
npm run typecheck
```

Expected: No type errors

**Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds, dist/ created

---

### Task 33: Create CHANGELOG

**Files:**
- Create: `CHANGELOG.md`

**Step 1: Create CHANGELOG.md**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

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
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add changelog"
```

---

### Task 34: Final commit - ready for release

**Step 1: Verify everything is committed**

```bash
git status
```

Expected: Clean working directory

**Step 2: Tag initial release**

```bash
git tag v0.1.0
```

---

## Summary

**Total Tasks: 34**

**Phases:**
1. Project Setup (6 tasks)
2. Core Types (3 tasks)
3. Storage Layer (4 tasks)
4. Analyzers (3 tasks)
5. MCP Tools (8 tasks)
6. MCP Server (2 tasks)
7. Open Source Files (5 tasks)
8. Final Verification (3 tasks)

**Test Coverage:**
- Storage: locator, index-parser, reader
- Analyzers: n-plus-one, slow-queries
- Tools: requests, database, performance, cache, context, commands, utility

**Ready for npm publish after completing all tasks.**

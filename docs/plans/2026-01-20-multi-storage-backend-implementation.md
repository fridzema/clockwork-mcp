# Multi-Storage Backend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable the MCP server to read Clockwork data from any storage backend (File, SQLite, MySQL, PostgreSQL, Redis) by using `php artisan tinker` to leverage Clockwork's own storage classes.

**Architecture:** Replace direct file I/O with PHP execution via artisan tinker. The new `storage.ts` module provides a unified interface that auto-detects and routes to either file-based or artisan-based reading. Existing tool functions remain unchanged - only their data source changes.

**Tech Stack:** Node.js, TypeScript, Vitest, child_process for PHP execution

---

## Task 1: Create Artisan Executor Module

**Files:**
- Create: `src/storage/artisan.ts`
- Create: `src/storage/artisan.test.ts`

### Step 1: Write failing test for executePhp

```typescript
// src/storage/artisan.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executePhp } from './artisan.js';
import { execSync } from 'child_process';

vi.mock('child_process');

describe('Artisan Executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executePhp', () => {
    it('executes PHP code via artisan tinker and returns parsed JSON', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('{"id":"abc123","type":"request"}'));

      const result = executePhp('/path/to/laravel', 'echo json_encode(["id" => "abc123", "type" => "request"]);');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('php artisan tinker'),
        expect.objectContaining({ cwd: '/path/to/laravel' })
      );
      expect(result).toEqual({ id: 'abc123', type: 'request' });
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/storage/artisan.test.ts`
Expected: FAIL with "Cannot find module './artisan.js'"

### Step 3: Write minimal implementation

```typescript
// src/storage/artisan.ts
import { execSync } from 'child_process';

export interface ArtisanOptions {
  phpPath?: string;
  timeout?: number;
}

/**
 * Executes PHP code via artisan tinker and returns parsed JSON result.
 * @param projectPath - Path to Laravel project root
 * @param phpCode - PHP code to execute (should echo JSON)
 * @param options - Execution options
 * @returns Parsed JSON result
 */
export function executePhp<T = unknown>(
  projectPath: string,
  phpCode: string,
  options: ArtisanOptions = {}
): T {
  const phpBinary = options.phpPath ?? 'php';
  const timeout = options.timeout ?? 30000;

  // Escape the PHP code for shell execution
  const escapedCode = phpCode.replace(/'/g, "'\\''");
  const command = `${phpBinary} artisan tinker --execute='${escapedCode}'`;

  const output = execSync(command, {
    cwd: projectPath,
    timeout,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Tinker may output extra lines, find the JSON
  const lines = output.trim().split('\n');
  const jsonLine = lines.find((line) => line.startsWith('{') || line.startsWith('['));

  if (!jsonLine) {
    throw new Error(`No JSON output from PHP execution. Output: ${output}`);
  }

  return JSON.parse(jsonLine) as T;
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/storage/artisan.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/storage/artisan.ts src/storage/artisan.test.ts
git commit -m "feat(storage): add artisan executor for PHP code execution"
```

---

## Task 2: Add Error Handling Tests for Artisan Executor

**Files:**
- Modify: `src/storage/artisan.test.ts`
- Modify: `src/storage/artisan.ts`

### Step 1: Write failing tests for error scenarios

Add to `src/storage/artisan.test.ts`:

```typescript
    it('throws descriptive error when PHP is not found', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockImplementation(() => {
        const error = new Error('Command failed') as Error & { code: string };
        error.code = 'ENOENT';
        throw error;
      });

      expect(() => executePhp('/path/to/laravel', 'echo 1;')).toThrow(
        'PHP executable not found'
      );
    });

    it('throws descriptive error when artisan is not found', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockImplementation(() => {
        throw new Error("Could not open input file: artisan");
      });

      expect(() => executePhp('/path/to/laravel', 'echo 1;')).toThrow(
        'Laravel artisan not found'
      );
    });

    it('throws descriptive error when Clockwork is not installed', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from(
        "Target class [clockwork] does not exist."
      ));

      expect(() => executePhp('/path/to/laravel', "echo json_encode(app('clockwork'));")).toThrow(
        'Clockwork is not installed'
      );
    });

    it('throws error when output is not valid JSON', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('not json'));

      expect(() => executePhp('/path/to/laravel', 'echo "not json";')).toThrow(
        'No JSON output'
      );
    });
```

### Step 2: Run tests to verify they fail

Run: `npm test -- src/storage/artisan.test.ts`
Expected: FAIL (error handling not implemented)

### Step 3: Update implementation with error handling

Update `executePhp` in `src/storage/artisan.ts`:

```typescript
export function executePhp<T = unknown>(
  projectPath: string,
  phpCode: string,
  options: ArtisanOptions = {}
): T {
  const phpBinary = options.phpPath ?? 'php';
  const timeout = options.timeout ?? 30000;

  const escapedCode = phpCode.replace(/'/g, "'\\''");
  const command = `${phpBinary} artisan tinker --execute='${escapedCode}'`;

  let output: string;
  try {
    output = execSync(command, {
      cwd: projectPath,
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === 'ENOENT') {
      throw new Error(
        `PHP executable not found. Ensure PHP is installed and in PATH, or set CLOCKWORK_PHP_PATH.`
      );
    }
    if (err.message.includes('Could not open input file: artisan')) {
      throw new Error(
        `Laravel artisan not found at ${projectPath}. Ensure this is a Laravel project root.`
      );
    }
    throw new Error(`PHP execution failed: ${err.message}`);
  }

  // Check for Clockwork not installed
  if (output.includes('Target class [clockwork] does not exist')) {
    throw new Error(
      'Clockwork is not installed in the Laravel project. Run: composer require itsgoingd/clockwork'
    );
  }

  // Find JSON in output (tinker may output extra lines)
  const lines = output.trim().split('\n');
  const jsonLine = lines.find((line) => line.startsWith('{') || line.startsWith('[') || line === 'null');

  if (!jsonLine) {
    throw new Error(`No JSON output from PHP execution. Output: ${output}`);
  }

  return JSON.parse(jsonLine) as T;
}
```

### Step 4: Run tests to verify they pass

Run: `npm test -- src/storage/artisan.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/storage/artisan.ts src/storage/artisan.test.ts
git commit -m "feat(storage): add error handling for artisan executor"
```

---

## Task 3: Add Clockwork Storage Query Functions

**Files:**
- Modify: `src/storage/artisan.ts`
- Modify: `src/storage/artisan.test.ts`

### Step 1: Write failing test for getRequestViaArtisan

Add to `src/storage/artisan.test.ts`:

```typescript
import { executePhp, getRequestViaArtisan, getLatestRequestViaArtisan, listRequestsViaArtisan } from './artisan.js';

describe('Clockwork Storage Functions', () => {
  describe('getRequestViaArtisan', () => {
    it('fetches a single request by ID', () => {
      const mockExecSync = vi.mocked(execSync);
      const mockRequest = {
        id: 'abc123',
        type: 'request',
        time: 1705312345,
        method: 'GET',
        uri: '/api/users',
      };
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(mockRequest)));

      const result = getRequestViaArtisan('/path/to/laravel', 'abc123');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("find('abc123')"),
        expect.any(Object)
      );
      expect(result).toEqual(mockRequest);
    });

    it('returns null when request not found', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('null'));

      const result = getRequestViaArtisan('/path/to/laravel', 'nonexistent');

      expect(result).toBeNull();
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/storage/artisan.test.ts`
Expected: FAIL with "getRequestViaArtisan is not exported"

### Step 3: Implement getRequestViaArtisan

Add to `src/storage/artisan.ts`:

```typescript
import type { ClockworkRequest } from '../types/clockwork.js';

/**
 * Fetches a single Clockwork request by ID via artisan tinker.
 * @param projectPath - Path to Laravel project root
 * @param requestId - Clockwork request ID
 * @param options - Execution options
 * @returns Request data or null if not found
 */
export function getRequestViaArtisan(
  projectPath: string,
  requestId: string,
  options: ArtisanOptions = {}
): ClockworkRequest | null {
  const phpCode = `echo json_encode(app('clockwork')->storage()->find('${requestId}')?->toArray());`;
  return executePhp<ClockworkRequest | null>(projectPath, phpCode, options);
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/storage/artisan.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/storage/artisan.ts src/storage/artisan.test.ts
git commit -m "feat(storage): add getRequestViaArtisan function"
```

---

## Task 4: Add getLatestRequestViaArtisan Function

**Files:**
- Modify: `src/storage/artisan.ts`
- Modify: `src/storage/artisan.test.ts`

### Step 1: Write failing test

Add to `src/storage/artisan.test.ts`:

```typescript
  describe('getLatestRequestViaArtisan', () => {
    it('fetches the most recent request', () => {
      const mockExecSync = vi.mocked(execSync);
      const mockRequest = {
        id: 'latest123',
        type: 'request',
        time: 1705312999,
        method: 'POST',
        uri: '/api/orders',
      };
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(mockRequest)));

      const result = getLatestRequestViaArtisan('/path/to/laravel');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("latest()"),
        expect.any(Object)
      );
      expect(result).toEqual(mockRequest);
    });

    it('returns null when no requests exist', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('null'));

      const result = getLatestRequestViaArtisan('/path/to/laravel');

      expect(result).toBeNull();
    });
  });
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/storage/artisan.test.ts`
Expected: FAIL

### Step 3: Implement getLatestRequestViaArtisan

Add to `src/storage/artisan.ts`:

```typescript
/**
 * Fetches the most recent Clockwork request via artisan tinker.
 * @param projectPath - Path to Laravel project root
 * @param options - Execution options
 * @returns Latest request data or null if none exist
 */
export function getLatestRequestViaArtisan(
  projectPath: string,
  options: ArtisanOptions = {}
): ClockworkRequest | null {
  const phpCode = `echo json_encode(app('clockwork')->storage()->latest()?->toArray());`;
  return executePhp<ClockworkRequest | null>(projectPath, phpCode, options);
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/storage/artisan.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/storage/artisan.ts src/storage/artisan.test.ts
git commit -m "feat(storage): add getLatestRequestViaArtisan function"
```

---

## Task 5: Add listRequestsViaArtisan Function

**Files:**
- Modify: `src/storage/artisan.ts`
- Modify: `src/storage/artisan.test.ts`

### Step 1: Write failing test

Add to `src/storage/artisan.test.ts`:

```typescript
  describe('listRequestsViaArtisan', () => {
    it('fetches all requests as index entries', () => {
      const mockExecSync = vi.mocked(execSync);
      const mockRequests = [
        { id: 'req1', type: 'request', time: 1705312999, method: 'GET', uri: '/api/users', responseStatus: 200, responseDuration: 45.5 },
        { id: 'req2', type: 'command', time: 1705312000, commandName: 'migrate' },
      ];
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(mockRequests)));

      const result = listRequestsViaArtisan('/path/to/laravel');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("all()"),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('req1');
      expect(result[1].commandName).toBe('migrate');
    });

    it('returns empty array when no requests exist', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from('[]'));

      const result = listRequestsViaArtisan('/path/to/laravel');

      expect(result).toEqual([]);
    });
  });
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/storage/artisan.test.ts`
Expected: FAIL

### Step 3: Implement listRequestsViaArtisan

Add to `src/storage/artisan.ts`:

```typescript
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';

/**
 * Lists all Clockwork requests via artisan tinker.
 * Returns lightweight index entries extracted from full request data.
 * @param projectPath - Path to Laravel project root
 * @param options - Execution options
 * @returns Array of index entries sorted by time (most recent first)
 */
export function listRequestsViaArtisan(
  projectPath: string,
  options: ArtisanOptions = {}
): IndexEntry[] {
  const phpCode = `echo json_encode(array_map(fn($r) => $r->toArray(), app('clockwork')->storage()->all()));`;
  const requests = executePhp<ClockworkRequest[]>(projectPath, phpCode, options) ?? [];

  // Map full requests to lightweight index entries
  return requests
    .map((r) => ({
      id: r.id,
      time: r.time,
      type: r.type,
      method: r.method,
      uri: r.uri,
      controller: r.controller,
      responseStatus: r.responseStatus,
      responseDuration: r.responseDuration,
      commandName: r.commandName,
    }))
    .sort((a, b) => b.time - a.time);
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/storage/artisan.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/storage/artisan.ts src/storage/artisan.test.ts
git commit -m "feat(storage): add listRequestsViaArtisan function"
```

---

## Task 6: Add Batch Request Fetching

**Files:**
- Modify: `src/storage/artisan.ts`
- Modify: `src/storage/artisan.test.ts`

### Step 1: Write failing test

Add to `src/storage/artisan.test.ts`:

```typescript
import { getRequestsViaArtisan } from './artisan.js';

  describe('getRequestsViaArtisan', () => {
    it('fetches multiple requests in a single call', () => {
      const mockExecSync = vi.mocked(execSync);
      const mockRequests = [
        { id: 'req1', type: 'request', time: 1705312999 },
        { id: 'req2', type: 'request', time: 1705312000 },
      ];
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(mockRequests)));

      const result = getRequestsViaArtisan('/path/to/laravel', ['req1', 'req2']);

      expect(mockExecSync).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it('filters out null results for missing requests', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue(Buffer.from(JSON.stringify([
        { id: 'req1', type: 'request', time: 1705312999 },
        null,
      ])));

      const result = getRequestsViaArtisan('/path/to/laravel', ['req1', 'nonexistent']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req1');
    });
  });
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/storage/artisan.test.ts`
Expected: FAIL

### Step 3: Implement getRequestsViaArtisan

Add to `src/storage/artisan.ts`:

```typescript
/**
 * Fetches multiple Clockwork requests by ID in a single PHP call.
 * @param projectPath - Path to Laravel project root
 * @param requestIds - Array of request IDs to fetch
 * @param options - Execution options
 * @returns Array of requests (excludes not found)
 */
export function getRequestsViaArtisan(
  projectPath: string,
  requestIds: string[],
  options: ArtisanOptions = {}
): ClockworkRequest[] {
  if (requestIds.length === 0) {
    return [];
  }

  const idsJson = JSON.stringify(requestIds);
  const phpCode = `echo json_encode(array_map(fn($id) => app('clockwork')->storage()->find($id)?->toArray(), json_decode('${idsJson}')));`;
  const results = executePhp<(ClockworkRequest | null)[]>(projectPath, phpCode, options) ?? [];

  return results.filter((r): r is ClockworkRequest => r !== null);
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/storage/artisan.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/storage/artisan.ts src/storage/artisan.test.ts
git commit -m "feat(storage): add batch request fetching via artisan"
```

---

## Task 7: Extend Locator to Return Project Path

**Files:**
- Modify: `src/storage/locator.ts`
- Modify: `src/storage/locator.test.ts` (create if not exists)

### Step 1: Write failing test

Create or update `src/storage/locator.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findProjectPath, findStoragePath } from './locator.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Locator', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-locator-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('findProjectPath', () => {
    it('returns project path from CLOCKWORK_PROJECT_PATH env var', () => {
      mkdirSync(join(testDir, 'laravel'), { recursive: true });
      writeFileSync(join(testDir, 'laravel', 'artisan'), '');

      const result = findProjectPath({ CLOCKWORK_PROJECT_PATH: join(testDir, 'laravel') });

      expect(result).toBe(join(testDir, 'laravel'));
    });

    it('finds Laravel project by traversing up from cwd', () => {
      mkdirSync(join(testDir, 'laravel', 'app', 'Http'), { recursive: true });
      writeFileSync(join(testDir, 'laravel', 'artisan'), '');

      const result = findProjectPath({}, join(testDir, 'laravel', 'app', 'Http'));

      expect(result).toBe(join(testDir, 'laravel'));
    });

    it('returns null when no Laravel project found', () => {
      const result = findProjectPath({}, testDir);

      expect(result).toBeNull();
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/storage/locator.test.ts`
Expected: FAIL with "findProjectPath is not exported"

### Step 3: Implement findProjectPath

Add to `src/storage/locator.ts`:

```typescript
/**
 * Finds Laravel project root path.
 * @param env - Environment variables for explicit paths
 * @param cwd - Current working directory override
 * @returns Project path or null if not found
 */
export function findProjectPath(env: LocatorEnv = {}, cwd?: string): string | null {
  // 1. Check explicit project path from env
  if (env.CLOCKWORK_PROJECT_PATH) {
    if (isLaravelProject(env.CLOCKWORK_PROJECT_PATH)) {
      return env.CLOCKWORK_PROJECT_PATH;
    }
    return null;
  }

  // 2. Check if cwd is a Laravel project
  const startDir = cwd || process.cwd();
  if (isLaravelProject(startDir)) {
    return startDir;
  }

  // 3. Traverse up to find Laravel project
  let currentDir = startDir;
  const root = dirname(currentDir);

  while (currentDir !== root) {
    if (isLaravelProject(currentDir)) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }

  return null;
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/storage/locator.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/storage/locator.ts src/storage/locator.test.ts
git commit -m "feat(storage): add findProjectPath to locator"
```

---

## Task 8: Create Unified Storage Interface

**Files:**
- Create: `src/storage/storage.ts`
- Create: `src/storage/storage.test.ts`

### Step 1: Write failing test

```typescript
// src/storage/storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStorage, StorageDriver } from './storage.js';
import * as artisan from './artisan.js';
import * as reader from './reader.js';
import * as indexParser from './index-parser.js';

vi.mock('./artisan.js');
vi.mock('./reader.js');
vi.mock('./index-parser.js');

describe('Unified Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStorage with artisan driver', () => {
    it('routes find() to artisan implementation', () => {
      const mockRequest = { id: 'abc123', type: 'request', time: 123 };
      vi.mocked(artisan.getRequestViaArtisan).mockReturnValue(mockRequest as any);

      const storage = createStorage({
        driver: 'artisan',
        projectPath: '/path/to/laravel',
      });

      const result = storage.find('abc123');

      expect(artisan.getRequestViaArtisan).toHaveBeenCalledWith('/path/to/laravel', 'abc123', {});
      expect(result).toEqual(mockRequest);
    });

    it('routes latest() to artisan implementation', () => {
      const mockRequest = { id: 'latest', type: 'request', time: 999 };
      vi.mocked(artisan.getLatestRequestViaArtisan).mockReturnValue(mockRequest as any);

      const storage = createStorage({
        driver: 'artisan',
        projectPath: '/path/to/laravel',
      });

      const result = storage.latest();

      expect(artisan.getLatestRequestViaArtisan).toHaveBeenCalledWith('/path/to/laravel', {});
      expect(result).toEqual(mockRequest);
    });

    it('routes list() to artisan implementation', () => {
      const mockEntries = [{ id: 'req1', time: 123, type: 'request' }];
      vi.mocked(artisan.listRequestsViaArtisan).mockReturnValue(mockEntries as any);

      const storage = createStorage({
        driver: 'artisan',
        projectPath: '/path/to/laravel',
      });

      const result = storage.list();

      expect(artisan.listRequestsViaArtisan).toHaveBeenCalledWith('/path/to/laravel', {});
      expect(result).toEqual(mockEntries);
    });
  });

  describe('createStorage with file driver', () => {
    it('routes find() to file-based reader', () => {
      const mockRequest = { id: 'abc123', type: 'request', time: 123 };
      vi.mocked(reader.readRequest).mockReturnValue(mockRequest as any);

      const storage = createStorage({
        driver: 'file',
        storagePath: '/path/to/storage/clockwork',
      });

      const result = storage.find('abc123');

      expect(reader.readRequest).toHaveBeenCalledWith('/path/to/storage/clockwork', 'abc123');
      expect(result).toEqual(mockRequest);
    });

    it('routes list() to file-based index parser', () => {
      const mockEntries = [{ id: 'req1', time: 123, type: 'request' }];
      vi.mocked(indexParser.parseIndex).mockReturnValue(mockEntries as any);

      const storage = createStorage({
        driver: 'file',
        storagePath: '/path/to/storage/clockwork',
      });

      const result = storage.list();

      expect(indexParser.parseIndex).toHaveBeenCalledWith('/path/to/storage/clockwork');
      expect(result).toEqual(mockEntries);
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/storage/storage.test.ts`
Expected: FAIL with "Cannot find module './storage.js'"

### Step 3: Implement unified storage interface

```typescript
// src/storage/storage.ts
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import * as artisan from './artisan.js';
import * as reader from './reader.js';
import { parseIndex } from './index-parser.js';
import type { ArtisanOptions } from './artisan.js';

export type StorageDriver = 'artisan' | 'file';

export interface StorageOptions {
  driver: StorageDriver;
  projectPath?: string;
  storagePath?: string;
  phpPath?: string;
  timeout?: number;
}

export interface Storage {
  find(requestId: string): ClockworkRequest | null;
  findMany(requestIds: string[]): ClockworkRequest[];
  latest(): ClockworkRequest | null;
  list(): IndexEntry[];
}

/**
 * Creates a unified storage interface that routes to the appropriate backend.
 * @param options - Storage configuration
 * @returns Storage interface
 */
export function createStorage(options: StorageOptions): Storage {
  if (options.driver === 'artisan') {
    if (!options.projectPath) {
      throw new Error('projectPath is required for artisan driver');
    }

    const artisanOpts: ArtisanOptions = {
      phpPath: options.phpPath,
      timeout: options.timeout,
    };

    return {
      find: (requestId) => artisan.getRequestViaArtisan(options.projectPath!, requestId, artisanOpts),
      findMany: (requestIds) => artisan.getRequestsViaArtisan(options.projectPath!, requestIds, artisanOpts),
      latest: () => artisan.getLatestRequestViaArtisan(options.projectPath!, artisanOpts),
      list: () => artisan.listRequestsViaArtisan(options.projectPath!, artisanOpts),
    };
  }

  if (options.driver === 'file') {
    if (!options.storagePath) {
      throw new Error('storagePath is required for file driver');
    }

    return {
      find: (requestId) => reader.readRequest(options.storagePath!, requestId),
      findMany: (requestIds) => reader.readRequests(options.storagePath!, requestIds),
      latest: () => {
        const entries = parseIndex(options.storagePath!);
        if (entries.length === 0) return null;
        return reader.readRequest(options.storagePath!, entries[0].id);
      },
      list: () => parseIndex(options.storagePath!),
    };
  }

  throw new Error(`Unknown storage driver: ${options.driver}`);
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/storage/storage.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/storage/storage.ts src/storage/storage.test.ts
git commit -m "feat(storage): add unified storage interface"
```

---

## Task 9: Add Auto-Detection to Storage Factory

**Files:**
- Modify: `src/storage/storage.ts`
- Modify: `src/storage/storage.test.ts`

### Step 1: Write failing test for auto-detection

Add to `src/storage/storage.test.ts`:

```typescript
import { resolveStorage } from './storage.js';
import * as locator from './locator.js';

vi.mock('./locator.js');

describe('resolveStorage', () => {
  it('uses artisan driver when CLOCKWORK_STORAGE_DRIVER=artisan', () => {
    vi.mocked(locator.findProjectPath).mockReturnValue('/path/to/laravel');

    const storage = resolveStorage({
      CLOCKWORK_STORAGE_DRIVER: 'artisan',
      CLOCKWORK_PROJECT_PATH: '/path/to/laravel',
    });

    expect(storage).toBeDefined();
    // Test that it uses artisan by calling a method
    vi.mocked(artisan.listRequestsViaArtisan).mockReturnValue([]);
    storage.list();
    expect(artisan.listRequestsViaArtisan).toHaveBeenCalled();
  });

  it('uses file driver when CLOCKWORK_STORAGE_DRIVER=file', () => {
    vi.mocked(locator.findStoragePath).mockReturnValue('/path/to/storage/clockwork');

    const storage = resolveStorage({
      CLOCKWORK_STORAGE_DRIVER: 'file',
      CLOCKWORK_STORAGE_PATH: '/path/to/storage/clockwork',
    });

    expect(storage).toBeDefined();
    vi.mocked(indexParser.parseIndex).mockReturnValue([]);
    storage.list();
    expect(indexParser.parseIndex).toHaveBeenCalled();
  });

  it('auto-detects artisan driver when project path found', () => {
    vi.mocked(locator.findProjectPath).mockReturnValue('/path/to/laravel');
    vi.mocked(locator.findStoragePath).mockReturnValue(null);

    const storage = resolveStorage({});

    vi.mocked(artisan.listRequestsViaArtisan).mockReturnValue([]);
    storage.list();
    expect(artisan.listRequestsViaArtisan).toHaveBeenCalled();
  });

  it('throws when no storage can be resolved', () => {
    vi.mocked(locator.findProjectPath).mockReturnValue(null);
    vi.mocked(locator.findStoragePath).mockReturnValue(null);

    expect(() => resolveStorage({})).toThrow('Could not find Clockwork storage');
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/storage/storage.test.ts`
Expected: FAIL with "resolveStorage is not exported"

### Step 3: Implement resolveStorage

Add to `src/storage/storage.ts`:

```typescript
import { findProjectPath, findStoragePath, LocatorEnv } from './locator.js';

export interface ResolveEnv extends LocatorEnv {
  CLOCKWORK_STORAGE_DRIVER?: string;
  CLOCKWORK_PHP_PATH?: string;
}

/**
 * Resolves and creates a storage instance based on environment and auto-detection.
 * @param env - Environment variables
 * @param cwd - Current working directory override
 * @returns Configured storage instance
 */
export function resolveStorage(env: ResolveEnv = {}, cwd?: string): Storage {
  const driver = env.CLOCKWORK_STORAGE_DRIVER as StorageDriver | undefined;

  // Explicit driver selection
  if (driver === 'artisan') {
    const projectPath = findProjectPath(env, cwd);
    if (!projectPath) {
      throw new Error('Could not find Laravel project for artisan driver');
    }
    return createStorage({
      driver: 'artisan',
      projectPath,
      phpPath: env.CLOCKWORK_PHP_PATH,
    });
  }

  if (driver === 'file') {
    const storagePath = findStoragePath(env, cwd);
    if (!storagePath) {
      throw new Error('Could not find Clockwork storage path for file driver');
    }
    return createStorage({
      driver: 'file',
      storagePath,
    });
  }

  // Auto-detection: prefer artisan (works with all backends)
  const projectPath = findProjectPath(env, cwd);
  if (projectPath) {
    return createStorage({
      driver: 'artisan',
      projectPath,
      phpPath: env.CLOCKWORK_PHP_PATH,
    });
  }

  // Fallback to file-based if storage path exists
  const storagePath = findStoragePath(env, cwd);
  if (storagePath) {
    return createStorage({
      driver: 'file',
      storagePath,
    });
  }

  throw new Error(
    'Could not find Clockwork storage. Ensure you are in a Laravel project with Clockwork installed, ' +
      'or set CLOCKWORK_PROJECT_PATH or CLOCKWORK_STORAGE_PATH environment variable.'
  );
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/storage/storage.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/storage/storage.ts src/storage/storage.test.ts
git commit -m "feat(storage): add auto-detection to storage resolver"
```

---

## Task 10: Update Server to Use Unified Storage

**Files:**
- Modify: `src/server.ts`

### Step 1: Read current server implementation

Already read in exploration phase. The server uses `getStoragePath()` and passes it to tool functions.

### Step 2: Update server to use resolveStorage

Update `src/server.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { resolveStorage, Storage } from './storage/storage.js';
import * as requestTools from './tools/requests.js';
import * as dbTools from './tools/database.js';
import * as perfTools from './tools/performance.js';
import * as cacheTools from './tools/cache.js';
import * as contextTools from './tools/context.js';
import * as cmdTools from './tools/commands.js';
import * as utilTools from './tools/utility.js';
import * as schemas from './types/tools.js';

/**
 * Creates and configures the MCP server with all Clockwork debugging tools.
 * @returns Configured McpServer instance ready to connect
 */
export function createServer() {
  const server = new McpServer({
    name: 'clockwork-mcp',
    version: '0.1.0',
  });

  // Resolve storage - will be created when tools are called
  let storage: Storage | null = null;
  const getStorage = (): Storage => {
    if (!storage) {
      storage = resolveStorage({
        CLOCKWORK_STORAGE_PATH: process.env.CLOCKWORK_STORAGE_PATH,
        CLOCKWORK_PROJECT_PATH: process.env.CLOCKWORK_PROJECT_PATH,
        CLOCKWORK_STORAGE_DRIVER: process.env.CLOCKWORK_STORAGE_DRIVER,
        CLOCKWORK_PHP_PATH: process.env.CLOCKWORK_PHP_PATH,
      });
    }
    return storage;
  };

  // Request discovery tools
  server.tool(
    'list_requests',
    'List recent Clockwork requests with optional filtering',
    schemas.listRequestsSchema.shape,
    async (input) => {
      const result = requestTools.listRequestsFromStorage(
        getStorage(),
        input as schemas.ListRequestsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ... (remaining tools follow same pattern)
```

**Note:** This requires updating the tool functions to accept `Storage` instead of `storagePath`. This is covered in Task 11.

### Step 3: Run typecheck to verify

Run: `npm run typecheck`
Expected: Type errors (tool functions don't accept Storage yet)

### Step 4: Commit partial progress

```bash
git add src/server.ts
git commit -m "refactor(server): prepare for unified storage interface

WIP: Tool functions need updating to accept Storage instead of storagePath"
```

---

## Task 11: Update Request Tools to Use Storage Interface

**Files:**
- Modify: `src/tools/requests.ts`
- Modify: `src/tools/requests.test.ts`

### Step 1: Update tool functions

Update `src/tools/requests.ts`:

```typescript
import type { Storage } from '../storage/storage.js';
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import type { ListRequestsInput, SearchRequestsInput } from '../types/tools.js';

/**
 * Lists recent Clockwork requests with optional filtering and pagination.
 * @param storage - Storage interface
 * @param input - Filter and pagination options
 * @returns Array of index entries matching the criteria
 */
export function listRequestsFromStorage(storage: Storage, input: ListRequestsInput): IndexEntry[] {
  let entries = storage.list();

  // Apply filters
  if (input.type) {
    entries = entries.filter((e) => e.type === input.type);
  }
  if (input.status !== undefined) {
    entries = entries.filter((e) => e.responseStatus === input.status);
  }
  if (input.uri) {
    entries = entries.filter((e) => e.uri?.includes(input.uri!));
  }
  if (input.method) {
    entries = entries.filter((e) => e.method === input.method);
  }
  if (input.from !== undefined) {
    entries = entries.filter((e) => e.time >= input.from!);
  }
  if (input.to !== undefined) {
    entries = entries.filter((e) => e.time <= input.to!);
  }

  // Apply pagination
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

/**
 * Gets full details of a specific Clockwork request.
 * @param storage - Storage interface
 * @param requestId - Clockwork request ID
 * @returns Full request data or null if not found
 */
export function getRequestFromStorage(storage: Storage, requestId: string): ClockworkRequest | null {
  return storage.find(requestId);
}

/**
 * Gets the most recent Clockwork request.
 * @param storage - Storage interface
 * @returns Most recent request data or null if no requests exist
 */
export function getLatestRequestFromStorage(storage: Storage): ClockworkRequest | null {
  return storage.latest();
}

/**
 * Searches requests by controller, URI, status code, or duration.
 * @param storage - Storage interface
 * @param input - Search criteria and pagination options
 * @returns Array of matching index entries
 */
export function searchRequestsFromStorage(storage: Storage, input: SearchRequestsInput): IndexEntry[] {
  let entries = storage.list();

  if (input.controller) {
    entries = entries.filter((e) => e.controller?.includes(input.controller!));
  }
  if (input.uri) {
    entries = entries.filter((e) => e.uri?.includes(input.uri!));
  }
  if (input.status !== undefined) {
    entries = entries.filter((e) => e.responseStatus === input.status);
  }
  if (input.minDuration !== undefined) {
    entries = entries.filter((e) => (e.responseDuration ?? 0) >= input.minDuration!);
  }
  if (input.maxDuration !== undefined) {
    entries = entries.filter((e) => (e.responseDuration ?? 0) <= input.maxDuration!);
  }

  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

// Keep old functions for backward compatibility (deprecated)
export { listRequests, getRequest, getLatestRequest, searchRequests } from './requests-legacy.js';
```

### Step 2: Create legacy wrapper

Create `src/tools/requests-legacy.ts` with the old implementations that convert storagePath to Storage:

```typescript
// src/tools/requests-legacy.ts
// Deprecated: Use *FromStorage functions instead
import { createStorage } from '../storage/storage.js';
import type { IndexEntry, ClockworkRequest } from '../types/clockwork.js';
import type { ListRequestsInput, SearchRequestsInput } from '../types/tools.js';
import * as newTools from './requests.js';

/** @deprecated Use listRequestsFromStorage instead */
export function listRequests(storagePath: string, input: ListRequestsInput): IndexEntry[] {
  const storage = createStorage({ driver: 'file', storagePath });
  return newTools.listRequestsFromStorage(storage, input);
}

/** @deprecated Use getRequestFromStorage instead */
export function getRequest(storagePath: string, requestId: string): ClockworkRequest | null {
  const storage = createStorage({ driver: 'file', storagePath });
  return newTools.getRequestFromStorage(storage, requestId);
}

/** @deprecated Use getLatestRequestFromStorage instead */
export function getLatestRequest(storagePath: string): ClockworkRequest | null {
  const storage = createStorage({ driver: 'file', storagePath });
  return newTools.getLatestRequestFromStorage(storage);
}

/** @deprecated Use searchRequestsFromStorage instead */
export function searchRequests(storagePath: string, input: SearchRequestsInput): IndexEntry[] {
  const storage = createStorage({ driver: 'file', storagePath });
  return newTools.searchRequestsFromStorage(storage, input);
}
```

### Step 3: Update tests

Update `src/tools/requests.test.ts` to test the new functions with a mock Storage interface.

### Step 4: Run tests

Run: `npm test -- src/tools/requests.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/tools/requests.ts src/tools/requests-legacy.ts src/tools/requests.test.ts
git commit -m "refactor(tools): update request tools to use Storage interface"
```

---

## Task 12: Update Remaining Tools

**Files:**
- Modify: `src/tools/database.ts`
- Modify: `src/tools/cache.ts`
- Modify: `src/tools/context.ts`
- Modify: `src/tools/commands.ts`
- Modify: `src/tools/performance.ts`
- Modify: `src/tools/utility.ts`

Follow the same pattern as Task 11 for each tool file:

1. Add new `*FromStorage` functions that accept `Storage` interface
2. Keep old functions as deprecated wrappers
3. Update tests

### Commit after each file

```bash
git commit -m "refactor(tools): update database tools to use Storage interface"
git commit -m "refactor(tools): update cache tools to use Storage interface"
git commit -m "refactor(tools): update context tools to use Storage interface"
git commit -m "refactor(tools): update commands tools to use Storage interface"
git commit -m "refactor(tools): update performance tools to use Storage interface"
git commit -m "refactor(tools): update utility tools to use Storage interface"
```

---

## Task 13: Complete Server Integration

**Files:**
- Modify: `src/server.ts`

### Step 1: Update all tool registrations

Update `src/server.ts` to use the new `*FromStorage` functions for all tools:

```typescript
// Example for one tool - apply pattern to all
server.tool(
  'list_requests',
  'List recent Clockwork requests with optional filtering',
  schemas.listRequestsSchema.shape,
  async (input) => {
    const result = requestTools.listRequestsFromStorage(
      getStorage(),
      input as schemas.ListRequestsInput
    );
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);
```

### Step 2: Run all tests

Run: `npm test`
Expected: All tests PASS

### Step 3: Run typecheck

Run: `npm run typecheck`
Expected: No errors

### Step 4: Commit

```bash
git add src/server.ts
git commit -m "feat(server): complete integration with unified storage"
```

---

## Task 14: Add Integration Test with Real Laravel Project

**Files:**
- Create: `src/storage/integration.test.ts`

### Step 1: Write integration test (skipped in CI)

```typescript
// src/storage/integration.test.ts
import { describe, it, expect } from 'vitest';
import { resolveStorage } from './storage.js';
import { existsSync } from 'fs';

// Skip in CI - requires a real Laravel project
const LARAVEL_PROJECT = process.env.TEST_LARAVEL_PROJECT;

describe.skipIf(!LARAVEL_PROJECT)('Integration Tests', () => {
  it('can resolve storage from Laravel project', () => {
    const storage = resolveStorage({
      CLOCKWORK_PROJECT_PATH: LARAVEL_PROJECT,
    });

    expect(storage).toBeDefined();
  });

  it('can list requests via artisan', () => {
    const storage = resolveStorage({
      CLOCKWORK_PROJECT_PATH: LARAVEL_PROJECT,
      CLOCKWORK_STORAGE_DRIVER: 'artisan',
    });

    const entries = storage.list();
    expect(Array.isArray(entries)).toBe(true);
  });

  it('can fetch latest request via artisan', () => {
    const storage = resolveStorage({
      CLOCKWORK_PROJECT_PATH: LARAVEL_PROJECT,
      CLOCKWORK_STORAGE_DRIVER: 'artisan',
    });

    const latest = storage.latest();
    // May be null if no requests
    if (latest) {
      expect(latest.id).toBeDefined();
      expect(latest.type).toBeDefined();
    }
  });
});
```

### Step 2: Run integration test locally

Run: `TEST_LARAVEL_PROJECT=/path/to/your/laravel npm test -- src/storage/integration.test.ts`

### Step 3: Commit

```bash
git add src/storage/integration.test.ts
git commit -m "test(storage): add integration tests for artisan storage"
```

---

## Task 15: Update Documentation

**Files:**
- Modify: `README.md`

### Step 1: Add documentation for new storage options

Add a section to README.md:

```markdown
## Storage Configuration

By default, Clockwork MCP auto-detects your Laravel project and uses `php artisan tinker` to read Clockwork data. This works with **all** Clockwork storage backends:

- File (default)
- SQLite
- MySQL
- PostgreSQL
- Redis

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CLOCKWORK_PROJECT_PATH` | Path to Laravel project root | `/path/to/laravel` |
| `CLOCKWORK_STORAGE_DRIVER` | Force storage driver (`artisan` or `file`) | `artisan` |
| `CLOCKWORK_PHP_PATH` | Custom PHP binary path | `/usr/local/bin/php` |
| `CLOCKWORK_STORAGE_PATH` | Direct path to storage (file driver only) | `/path/to/storage/clockwork` |

### How It Works

When you configure Clockwork to use SQL or Redis storage in your Laravel app (`config/clockwork.php`), the MCP server automatically uses the same storage by running PHP commands through `artisan tinker`. No additional configuration required.
```

### Step 2: Commit

```bash
git add README.md
git commit -m "docs: add storage configuration documentation"
```

---

## Task 16: Final Verification

### Step 1: Run full test suite

Run: `npm test`
Expected: All tests PASS

### Step 2: Run linting

Run: `npm run lint`
Expected: No errors

### Step 3: Run typecheck

Run: `npm run typecheck`
Expected: No errors

### Step 4: Build

Run: `npm run build`
Expected: Build succeeds

### Step 5: Manual test with your Laravel project

1. Set Clockwork storage to SQL in your Laravel app
2. Make a few requests
3. Run: `CLOCKWORK_PROJECT_PATH=/path/to/artworkflow/apps/backend npx clockwork-mcp`
4. Verify tools return data from SQL storage

### Step 6: Final commit

```bash
git add -A
git commit -m "feat: complete multi-storage backend support

Adds support for all Clockwork storage backends (File, SQLite, MySQL,
PostgreSQL, Redis) by using php artisan tinker to leverage Clockwork's
own storage classes.

- Add artisan.ts for PHP execution via tinker
- Add storage.ts unified storage interface
- Update all tools to use Storage interface
- Auto-detect storage driver from Laravel project
- Add integration tests

Closes #XX"
```

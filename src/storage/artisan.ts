import { execSync } from 'child_process';
import type { ClockworkRequest, IndexEntry, RequestType } from '../types/clockwork.js';

export interface ArtisanOptions {
  phpPath?: string;
  timeout?: number;
}

/**
 * Detects if Clockwork uses SQLite storage and returns the database path.
 * @param projectPath - Path to Laravel project root
 * @param options - Execution options
 * @returns SQLite database path or null if not using SQLite
 */
export function detectSqliteStorage(
  projectPath: string,
  options: ArtisanOptions = {}
): string | null {
  try {
    const phpCode = `
      $storage = config('clockwork.storage');
      $path = config('clockwork.storage_sql_database');
      if ($storage === 'sql' && $path && str_ends_with($path, '.sqlite')) {
        echo json_encode($path);
      } else {
        echo json_encode(null);
      }
    `;
    const result = executePhp<string | null>(projectPath, phpCode, options);
    return result && result.endsWith('.sqlite') ? result : null;
  } catch {
    return null;
  }
}

/**
 * Lists Clockwork requests by querying SQLite directly (avoids OOM from hydrating full objects).
 * @param dbPath - Path to SQLite database file
 * @param limit - Maximum number of requests to return
 * @param timeout - Command timeout in milliseconds
 * @returns Array of index entries sorted by time (most recent first)
 */
export function listRequestsViaSqlite(
  dbPath: string,
  limit: number = 100,
  timeout: number = 30000
): IndexEntry[] {
  // Query only the columns needed for IndexEntry to avoid loading full request payloads
  const columns =
    'id, time, type, method, uri, controller, responseStatus, responseDuration, commandName';
  const query = `SELECT ${columns} FROM clockwork ORDER BY time DESC LIMIT ${limit}`;

  // Use -json output mode for reliable parsing
  const command = `sqlite3 -json "${dbPath}" "${query}"`;

  let output: string;
  try {
    output = execSync(command, {
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(`SQLite query failed for ${dbPath}`);
  }

  const trimmed = output.trim();
  if (!trimmed || trimmed === '[]') {
    return [];
  }

  // Parse JSON output from sqlite3 -json
  const rows = JSON.parse(trimmed) as Array<{
    id: string;
    time: number;
    type: string;
    method: string | null;
    uri: string | null;
    controller: string | null;
    responseStatus: number | null;
    responseDuration: number | null;
    commandName: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    time: row.time,
    type: (row.type || 'request') as RequestType,
    method: row.method ?? undefined,
    uri: row.uri ?? undefined,
    controller: row.controller ?? undefined,
    responseStatus: row.responseStatus ?? undefined,
    responseDuration: row.responseDuration ?? undefined,
    commandName: row.commandName ?? undefined,
  }));
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
  const jsonLine = lines.find(
    (line) =>
      line.startsWith('{') || line.startsWith('[') || line.startsWith('"') || line === 'null'
  );

  if (!jsonLine) {
    throw new Error(`No JSON output from PHP execution. Output: ${output}`);
  }

  return JSON.parse(jsonLine) as T;
}

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

/**
 * Lists Clockwork requests.
 * Tries direct SQLite query first (fast, avoids OOM), falls back to PHP for non-SQLite storage.
 * @param projectPath - Path to Laravel project root
 * @param options - Execution options
 * @param limit - Maximum number of requests to return (default 100)
 * @returns Array of index entries sorted by time (most recent first)
 */
export function listRequestsViaArtisan(
  projectPath: string,
  options: ArtisanOptions = {},
  limit: number = 100
): IndexEntry[] {
  // Try direct SQLite path first - avoids OOM by querying only metadata columns
  const sqlitePath = detectSqliteStorage(projectPath, options);
  if (sqlitePath) {
    try {
      return listRequestsViaSqlite(sqlitePath, limit, options.timeout);
    } catch {
      // Fall through to PHP method
    }
  }

  // Fallback to PHP method (for non-SQLite storage or if SQLite query fails)
  // Uses previous() instead of all() - all() causes OOM on SQL storage by loading everything
  const phpCode = `$s = app("clockwork")->storage(); $l = $s->latest(); if (!$l) { echo "[]"; } else { $p = $s->previous($l->id, ${limit - 1}); array_unshift($p, $l); echo json_encode(array_map(fn($r) => ["id" => $r->id, "time" => $r->time, "type" => $r->type ?? "request", "method" => $r->method ?? null, "uri" => $r->uri ?? null, "controller" => $r->controller ?? null, "responseStatus" => $r->responseStatus ?? null, "responseDuration" => $r->responseDuration ?? null, "commandName" => $r->commandName ?? null], $p)); }`;

  const entries = executePhp<IndexEntry[]>(projectPath, phpCode, options) ?? [];

  return entries.sort((a, b) => b.time - a.time);
}

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

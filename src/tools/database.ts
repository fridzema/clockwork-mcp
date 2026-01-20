import type { Storage } from '../storage/storage.js';
import { detectNPlusOne } from '../analyzers/n-plus-one.js';
import { analyzeSlowQueries } from '../analyzers/slow-queries.js';
import type { DatabaseQuery } from '../types/clockwork.js';
import type {
  GetQueriesInput,
  GetQueryStatsInput,
  AnalyzeSlowQueriesInput,
  DetectNPlusOneInput,
} from '../types/tools.js';

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

/**
 * Gets database queries executed during a request.
 * @param storage - Storage interface
 * @param input - Request ID and optional slow query filter
 * @returns Array of database queries
 */
export function getQueries(storage: Storage, input: GetQueriesInput): DatabaseQuery[] {
  const request = storage.find(input.requestId);

  if (!request?.databaseQueries) {
    return [];
  }

  let queries = request.databaseQueries;

  if (input.slow && input.threshold) {
    queries = queries.filter((q) => q.duration >= input.threshold!);
  }

  return queries;
}

/**
 * Gets aggregate statistics for database queries in a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Query statistics including counts, durations, and breakdown by type
 */
export function getQueryStats(storage: Storage, input: GetQueryStatsInput): QueryStats {
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

  const request = storage.find(input.requestId);

  if (!request?.databaseQueries || request.databaseQueries.length === 0) {
    return defaultStats;
  }

  const queries = request.databaseQueries;
  const totalDuration = queries.reduce((sum, q) => sum + q.duration, 0);
  const slowest = queries.reduce(
    (max, q) => (q.duration > (max?.duration ?? 0) ? q : max),
    queries[0]
  );

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

/**
 * Finds queries exceeding a duration threshold.
 * @param storage - Storage interface
 * @param input - Request ID and threshold in milliseconds (default: 100ms)
 * @returns Array of slow queries sorted by duration descending
 */
export function analyzeSlowQueriesForRequest(
  storage: Storage,
  input: AnalyzeSlowQueriesInput
): DatabaseQuery[] {
  if (!input.requestId) {
    return [];
  }

  const request = storage.find(input.requestId);

  if (!request?.databaseQueries) {
    return [];
  }

  return analyzeSlowQueries(request.databaseQueries, input.threshold ?? 100);
}

/**
 * Detects N+1 query patterns in a request.
 * @param storage - Storage interface
 * @param input - Request ID and detection threshold
 * @returns Array of detected N+1 patterns with query counts and examples
 */
export function detectNPlusOneForRequest(storage: Storage, input: DetectNPlusOneInput) {
  const request = storage.find(input.requestId);

  if (!request?.databaseQueries) {
    return [];
  }

  return detectNPlusOne(request.databaseQueries, input.threshold);
}

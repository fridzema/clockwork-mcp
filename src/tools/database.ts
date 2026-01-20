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
import { filterRequestsByScope } from './utility.js';

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

export interface AggregatedSlowQuery {
  queryPattern: string;
  totalOccurrences: number;
  totalDuration: number;
  maxDuration: number;
  avgDuration: number;
  affectedRequests: Array<{ id: string; uri?: string; method?: string }>;
  exampleQuery: string;
}

export interface AggregatedSlowQueriesResult {
  queries: AggregatedSlowQuery[];
  summary: {
    totalSlowQueries: number;
    requestsAnalyzed: number;
    requestsWithSlowQueries: number;
    capped: boolean;
    totalMatched: number;
  };
}

export interface AggregatedNPlusOnePattern {
  queryPattern: string;
  totalOccurrences: number;
  avgOccurrencesPerRequest: number;
  affectedRequests: Array<{ id: string; uri?: string; method?: string; count: number }>;
  exampleQuery: string;
}

export interface AggregatedNPlusOneResult {
  patterns: AggregatedNPlusOnePattern[];
  summary: {
    totalPatterns: number;
    requestsAnalyzed: number;
    requestsWithNPlusOne: number;
    capped: boolean;
    totalMatched: number;
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
 * Normalizes a SQL query to a pattern by replacing literal values with placeholders.
 */
function normalizeQueryToPattern(query: string): string {
  return query
    .replace(/= ?\d+/g, '= ?') // numbers
    .replace(/= ?'[^']*'/g, "= '?'") // single-quoted strings
    .replace(/= ?"[^"]*"/g, '= "?"') // double-quoted strings
    .replace(/IN \([^)]+\)/gi, 'IN (?)') // IN clauses
    .replace(/LIMIT \d+/gi, 'LIMIT ?') // LIMIT
    .replace(/OFFSET \d+/gi, 'OFFSET ?') // OFFSET
    .trim();
}

/**
 * Finds queries exceeding a duration threshold across multiple requests.
 * @param storage - Storage interface
 * @param input - Scope parameters and threshold in milliseconds (default: 100ms)
 * @returns Aggregated slow queries grouped by pattern
 */
export function analyzeSlowQueriesForRequest(
  storage: Storage,
  input: AnalyzeSlowQueriesInput
): AggregatedSlowQueriesResult {
  const threshold = input.threshold ?? 100;
  const { ids, totalMatched, capped } = filterRequestsByScope(input, storage);

  const patternMap = new Map<
    string,
    {
      occurrences: number;
      totalDuration: number;
      maxDuration: number;
      requests: Set<string>;
      requestDetails: Map<string, { uri?: string; method?: string }>;
      exampleQuery: string;
    }
  >();

  let requestsWithSlowQueries = 0;

  for (const id of ids) {
    const request = storage.find(id);
    if (!request?.databaseQueries) continue;

    const slowQueries = analyzeSlowQueries(request.databaseQueries, threshold);
    if (slowQueries.length > 0) {
      requestsWithSlowQueries++;
    }

    for (const query of slowQueries) {
      const pattern = normalizeQueryToPattern(query.query);
      const existing = patternMap.get(pattern);

      if (existing) {
        existing.occurrences++;
        existing.totalDuration += query.duration;
        existing.maxDuration = Math.max(existing.maxDuration, query.duration);
        existing.requests.add(id);
        existing.requestDetails.set(id, { uri: request.uri, method: request.method });
      } else {
        const requestDetails = new Map<string, { uri?: string; method?: string }>();
        requestDetails.set(id, { uri: request.uri, method: request.method });
        patternMap.set(pattern, {
          occurrences: 1,
          totalDuration: query.duration,
          maxDuration: query.duration,
          requests: new Set([id]),
          requestDetails,
          exampleQuery: query.query,
        });
      }
    }
  }

  const queries: AggregatedSlowQuery[] = Array.from(patternMap.entries())
    .map(([pattern, data]) => ({
      queryPattern: pattern,
      totalOccurrences: data.occurrences,
      totalDuration: data.totalDuration,
      maxDuration: data.maxDuration,
      avgDuration: data.totalDuration / data.occurrences,
      affectedRequests: Array.from(data.requests).map((id) => ({
        id,
        ...data.requestDetails.get(id),
      })),
      exampleQuery: data.exampleQuery,
    }))
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences);

  const limitedQueries = queries.slice(0, input.limit ?? 20);

  return {
    queries: limitedQueries,
    summary: {
      totalSlowQueries: queries.reduce((sum, q) => sum + q.totalOccurrences, 0),
      requestsAnalyzed: ids.length,
      requestsWithSlowQueries,
      capped,
      totalMatched,
    },
  };
}

/**
 * Detects N+1 query patterns across multiple requests.
 * @param storage - Storage interface
 * @param input - Scope parameters and detection threshold
 * @returns Aggregated N+1 patterns grouped by query pattern
 */
export function detectNPlusOneForRequest(
  storage: Storage,
  input: DetectNPlusOneInput
): AggregatedNPlusOneResult {
  const threshold = input.threshold ?? 2;
  const { ids, totalMatched, capped } = filterRequestsByScope(input, storage);

  const patternMap = new Map<
    string,
    {
      totalOccurrences: number;
      requests: Map<string, { uri?: string; method?: string; count: number }>;
      exampleQuery: string;
    }
  >();

  let requestsWithNPlusOne = 0;

  for (const id of ids) {
    const request = storage.find(id);
    if (!request?.databaseQueries) continue;

    const patterns = detectNPlusOne(request.databaseQueries, threshold);
    if (patterns.length > 0) {
      requestsWithNPlusOne++;
    }

    for (const nPlusOnePattern of patterns) {
      // nPlusOnePattern.pattern is already normalized
      const normalizedPattern = nPlusOnePattern.pattern;
      const existing = patternMap.get(normalizedPattern);

      if (existing) {
        existing.totalOccurrences += nPlusOnePattern.count;
        existing.requests.set(id, {
          uri: request.uri,
          method: request.method,
          count: nPlusOnePattern.count,
        });
      } else {
        const requests = new Map<string, { uri?: string; method?: string; count: number }>();
        requests.set(id, {
          uri: request.uri,
          method: request.method,
          count: nPlusOnePattern.count,
        });
        patternMap.set(normalizedPattern, {
          totalOccurrences: nPlusOnePattern.count,
          requests,
          exampleQuery: nPlusOnePattern.examples[0] || nPlusOnePattern.pattern,
        });
      }
    }
  }

  const patterns: AggregatedNPlusOnePattern[] = Array.from(patternMap.entries())
    .map(([pattern, data]) => ({
      queryPattern: pattern,
      totalOccurrences: data.totalOccurrences,
      avgOccurrencesPerRequest: data.totalOccurrences / data.requests.size,
      affectedRequests: Array.from(data.requests.entries()).map(([reqId, details]) => ({
        id: reqId,
        ...details,
      })),
      exampleQuery: data.exampleQuery,
    }))
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences);

  return {
    patterns,
    summary: {
      totalPatterns: patterns.length,
      requestsAnalyzed: ids.length,
      requestsWithNPlusOne,
      capped,
      totalMatched,
    },
  };
}

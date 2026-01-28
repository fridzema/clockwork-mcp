import type { Storage } from '../storage/storage.js';
import type { TimelineEvent } from '../types/clockwork.js';
import type {
  GetPerformanceSummaryInput,
  GetTimelineInput,
  CompareRequestsInput,
} from '../types/tools.js';

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

/**
 * Gets a performance overview for a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Performance metrics including duration, memory, queries, and cache
 */
export function getPerformanceSummary(
  storage: Storage,
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

  const request = storage.find(input.requestId);

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

/**
 * Gets the execution timeline for a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Array of timeline events showing execution flow
 */
export function getTimeline(storage: Storage, input: GetTimelineInput): TimelineEvent[] {
  const request = storage.find(input.requestId);

  if (!request?.timelineData) {
    return [];
  }

  return request.timelineData;
}

/**
 * Compares performance metrics between two requests.
 * @param storage - Storage interface
 * @param input - Two request IDs to compare
 * @returns Comparison showing differences in duration, queries, and memory
 */
export function compareRequests(storage: Storage, input: CompareRequestsInput): RequestComparison {
  const req1 = storage.find(input.requestId1);
  const req2 = storage.find(input.requestId2);

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

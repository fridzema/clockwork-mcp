import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { Storage } from '../storage/storage.js';

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

/**
 * Gets Clockwork storage status and statistics.
 * @param storage - Storage interface
 * @param storagePath - Path to Clockwork storage directory (for size calculation)
 * @returns Status including request count, time range, and storage size
 */
export function getClockworkStatus(storage: Storage, storagePath: string): ClockworkStatus {
  if (!existsSync(storagePath)) {
    return {
      found: false,
      storagePath,
      requestCount: 0,
    };
  }

  const entries = storage.list();

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

/**
 * Generates a high-level summary of what happened in a request.
 * @param storage - Storage interface
 * @param requestId - Clockwork request ID
 * @returns Summary including route, controller, queries, and status
 */
export function explainRequestFlow(storage: Storage, requestId: string): RequestFlowSummary {
  const request = storage.find(requestId);

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

/**
 * Parses a human-readable time duration string into milliseconds.
 * Supports formats: 30m, 1h, 2d, 1w (minutes, hours, days, weeks)
 * @param duration - Duration string (e.g., "1h", "30m", "2d", "1w")
 * @returns Duration in milliseconds, or null if invalid format
 */
export function parseTimeDuration(duration: string): number | null {
  const match = duration.trim().match(/^(\d+(?:\.\d+)?)\s*(m|h|d|w)$/i);
  if (!match) {
    return null;
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    m: 60 * 1000, // minutes to ms
    h: 60 * 60 * 1000, // hours to ms
    d: 24 * 60 * 60 * 1000, // days to ms
    w: 7 * 24 * 60 * 60 * 1000, // weeks to ms
  };

  return value * multipliers[unit];
}

export interface RequestScope {
  requestId?: string;
  count?: number;
  since?: string;
  all?: boolean;
  uri?: string;
}

export interface ScopedRequestIds {
  ids: string[];
  totalMatched: number;
  capped: boolean;
}

const MAX_REQUESTS = 100;

/**
 * Filters and returns request IDs based on scope parameters.
 * Only includes HTTP requests (not artisan commands) toward the count limit.
 * @param scope - Scope parameters (requestId, count, since, all, uri)
 * @param storage - Storage interface
 * @returns Object with filtered request IDs, total matched, and whether capped
 */
export function filterRequestsByScope(scope: RequestScope, storage: Storage): ScopedRequestIds {
  // Priority 1: Specific request ID
  if (scope.requestId) {
    return { ids: [scope.requestId], totalMatched: 1, capped: false };
  }

  // Get all entries from storage
  let entries = storage.list();

  // Filter by URI pattern if specified
  if (scope.uri) {
    const uriPattern = scope.uri.toLowerCase();
    entries = entries.filter((e) => e.uri?.toLowerCase().includes(uriPattern));
  }

  // Filter by time if 'since' is specified
  if (scope.since) {
    const durationMs = parseTimeDuration(scope.since);
    if (durationMs) {
      const cutoffTime = (Date.now() - durationMs) / 1000; // Convert to Unix timestamp
      entries = entries.filter((e) => e.time >= cutoffTime);
    }
  }

  // Only count HTTP requests (type === 'request'), not artisan commands
  const httpEntries = entries.filter((e) => e.type === 'request' || !e.type);

  // Determine how many to return
  let limit: number;
  if (scope.count !== undefined) {
    limit = Math.min(scope.count, MAX_REQUESTS);
  } else if (scope.all || scope.since) {
    limit = MAX_REQUESTS;
  } else {
    // Default: latest only
    limit = 1;
  }

  const totalMatched = httpEntries.length;
  const capped = totalMatched > limit;
  const ids = httpEntries.slice(0, limit).map((e) => e.id);

  return { ids, totalMatched, capped };
}

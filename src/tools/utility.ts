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

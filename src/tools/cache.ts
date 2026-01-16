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

import type { Storage } from '../storage/storage.js';
import type { CacheQuery, RedisCommand } from '../types/clockwork.js';
import type {
  GetCacheOperationsInput,
  GetCacheStatsInput,
  GetRedisCommandsInput,
} from '../types/tools.js';

export interface CacheStats {
  hits: number;
  misses: number;
  writes: number;
  deletes: number;
  totalOperations: number;
  hitRatio: number;
  totalDuration: number;
}

/**
 * Gets cache operations (hits, misses, writes) for a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Array of cache operations
 */
export function getCacheOperations(
  storage: Storage,
  input: GetCacheOperationsInput
): CacheQuery[] {
  const request = storage.find(input.requestId);

  if (!request?.cacheQueries) {
    return [];
  }

  return request.cacheQueries;
}

/**
 * Gets aggregate cache statistics for a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Cache stats including hit ratio and operation counts
 */
export function getCacheStats(storage: Storage, input: GetCacheStatsInput): CacheStats {
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

  const request = storage.find(input.requestId);

  if (!request?.cacheQueries || request.cacheQueries.length === 0) {
    return defaultStats;
  }

  const queries = request.cacheQueries;
  let hits = 0,
    misses = 0,
    writes = 0,
    deletes = 0,
    totalDuration = 0;

  for (const q of queries) {
    totalDuration += q.duration ?? 0;
    switch (q.type) {
      case 'hit':
        hits++;
        break;
      case 'miss':
        misses++;
        break;
      case 'write':
        writes++;
        break;
      case 'delete':
        deletes++;
        break;
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

/**
 * Gets Redis commands executed during a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Array of Redis commands
 */
export function getRedisCommands(
  storage: Storage,
  input: GetRedisCommandsInput
): RedisCommand[] {
  const request = storage.find(input.requestId);

  if (!request?.redisCommands) {
    return [];
  }

  return request.redisCommands;
}

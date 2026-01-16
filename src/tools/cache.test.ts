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

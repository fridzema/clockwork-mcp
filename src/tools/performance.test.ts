import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPerformanceSummary, getTimeline, compareRequests } from './performance.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Performance Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-perf-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    writeFileSync(join(testDir, 'req-1.json'), JSON.stringify({
      id: 'req-1',
      type: 'request',
      time: 1705312345,
      responseDuration: 150,
      memoryUsage: 10485760,
      databaseQueriesCount: 5,
      databaseDuration: 45,
      cacheHits: 3,
      cacheReads: 5,
      timelineData: [
        { description: 'Boot', start: 0, end: 50, duration: 50 },
        { description: 'Controller', start: 50, end: 120, duration: 70 },
      ],
    }));

    writeFileSync(join(testDir, 'req-2.json'), JSON.stringify({
      id: 'req-2',
      type: 'request',
      time: 1705312400,
      responseDuration: 300,
      memoryUsage: 20971520,
      databaseQueriesCount: 15,
      databaseDuration: 180,
      cacheHits: 1,
      cacheReads: 10,
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getPerformanceSummary', () => {
    it('returns performance metrics for a request', () => {
      const result = getPerformanceSummary(testDir, { requestId: 'req-1' });
      expect(result.responseDuration).toBe(150);
      expect(result.memoryUsageMB).toBeCloseTo(10);
      expect(result.databaseQueries).toBe(5);
      expect(result.cacheHitRatio).toBe(0.6);
    });
  });

  describe('getTimeline', () => {
    it('returns timeline events', () => {
      const result = getTimeline(testDir, { requestId: 'req-1' });
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('Boot');
    });

    it('returns empty array when no timeline', () => {
      const result = getTimeline(testDir, { requestId: 'req-2' });
      expect(result).toHaveLength(0);
    });
  });

  describe('compareRequests', () => {
    it('compares two requests', () => {
      const result = compareRequests(testDir, { requestId1: 'req-1', requestId2: 'req-2' });
      expect(result.durationDiff).toBe(150);
      expect(result.queryCountDiff).toBe(10);
      expect(result.memoryDiff).toBeCloseTo(10);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getQueries, getQueryStats, analyzeSlowQueriesForRequest, detectNPlusOneForRequest } from './database.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Database Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-db-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    const request = {
      id: 'test-request',
      type: 'request',
      time: 1705312345,
      databaseQueries: [
        { query: 'SELECT * FROM users WHERE id = 1', duration: 5 },
        { query: 'SELECT * FROM users WHERE id = 2', duration: 150 },
        { query: 'SELECT * FROM users WHERE id = 3', duration: 8 },
        { query: 'SELECT * FROM posts', duration: 200 },
      ],
    };

    writeFileSync(join(testDir, 'test-request.json'), JSON.stringify(request));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getQueries', () => {
    it('returns all queries for a request', () => {
      const result = getQueries(testDir, { requestId: 'test-request' });
      expect(result).toHaveLength(4);
    });

    it('filters slow queries when threshold provided', () => {
      const result = getQueries(testDir, { requestId: 'test-request', slow: true, threshold: 100 });
      expect(result).toHaveLength(2);
    });

    it('returns empty array for non-existent request', () => {
      const result = getQueries(testDir, { requestId: 'nonexistent' });
      expect(result).toHaveLength(0);
    });
  });

  describe('getQueryStats', () => {
    it('returns aggregate statistics', () => {
      const result = getQueryStats(testDir, { requestId: 'test-request' });
      expect(result.totalQueries).toBe(4);
      expect(result.totalDuration).toBe(363);
      expect(result.slowestQuery?.duration).toBe(200);
    });
  });

  describe('analyzeSlowQueriesForRequest', () => {
    it('finds slow queries', () => {
      const result = analyzeSlowQueriesForRequest(testDir, { requestId: 'test-request', threshold: 100 });
      expect(result).toHaveLength(2);
      expect(result[0].duration).toBe(200);
    });
  });

  describe('detectNPlusOneForRequest', () => {
    it('detects N+1 patterns', () => {
      const result = detectNPlusOneForRequest(testDir, { requestId: 'test-request', threshold: 2 });
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(3);
    });
  });
});

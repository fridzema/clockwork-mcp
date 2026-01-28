import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getQueries,
  getQueryStats,
  analyzeSlowQueriesForRequest,
  detectNPlusOneForRequest,
} from './database.js';
import { createStorage } from '../storage/storage.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Database Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-db-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create index file
    const indexContent = [
      'test-request\t1705312345\tGET\t/api/users\tUserController@index\t200\t50\trequest',
      'test-request-2\t1705312400\tGET\t/api/posts\tPostController@index\t200\t80\trequest',
    ].join('\n');
    writeFileSync(join(testDir, 'index'), indexContent);

    const request1 = {
      id: 'test-request',
      type: 'request',
      time: 1705312345,
      method: 'GET',
      uri: '/api/users',
      databaseQueries: [
        { query: 'SELECT * FROM users WHERE id = 1', duration: 5 },
        { query: 'SELECT * FROM users WHERE id = 2', duration: 150 },
        { query: 'SELECT * FROM users WHERE id = 3', duration: 8 },
        { query: 'SELECT * FROM posts', duration: 200 },
      ],
    };

    const request2 = {
      id: 'test-request-2',
      type: 'request',
      time: 1705312400,
      method: 'GET',
      uri: '/api/posts',
      databaseQueries: [
        { query: 'SELECT * FROM users WHERE id = 4', duration: 6 },
        { query: 'SELECT * FROM users WHERE id = 5', duration: 120 },
        { query: 'SELECT * FROM comments', duration: 180 },
      ],
    };

    writeFileSync(join(testDir, 'test-request.json'), JSON.stringify(request1));
    writeFileSync(join(testDir, 'test-request-2.json'), JSON.stringify(request2));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const getStorage = () => createStorage({ driver: 'file', storagePath: testDir });

  describe('getQueries', () => {
    it('returns all queries for a request', () => {
      const result = getQueries(getStorage(), { requestId: 'test-request' });
      expect(result).toHaveLength(4);
    });

    it('filters slow queries when threshold provided', () => {
      const result = getQueries(getStorage(), {
        requestId: 'test-request',
        slow: true,
        threshold: 100,
      });
      expect(result).toHaveLength(2);
    });

    it('returns empty array for non-existent request', () => {
      const result = getQueries(getStorage(), { requestId: 'nonexistent' });
      expect(result).toHaveLength(0);
    });
  });

  describe('getQueryStats', () => {
    it('returns aggregate statistics', () => {
      const result = getQueryStats(getStorage(), { requestId: 'test-request' });
      expect(result.totalQueries).toBe(4);
      expect(result.totalDuration).toBe(363);
      expect(result.slowestQuery?.duration).toBe(200);
    });
  });

  describe('analyzeSlowQueriesForRequest', () => {
    it('finds slow queries for single request', () => {
      const result = analyzeSlowQueriesForRequest(getStorage(), {
        requestId: 'test-request',
        threshold: 100,
      });
      expect(result.queries).toHaveLength(2);
      expect(result.summary.totalSlowQueries).toBe(2);
      expect(result.summary.requestsAnalyzed).toBe(1);
    });

    it('aggregates slow queries across multiple requests', () => {
      const result = analyzeSlowQueriesForRequest(getStorage(), {
        count: 2,
        threshold: 100,
      });
      expect(result.summary.requestsAnalyzed).toBe(2);
      expect(result.summary.totalSlowQueries).toBeGreaterThan(2);
      // SELECT * FROM users WHERE id = ? should be grouped as one pattern
      const userPattern = result.queries.find((q) => q.queryPattern.includes('users'));
      expect(userPattern).toBeDefined();
      expect(userPattern!.totalOccurrences).toBe(2); // 150ms and 120ms queries
    });

    it('groups queries by normalized pattern', () => {
      const result = analyzeSlowQueriesForRequest(getStorage(), {
        count: 2,
        threshold: 100,
      });
      // Different id values should be grouped as same pattern
      const patterns = result.queries.map((q) => q.queryPattern);
      expect(patterns.filter((p) => p.includes('users'))).toHaveLength(1);
    });
  });

  describe('detectNPlusOneForRequest', () => {
    it('detects N+1 patterns for single request', () => {
      const result = detectNPlusOneForRequest(getStorage(), {
        requestId: 'test-request',
        threshold: 2,
      });
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].totalOccurrences).toBe(3);
      expect(result.summary.requestsWithNPlusOne).toBe(1);
    });

    it('aggregates N+1 patterns across multiple requests', () => {
      const result = detectNPlusOneForRequest(getStorage(), {
        count: 2,
        threshold: 2,
      });
      expect(result.summary.requestsAnalyzed).toBe(2);
      // Both requests have the SELECT * FROM users WHERE id = ? pattern
      const userPattern = result.patterns.find((p) => p.queryPattern.includes('users'));
      expect(userPattern).toBeDefined();
      expect(userPattern!.totalOccurrences).toBe(5); // 3 from request 1, 2 from request 2
      expect(userPattern!.affectedRequests).toHaveLength(2);
    });

    it('returns empty patterns when none found', () => {
      const result = detectNPlusOneForRequest(getStorage(), {
        requestId: 'test-request',
        threshold: 10, // High threshold
      });
      expect(result.patterns).toHaveLength(0);
      expect(result.summary.requestsWithNPlusOne).toBe(0);
    });
  });
});

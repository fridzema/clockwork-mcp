import { describe, it, expect } from 'vitest';
import { analyzeSlowQueries, groupByPattern } from './slow-queries.js';
import type { DatabaseQuery } from '../types/clockwork.js';

describe('Slow Query Analyzer', () => {
  describe('analyzeSlowQueries', () => {
    it('filters queries above threshold', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM users', duration: 50 },
        { query: 'SELECT * FROM posts', duration: 150 },
        { query: 'SELECT * FROM comments', duration: 200 },
      ];

      const result = analyzeSlowQueries(queries, 100);

      expect(result).toHaveLength(2);
      expect(result[0].query).toBe('SELECT * FROM comments');
      expect(result[1].query).toBe('SELECT * FROM posts');
    });

    it('returns empty array when no slow queries', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM users', duration: 5 },
        { query: 'SELECT * FROM posts', duration: 10 },
      ];

      const result = analyzeSlowQueries(queries, 100);

      expect(result).toHaveLength(0);
    });

    it('sorts by duration descending', () => {
      const queries: DatabaseQuery[] = [
        { query: 'Query A', duration: 150 },
        { query: 'Query B', duration: 300 },
        { query: 'Query C', duration: 200 },
      ];

      const result = analyzeSlowQueries(queries, 100);

      expect(result[0].duration).toBe(300);
      expect(result[1].duration).toBe(200);
      expect(result[2].duration).toBe(150);
    });
  });

  describe('groupByPattern', () => {
    it('groups queries by normalized pattern', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM users WHERE id = 1', duration: 100 },
        { query: 'SELECT * FROM users WHERE id = 2', duration: 150 },
        { query: 'SELECT * FROM posts WHERE id = 1', duration: 200 },
      ];

      const result = groupByPattern(queries);

      expect(result).toHaveLength(2);

      const userPattern = result.find((g) => g.pattern.includes('users'));
      expect(userPattern?.count).toBe(2);
      expect(userPattern?.totalDuration).toBe(250);
      expect(userPattern?.avgDuration).toBe(125);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { detectNPlusOne, normalizeQuery } from './n-plus-one.js';
import type { DatabaseQuery } from '../types/clockwork.js';

describe('N+1 Query Detector', () => {
  describe('normalizeQuery', () => {
    it('replaces numeric values with ?', () => {
      const query = 'SELECT * FROM users WHERE id = 123';
      expect(normalizeQuery(query)).toBe('SELECT * FROM users WHERE id = ?');
    });

    it('replaces string values with ?', () => {
      const query = "SELECT * FROM users WHERE email = 'test@example.com'";
      expect(normalizeQuery(query)).toBe('SELECT * FROM users WHERE email = ?');
    });

    it('replaces IN clauses with ?', () => {
      const query = 'SELECT * FROM users WHERE id IN (1, 2, 3)';
      expect(normalizeQuery(query)).toBe('SELECT * FROM users WHERE id IN (?)');
    });
  });

  describe('detectNPlusOne', () => {
    it('detects repeated queries', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM posts WHERE user_id = 1', duration: 5 },
        { query: 'SELECT * FROM posts WHERE user_id = 2', duration: 5 },
        { query: 'SELECT * FROM posts WHERE user_id = 3', duration: 5 },
      ];

      const result = detectNPlusOne(queries, 2);

      expect(result).toHaveLength(1);
      expect(result[0].pattern).toBe('SELECT * FROM posts WHERE user_id = ?');
      expect(result[0].count).toBe(3);
      expect(result[0].totalDuration).toBe(15);
    });

    it('does not flag queries below threshold', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM posts WHERE user_id = 1', duration: 5 },
        { query: 'SELECT * FROM posts WHERE user_id = 2', duration: 5 },
      ];

      const result = detectNPlusOne(queries, 3);

      expect(result).toHaveLength(0);
    });

    it('groups by normalized pattern', () => {
      const queries: DatabaseQuery[] = [
        { query: "SELECT * FROM users WHERE email = 'a@test.com'", duration: 5 },
        { query: "SELECT * FROM users WHERE email = 'b@test.com'", duration: 5 },
        { query: 'SELECT * FROM posts WHERE id = 1', duration: 3 },
        { query: 'SELECT * FROM posts WHERE id = 2', duration: 3 },
        { query: 'SELECT * FROM posts WHERE id = 3', duration: 3 },
      ];

      const result = detectNPlusOne(queries, 2);

      expect(result).toHaveLength(2);
    });

    it('includes example queries in result', () => {
      const queries: DatabaseQuery[] = [
        { query: 'SELECT * FROM posts WHERE user_id = 1', duration: 5 },
        { query: 'SELECT * FROM posts WHERE user_id = 2', duration: 5 },
        { query: 'SELECT * FROM posts WHERE user_id = 3', duration: 5 },
      ];

      const result = detectNPlusOne(queries, 2);

      expect(result[0].examples).toHaveLength(3);
      expect(result[0].examples).toContain('SELECT * FROM posts WHERE user_id = 1');
    });
  });
});

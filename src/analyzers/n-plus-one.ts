import type { DatabaseQuery } from '../types/clockwork.js';

export interface NPlusOnePattern {
  pattern: string;
  count: number;
  totalDuration: number;
  examples: string[];
}

/**
 * Normalizes a SQL query by replacing literals with placeholders.
 * Used to identify similar query patterns for N+1 detection.
 * @param query - Raw SQL query string
 * @returns Normalized query with literals replaced by ?
 */
export function normalizeQuery(query: string): string {
  return (
    query
      // Replace string literals
      .replace(/'[^']*'/g, '?')
      // Replace numeric values
      .replace(/\b\d+\b/g, '?')
      // Normalize IN clauses
      .replace(/IN\s*\([^)]+\)/gi, 'IN (?)')
  );
}

/**
 * Detects N+1 query patterns by finding repeated similar queries.
 * @param queries - Array of database queries to analyze
 * @param threshold - Minimum repetitions to flag as N+1 (default: 2)
 * @returns Detected patterns sorted by count descending
 */
export function detectNPlusOne(queries: DatabaseQuery[], threshold: number = 2): NPlusOnePattern[] {
  const patterns = new Map<string, { count: number; totalDuration: number; examples: string[] }>();

  for (const query of queries) {
    const normalized = normalizeQuery(query.query);

    if (!patterns.has(normalized)) {
      patterns.set(normalized, { count: 0, totalDuration: 0, examples: [] });
    }

    const pattern = patterns.get(normalized)!;
    pattern.count++;
    pattern.totalDuration += query.duration;
    pattern.examples.push(query.query);
  }

  const results: NPlusOnePattern[] = [];

  for (const [pattern, data] of patterns) {
    if (data.count >= threshold) {
      results.push({
        pattern,
        count: data.count,
        totalDuration: data.totalDuration,
        examples: data.examples,
      });
    }
  }

  // Sort by count descending
  return results.sort((a, b) => b.count - a.count);
}

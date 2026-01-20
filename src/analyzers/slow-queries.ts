import type { DatabaseQuery } from '../types/clockwork.js';
import { normalizeQuery } from './n-plus-one.js';

export interface QueryGroup {
  pattern: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  examples: DatabaseQuery[];
}

/**
 * Filters queries exceeding a duration threshold.
 * @param queries - Array of database queries to analyze
 * @param threshold - Duration threshold in milliseconds
 * @returns Slow queries sorted by duration descending
 */
export function analyzeSlowQueries(queries: DatabaseQuery[], threshold: number): DatabaseQuery[] {
  return queries.filter((q) => q.duration >= threshold).sort((a, b) => b.duration - a.duration);
}

/**
 * Groups queries by their normalized pattern.
 * @param queries - Array of database queries to group
 * @returns Query groups with aggregate statistics
 */
export function groupByPattern(queries: DatabaseQuery[]): QueryGroup[] {
  const groups = new Map<
    string,
    {
      count: number;
      totalDuration: number;
      maxDuration: number;
      examples: DatabaseQuery[];
    }
  >();

  for (const query of queries) {
    const pattern = normalizeQuery(query.query);

    if (!groups.has(pattern)) {
      groups.set(pattern, {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        examples: [],
      });
    }

    const group = groups.get(pattern)!;
    group.count++;
    group.totalDuration += query.duration;
    group.maxDuration = Math.max(group.maxDuration, query.duration);
    group.examples.push(query);
  }

  const results: QueryGroup[] = [];

  for (const [pattern, data] of groups) {
    results.push({
      pattern,
      count: data.count,
      totalDuration: data.totalDuration,
      avgDuration: data.totalDuration / data.count,
      maxDuration: data.maxDuration,
      examples: data.examples,
    });
  }

  // Sort by total duration descending
  return results.sort((a, b) => b.totalDuration - a.totalDuration);
}

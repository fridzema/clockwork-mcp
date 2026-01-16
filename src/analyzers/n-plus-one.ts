import type { DatabaseQuery } from '../types/clockwork.js';

export interface NPlusOnePattern {
  pattern: string;
  count: number;
  totalDuration: number;
  examples: string[];
}

export function normalizeQuery(query: string): string {
  return query
    // Replace string literals
    .replace(/'[^']*'/g, '?')
    // Replace numeric values
    .replace(/\b\d+\b/g, '?')
    // Normalize IN clauses
    .replace(/IN\s*\([^)]+\)/gi, 'IN (?)');
}

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

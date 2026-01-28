import type { ClockworkRequest } from '../types/clockwork.js';

export interface RoutePerformanceStats {
  route: string;
  samples: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  avgMemoryMB: number | null;
}

export interface RoutePerformanceAnalysis {
  routes: RoutePerformanceStats[];
  summary: {
    totalRequests: number;
    uniqueRoutes: number;
    slowestRoute: string | null;
    fastestRoute: string | null;
  };
}

export type GroupByOption = 'uri' | 'route' | 'controller';

/**
 * Calculates a percentile value from a sorted array.
 * @param sorted - Array of numbers sorted in ascending order
 * @param p - Percentile (0-100)
 * @returns Percentile value
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const weight = idx - lower;

  if (upper >= sorted.length) return sorted[sorted.length - 1];

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Extracts the grouping key from a request based on the groupBy option.
 * @param request - Clockwork request
 * @param groupBy - How to group routes
 * @returns Grouping key or null if not applicable
 */
function getGroupKey(request: ClockworkRequest, groupBy: GroupByOption): string | null {
  switch (groupBy) {
    case 'uri':
      return request.uri ?? null;
    case 'route':
      return request.route ?? request.routeName ?? request.uri ?? null;
    case 'controller':
      return request.controller ?? null;
    default:
      return request.uri ?? null;
  }
}

/**
 * Analyzes route performance across multiple requests.
 * @param requests - Array of Clockwork requests
 * @param options - Analysis options
 * @returns Route performance analysis with stats and summary
 */
export function analyzeRoutePerformance(
  requests: ClockworkRequest[],
  options: { groupBy?: GroupByOption; minSamples?: number } = {}
): RoutePerformanceAnalysis {
  const { groupBy = 'uri', minSamples = 1 } = options;

  // Filter to HTTP requests only (not commands, queue jobs, tests)
  const httpRequests = requests.filter((r) => r.type === 'request');

  const groups = new Map<
    string,
    {
      durations: number[];
      memoryUsages: number[];
    }
  >();

  for (const request of httpRequests) {
    const key = getGroupKey(request, groupBy);
    if (!key) continue;

    const duration = request.responseDuration;
    if (duration === undefined) continue;

    if (!groups.has(key)) {
      groups.set(key, {
        durations: [],
        memoryUsages: [],
      });
    }

    const group = groups.get(key)!;
    group.durations.push(duration);

    if (request.memoryUsage !== undefined) {
      group.memoryUsages.push(request.memoryUsage);
    }
  }

  const results: RoutePerformanceStats[] = [];

  for (const [route, data] of groups) {
    if (data.durations.length < minSamples) continue;

    const sorted = [...data.durations].sort((a, b) => a - b);
    const total = sorted.reduce((sum, d) => sum + d, 0);

    let avgMemoryMB: number | null = null;
    if (data.memoryUsages.length > 0) {
      const totalMemory = data.memoryUsages.reduce((sum, m) => sum + m, 0);
      // Convert bytes to MB
      avgMemoryMB = totalMemory / data.memoryUsages.length / (1024 * 1024);
    }

    results.push({
      route,
      samples: sorted.length,
      avgDuration: total / sorted.length,
      minDuration: sorted[0],
      maxDuration: sorted[sorted.length - 1],
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      avgMemoryMB,
    });
  }

  // Sort by average duration descending (slowest first)
  results.sort((a, b) => b.avgDuration - a.avgDuration);

  return {
    routes: results,
    summary: {
      totalRequests: httpRequests.length,
      uniqueRoutes: results.length,
      slowestRoute: results[0]?.route ?? null,
      fastestRoute: results.length > 0 ? results[results.length - 1].route : null,
    },
  };
}

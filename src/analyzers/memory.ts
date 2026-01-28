import type { ClockworkRequest } from '../types/clockwork.js';

export interface MemoryIssue {
  requestId: string;
  uri: string | null;
  memoryMB: number;
  thresholdMB: number;
  type: 'high_usage' | 'memory_growth';
  details: string;
}

export interface MemoryAnalysis {
  issues: MemoryIssue[];
  summary: {
    totalRequests: number;
    requestsWithMemoryData: number;
    issuesFound: number;
    avgMemoryMB: number | null;
    maxMemoryMB: number | null;
    growthDetected: boolean;
  };
}

/**
 * Detects memory issues across multiple requests.
 * @param requests - Array of Clockwork requests
 * @param options - Detection options
 * @returns Memory analysis with issues and summary
 */
export function detectMemoryIssues(
  requests: ClockworkRequest[],
  options: { thresholdMB?: number; detectGrowth?: boolean } = {}
): MemoryAnalysis {
  const { thresholdMB = 128, detectGrowth = true } = options;
  const thresholdBytes = thresholdMB * 1024 * 1024;

  const issues: MemoryIssue[] = [];
  const memoryValues: Array<{
    requestId: string;
    uri: string | null;
    memoryMB: number;
    time: number;
  }> = [];

  // Collect memory data and detect high usage
  for (const request of requests) {
    if (request.memoryUsage === undefined) continue;

    const memoryMB = request.memoryUsage / (1024 * 1024);

    memoryValues.push({
      requestId: request.id,
      uri: request.uri ?? null,
      memoryMB,
      time: request.time,
    });

    // Check for high memory usage
    if (request.memoryUsage >= thresholdBytes) {
      issues.push({
        requestId: request.id,
        uri: request.uri ?? null,
        memoryMB,
        thresholdMB,
        type: 'high_usage',
        details: `Memory usage (${memoryMB.toFixed(1)} MB) exceeds threshold (${thresholdMB} MB)`,
      });
    }
  }

  // Detect memory growth pattern
  let growthDetected = false;
  if (detectGrowth && memoryValues.length >= 4) {
    // Sort by time
    memoryValues.sort((a, b) => a.time - b.time);

    // Compare first half average to second half average
    const midpoint = Math.floor(memoryValues.length / 2);
    const firstHalf = memoryValues.slice(0, midpoint);
    const secondHalf = memoryValues.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, v) => sum + v.memoryMB, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, v) => sum + v.memoryMB, 0) / secondHalf.length;

    // Flag if second half is >20% higher than first half
    const growthPercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    if (growthPercent > 20) {
      growthDetected = true;

      // Find the request with highest memory in second half as representative
      const peakRequest = secondHalf.reduce((max, v) => (v.memoryMB > max.memoryMB ? v : max));

      issues.push({
        requestId: peakRequest.requestId,
        uri: peakRequest.uri,
        memoryMB: peakRequest.memoryMB,
        thresholdMB,
        type: 'memory_growth',
        details:
          `Memory growth detected: average increased from ${firstHalfAvg.toFixed(1)} MB ` +
          `to ${secondHalfAvg.toFixed(1)} MB (+${growthPercent.toFixed(0)}%) over ${memoryValues.length} requests`,
      });
    }
  }

  // Calculate summary stats
  let avgMemoryMB: number | null = null;
  let maxMemoryMB: number | null = null;

  if (memoryValues.length > 0) {
    const totalMemory = memoryValues.reduce((sum, v) => sum + v.memoryMB, 0);
    avgMemoryMB = totalMemory / memoryValues.length;
    maxMemoryMB = Math.max(...memoryValues.map((v) => v.memoryMB));
  }

  // Sort issues by memory usage descending
  issues.sort((a, b) => b.memoryMB - a.memoryMB);

  return {
    issues,
    summary: {
      totalRequests: requests.length,
      requestsWithMemoryData: memoryValues.length,
      issuesFound: issues.length,
      avgMemoryMB,
      maxMemoryMB,
      growthDetected,
    },
  };
}

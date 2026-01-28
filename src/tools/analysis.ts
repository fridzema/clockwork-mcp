import type { Storage } from '../storage/storage.js';
import type { LogEntry } from '../types/clockwork.js';
import type {
  AnalyzeExceptionsInput,
  AnalyzeRoutePerformanceInput,
  DetectMemoryIssuesInput,
} from '../types/tools.js';
import { filterRequestsByScope } from './utility.js';
import {
  extractExceptions,
  groupExceptions,
  type ExceptionAnalysis,
} from '../analyzers/exceptions.js';
import {
  analyzeRoutePerformance as analyzeRoutePerformanceCore,
  type RoutePerformanceAnalysis,
  type GroupByOption,
} from '../analyzers/route-performance.js';
import {
  detectMemoryIssues as detectMemoryIssuesCore,
  type MemoryAnalysis,
} from '../analyzers/memory.js';

export interface AggregatedExceptionAnalysis extends ExceptionAnalysis {
  meta: {
    requestsAnalyzed: number;
    capped: boolean;
    totalMatched: number;
  };
}

/**
 * Analyzes exceptions across multiple requests, grouping by normalized message.
 * @param storage - Storage interface
 * @param input - Scope parameters and grouping options
 * @returns Exception analysis with groups, summary, and metadata
 */
export function analyzeExceptions(
  storage: Storage,
  input: AnalyzeExceptionsInput
): AggregatedExceptionAnalysis {
  const { ids, totalMatched, capped } = filterRequestsByScope(input, storage);

  // Collect all exceptions from all requests
  const allExceptions: Array<LogEntry & { requestId: string }> = [];

  for (const id of ids) {
    const request = storage.find(id);
    if (!request?.log) continue;

    const exceptions = extractExceptions(request.log);
    for (const exception of exceptions) {
      allExceptions.push({
        ...exception,
        requestId: id,
      });
    }
  }

  const analysis = groupExceptions(allExceptions, {
    groupByMessage: input.groupByMessage ?? true,
    limit: input.limit ?? 20,
  });

  return {
    ...analysis,
    meta: {
      requestsAnalyzed: ids.length,
      capped,
      totalMatched,
    },
  };
}

export interface AggregatedRoutePerformanceAnalysis extends RoutePerformanceAnalysis {
  meta: {
    requestsAnalyzed: number;
    capped: boolean;
    totalMatched: number;
  };
}

/**
 * Analyzes route performance across multiple requests.
 * @param storage - Storage interface
 * @param input - Scope parameters and grouping options
 * @returns Route performance analysis with stats, summary, and metadata
 */
export function analyzeRoutePerformance(
  storage: Storage,
  input: AnalyzeRoutePerformanceInput
): AggregatedRoutePerformanceAnalysis {
  const { ids, totalMatched, capped } = filterRequestsByScope(input, storage);

  // Load all requests
  const requests = storage.findMany(ids);

  const analysis = analyzeRoutePerformanceCore(requests, {
    groupBy: (input.groupBy as GroupByOption) ?? 'uri',
    minSamples: input.minSamples ?? 1,
  });

  return {
    ...analysis,
    meta: {
      requestsAnalyzed: ids.length,
      capped,
      totalMatched,
    },
  };
}

export interface AggregatedMemoryAnalysis extends MemoryAnalysis {
  meta: {
    requestsAnalyzed: number;
    capped: boolean;
    totalMatched: number;
  };
}

/**
 * Detects memory issues across multiple requests.
 * @param storage - Storage interface
 * @param input - Scope parameters and detection options
 * @returns Memory analysis with issues, summary, and metadata
 */
export function detectMemoryIssues(
  storage: Storage,
  input: DetectMemoryIssuesInput
): AggregatedMemoryAnalysis {
  const { ids, totalMatched, capped } = filterRequestsByScope(input, storage);

  // Load all requests
  const requests = storage.findMany(ids);

  const analysis = detectMemoryIssuesCore(requests, {
    thresholdMB: input.thresholdMB ?? 128,
    detectGrowth: input.detectGrowth ?? true,
  });

  return {
    ...analysis,
    meta: {
      requestsAnalyzed: ids.length,
      capped,
      totalMatched,
    },
  };
}

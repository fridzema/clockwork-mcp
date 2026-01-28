import type { LogEntry } from '../types/clockwork.js';

export interface ExceptionGroup {
  normalizedMessage: string;
  count: number;
  level: string;
  examples: Array<{
    message: string;
    file?: string;
    line?: number;
    time?: number;
    requestId?: string;
  }>;
}

export interface ExceptionAnalysis {
  exceptions: ExceptionGroup[];
  summary: {
    totalExceptions: number;
    uniquePatterns: number;
    mostCommon: string | null;
  };
}

/**
 * Normalizes an exception message by replacing dynamic values.
 * This allows grouping similar exceptions together.
 * @param message - Original exception message
 * @returns Normalized message pattern
 */
export function normalizeExceptionMessage(message: string): string {
  return (
    message
      // Replace UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
      // Replace numeric IDs (standalone numbers)
      .replace(/\b\d+\b/g, '<ID>')
      // Replace quoted strings
      .replace(/"[^"]*"/g, '"<STRING>"')
      .replace(/'[^']*'/g, "'<STRING>'")
      // Replace email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<EMAIL>')
      // Replace IP addresses
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<IP>')
      // Replace file paths
      .replace(/\/[^\s:]+\.\w+/g, '<PATH>')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Extracts exceptions from log entries.
 * Exceptions are typically error-level logs.
 * @param logs - Array of log entries
 * @returns Array of exception log entries
 */
export function extractExceptions(logs: LogEntry[]): LogEntry[] {
  return logs.filter((log) => log.level === 'error' || log.level === 'critical');
}

/**
 * Groups exceptions by their normalized message pattern.
 * @param exceptions - Array of exception log entries with optional request context
 * @param options - Grouping options
 * @returns Exception analysis with groups and summary
 */
export function groupExceptions(
  exceptions: Array<LogEntry & { requestId?: string }>,
  options: { groupByMessage?: boolean; limit?: number } = {}
): ExceptionAnalysis {
  const { groupByMessage = true, limit = 20 } = options;

  if (!groupByMessage) {
    // Return each exception as its own group
    const groups: ExceptionGroup[] = exceptions.slice(0, limit).map((e) => ({
      normalizedMessage: e.message,
      count: 1,
      level: e.level,
      examples: [
        {
          message: e.message,
          file: e.file,
          line: e.line,
          time: e.time,
          requestId: e.requestId,
        },
      ],
    }));

    return {
      exceptions: groups,
      summary: {
        totalExceptions: exceptions.length,
        uniquePatterns: exceptions.length,
        mostCommon: groups[0]?.normalizedMessage ?? null,
      },
    };
  }

  const groups = new Map<
    string,
    {
      level: string;
      examples: Array<{
        message: string;
        file?: string;
        line?: number;
        time?: number;
        requestId?: string;
      }>;
    }
  >();

  for (const exception of exceptions) {
    const normalized = normalizeExceptionMessage(exception.message);

    if (!groups.has(normalized)) {
      groups.set(normalized, {
        level: exception.level,
        examples: [],
      });
    }

    const group = groups.get(normalized)!;
    group.examples.push({
      message: exception.message,
      file: exception.file,
      line: exception.line,
      time: exception.time,
      requestId: exception.requestId,
    });
  }

  const results: ExceptionGroup[] = [];

  for (const [normalizedMessage, data] of groups) {
    results.push({
      normalizedMessage,
      count: data.examples.length,
      level: data.level,
      examples: data.examples.slice(0, 3), // Keep only first 3 examples
    });
  }

  // Sort by count descending
  results.sort((a, b) => b.count - a.count);

  const limited = results.slice(0, limit);

  return {
    exceptions: limited,
    summary: {
      totalExceptions: exceptions.length,
      uniquePatterns: groups.size,
      mostCommon: limited[0]?.normalizedMessage ?? null,
    },
  };
}

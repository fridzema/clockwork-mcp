import type { Storage } from '../storage/storage.js';
import type { TimelineEvent } from '../types/clockwork.js';
import type {
  GetCallGraphInput,
  GetQueryStackTraceInput,
  GetLogStackTraceInput,
} from '../types/tools.js';

export interface CallGraphNode {
  description: string;
  duration: number;
  start: number;
  end: number;
  children: CallGraphNode[];
}

/**
 * Builds a hierarchical call graph from timeline events.
 * Events that overlap in time are nested as children.
 * @param storage - Storage interface
 * @param input - Request ID and optional minDuration filter
 * @returns Array of root-level call graph nodes
 */
export function getCallGraph(storage: Storage, input: GetCallGraphInput): CallGraphNode[] {
  const request = storage.find(input.requestId);

  if (!request?.timelineData || request.timelineData.length === 0) {
    return [];
  }

  let events = request.timelineData;

  // Filter by minimum duration if specified
  if (input.minDuration !== undefined && input.minDuration > 0) {
    events = events.filter((e) => e.duration >= input.minDuration!);
  }

  // Sort by start time, then by duration descending (longer events first)
  const sorted = [...events].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.duration - a.duration;
  });

  return buildCallGraph(sorted);
}

/**
 * Builds the hierarchical call graph structure from sorted events.
 */
function buildCallGraph(events: TimelineEvent[]): CallGraphNode[] {
  const roots: CallGraphNode[] = [];
  const stack: CallGraphNode[] = [];

  for (const event of events) {
    const node: CallGraphNode = {
      description: event.description,
      duration: event.duration,
      start: event.start,
      end: event.end,
      children: [],
    };

    // Pop events from stack that have ended before this event starts
    while (stack.length > 0 && stack[stack.length - 1].end < event.start) {
      stack.pop();
    }

    // Find parent: the topmost stack item that contains this event
    let parent: CallGraphNode | null = null;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].start <= event.start && stack[i].end >= event.end) {
        parent = stack[i];
        break;
      }
    }

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push(node);
  }

  return roots;
}

export interface StackTraceResult {
  found: boolean;
  file: string | null;
  line: number | null;
}

export interface QueryStackTraceResult extends StackTraceResult {
  query: string | null;
}

/**
 * Gets the source location (file and line) for a specific database query.
 * @param storage - Storage interface
 * @param input - Request ID and query index
 * @returns Stack trace information including file, line, and the query
 */
export function getQueryStackTrace(
  storage: Storage,
  input: GetQueryStackTraceInput
): QueryStackTraceResult {
  const request = storage.find(input.requestId);

  if (!request?.databaseQueries || request.databaseQueries.length === 0) {
    return { found: false, file: null, line: null, query: null };
  }

  if (input.queryIndex < 0 || input.queryIndex >= request.databaseQueries.length) {
    return { found: false, file: null, line: null, query: null };
  }

  const query = request.databaseQueries[input.queryIndex];

  return {
    found: !!(query.file || query.line),
    file: query.file ?? null,
    line: query.line ?? null,
    query: query.query,
  };
}

export interface LogStackTraceResult extends StackTraceResult {
  message: string | null;
  level: string | null;
}

/**
 * Gets the source location (file and line) for a specific log entry.
 * @param storage - Storage interface
 * @param input - Request ID and log index
 * @returns Stack trace information including file, line, message, and level
 */
export function getLogStackTrace(
  storage: Storage,
  input: GetLogStackTraceInput
): LogStackTraceResult {
  const request = storage.find(input.requestId);

  if (!request?.log || request.log.length === 0) {
    return { found: false, file: null, line: null, message: null, level: null };
  }

  if (input.logIndex < 0 || input.logIndex >= request.log.length) {
    return { found: false, file: null, line: null, message: null, level: null };
  }

  const log = request.log[input.logIndex];

  return {
    found: !!(log.file || log.line),
    file: log.file ?? null,
    line: log.line ?? null,
    message: log.message,
    level: log.level,
  };
}

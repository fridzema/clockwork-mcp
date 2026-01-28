import type { Storage } from '../storage/storage.js';
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import type { ListTestsInput, GetTestInput } from '../types/tools.js';

/**
 * Lists test executions from Clockwork storage with optional filtering.
 * Tests are requests with type='test'.
 * @param storage - Storage interface
 * @param input - Filter and pagination options
 * @returns Array of test index entries
 */
export function listTests(storage: Storage, input: ListTestsInput): IndexEntry[] {
  let entries = storage.list();

  // Filter to tests only
  entries = entries.filter((e) => e.type === 'test');

  // Apply time range filters
  if (input.from !== undefined) {
    entries = entries.filter((e) => e.time >= input.from!);
  }
  if (input.to !== undefined) {
    entries = entries.filter((e) => e.time <= input.to!);
  }

  // For name/status filters, we need to load full request data
  if (input.name || input.status) {
    const ids = entries.map((e) => e.id);
    const requests = storage.findMany(ids);

    const filteredIds = new Set<string>();
    for (const req of requests) {
      if (!req) continue;

      // Filter by test name
      if (input.name) {
        const testName = getTestName(req);
        if (!testName?.includes(input.name)) continue;
      }

      // Filter by status
      if (input.status) {
        const status = getTestStatus(req);
        if (status !== input.status) continue;
      }

      filteredIds.add(req.id);
    }

    entries = entries.filter((e) => filteredIds.has(e.id));
  }

  // Apply pagination
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

/**
 * Gets full details of a test execution by request ID.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Full test data or null if not found
 */
export function getTest(storage: Storage, input: GetTestInput): ClockworkRequest | null {
  const request = storage.find(input.requestId);

  // Verify it's actually a test
  if (request && request.type !== 'test') {
    return null;
  }

  return request;
}

/**
 * Extracts test name from a test request.
 */
function getTestName(request: ClockworkRequest): string | null {
  // Test name is typically in commandName or controller
  if (request.commandName) {
    return request.commandName;
  }
  if (request.controller) {
    return request.controller;
  }
  // Check URI for test identifier
  if (request.uri) {
    return request.uri;
  }
  return null;
}

/**
 * Infers test status from request data.
 */
function getTestStatus(request: ClockworkRequest): 'passed' | 'failed' | 'skipped' {
  // Check exit code for command-based tests
  if (request.commandExitCode !== undefined) {
    if (request.commandExitCode === 0) return 'passed';
    return 'failed';
  }

  // Check response status
  if (request.responseStatus !== undefined) {
    if (request.responseStatus >= 200 && request.responseStatus < 300) {
      return 'passed';
    }
    if (request.responseStatus >= 400) {
      return 'failed';
    }
  }

  // Check for error logs
  if (request.log?.some((l) => l.level === 'error')) {
    return 'failed';
  }

  // Default to passed if no failure indicators
  return 'passed';
}

import type { Storage } from '../storage/storage.js';
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import type { ListRequestsInput, SearchRequestsInput } from '../types/tools.js';

/**
 * Lists recent Clockwork requests with optional filtering and pagination.
 * @param storage - Storage interface
 * @param input - Filter and pagination options
 * @returns Array of index entries matching the criteria
 */
export function listRequests(storage: Storage, input: ListRequestsInput): IndexEntry[] {
  let entries = storage.list();

  // Apply filters
  if (input.type) {
    entries = entries.filter((e) => e.type === input.type);
  }
  if (input.status !== undefined) {
    entries = entries.filter((e) => e.responseStatus === input.status);
  }
  if (input.uri) {
    entries = entries.filter((e) => e.uri?.includes(input.uri!));
  }
  if (input.method) {
    entries = entries.filter((e) => e.method === input.method);
  }
  if (input.from !== undefined) {
    entries = entries.filter((e) => e.time >= input.from!);
  }
  if (input.to !== undefined) {
    entries = entries.filter((e) => e.time <= input.to!);
  }

  // Apply pagination
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

/**
 * Gets full details of a specific Clockwork request.
 * @param storage - Storage interface
 * @param requestId - Clockwork request ID
 * @returns Full request data or null if not found
 */
export function getRequest(storage: Storage, requestId: string): ClockworkRequest | null {
  return storage.find(requestId);
}

/**
 * Gets the most recent Clockwork request.
 * @param storage - Storage interface
 * @returns Most recent request data or null if no requests exist
 */
export function getLatestRequest(storage: Storage): ClockworkRequest | null {
  return storage.latest();
}

/**
 * Searches requests by controller, URI, status code, or duration.
 * @param storage - Storage interface
 * @param input - Search criteria and pagination options
 * @returns Array of matching index entries
 */
export function searchRequests(storage: Storage, input: SearchRequestsInput): IndexEntry[] {
  let entries = storage.list();

  if (input.controller) {
    entries = entries.filter((e) => e.controller?.includes(input.controller!));
  }
  if (input.uri) {
    entries = entries.filter((e) => e.uri?.includes(input.uri!));
  }
  if (input.status !== undefined) {
    entries = entries.filter((e) => e.responseStatus === input.status);
  }
  if (input.minDuration !== undefined) {
    entries = entries.filter((e) => (e.responseDuration ?? 0) >= input.minDuration!);
  }
  if (input.maxDuration !== undefined) {
    entries = entries.filter((e) => (e.responseDuration ?? 0) <= input.maxDuration!);
  }

  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

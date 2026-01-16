import { parseIndex } from '../storage/index-parser.js';
import { readRequest } from '../storage/reader.js';
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import type { ListRequestsInput, SearchRequestsInput } from '../types/tools.js';

export function listRequests(
  storagePath: string,
  input: ListRequestsInput
): IndexEntry[] {
  let entries = parseIndex(storagePath);

  // Apply filters
  if (input.type) {
    entries = entries.filter(e => e.type === input.type);
  }
  if (input.status !== undefined) {
    entries = entries.filter(e => e.responseStatus === input.status);
  }
  if (input.uri) {
    entries = entries.filter(e => e.uri?.includes(input.uri!));
  }
  if (input.method) {
    entries = entries.filter(e => e.method === input.method);
  }
  if (input.from !== undefined) {
    entries = entries.filter(e => e.time >= input.from!);
  }
  if (input.to !== undefined) {
    entries = entries.filter(e => e.time <= input.to!);
  }

  // Apply pagination
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

export function getRequest(
  storagePath: string,
  requestId: string
): ClockworkRequest | null {
  return readRequest(storagePath, requestId);
}

export function getLatestRequest(storagePath: string): ClockworkRequest | null {
  const entries = parseIndex(storagePath);

  if (entries.length === 0) {
    return null;
  }

  return readRequest(storagePath, entries[0].id);
}

export function searchRequests(
  storagePath: string,
  input: SearchRequestsInput
): IndexEntry[] {
  let entries = parseIndex(storagePath);

  if (input.controller) {
    entries = entries.filter(e => e.controller?.includes(input.controller!));
  }
  if (input.uri) {
    entries = entries.filter(e => e.uri?.includes(input.uri!));
  }
  if (input.status !== undefined) {
    entries = entries.filter(e => e.responseStatus === input.status);
  }
  if (input.minDuration !== undefined) {
    entries = entries.filter(e => (e.responseDuration ?? 0) >= input.minDuration!);
  }
  if (input.maxDuration !== undefined) {
    entries = entries.filter(e => (e.responseDuration ?? 0) <= input.maxDuration!);
  }

  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

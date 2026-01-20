import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ClockworkRequest } from '../types/clockwork.js';

/**
 * Checks if a request file exists in storage.
 * @param storagePath - Path to Clockwork storage directory
 * @param requestId - Clockwork request ID
 * @returns True if request file exists
 */
export function requestExists(storagePath: string, requestId: string): boolean {
  const filePath = join(storagePath, `${requestId}.json`);
  return existsSync(filePath);
}

/**
 * Reads and parses a Clockwork request file.
 * @param storagePath - Path to Clockwork storage directory
 * @param requestId - Clockwork request ID
 * @returns Parsed request data or null if not found
 */
export function readRequest(storagePath: string, requestId: string): ClockworkRequest | null {
  const filePath = join(storagePath, `${requestId}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as ClockworkRequest;
}

/**
 * Reads multiple Clockwork request files.
 * @param storagePath - Path to Clockwork storage directory
 * @param requestIds - Array of request IDs to read
 * @returns Array of parsed requests (skips missing files)
 */
export function readRequests(storagePath: string, requestIds: string[]): ClockworkRequest[] {
  const requests: ClockworkRequest[] = [];

  for (const id of requestIds) {
    const request = readRequest(storagePath, id);
    if (request) {
      requests.push(request);
    }
  }

  return requests;
}

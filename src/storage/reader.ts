import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ClockworkRequest } from '../types/clockwork.js';

export function requestExists(storagePath: string, requestId: string): boolean {
  const filePath = join(storagePath, `${requestId}.json`);
  return existsSync(filePath);
}

export function readRequest(storagePath: string, requestId: string): ClockworkRequest | null {
  const filePath = join(storagePath, `${requestId}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as ClockworkRequest;
}

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

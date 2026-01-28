import type { Storage } from '../storage/storage.js';
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import type { ListQueueJobsInput, GetQueueJobInput } from '../types/tools.js';

/**
 * Lists queue jobs from Clockwork storage with optional filtering.
 * Queue jobs are requests with type='queue-job'.
 * @param storage - Storage interface
 * @param input - Filter and pagination options
 * @returns Array of queue job index entries
 */
export function listQueueJobs(storage: Storage, input: ListQueueJobsInput): IndexEntry[] {
  let entries = storage.list();

  // Filter to queue jobs only
  entries = entries.filter((e) => e.type === 'queue-job');

  // Apply time range filters
  if (input.from !== undefined) {
    entries = entries.filter((e) => e.time >= input.from!);
  }
  if (input.to !== undefined) {
    entries = entries.filter((e) => e.time <= input.to!);
  }

  // For queue/job/status filters, we need to load full request data
  // since these aren't in the index
  if (input.queue || input.job || input.status) {
    const ids = entries.map((e) => e.id);
    const requests = storage.findMany(ids);

    const filteredIds = new Set<string>();
    for (const req of requests) {
      if (!req) continue;

      // Filter by queue name (often stored in commandName or custom field)
      if (input.queue) {
        const queueName = getQueueName(req);
        if (!queueName?.includes(input.queue)) continue;
      }

      // Filter by job class name
      if (input.job) {
        const jobName = getJobName(req);
        if (!jobName?.includes(input.job)) continue;
      }

      // Filter by status (inferred from exit code or response status)
      if (input.status) {
        const status = getJobStatus(req);
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
 * Gets full details of a queue job by request ID.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Full queue job data or null if not found
 */
export function getQueueJob(storage: Storage, input: GetQueueJobInput): ClockworkRequest | null {
  const request = storage.find(input.requestId);

  // Verify it's actually a queue job
  if (request && request.type !== 'queue-job') {
    return null;
  }

  return request;
}

/**
 * Extracts queue name from a queue job request.
 */
function getQueueName(request: ClockworkRequest): string | null {
  // Queue name might be in various places depending on Laravel version
  // Common locations: commandName, custom data fields
  if (request.commandName?.includes('queue:')) {
    return request.commandName;
  }
  // Check for queue property in request data
  const data = request.requestData as Record<string, unknown> | undefined;
  if (data?.queue && typeof data.queue === 'string') {
    return data.queue;
  }
  return request.commandName ?? null;
}

/**
 * Extracts job class name from a queue job request.
 */
function getJobName(request: ClockworkRequest): string | null {
  // Job name is often the controller or in command arguments
  if (request.controller) {
    return request.controller;
  }
  const args = request.commandArguments as Record<string, unknown> | undefined;
  if (args?.job && typeof args.job === 'string') {
    return args.job;
  }
  return null;
}

/**
 * Infers job status from request data.
 */
function getJobStatus(
  request: ClockworkRequest
): 'pending' | 'processing' | 'completed' | 'failed' {
  // Check exit code for commands
  if (request.commandExitCode !== undefined) {
    return request.commandExitCode === 0 ? 'completed' : 'failed';
  }

  // Check response status
  if (request.responseStatus !== undefined) {
    if (request.responseStatus >= 200 && request.responseStatus < 300) {
      return 'completed';
    }
    if (request.responseStatus >= 400) {
      return 'failed';
    }
  }

  // Default to completed if we have response duration (job finished)
  if (request.responseDuration !== undefined) {
    return 'completed';
  }

  return 'pending';
}

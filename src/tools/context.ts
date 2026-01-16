import { readRequest } from '../storage/reader.js';
import type { LogEntry, DispatchedEvent, RenderedView, OutgoingHttpRequest } from '../types/clockwork.js';
import type { GetLogsInput, GetEventsInput, GetViewsInput, GetHttpRequestsInput } from '../types/tools.js';

const LOG_LEVELS = ['debug', 'info', 'warning', 'error'] as const;

export function getLogs(storagePath: string, input: GetLogsInput): LogEntry[] {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.log) {
    return [];
  }

  let logs = request.log;

  if (input.level) {
    const minLevelIndex = LOG_LEVELS.indexOf(input.level);
    logs = logs.filter(l => {
      const logLevelIndex = LOG_LEVELS.indexOf(l.level as typeof LOG_LEVELS[number]);
      return logLevelIndex >= minLevelIndex;
    });
  }

  return logs;
}

export function getEvents(storagePath: string, input: GetEventsInput): DispatchedEvent[] {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.events) {
    return [];
  }

  return request.events;
}

export function getViews(storagePath: string, input: GetViewsInput): RenderedView[] {
  const request = readRequest(storagePath, input.requestId);

  // Clockwork stores views in either 'views' or 'viewsData'
  const views = request?.views ?? request?.viewsData;

  if (!views) {
    return [];
  }

  return views;
}

export function getHttpRequests(storagePath: string, input: GetHttpRequestsInput): OutgoingHttpRequest[] {
  const request = readRequest(storagePath, input.requestId);

  if (!request?.httpRequests) {
    return [];
  }

  return request.httpRequests;
}

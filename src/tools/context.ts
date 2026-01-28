import type { Storage } from '../storage/storage.js';
import type {
  LogEntry,
  DispatchedEvent,
  RenderedView,
  OutgoingHttpRequest,
} from '../types/clockwork.js';
import type {
  GetLogsInput,
  GetEventsInput,
  GetViewsInput,
  GetHttpRequestsInput,
  GetAuthUserInput,
  GetSessionDataInput,
  GetMiddlewareChainInput,
  GetRouteDetailsInput,
} from '../types/tools.js';

const LOG_LEVELS = ['debug', 'info', 'warning', 'error'] as const;

/**
 * Gets log entries for a request with optional level filtering.
 * @param storage - Storage interface
 * @param input - Request ID and optional minimum log level
 * @returns Array of log entries
 */
export function getLogs(storage: Storage, input: GetLogsInput): LogEntry[] {
  const request = storage.find(input.requestId);

  if (!request?.log) {
    return [];
  }

  let logs = request.log;

  if (input.level) {
    const minLevelIndex = LOG_LEVELS.indexOf(input.level);
    logs = logs.filter((l) => {
      const logLevelIndex = LOG_LEVELS.indexOf(l.level as (typeof LOG_LEVELS)[number]);
      return logLevelIndex >= minLevelIndex;
    });
  }

  return logs;
}

/**
 * Gets events dispatched during a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Array of dispatched events with their listeners
 */
export function getEvents(storage: Storage, input: GetEventsInput): DispatchedEvent[] {
  const request = storage.find(input.requestId);

  if (!request?.events) {
    return [];
  }

  return request.events;
}

/**
 * Gets views rendered during a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Array of rendered views with their data
 */
export function getViews(storage: Storage, input: GetViewsInput): RenderedView[] {
  const request = storage.find(input.requestId);

  // Clockwork stores views in either 'views' or 'viewsData'
  const views = request?.views ?? request?.viewsData;

  if (!views) {
    return [];
  }

  return views;
}

/**
 * Gets outgoing HTTP requests made during a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Array of outgoing HTTP requests
 */
export function getHttpRequests(
  storage: Storage,
  input: GetHttpRequestsInput
): OutgoingHttpRequest[] {
  const request = storage.find(input.requestId);

  if (!request?.httpRequests) {
    return [];
  }

  return request.httpRequests;
}

export interface AuthUser {
  id?: string | number;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Gets the authenticated user for a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Authenticated user object or null
 */
export function getAuthUser(storage: Storage, input: GetAuthUserInput): AuthUser | null {
  const request = storage.find(input.requestId);

  if (!request?.authenticatedUser) {
    return null;
  }

  return request.authenticatedUser;
}

/**
 * Gets session data for a request.
 * @param storage - Storage interface
 * @param input - Request ID and optional keys filter
 * @returns Session data object
 */
export function getSessionData(
  storage: Storage,
  input: GetSessionDataInput
): Record<string, unknown> {
  const request = storage.find(input.requestId);

  if (!request?.sessionData) {
    return {};
  }

  // Filter by specific keys if provided
  if (input.keys && input.keys.length > 0) {
    const filtered: Record<string, unknown> = {};
    for (const key of input.keys) {
      if (key in request.sessionData) {
        filtered[key] = request.sessionData[key];
      }
    }
    return filtered;
  }

  return request.sessionData;
}

/**
 * Gets the middleware chain for a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Array of middleware names
 */
export function getMiddlewareChain(storage: Storage, input: GetMiddlewareChainInput): string[] {
  const request = storage.find(input.requestId);

  if (!request?.middleware) {
    return [];
  }

  return request.middleware;
}

export interface RouteDetails {
  route: string | null;
  routeName: string | null;
  uri: string | null;
  method: string | null;
  controller: string | null;
}

/**
 * Gets route details for a request.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Route information
 */
export function getRouteDetails(storage: Storage, input: GetRouteDetailsInput): RouteDetails {
  const request = storage.find(input.requestId);

  if (!request) {
    return {
      route: null,
      routeName: null,
      uri: null,
      method: null,
      controller: null,
    };
  }

  return {
    route: request.route ?? null,
    routeName: request.routeName ?? null,
    uri: request.uri ?? null,
    method: request.method ?? null,
    controller: request.controller ?? null,
  };
}

export type RequestType = 'request' | 'command' | 'queue-job' | 'test';

export interface DatabaseQuery {
  query: string;
  bindings?: unknown[];
  duration: number;
  connection?: string;
  file?: string;
  line?: number;
  model?: string;
  tags?: string[];
}

export interface CacheQuery {
  type: 'hit' | 'miss' | 'write' | 'delete' | 'read';
  key: string;
  value?: unknown;
  duration?: number;
  connection?: string;
}

export interface RedisCommand {
  command: string;
  parameters?: unknown[];
  duration?: number;
  connection?: string;
}

export interface LogEntry {
  level: string;
  message: string;
  context?: Record<string, unknown>;
  time?: number;
  file?: string;
  line?: number;
}

export interface TimelineEvent {
  description: string;
  start: number;
  end: number;
  duration: number;
  color?: string;
  data?: Record<string, unknown>;
}

export interface DispatchedEvent {
  event: string;
  listeners?: string[];
  data?: unknown;
  time?: number;
  duration?: number;
}

export interface RenderedView {
  name: string;
  path?: string;
  data?: Record<string, unknown>;
  duration?: number;
}

export interface OutgoingHttpRequest {
  method: string;
  url: string;
  duration?: number;
  responseStatus?: number;
  request?: {
    headers?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    headers?: Record<string, string>;
    body?: unknown;
  };
}

export interface ClockworkRequest {
  id: string;
  version: number;
  type: RequestType;
  time: number;

  // HTTP request fields
  method?: string;
  uri?: string;
  url?: string;
  controller?: string;
  headers?: Record<string, string>;
  getData?: Record<string, unknown>;
  postData?: Record<string, unknown>;
  requestData?: Record<string, unknown>;
  responseStatus?: number;
  responseDuration?: number;
  memoryUsage?: number;
  middleware?: string[];

  // Route info
  route?: string;
  routeName?: string;

  // Command fields
  commandName?: string;
  commandArguments?: Record<string, unknown>;
  commandArgumentsDefaults?: Record<string, unknown>;
  commandOptions?: Record<string, unknown>;
  commandOptionsDefaults?: Record<string, unknown>;
  commandExitCode?: number;
  commandOutput?: string;

  // Collected data
  databaseQueries?: DatabaseQuery[];
  databaseQueriesCount?: number;
  databaseSlowQueries?: number;
  databaseSelects?: number;
  databaseInserts?: number;
  databaseUpdates?: number;
  databaseDeletes?: number;
  databaseOthers?: number;
  databaseDuration?: number;

  cacheQueries?: CacheQuery[];
  cacheReads?: number;
  cacheHits?: number;
  cacheWrites?: number;
  cacheDeletes?: number;
  cacheDuration?: number;

  redisCommands?: RedisCommand[];

  log?: LogEntry[];

  events?: DispatchedEvent[];

  views?: RenderedView[];
  viewsData?: RenderedView[];

  timelineData?: TimelineEvent[];

  httpRequests?: OutgoingHttpRequest[];

  // User info
  authenticatedUser?: {
    id?: string | number;
    email?: string;
    name?: string;
    [key: string]: unknown;
  };

  // Session
  sessionData?: Record<string, unknown>;
}

export interface IndexEntry {
  id: string;
  time: number;
  method?: string;
  uri?: string;
  controller?: string;
  responseStatus?: number;
  responseDuration?: number;
  type: RequestType;
  commandName?: string;
}

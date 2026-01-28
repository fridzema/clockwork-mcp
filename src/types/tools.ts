import { z } from 'zod';

// Common schemas
export const requestIdSchema = z.string().describe('Clockwork request ID');

export const timeRangeSchema = z.object({
  from: z.number().optional().describe('Unix timestamp start'),
  to: z.number().optional().describe('Unix timestamp end'),
});

// Request scope schema for multi-request analysis
export const requestScopeSchema = z.object({
  requestId: requestIdSchema.optional().describe('Specific request ID (highest priority)'),
  count: z.number().optional().describe('Number of recent HTTP requests to analyze'),
  since: z
    .string()
    .optional()
    .describe('Time duration to look back (e.g., "30m", "1h", "2d", "1w")'),
  all: z.boolean().optional().describe('Analyze all available requests (max 100)'),
  uri: z.string().optional().describe('Filter by URI pattern (substring match)'),
});

export const paginationSchema = z.object({
  limit: z.number().default(20).describe('Max results to return'),
  offset: z.number().default(0).describe('Number of results to skip'),
});

// Request discovery tool schemas
export const listRequestsSchema = z.object({
  type: z.enum(['request', 'command']).optional().describe('Filter by request type'),
  status: z.number().optional().describe('Filter by HTTP status code'),
  uri: z.string().optional().describe('Filter by URI pattern (substring match)'),
  method: z.string().optional().describe('Filter by HTTP method'),
  ...timeRangeSchema.shape,
  ...paginationSchema.shape,
});

export const searchRequestsSchema = z.object({
  controller: z.string().optional().describe('Filter by controller name'),
  uri: z.string().optional().describe('Filter by URI pattern'),
  status: z.number().optional().describe('Filter by HTTP status code'),
  minDuration: z.number().optional().describe('Minimum response duration in ms'),
  maxDuration: z.number().optional().describe('Maximum response duration in ms'),
  ...paginationSchema.shape,
});

// Database tool schemas
export const getQueriesSchema = z.object({
  requestId: requestIdSchema,
  slow: z.boolean().optional().describe('Only return slow queries'),
  threshold: z.number().optional().describe('Slow query threshold in ms'),
});

export const analyzeSlowQueriesSchema = z.object({
  ...requestScopeSchema.shape,
  threshold: z.number().default(100).describe('Slow query threshold in ms'),
  limit: z.number().default(20).describe('Max queries to return'),
});

export const detectNPlusOneSchema = z.object({
  ...requestScopeSchema.shape,
  threshold: z.number().default(2).describe('Min repetitions to flag as N+1'),
});

export const getQueryStatsSchema = z.object({
  requestId: requestIdSchema
    .optional()
    .describe('Stats for specific request, or aggregate if omitted'),
  ...timeRangeSchema.shape,
});

// Performance tool schemas
export const getPerformanceSummarySchema = z.object({
  requestId: requestIdSchema.optional(),
  ...timeRangeSchema.shape,
});

export const getTimelineSchema = z.object({
  requestId: requestIdSchema,
});

export const compareRequestsSchema = z.object({
  requestId1: requestIdSchema.describe('First request ID'),
  requestId2: requestIdSchema.describe('Second request ID'),
});

// Cache tool schemas
export const getCacheOperationsSchema = z.object({
  requestId: requestIdSchema,
});

export const getCacheStatsSchema = z.object({
  requestId: requestIdSchema.optional(),
  ...timeRangeSchema.shape,
});

export const getRedisCommandsSchema = z.object({
  requestId: requestIdSchema,
});

// Context tool schemas
export const getLogsSchema = z.object({
  requestId: requestIdSchema,
  level: z.enum(['debug', 'info', 'warning', 'error']).optional().describe('Minimum log level'),
});

export const getEventsSchema = z.object({
  requestId: requestIdSchema,
});

export const getViewsSchema = z.object({
  requestId: requestIdSchema,
});

export const getHttpRequestsSchema = z.object({
  requestId: requestIdSchema,
});

// Command tool schemas
export const listCommandsSchema = z.object({
  name: z.string().optional().describe('Filter by command name'),
  ...timeRangeSchema.shape,
  ...paginationSchema.shape,
});

export const getCommandSchema = z.object({
  requestId: requestIdSchema,
});

// Call graph & stack trace schemas
export const getCallGraphSchema = z.object({
  requestId: requestIdSchema,
  minDuration: z.number().optional().describe('Minimum duration in ms to include in graph'),
});

export const getQueryStackTraceSchema = z.object({
  requestId: requestIdSchema,
  queryIndex: z.number().describe('0-based index of the query'),
});

export const getLogStackTraceSchema = z.object({
  requestId: requestIdSchema,
  logIndex: z.number().describe('0-based index of the log entry'),
});

// Xdebug profiling schemas (stubs)
export const getXdebugProfileSchema = z.object({
  requestId: requestIdSchema,
});

export const getXdebugHotspotsSchema = z.object({
  requestId: requestIdSchema,
  limit: z.number().default(10).describe('Max hotspots to return'),
});

// Queue job schemas
export const listQueueJobsSchema = z.object({
  queue: z.string().optional().describe('Filter by queue name'),
  job: z.string().optional().describe('Filter by job class name'),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional().describe('Filter by job status'),
  ...timeRangeSchema.shape,
  ...paginationSchema.shape,
});

export const getQueueJobSchema = z.object({
  requestId: requestIdSchema,
});

// Test schemas
export const listTestsSchema = z.object({
  name: z.string().optional().describe('Filter by test name'),
  status: z.enum(['passed', 'failed', 'skipped']).optional().describe('Filter by test status'),
  ...timeRangeSchema.shape,
  ...paginationSchema.shape,
});

export const getTestSchema = z.object({
  requestId: requestIdSchema,
});

// Context schemas
export const getAuthUserSchema = z.object({
  requestId: requestIdSchema,
});

export const getSessionDataSchema = z.object({
  requestId: requestIdSchema,
  keys: z.array(z.string()).optional().describe('Specific session keys to retrieve'),
});

export const getMiddlewareChainSchema = z.object({
  requestId: requestIdSchema,
});

export const getRouteDetailsSchema = z.object({
  requestId: requestIdSchema,
});

// Analysis schemas
export const analyzeExceptionsSchema = z.object({
  ...requestScopeSchema.shape,
  groupByMessage: z.boolean().default(true).describe('Group exceptions by normalized message'),
  limit: z.number().default(20).describe('Max exception groups to return'),
});

export const analyzeRoutePerformanceSchema = z.object({
  ...requestScopeSchema.shape,
  groupBy: z.enum(['uri', 'route', 'controller']).default('uri').describe('How to group routes'),
  minSamples: z.number().default(1).describe('Minimum samples required for a route'),
});

export const detectMemoryIssuesSchema = z.object({
  ...requestScopeSchema.shape,
  thresholdMB: z.number().default(128).describe('Memory threshold in MB to flag as high'),
  detectGrowth: z.boolean().default(true).describe('Detect memory growth patterns'),
});

// Export all schema types - use z.input to get the input type (with optional defaults)
export type RequestScopeInput = z.input<typeof requestScopeSchema>;
export type ListRequestsInput = z.input<typeof listRequestsSchema>;
export type SearchRequestsInput = z.input<typeof searchRequestsSchema>;
export type GetQueriesInput = z.input<typeof getQueriesSchema>;
export type AnalyzeSlowQueriesInput = z.input<typeof analyzeSlowQueriesSchema>;
export type DetectNPlusOneInput = z.input<typeof detectNPlusOneSchema>;
export type GetQueryStatsInput = z.input<typeof getQueryStatsSchema>;
export type GetPerformanceSummaryInput = z.input<typeof getPerformanceSummarySchema>;
export type GetTimelineInput = z.input<typeof getTimelineSchema>;
export type CompareRequestsInput = z.input<typeof compareRequestsSchema>;
export type GetCacheOperationsInput = z.input<typeof getCacheOperationsSchema>;
export type GetCacheStatsInput = z.input<typeof getCacheStatsSchema>;
export type GetRedisCommandsInput = z.input<typeof getRedisCommandsSchema>;
export type GetLogsInput = z.input<typeof getLogsSchema>;
export type GetEventsInput = z.input<typeof getEventsSchema>;
export type GetViewsInput = z.input<typeof getViewsSchema>;
export type GetHttpRequestsInput = z.input<typeof getHttpRequestsSchema>;
export type ListCommandsInput = z.input<typeof listCommandsSchema>;
export type GetCommandInput = z.input<typeof getCommandSchema>;
export type GetCallGraphInput = z.input<typeof getCallGraphSchema>;
export type GetQueryStackTraceInput = z.input<typeof getQueryStackTraceSchema>;
export type GetLogStackTraceInput = z.input<typeof getLogStackTraceSchema>;
export type GetXdebugProfileInput = z.input<typeof getXdebugProfileSchema>;
export type GetXdebugHotspotsInput = z.input<typeof getXdebugHotspotsSchema>;
export type ListQueueJobsInput = z.input<typeof listQueueJobsSchema>;
export type GetQueueJobInput = z.input<typeof getQueueJobSchema>;
export type ListTestsInput = z.input<typeof listTestsSchema>;
export type GetTestInput = z.input<typeof getTestSchema>;
export type GetAuthUserInput = z.input<typeof getAuthUserSchema>;
export type GetSessionDataInput = z.input<typeof getSessionDataSchema>;
export type GetMiddlewareChainInput = z.input<typeof getMiddlewareChainSchema>;
export type GetRouteDetailsInput = z.input<typeof getRouteDetailsSchema>;
export type AnalyzeExceptionsInput = z.input<typeof analyzeExceptionsSchema>;
export type AnalyzeRoutePerformanceInput = z.input<typeof analyzeRoutePerformanceSchema>;
export type DetectMemoryIssuesInput = z.input<typeof detectMemoryIssuesSchema>;

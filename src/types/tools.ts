import { z } from 'zod';

// Common schemas
export const requestIdSchema = z.string().describe('Clockwork request ID');

export const timeRangeSchema = z.object({
  from: z.number().optional().describe('Unix timestamp start'),
  to: z.number().optional().describe('Unix timestamp end'),
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
  requestId: requestIdSchema.optional().describe('Analyze specific request, or all recent if omitted'),
  threshold: z.number().default(100).describe('Slow query threshold in ms'),
  limit: z.number().default(20).describe('Max queries to return'),
});

export const detectNPlusOneSchema = z.object({
  requestId: requestIdSchema,
  threshold: z.number().default(2).describe('Min repetitions to flag as N+1'),
});

export const getQueryStatsSchema = z.object({
  requestId: requestIdSchema.optional().describe('Stats for specific request, or aggregate if omitted'),
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

// Export all schema types
export type ListRequestsInput = z.infer<typeof listRequestsSchema>;
export type SearchRequestsInput = z.infer<typeof searchRequestsSchema>;
export type GetQueriesInput = z.infer<typeof getQueriesSchema>;
export type AnalyzeSlowQueriesInput = z.infer<typeof analyzeSlowQueriesSchema>;
export type DetectNPlusOneInput = z.infer<typeof detectNPlusOneSchema>;
export type GetQueryStatsInput = z.infer<typeof getQueryStatsSchema>;
export type GetPerformanceSummaryInput = z.infer<typeof getPerformanceSummarySchema>;
export type GetTimelineInput = z.infer<typeof getTimelineSchema>;
export type CompareRequestsInput = z.infer<typeof compareRequestsSchema>;
export type GetCacheOperationsInput = z.infer<typeof getCacheOperationsSchema>;
export type GetCacheStatsInput = z.infer<typeof getCacheStatsSchema>;
export type GetRedisCommandsInput = z.infer<typeof getRedisCommandsSchema>;
export type GetLogsInput = z.infer<typeof getLogsSchema>;
export type GetEventsInput = z.infer<typeof getEventsSchema>;
export type GetViewsInput = z.infer<typeof getViewsSchema>;
export type GetHttpRequestsInput = z.infer<typeof getHttpRequestsSchema>;
export type ListCommandsInput = z.infer<typeof listCommandsSchema>;
export type GetCommandInput = z.infer<typeof getCommandSchema>;

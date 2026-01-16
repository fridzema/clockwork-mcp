import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { findStoragePath } from './storage/locator.js';
import * as requestTools from './tools/requests.js';
import * as dbTools from './tools/database.js';
import * as perfTools from './tools/performance.js';
import * as cacheTools from './tools/cache.js';
import * as contextTools from './tools/context.js';
import * as cmdTools from './tools/commands.js';
import * as utilTools from './tools/utility.js';
import * as schemas from './types/tools.js';

export function createServer() {
  const server = new McpServer({
    name: 'clockwork-mcp',
    version: '0.1.0',
  });

  // Get storage path - will be resolved when tools are called
  const getStoragePath = (): string => {
    const path = findStoragePath({
      CLOCKWORK_STORAGE_PATH: process.env.CLOCKWORK_STORAGE_PATH,
      CLOCKWORK_PROJECT_PATH: process.env.CLOCKWORK_PROJECT_PATH,
    });

    if (!path) {
      throw new Error(
        'Clockwork storage not found. Set CLOCKWORK_STORAGE_PATH or run from a Laravel project.'
      );
    }

    return path;
  };

  // Request discovery tools
  server.tool(
    'list_requests',
    'List recent Clockwork requests with optional filtering',
    schemas.listRequestsSchema.shape,
    async (input) => {
      const result = requestTools.listRequests(getStoragePath(), input as schemas.ListRequestsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_request',
    'Get full details of a specific request by ID',
    { requestId: z.string().describe('Clockwork request ID') },
    async ({ requestId }) => {
      const result = requestTools.getRequest(getStoragePath(), requestId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_latest_request',
    'Get the most recent Clockwork request',
    {},
    async () => {
      const result = requestTools.getLatestRequest(getStoragePath());
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'search_requests',
    'Search requests by controller, URI, status, or duration',
    schemas.searchRequestsSchema.shape,
    async (input) => {
      const result = requestTools.searchRequests(getStoragePath(), input as schemas.SearchRequestsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Database tools
  server.tool(
    'get_queries',
    'Get database queries for a request',
    schemas.getQueriesSchema.shape,
    async (input) => {
      const result = dbTools.getQueries(getStoragePath(), input as schemas.GetQueriesInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'analyze_slow_queries',
    'Find slow database queries above threshold',
    schemas.analyzeSlowQueriesSchema.shape,
    async (input) => {
      const result = dbTools.analyzeSlowQueriesForRequest(getStoragePath(), input as schemas.AnalyzeSlowQueriesInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'detect_n_plus_one',
    'Detect N+1 query patterns in a request',
    schemas.detectNPlusOneSchema.shape,
    async (input) => {
      const result = dbTools.detectNPlusOneForRequest(getStoragePath(), input as schemas.DetectNPlusOneInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_query_stats',
    'Get aggregate query statistics for a request',
    schemas.getQueryStatsSchema.shape,
    async (input) => {
      const result = dbTools.getQueryStats(getStoragePath(), input as schemas.GetQueryStatsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Performance tools
  server.tool(
    'get_performance_summary',
    'Get performance overview for a request',
    schemas.getPerformanceSummarySchema.shape,
    async (input) => {
      const result = perfTools.getPerformanceSummary(getStoragePath(), input as schemas.GetPerformanceSummaryInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_timeline',
    'Get timeline events for a request',
    schemas.getTimelineSchema.shape,
    async (input) => {
      const result = perfTools.getTimeline(getStoragePath(), input as schemas.GetTimelineInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'compare_requests',
    'Compare two requests side by side',
    schemas.compareRequestsSchema.shape,
    async (input) => {
      const result = perfTools.compareRequests(getStoragePath(), input as schemas.CompareRequestsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Cache tools
  server.tool(
    'get_cache_operations',
    'Get cache operations for a request',
    schemas.getCacheOperationsSchema.shape,
    async (input) => {
      const result = cacheTools.getCacheOperations(getStoragePath(), input as schemas.GetCacheOperationsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_cache_stats',
    'Get cache statistics (hit ratio, totals)',
    schemas.getCacheStatsSchema.shape,
    async (input) => {
      const result = cacheTools.getCacheStats(getStoragePath(), input as schemas.GetCacheStatsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_redis_commands',
    'Get Redis commands for a request',
    schemas.getRedisCommandsSchema.shape,
    async (input) => {
      const result = cacheTools.getRedisCommands(getStoragePath(), input as schemas.GetRedisCommandsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Context tools
  server.tool(
    'get_logs',
    'Get log entries for a request',
    schemas.getLogsSchema.shape,
    async (input) => {
      const result = contextTools.getLogs(getStoragePath(), input as schemas.GetLogsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_events',
    'Get dispatched events for a request',
    schemas.getEventsSchema.shape,
    async (input) => {
      const result = contextTools.getEvents(getStoragePath(), input as schemas.GetEventsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_views',
    'Get rendered views for a request',
    schemas.getViewsSchema.shape,
    async (input) => {
      const result = contextTools.getViews(getStoragePath(), input as schemas.GetViewsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_http_requests',
    'Get outgoing HTTP requests made during a request',
    schemas.getHttpRequestsSchema.shape,
    async (input) => {
      const result = contextTools.getHttpRequests(getStoragePath(), input as schemas.GetHttpRequestsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Command tools
  server.tool(
    'list_commands',
    'List profiled Artisan command executions',
    schemas.listCommandsSchema.shape,
    async (input) => {
      const result = cmdTools.listCommands(getStoragePath(), input as schemas.ListCommandsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_command',
    'Get full details of an Artisan command execution',
    schemas.getCommandSchema.shape,
    async (input) => {
      const result = cmdTools.getCommand(getStoragePath(), input as schemas.GetCommandInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Utility tools
  server.tool(
    'get_clockwork_status',
    'Check Clockwork storage status and statistics',
    {},
    async () => {
      const path = findStoragePath({
        CLOCKWORK_STORAGE_PATH: process.env.CLOCKWORK_STORAGE_PATH,
        CLOCKWORK_PROJECT_PATH: process.env.CLOCKWORK_PROJECT_PATH,
      });
      const result = utilTools.getClockworkStatus(path ?? '');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'explain_request_flow',
    'Get high-level summary of what happened in a request',
    { requestId: z.string().describe('Clockwork request ID') },
    async ({ requestId }) => {
      const result = utilTools.explainRequestFlow(getStoragePath(), requestId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}

export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

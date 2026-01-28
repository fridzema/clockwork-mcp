import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { resolveStorage, type Storage } from './storage/storage.js';
import { findStoragePath } from './storage/locator.js';
import * as requestTools from './tools/requests.js';
import * as dbTools from './tools/database.js';
import * as perfTools from './tools/performance.js';
import * as cacheTools from './tools/cache.js';
import * as contextTools from './tools/context.js';
import * as cmdTools from './tools/commands.js';
import * as utilTools from './tools/utility.js';
import * as traceTools from './tools/traces.js';
import * as profilingTools from './tools/profiling.js';
import * as queueTools from './tools/queue.js';
import * as testTools from './tools/tests.js';
import * as analysisTools from './tools/analysis.js';
import * as schemas from './types/tools.js';

/**
 * Creates and configures the MCP server with all Clockwork debugging tools.
 * @returns Configured McpServer instance ready to connect
 * @example
 * ```ts
 * const server = createServer();
 * await server.connect(transport);
 * ```
 */
export function createServer() {
  const server = new McpServer({
    name: 'clockwork-mcp',
    version: '0.1.0',
  });

  // Resolve storage - will be created when tools are called
  let storage: Storage | null = null;
  const getStorage = (): Storage => {
    if (!storage) {
      storage = resolveStorage({
        CLOCKWORK_STORAGE_PATH: process.env.CLOCKWORK_STORAGE_PATH,
        CLOCKWORK_PROJECT_PATH: process.env.CLOCKWORK_PROJECT_PATH,
        CLOCKWORK_STORAGE_DRIVER: process.env.CLOCKWORK_STORAGE_DRIVER,
        CLOCKWORK_PHP_PATH: process.env.CLOCKWORK_PHP_PATH,
      });
    }
    return storage;
  };

  // Helper to get storage path for status tool (file size calculation)
  const getStoragePath = (): string => {
    const path = findStoragePath({
      CLOCKWORK_STORAGE_PATH: process.env.CLOCKWORK_STORAGE_PATH,
      CLOCKWORK_PROJECT_PATH: process.env.CLOCKWORK_PROJECT_PATH,
    });
    return path ?? '';
  };

  // Request discovery tools
  server.tool(
    'list_requests',
    'List recent Clockwork requests with optional filtering',
    schemas.listRequestsSchema.shape,
    async (input) => {
      const result = requestTools.listRequests(
        getStorage(),
        input as schemas.ListRequestsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_request',
    'Get full details of a specific request by ID',
    { requestId: z.string().describe('Clockwork request ID') },
    async ({ requestId }) => {
      const result = requestTools.getRequest(getStorage(), requestId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('get_latest_request', 'Get the most recent Clockwork request', {}, async () => {
    const result = requestTools.getLatestRequest(getStorage());
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool(
    'search_requests',
    'Search requests by controller, URI, status, or duration',
    schemas.searchRequestsSchema.shape,
    async (input) => {
      const result = requestTools.searchRequests(
        getStorage(),
        input as schemas.SearchRequestsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Database tools
  server.tool(
    'get_queries',
    'Get database queries for a request',
    schemas.getQueriesSchema.shape,
    async (input) => {
      const result = dbTools.getQueries(getStorage(), input as schemas.GetQueriesInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'analyze_slow_queries',
    'Find slow database queries above threshold',
    schemas.analyzeSlowQueriesSchema.shape,
    async (input) => {
      const result = dbTools.analyzeSlowQueriesForRequest(
        getStorage(),
        input as schemas.AnalyzeSlowQueriesInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'detect_n_plus_one',
    'Detect N+1 query patterns in a request',
    schemas.detectNPlusOneSchema.shape,
    async (input) => {
      const result = dbTools.detectNPlusOneForRequest(
        getStorage(),
        input as schemas.DetectNPlusOneInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_query_stats',
    'Get aggregate query statistics for a request',
    schemas.getQueryStatsSchema.shape,
    async (input) => {
      const result = dbTools.getQueryStats(getStorage(), input as schemas.GetQueryStatsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Performance tools
  server.tool(
    'get_performance_summary',
    'Get performance overview for a request',
    schemas.getPerformanceSummarySchema.shape,
    async (input) => {
      const result = perfTools.getPerformanceSummary(
        getStorage(),
        input as schemas.GetPerformanceSummaryInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_timeline',
    'Get timeline events for a request',
    schemas.getTimelineSchema.shape,
    async (input) => {
      const result = perfTools.getTimeline(getStorage(), input as schemas.GetTimelineInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'compare_requests',
    'Compare two requests side by side',
    schemas.compareRequestsSchema.shape,
    async (input) => {
      const result = perfTools.compareRequests(
        getStorage(),
        input as schemas.CompareRequestsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Cache tools
  server.tool(
    'get_cache_operations',
    'Get cache operations for a request',
    schemas.getCacheOperationsSchema.shape,
    async (input) => {
      const result = cacheTools.getCacheOperations(
        getStorage(),
        input as schemas.GetCacheOperationsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_cache_stats',
    'Get cache statistics (hit ratio, totals)',
    schemas.getCacheStatsSchema.shape,
    async (input) => {
      const result = cacheTools.getCacheStats(
        getStorage(),
        input as schemas.GetCacheStatsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_redis_commands',
    'Get Redis commands for a request',
    schemas.getRedisCommandsSchema.shape,
    async (input) => {
      const result = cacheTools.getRedisCommands(
        getStorage(),
        input as schemas.GetRedisCommandsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Context tools
  server.tool(
    'get_logs',
    'Get log entries for a request',
    schemas.getLogsSchema.shape,
    async (input) => {
      const result = contextTools.getLogs(getStorage(), input as schemas.GetLogsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_events',
    'Get dispatched events for a request',
    schemas.getEventsSchema.shape,
    async (input) => {
      const result = contextTools.getEvents(getStorage(), input as schemas.GetEventsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_views',
    'Get rendered views for a request',
    schemas.getViewsSchema.shape,
    async (input) => {
      const result = contextTools.getViews(getStorage(), input as schemas.GetViewsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_http_requests',
    'Get outgoing HTTP requests made during a request',
    schemas.getHttpRequestsSchema.shape,
    async (input) => {
      const result = contextTools.getHttpRequests(
        getStorage(),
        input as schemas.GetHttpRequestsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Command tools
  server.tool(
    'list_commands',
    'List profiled Artisan command executions',
    schemas.listCommandsSchema.shape,
    async (input) => {
      const result = cmdTools.listCommands(getStorage(), input as schemas.ListCommandsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_command',
    'Get full details of an Artisan command execution',
    schemas.getCommandSchema.shape,
    async (input) => {
      const result = cmdTools.getCommand(getStorage(), input as schemas.GetCommandInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Utility tools
  server.tool(
    'get_clockwork_status',
    'Check Clockwork storage status and statistics',
    {},
    async () => {
      const result = utilTools.getClockworkStatus(getStorage(), getStoragePath());
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'explain_request_flow',
    'Get high-level summary of what happened in a request',
    { requestId: z.string().describe('Clockwork request ID') },
    async ({ requestId }) => {
      const result = utilTools.explainRequestFlow(getStorage(), requestId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Call graph & stack trace tools
  server.tool(
    'get_call_graph',
    'Build hierarchical execution tree from timeline events',
    schemas.getCallGraphSchema.shape,
    async (input) => {
      const result = traceTools.getCallGraph(getStorage(), input as schemas.GetCallGraphInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_query_stack_trace',
    'Get source location for a database query',
    schemas.getQueryStackTraceSchema.shape,
    async (input) => {
      const result = traceTools.getQueryStackTrace(
        getStorage(),
        input as schemas.GetQueryStackTraceInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_log_stack_trace',
    'Get source location for a log entry',
    schemas.getLogStackTraceSchema.shape,
    async (input) => {
      const result = traceTools.getLogStackTrace(
        getStorage(),
        input as schemas.GetLogStackTraceInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Xdebug profiling tools (stubs)
  server.tool(
    'get_xdebug_profile',
    'Get Xdebug profiling data for a request (stub - not available in Clockwork)',
    schemas.getXdebugProfileSchema.shape,
    async (input) => {
      const result = profilingTools.getXdebugProfile(
        getStorage(),
        input as schemas.GetXdebugProfileInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_xdebug_hotspots',
    'Get Xdebug hotspots for a request (stub - not available in Clockwork)',
    schemas.getXdebugHotspotsSchema.shape,
    async (input) => {
      const result = profilingTools.getXdebugHotspots(
        getStorage(),
        input as schemas.GetXdebugHotspotsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Queue job tools
  server.tool(
    'list_queue_jobs',
    'List queue jobs with optional filtering',
    schemas.listQueueJobsSchema.shape,
    async (input) => {
      const result = queueTools.listQueueJobs(getStorage(), input as schemas.ListQueueJobsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_queue_job',
    'Get full details of a queue job',
    schemas.getQueueJobSchema.shape,
    async (input) => {
      const result = queueTools.getQueueJob(getStorage(), input as schemas.GetQueueJobInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Test tools
  server.tool(
    'list_tests',
    'List test executions with optional filtering',
    schemas.listTestsSchema.shape,
    async (input) => {
      const result = testTools.listTests(getStorage(), input as schemas.ListTestsInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_test',
    'Get full details of a test execution',
    schemas.getTestSchema.shape,
    async (input) => {
      const result = testTools.getTest(getStorage(), input as schemas.GetTestInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Context tools
  server.tool(
    'get_auth_user',
    'Get authenticated user for a request',
    schemas.getAuthUserSchema.shape,
    async (input) => {
      const result = contextTools.getAuthUser(getStorage(), input as schemas.GetAuthUserInput);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_session_data',
    'Get session data for a request',
    schemas.getSessionDataSchema.shape,
    async (input) => {
      const result = contextTools.getSessionData(
        getStorage(),
        input as schemas.GetSessionDataInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_middleware_chain',
    'Get middleware chain for a request',
    schemas.getMiddlewareChainSchema.shape,
    async (input) => {
      const result = contextTools.getMiddlewareChain(
        getStorage(),
        input as schemas.GetMiddlewareChainInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_route_details',
    'Get route details for a request',
    schemas.getRouteDetailsSchema.shape,
    async (input) => {
      const result = contextTools.getRouteDetails(
        getStorage(),
        input as schemas.GetRouteDetailsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Analysis tools
  server.tool(
    'analyze_exceptions',
    'Analyze exceptions across requests, grouping by message pattern',
    schemas.analyzeExceptionsSchema.shape,
    async (input) => {
      const result = analysisTools.analyzeExceptions(
        getStorage(),
        input as schemas.AnalyzeExceptionsInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'analyze_route_performance',
    'Analyze route performance with percentile statistics',
    schemas.analyzeRoutePerformanceSchema.shape,
    async (input) => {
      const result = analysisTools.analyzeRoutePerformance(
        getStorage(),
        input as schemas.AnalyzeRoutePerformanceInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'detect_memory_issues',
    'Detect high memory usage and growth patterns',
    schemas.detectMemoryIssuesSchema.shape,
    async (input) => {
      const result = analysisTools.detectMemoryIssues(
        getStorage(),
        input as schemas.DetectMemoryIssuesInput
      );
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}

/**
 * Creates the server and starts it using stdio transport.
 * This is the main entry point for the CLI.
 */
export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

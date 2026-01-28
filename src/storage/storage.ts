import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import * as artisan from './artisan.js';
import * as reader from './reader.js';
import { parseIndex } from './index-parser.js';
import { findProjectPath, findStoragePath, type LocatorEnv } from './locator.js';
import type { ArtisanOptions } from './artisan.js';

export type StorageDriver = 'artisan' | 'file';

export interface StorageOptions {
  driver: StorageDriver;
  projectPath?: string;
  storagePath?: string;
  phpPath?: string;
  timeout?: number;
}

export interface Storage {
  find(requestId: string): ClockworkRequest | null;
  findMany(requestIds: string[]): ClockworkRequest[];
  latest(): ClockworkRequest | null;
  list(): IndexEntry[];
}

/**
 * Creates a unified storage interface that routes to the appropriate backend.
 * @param options - Storage configuration
 * @returns Storage interface
 */
export function createStorage(options: StorageOptions): Storage {
  if (options.driver === 'artisan') {
    if (!options.projectPath) {
      throw new Error('projectPath is required for artisan driver');
    }

    const artisanOpts: ArtisanOptions = {
      phpPath: options.phpPath,
      timeout: options.timeout,
    };

    return {
      find: (requestId) =>
        artisan.getRequestViaArtisan(options.projectPath!, requestId, artisanOpts),
      findMany: (requestIds) =>
        artisan.getRequestsViaArtisan(options.projectPath!, requestIds, artisanOpts),
      latest: () => artisan.getLatestRequestViaArtisan(options.projectPath!, artisanOpts),
      list: () => artisan.listRequestsViaArtisan(options.projectPath!, artisanOpts),
    };
  }

  if (options.driver === 'file') {
    if (!options.storagePath) {
      throw new Error('storagePath is required for file driver');
    }

    return {
      find: (requestId) => reader.readRequest(options.storagePath!, requestId),
      findMany: (requestIds) => reader.readRequests(options.storagePath!, requestIds),
      latest: () => {
        const entries = parseIndex(options.storagePath!);
        if (entries.length === 0) return null;
        return reader.readRequest(options.storagePath!, entries[0].id);
      },
      list: () => parseIndex(options.storagePath!),
    };
  }

  throw new Error(`Unknown storage driver: ${options.driver}`);
}

export interface ResolveEnv extends LocatorEnv {
  CLOCKWORK_STORAGE_DRIVER?: string;
  CLOCKWORK_PHP_PATH?: string;
}

/**
 * Resolves and creates a storage instance based on environment and auto-detection.
 * @param env - Environment variables
 * @param cwd - Current working directory override
 * @returns Configured storage instance
 */
export function resolveStorage(env: ResolveEnv = {}, cwd?: string): Storage {
  const driver = env.CLOCKWORK_STORAGE_DRIVER as StorageDriver | undefined;

  // Explicit driver selection
  if (driver === 'artisan') {
    const projectPath = findProjectPath(env, cwd);
    if (!projectPath) {
      throw new Error('Could not find Laravel project for artisan driver');
    }
    return createStorage({
      driver: 'artisan',
      projectPath,
      phpPath: env.CLOCKWORK_PHP_PATH,
    });
  }

  if (driver === 'file') {
    const storagePath = findStoragePath(env, cwd);
    if (!storagePath) {
      throw new Error('Could not find Clockwork storage path for file driver');
    }
    return createStorage({
      driver: 'file',
      storagePath,
    });
  }

  // Auto-detection: prefer artisan (works with all backends)
  const projectPath = findProjectPath(env, cwd);
  if (projectPath) {
    return createStorage({
      driver: 'artisan',
      projectPath,
      phpPath: env.CLOCKWORK_PHP_PATH,
    });
  }

  // Fallback to file-based if storage path exists
  const storagePath = findStoragePath(env, cwd);
  if (storagePath) {
    return createStorage({
      driver: 'file',
      storagePath,
    });
  }

  throw new Error(
    'Could not find Clockwork storage. Ensure you are in a Laravel project with Clockwork installed, ' +
      'or set CLOCKWORK_PROJECT_PATH or CLOCKWORK_STORAGE_PATH environment variable.'
  );
}

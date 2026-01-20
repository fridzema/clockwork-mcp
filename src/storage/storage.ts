import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import * as artisan from './artisan.js';
import * as reader from './reader.js';
import { parseIndex } from './index-parser.js';
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
      find: (requestId) => artisan.getRequestViaArtisan(options.projectPath!, requestId, artisanOpts),
      findMany: (requestIds) => artisan.getRequestsViaArtisan(options.projectPath!, requestIds, artisanOpts),
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

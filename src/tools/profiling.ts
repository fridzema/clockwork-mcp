import type { Storage } from '../storage/storage.js';
import type { GetXdebugProfileInput, GetXdebugHotspotsInput } from '../types/tools.js';

export interface XdebugProfileResult {
  available: boolean;
  message: string;
  requestId: string;
}

/**
 * Gets Xdebug profiling data for a request.
 * This is a stub - Clockwork doesn't store Xdebug profile data directly.
 * @param storage - Storage interface
 * @param input - Request ID
 * @returns Stub result indicating feature is not available
 */
export function getXdebugProfile(
  _storage: Storage,
  input: GetXdebugProfileInput
): XdebugProfileResult {
  return {
    available: false,
    message:
      'Xdebug profiling data is not stored in Clockwork. To analyze Xdebug profiles, ' +
      'use tools like Webgrind, QCacheGrind, or PHPStorm to read .cachegrind files directly. ' +
      'Configure Xdebug with xdebug.output_dir to specify where profile files are saved.',
    requestId: input.requestId,
  };
}

export interface XdebugHotspot {
  function: string;
  file: string;
  line: number;
  selfTime: number;
  totalTime: number;
  calls: number;
}

export interface XdebugHotspotsResult {
  available: boolean;
  message: string;
  requestId: string;
  hotspots: XdebugHotspot[];
}

/**
 * Gets Xdebug hotspots (most time-consuming functions) for a request.
 * This is a stub - Clockwork doesn't store Xdebug profile data directly.
 * @param storage - Storage interface
 * @param input - Request ID and limit
 * @returns Stub result indicating feature is not available
 */
export function getXdebugHotspots(
  _storage: Storage,
  input: GetXdebugHotspotsInput
): XdebugHotspotsResult {
  return {
    available: false,
    message:
      'Xdebug hotspot analysis is not available through Clockwork. To identify performance ' +
      'hotspots, enable Xdebug profiling (xdebug.mode=profile) and analyze the generated ' +
      '.cachegrind files with QCacheGrind, Webgrind, or similar tools.',
    requestId: input.requestId,
    hotspots: [],
  };
}

import { existsSync } from 'fs';
import { join, dirname } from 'path';

export interface LocatorEnv {
  CLOCKWORK_STORAGE_PATH?: string;
  CLOCKWORK_PROJECT_PATH?: string;
}

/**
 * Checks if a directory is a Laravel project root.
 * @param dir - Directory path to check
 * @returns True if directory contains an artisan file
 */
export function isLaravelProject(dir: string): boolean {
  return existsSync(join(dir, 'artisan'));
}

/**
 * Finds Laravel project root path.
 * @param env - Environment variables for explicit paths
 * @param cwd - Current working directory override
 * @returns Project path or null if not found
 */
export function findProjectPath(env: LocatorEnv = {}, cwd?: string): string | null {
  // 1. Check explicit project path from env
  if (env.CLOCKWORK_PROJECT_PATH) {
    if (isLaravelProject(env.CLOCKWORK_PROJECT_PATH)) {
      return env.CLOCKWORK_PROJECT_PATH;
    }
    return null;
  }

  // 2. Check if cwd is a Laravel project
  const startDir = cwd || process.cwd();
  if (isLaravelProject(startDir)) {
    return startDir;
  }

  // 3. Traverse up to find Laravel project
  let currentDir = startDir;
  let parentDir = dirname(currentDir);

  while (currentDir !== parentDir) {
    currentDir = parentDir;
    if (isLaravelProject(currentDir)) {
      return currentDir;
    }
    parentDir = dirname(currentDir);
  }

  return null;
}

/**
 * Finds Clockwork storage path using multiple strategies.
 * Checks: env vars, project path, cwd, then traverses up to find Laravel project.
 * @param env - Environment variables for explicit paths
 * @param cwd - Current working directory override
 * @returns Storage path or null if not found
 */
export function findStoragePath(env: LocatorEnv = {}, cwd?: string): string | null {
  // 1. Check explicit env path
  if (env.CLOCKWORK_STORAGE_PATH) {
    if (existsSync(env.CLOCKWORK_STORAGE_PATH)) {
      return env.CLOCKWORK_STORAGE_PATH;
    }
    return null;
  }

  // 2. Check project path from env
  if (env.CLOCKWORK_PROJECT_PATH) {
    const storagePath = join(env.CLOCKWORK_PROJECT_PATH, 'storage', 'clockwork');
    if (existsSync(storagePath)) {
      return storagePath;
    }
  }

  // 3. Check current directory
  const startDir = cwd || process.cwd();
  const cwdStorage = join(startDir, 'storage', 'clockwork');
  if (existsSync(cwdStorage)) {
    return cwdStorage;
  }

  // 4. Traverse up to find Laravel project
  let currentDir = startDir;
  const root = dirname(currentDir);

  while (currentDir !== root) {
    if (isLaravelProject(currentDir)) {
      const storagePath = join(currentDir, 'storage', 'clockwork');
      if (existsSync(storagePath)) {
        return storagePath;
      }
    }
    currentDir = dirname(currentDir);
  }

  return null;
}

/**
 * Finds Clockwork storage path or throws if not found.
 * @param env - Environment variables for explicit paths
 * @param cwd - Current working directory override
 * @returns Storage path
 * @throws Error if storage path cannot be found
 */
export function getStoragePathOrThrow(env: LocatorEnv = {}, cwd?: string): string {
  const path = findStoragePath(env, cwd);
  if (!path) {
    throw new Error(
      'Clockwork storage not found. Ensure you are in a Laravel project with Clockwork installed, ' +
        'or set CLOCKWORK_STORAGE_PATH environment variable.'
    );
  }
  return path;
}

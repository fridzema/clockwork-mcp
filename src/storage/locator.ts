import { existsSync } from 'fs';
import { join, dirname } from 'path';

export interface LocatorEnv {
  CLOCKWORK_STORAGE_PATH?: string;
  CLOCKWORK_PROJECT_PATH?: string;
}

export function isLaravelProject(dir: string): boolean {
  return existsSync(join(dir, 'artisan'));
}

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

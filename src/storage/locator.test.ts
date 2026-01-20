import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findStoragePath, findProjectPath, isLaravelProject } from './locator.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Storage Locator', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('isLaravelProject', () => {
    it('returns true when artisan file exists', () => {
      writeFileSync(join(testDir, 'artisan'), '<?php');
      expect(isLaravelProject(testDir)).toBe(true);
    });

    it('returns false when artisan file does not exist', () => {
      expect(isLaravelProject(testDir)).toBe(false);
    });
  });

  describe('findStoragePath', () => {
    it('returns env path when CLOCKWORK_STORAGE_PATH is set', () => {
      const envPath = join(testDir, 'custom-storage');
      mkdirSync(envPath, { recursive: true });

      const result = findStoragePath({ CLOCKWORK_STORAGE_PATH: envPath });
      expect(result).toBe(envPath);
    });

    it('returns null when env path does not exist', () => {
      const result = findStoragePath({ CLOCKWORK_STORAGE_PATH: '/nonexistent/path' });
      expect(result).toBeNull();
    });

    it('finds storage/clockwork in Laravel project', () => {
      writeFileSync(join(testDir, 'artisan'), '<?php');
      const storagePath = join(testDir, 'storage', 'clockwork');
      mkdirSync(storagePath, { recursive: true });

      const result = findStoragePath({}, testDir);
      expect(result).toBe(storagePath);
    });

    it('returns null when no storage found', () => {
      const result = findStoragePath({}, testDir);
      expect(result).toBeNull();
    });
  });

  describe('findProjectPath', () => {
    it('returns project path from CLOCKWORK_PROJECT_PATH env var', () => {
      const laravelDir = join(testDir, 'laravel');
      mkdirSync(laravelDir, { recursive: true });
      writeFileSync(join(laravelDir, 'artisan'), '<?php');

      const result = findProjectPath({ CLOCKWORK_PROJECT_PATH: laravelDir });

      expect(result).toBe(laravelDir);
    });

    it('finds Laravel project by traversing up from cwd', () => {
      const laravelDir = join(testDir, 'laravel');
      const deepDir = join(laravelDir, 'app', 'Http');
      mkdirSync(deepDir, { recursive: true });
      writeFileSync(join(laravelDir, 'artisan'), '<?php');

      const result = findProjectPath({}, deepDir);

      expect(result).toBe(laravelDir);
    });

    it('returns null when no Laravel project found', () => {
      const result = findProjectPath({}, testDir);

      expect(result).toBeNull();
    });

    it('returns null when env path is not a Laravel project', () => {
      mkdirSync(join(testDir, 'not-laravel'), { recursive: true });

      const result = findProjectPath({ CLOCKWORK_PROJECT_PATH: join(testDir, 'not-laravel') });

      expect(result).toBeNull();
    });
  });
});

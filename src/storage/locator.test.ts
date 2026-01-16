import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findStoragePath, isLaravelProject } from './locator.js';
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
});

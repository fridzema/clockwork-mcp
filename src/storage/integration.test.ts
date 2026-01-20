import { describe, it, expect } from 'vitest';
import { resolveStorage } from './storage.js';

// Skip in CI - requires a real Laravel project
const LARAVEL_PROJECT = process.env.TEST_LARAVEL_PROJECT;

describe.skipIf(!LARAVEL_PROJECT)('Integration Tests', () => {
  it('can resolve storage from Laravel project', () => {
    const storage = resolveStorage({
      CLOCKWORK_PROJECT_PATH: LARAVEL_PROJECT,
    });

    expect(storage).toBeDefined();
  });

  it('can list requests via artisan', () => {
    const storage = resolveStorage({
      CLOCKWORK_PROJECT_PATH: LARAVEL_PROJECT,
      CLOCKWORK_STORAGE_DRIVER: 'artisan',
    });

    const entries = storage.list();
    expect(Array.isArray(entries)).toBe(true);
  });

  it('can fetch latest request via artisan', () => {
    const storage = resolveStorage({
      CLOCKWORK_PROJECT_PATH: LARAVEL_PROJECT,
      CLOCKWORK_STORAGE_DRIVER: 'artisan',
    });

    const latest = storage.latest();
    // May be null if no requests
    if (latest) {
      expect(latest.id).toBeDefined();
      expect(latest.type).toBeDefined();
    }
  });

  it('can fetch a specific request by ID', () => {
    const storage = resolveStorage({
      CLOCKWORK_PROJECT_PATH: LARAVEL_PROJECT,
      CLOCKWORK_STORAGE_DRIVER: 'artisan',
    });

    const entries = storage.list();
    if (entries.length > 0) {
      const request = storage.find(entries[0].id);
      expect(request).toBeDefined();
      expect(request?.id).toBe(entries[0].id);
    }
  });

  it('can fetch multiple requests at once', () => {
    const storage = resolveStorage({
      CLOCKWORK_PROJECT_PATH: LARAVEL_PROJECT,
      CLOCKWORK_STORAGE_DRIVER: 'artisan',
    });

    const entries = storage.list();
    if (entries.length >= 2) {
      const ids = entries.slice(0, 2).map((e) => e.id);
      const requests = storage.findMany(ids);
      expect(requests.length).toBe(2);
    }
  });
});

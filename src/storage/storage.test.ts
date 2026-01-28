import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStorage, resolveStorage } from './storage.js';
import * as artisan from './artisan.js';
import * as reader from './reader.js';
import * as indexParser from './index-parser.js';
import * as locator from './locator.js';

vi.mock('./artisan.js');
vi.mock('./reader.js');
vi.mock('./index-parser.js');
vi.mock('./locator.js');

describe('Unified Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStorage with artisan driver', () => {
    it('routes find() to artisan implementation', () => {
      const mockRequest = { id: 'abc123', type: 'request', time: 123 };
      vi.mocked(artisan.getRequestViaArtisan).mockReturnValue(mockRequest as any);

      const storage = createStorage({
        driver: 'artisan',
        projectPath: '/path/to/laravel',
      });

      const result = storage.find('abc123');

      expect(artisan.getRequestViaArtisan).toHaveBeenCalledWith('/path/to/laravel', 'abc123', {});
      expect(result).toEqual(mockRequest);
    });

    it('routes latest() to artisan implementation', () => {
      const mockRequest = { id: 'latest', type: 'request', time: 999 };
      vi.mocked(artisan.getLatestRequestViaArtisan).mockReturnValue(mockRequest as any);

      const storage = createStorage({
        driver: 'artisan',
        projectPath: '/path/to/laravel',
      });

      const result = storage.latest();

      expect(artisan.getLatestRequestViaArtisan).toHaveBeenCalledWith('/path/to/laravel', {});
      expect(result).toEqual(mockRequest);
    });

    it('routes list() to artisan implementation', () => {
      const mockEntries = [{ id: 'req1', time: 123, type: 'request' }];
      vi.mocked(artisan.listRequestsViaArtisan).mockReturnValue(mockEntries as any);

      const storage = createStorage({
        driver: 'artisan',
        projectPath: '/path/to/laravel',
      });

      const result = storage.list();

      expect(artisan.listRequestsViaArtisan).toHaveBeenCalledWith('/path/to/laravel', {});
      expect(result).toEqual(mockEntries);
    });

    it('routes findMany() to artisan implementation', () => {
      const mockRequests = [
        { id: 'req1', type: 'request', time: 123 },
        { id: 'req2', type: 'request', time: 456 },
      ];
      vi.mocked(artisan.getRequestsViaArtisan).mockReturnValue(mockRequests as any);

      const storage = createStorage({
        driver: 'artisan',
        projectPath: '/path/to/laravel',
      });

      const result = storage.findMany(['req1', 'req2']);

      expect(artisan.getRequestsViaArtisan).toHaveBeenCalledWith(
        '/path/to/laravel',
        ['req1', 'req2'],
        {}
      );
      expect(result).toEqual(mockRequests);
    });

    it('throws when projectPath is missing', () => {
      expect(() => createStorage({ driver: 'artisan' })).toThrow('projectPath is required');
    });
  });

  describe('createStorage with file driver', () => {
    it('routes find() to file-based reader', () => {
      const mockRequest = { id: 'abc123', type: 'request', time: 123 };
      vi.mocked(reader.readRequest).mockReturnValue(mockRequest as any);

      const storage = createStorage({
        driver: 'file',
        storagePath: '/path/to/storage/clockwork',
      });

      const result = storage.find('abc123');

      expect(reader.readRequest).toHaveBeenCalledWith('/path/to/storage/clockwork', 'abc123');
      expect(result).toEqual(mockRequest);
    });

    it('routes list() to file-based index parser', () => {
      const mockEntries = [{ id: 'req1', time: 123, type: 'request' }];
      vi.mocked(indexParser.parseIndex).mockReturnValue(mockEntries as any);

      const storage = createStorage({
        driver: 'file',
        storagePath: '/path/to/storage/clockwork',
      });

      const result = storage.list();

      expect(indexParser.parseIndex).toHaveBeenCalledWith('/path/to/storage/clockwork');
      expect(result).toEqual(mockEntries);
    });

    it('routes latest() to file-based implementation', () => {
      const mockEntries = [
        { id: 'req1', time: 999 },
        { id: 'req2', time: 123 },
      ];
      const mockRequest = { id: 'req1', type: 'request', time: 999 };
      vi.mocked(indexParser.parseIndex).mockReturnValue(mockEntries as any);
      vi.mocked(reader.readRequest).mockReturnValue(mockRequest as any);

      const storage = createStorage({
        driver: 'file',
        storagePath: '/path/to/storage/clockwork',
      });

      const result = storage.latest();

      expect(reader.readRequest).toHaveBeenCalledWith('/path/to/storage/clockwork', 'req1');
      expect(result).toEqual(mockRequest);
    });

    it('routes findMany() to file-based reader', () => {
      const mockRequests = [
        { id: 'req1', type: 'request', time: 123 },
        { id: 'req2', type: 'request', time: 456 },
      ];
      vi.mocked(reader.readRequests).mockReturnValue(mockRequests as any);

      const storage = createStorage({
        driver: 'file',
        storagePath: '/path/to/storage/clockwork',
      });

      const result = storage.findMany(['req1', 'req2']);

      expect(reader.readRequests).toHaveBeenCalledWith('/path/to/storage/clockwork', [
        'req1',
        'req2',
      ]);
      expect(result).toEqual(mockRequests);
    });

    it('throws when storagePath is missing', () => {
      expect(() => createStorage({ driver: 'file' })).toThrow('storagePath is required');
    });
  });

  describe('createStorage with unknown driver', () => {
    it('throws for unknown driver', () => {
      expect(() => createStorage({ driver: 'unknown' as any })).toThrow('Unknown storage driver');
    });
  });
});

describe('resolveStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses artisan driver when CLOCKWORK_STORAGE_DRIVER=artisan', () => {
    vi.mocked(locator.findProjectPath).mockReturnValue('/path/to/laravel');

    const storage = resolveStorage({
      CLOCKWORK_STORAGE_DRIVER: 'artisan',
      CLOCKWORK_PROJECT_PATH: '/path/to/laravel',
    });

    expect(storage).toBeDefined();
    // Test that it uses artisan by calling a method
    vi.mocked(artisan.listRequestsViaArtisan).mockReturnValue([]);
    storage.list();
    expect(artisan.listRequestsViaArtisan).toHaveBeenCalled();
  });

  it('uses file driver when CLOCKWORK_STORAGE_DRIVER=file', () => {
    vi.mocked(locator.findStoragePath).mockReturnValue('/path/to/storage/clockwork');

    const storage = resolveStorage({
      CLOCKWORK_STORAGE_DRIVER: 'file',
      CLOCKWORK_STORAGE_PATH: '/path/to/storage/clockwork',
    });

    expect(storage).toBeDefined();
    vi.mocked(indexParser.parseIndex).mockReturnValue([]);
    storage.list();
    expect(indexParser.parseIndex).toHaveBeenCalled();
  });

  it('auto-detects artisan driver when project path found', () => {
    vi.mocked(locator.findProjectPath).mockReturnValue('/path/to/laravel');
    vi.mocked(locator.findStoragePath).mockReturnValue(null);

    const storage = resolveStorage({});

    vi.mocked(artisan.listRequestsViaArtisan).mockReturnValue([]);
    storage.list();
    expect(artisan.listRequestsViaArtisan).toHaveBeenCalled();
  });

  it('falls back to file driver when only storage path found', () => {
    vi.mocked(locator.findProjectPath).mockReturnValue(null);
    vi.mocked(locator.findStoragePath).mockReturnValue('/path/to/storage/clockwork');

    const storage = resolveStorage({});

    vi.mocked(indexParser.parseIndex).mockReturnValue([]);
    storage.list();
    expect(indexParser.parseIndex).toHaveBeenCalled();
  });

  it('throws when no storage can be resolved', () => {
    vi.mocked(locator.findProjectPath).mockReturnValue(null);
    vi.mocked(locator.findStoragePath).mockReturnValue(null);

    expect(() => resolveStorage({})).toThrow('Could not find Clockwork storage');
  });

  it('throws when artisan driver requested but no project found', () => {
    vi.mocked(locator.findProjectPath).mockReturnValue(null);

    expect(() => resolveStorage({ CLOCKWORK_STORAGE_DRIVER: 'artisan' })).toThrow(
      'Could not find Laravel project'
    );
  });

  it('throws when file driver requested but no storage found', () => {
    vi.mocked(locator.findStoragePath).mockReturnValue(null);

    expect(() => resolveStorage({ CLOCKWORK_STORAGE_DRIVER: 'file' })).toThrow(
      'Could not find Clockwork storage path'
    );
  });
});

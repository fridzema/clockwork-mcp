import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executePhp, getRequestViaArtisan, getLatestRequestViaArtisan } from './artisan.js';
import { execSync } from 'child_process';

vi.mock('child_process');

describe('Artisan Executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executePhp', () => {
    it('executes PHP code via artisan tinker and returns parsed JSON', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue('{"id":"abc123","type":"request"}');

      const result = executePhp('/path/to/laravel', 'echo json_encode(["id" => "abc123", "type" => "request"]);');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('php artisan tinker'),
        expect.objectContaining({ cwd: '/path/to/laravel' })
      );
      expect(result).toEqual({ id: 'abc123', type: 'request' });
    });

    it('throws descriptive error when PHP is not found', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockImplementation(() => {
        const error = new Error('Command failed') as Error & { code: string };
        error.code = 'ENOENT';
        throw error;
      });

      expect(() => executePhp('/path/to/laravel', 'echo 1;')).toThrow(
        'PHP executable not found'
      );
    });

    it('throws descriptive error when artisan is not found', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockImplementation(() => {
        throw new Error('Could not open input file: artisan');
      });

      expect(() => executePhp('/path/to/laravel', 'echo 1;')).toThrow(
        'Laravel artisan not found'
      );
    });

    it('throws descriptive error when Clockwork is not installed', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue('Target class [clockwork] does not exist.');

      expect(() => executePhp('/path/to/laravel', "echo json_encode(app('clockwork'));")).toThrow(
        'Clockwork is not installed'
      );
    });

    it('throws error when output is not valid JSON', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue('not json');

      expect(() => executePhp('/path/to/laravel', 'echo "not json";')).toThrow(
        'No JSON output'
      );
    });
  });
});

describe('Clockwork Storage Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRequestViaArtisan', () => {
    it('fetches a single request by ID', () => {
      const mockExecSync = vi.mocked(execSync);
      const mockRequest = {
        id: 'abc123',
        type: 'request',
        time: 1705312345,
        method: 'GET',
        uri: '/api/users',
      };
      mockExecSync.mockReturnValue(JSON.stringify(mockRequest));

      const result = getRequestViaArtisan('/path/to/laravel', 'abc123');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('abc123'),
        expect.any(Object)
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('find'),
        expect.any(Object)
      );
      expect(result).toEqual(mockRequest);
    });

    it('returns null when request not found', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue('null');

      const result = getRequestViaArtisan('/path/to/laravel', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getLatestRequestViaArtisan', () => {
    it('fetches the most recent request', () => {
      const mockExecSync = vi.mocked(execSync);
      const mockRequest = {
        id: 'latest123',
        type: 'request',
        time: 1705312999,
        method: 'POST',
        uri: '/api/orders',
      };
      mockExecSync.mockReturnValue(JSON.stringify(mockRequest));

      const result = getLatestRequestViaArtisan('/path/to/laravel');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('latest'),
        expect.any(Object)
      );
      expect(result).toEqual(mockRequest);
    });

    it('returns null when no requests exist', () => {
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue('null');

      const result = getLatestRequestViaArtisan('/path/to/laravel');

      expect(result).toBeNull();
    });
  });
});

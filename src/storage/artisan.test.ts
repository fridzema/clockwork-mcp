import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executePhp } from './artisan.js';
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

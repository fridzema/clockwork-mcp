import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getClockworkStatus, explainRequestFlow } from './utility.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Utility Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-util-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    const indexContent = [
      'req-1\t1705312345\tGET\t/api/users\tUserController@index\t200\t50\trequest',
      'req-2\t1705312400\tPOST\t/api/users\tUserController@store\t201\t120\trequest',
    ].join('\n');
    writeFileSync(join(testDir, 'index'), indexContent);

    writeFileSync(join(testDir, 'req-1.json'), JSON.stringify({
      id: 'req-1',
      type: 'request',
      time: 1705312345,
      method: 'GET',
      uri: '/api/users',
      controller: 'UserController@index',
      responseStatus: 200,
      responseDuration: 50,
      middleware: ['auth', 'api'],
      databaseQueries: [
        { query: 'SELECT * FROM users', duration: 10 },
      ],
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getClockworkStatus', () => {
    it('returns storage status', () => {
      const result = getClockworkStatus(testDir);
      expect(result.found).toBe(true);
      expect(result.requestCount).toBe(2);
      expect(result.storagePath).toBe(testDir);
    });

    it('returns not found for invalid path', () => {
      const result = getClockworkStatus('/nonexistent/path');
      expect(result.found).toBe(false);
    });
  });

  describe('explainRequestFlow', () => {
    it('returns request flow summary', () => {
      const result = explainRequestFlow(testDir, 'req-1');
      expect(result.method).toBe('GET');
      expect(result.uri).toBe('/api/users');
      expect(result.controller).toBe('UserController@index');
      expect(result.middleware).toEqual(['auth', 'api']);
      expect(result.queryCount).toBe(1);
      expect(result.status).toBe(200);
    });
  });
});

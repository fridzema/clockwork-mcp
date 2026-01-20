import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getClockworkStatus,
  explainRequestFlow,
  parseTimeDuration,
  filterRequestsByScope,
} from './utility.js';
import { createStorage } from '../storage/storage.js';
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

    writeFileSync(
      join(testDir, 'req-1.json'),
      JSON.stringify({
        id: 'req-1',
        type: 'request',
        time: 1705312345,
        method: 'GET',
        uri: '/api/users',
        controller: 'UserController@index',
        responseStatus: 200,
        responseDuration: 50,
        middleware: ['auth', 'api'],
        databaseQueries: [{ query: 'SELECT * FROM users', duration: 10 }],
      })
    );
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const getStorage = () => createStorage({ driver: 'file', storagePath: testDir });

  describe('getClockworkStatus', () => {
    it('returns storage status', () => {
      const result = getClockworkStatus(getStorage(), testDir);
      expect(result.found).toBe(true);
      expect(result.requestCount).toBe(2);
      expect(result.storagePath).toBe(testDir);
    });

    it('returns not found for invalid path', () => {
      const result = getClockworkStatus(getStorage(), '/nonexistent/path');
      expect(result.found).toBe(false);
    });
  });

  describe('explainRequestFlow', () => {
    it('returns request flow summary', () => {
      const result = explainRequestFlow(getStorage(), 'req-1');
      expect(result.method).toBe('GET');
      expect(result.uri).toBe('/api/users');
      expect(result.controller).toBe('UserController@index');
      expect(result.middleware).toEqual(['auth', 'api']);
      expect(result.queryCount).toBe(1);
      expect(result.status).toBe(200);
    });
  });

  describe('parseTimeDuration', () => {
    it('parses minutes correctly', () => {
      expect(parseTimeDuration('30m')).toBe(30 * 60 * 1000);
      expect(parseTimeDuration('1m')).toBe(60 * 1000);
    });

    it('parses hours correctly', () => {
      expect(parseTimeDuration('1h')).toBe(60 * 60 * 1000);
      expect(parseTimeDuration('2h')).toBe(2 * 60 * 60 * 1000);
    });

    it('parses days correctly', () => {
      expect(parseTimeDuration('1d')).toBe(24 * 60 * 60 * 1000);
      expect(parseTimeDuration('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('parses weeks correctly', () => {
      expect(parseTimeDuration('1w')).toBe(7 * 24 * 60 * 60 * 1000);
      expect(parseTimeDuration('2w')).toBe(2 * 7 * 24 * 60 * 60 * 1000);
    });

    it('handles decimal values', () => {
      expect(parseTimeDuration('1.5h')).toBe(1.5 * 60 * 60 * 1000);
    });

    it('is case insensitive', () => {
      expect(parseTimeDuration('1H')).toBe(60 * 60 * 1000);
      expect(parseTimeDuration('30M')).toBe(30 * 60 * 1000);
    });

    it('returns null for invalid format', () => {
      expect(parseTimeDuration('invalid')).toBeNull();
      expect(parseTimeDuration('10')).toBeNull();
      expect(parseTimeDuration('10x')).toBeNull();
      expect(parseTimeDuration('')).toBeNull();
    });
  });

  describe('filterRequestsByScope', () => {
    it('returns specific request when requestId is provided', () => {
      const result = filterRequestsByScope({ requestId: 'req-1' }, getStorage());
      expect(result.ids).toEqual(['req-1']);
      expect(result.capped).toBe(false);
    });

    it('returns latest request by default', () => {
      const result = filterRequestsByScope({}, getStorage());
      expect(result.ids).toHaveLength(1);
    });

    it('respects count parameter', () => {
      const result = filterRequestsByScope({ count: 2 }, getStorage());
      expect(result.ids).toHaveLength(2);
    });

    it('filters by URI pattern', () => {
      const result = filterRequestsByScope({ uri: '/api/users', all: true }, getStorage());
      expect(result.ids).toHaveLength(2);
    });
  });
});

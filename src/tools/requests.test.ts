import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listRequests, getRequest, getLatestRequest, searchRequests } from './requests.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Request Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-requests-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create index
    const indexContent = [
      '1705312347-third\t1705312347\tPOST\t/api/users\tUserController@store\t201\t120\trequest',
      '1705312346-second\t1705312346\tGET\t/api/users\tUserController@index\t200\t45\trequest',
      '1705312345-first\t1705312345\tGET\t/\tHomeController@index\t200\t30\trequest',
    ].join('\n');
    writeFileSync(join(testDir, 'index'), indexContent);

    // Create request files
    writeFileSync(join(testDir, '1705312345-first.json'), JSON.stringify({
      id: '1705312345-first',
      type: 'request',
      time: 1705312345,
      method: 'GET',
      uri: '/',
      controller: 'HomeController@index',
      responseStatus: 200,
      responseDuration: 30,
    }));

    writeFileSync(join(testDir, '1705312346-second.json'), JSON.stringify({
      id: '1705312346-second',
      type: 'request',
      time: 1705312346,
      method: 'GET',
      uri: '/api/users',
      controller: 'UserController@index',
      responseStatus: 200,
      responseDuration: 45,
    }));

    writeFileSync(join(testDir, '1705312347-third.json'), JSON.stringify({
      id: '1705312347-third',
      type: 'request',
      time: 1705312347,
      method: 'POST',
      uri: '/api/users',
      controller: 'UserController@store',
      responseStatus: 201,
      responseDuration: 120,
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('listRequests', () => {
    it('returns all requests', () => {
      const result = listRequests(testDir, {});
      expect(result).toHaveLength(3);
    });

    it('filters by method', () => {
      const result = listRequests(testDir, { method: 'POST' });
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('POST');
    });

    it('filters by uri pattern', () => {
      const result = listRequests(testDir, { uri: '/api' });
      expect(result).toHaveLength(2);
    });

    it('respects limit', () => {
      const result = listRequests(testDir, { limit: 2 });
      expect(result).toHaveLength(2);
    });
  });

  describe('getRequest', () => {
    it('returns full request data', () => {
      const result = getRequest(testDir, '1705312345-first');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('1705312345-first');
      expect(result?.controller).toBe('HomeController@index');
    });

    it('returns null for non-existent request', () => {
      const result = getRequest(testDir, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getLatestRequest', () => {
    it('returns most recent request', () => {
      const result = getLatestRequest(testDir);
      expect(result?.id).toBe('1705312347-third');
    });
  });

  describe('searchRequests', () => {
    it('searches by controller', () => {
      const result = searchRequests(testDir, { controller: 'UserController' });
      expect(result).toHaveLength(2);
    });

    it('searches by min duration', () => {
      const result = searchRequests(testDir, { minDuration: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].responseDuration).toBe(120);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readRequest, requestExists } from './reader.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Request Reader', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-reader-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('requestExists', () => {
    it('returns true when request file exists', () => {
      writeFileSync(join(testDir, 'abc123.json'), '{}');
      expect(requestExists(testDir, 'abc123')).toBe(true);
    });

    it('returns false when request file does not exist', () => {
      expect(requestExists(testDir, 'nonexistent')).toBe(false);
    });
  });

  describe('readRequest', () => {
    it('reads and parses request JSON', () => {
      const request = {
        id: 'abc123',
        type: 'request',
        time: 1705312345,
        method: 'GET',
        uri: '/api/users',
        responseStatus: 200,
        responseDuration: 45.5,
        databaseQueries: [
          { query: 'SELECT * FROM users', duration: 5.2 }
        ],
      };

      writeFileSync(join(testDir, 'abc123.json'), JSON.stringify(request));

      const result = readRequest(testDir, 'abc123');

      expect(result).toEqual(request);
    });

    it('returns null when request does not exist', () => {
      const result = readRequest(testDir, 'nonexistent');
      expect(result).toBeNull();
    });

    it('handles malformed JSON gracefully', () => {
      writeFileSync(join(testDir, 'bad.json'), 'not valid json');

      expect(() => readRequest(testDir, 'bad')).toThrow();
    });
  });
});

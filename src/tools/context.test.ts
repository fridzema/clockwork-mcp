import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLogs, getEvents, getViews, getHttpRequests } from './context.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Context Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-context-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    writeFileSync(join(testDir, 'ctx-req.json'), JSON.stringify({
      id: 'ctx-req',
      type: 'request',
      time: 1705312345,
      log: [
        { level: 'debug', message: 'Debug message' },
        { level: 'info', message: 'Info message' },
        { level: 'warning', message: 'Warning message' },
        { level: 'error', message: 'Error message' },
      ],
      events: [
        { event: 'UserCreated', listeners: ['SendWelcomeEmail'] },
        { event: 'OrderPlaced', listeners: ['ProcessPayment', 'SendReceipt'] },
      ],
      views: [
        { name: 'layouts.app', duration: 10 },
        { name: 'users.index', duration: 5 },
      ],
      httpRequests: [
        { method: 'GET', url: 'https://api.example.com/users', duration: 150, responseStatus: 200 },
      ],
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getLogs', () => {
    it('returns all logs', () => {
      const result = getLogs(testDir, { requestId: 'ctx-req' });
      expect(result).toHaveLength(4);
    });

    it('filters by minimum level', () => {
      const result = getLogs(testDir, { requestId: 'ctx-req', level: 'warning' });
      expect(result).toHaveLength(2);
      expect(result.map(l => l.level)).toEqual(['warning', 'error']);
    });
  });

  describe('getEvents', () => {
    it('returns all events', () => {
      const result = getEvents(testDir, { requestId: 'ctx-req' });
      expect(result).toHaveLength(2);
      expect(result[0].event).toBe('UserCreated');
    });
  });

  describe('getViews', () => {
    it('returns all views', () => {
      const result = getViews(testDir, { requestId: 'ctx-req' });
      expect(result).toHaveLength(2);
    });
  });

  describe('getHttpRequests', () => {
    it('returns outgoing http requests', () => {
      const result = getHttpRequests(testDir, { requestId: 'ctx-req' });
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://api.example.com/users');
    });
  });
});

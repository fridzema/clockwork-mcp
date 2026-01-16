import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseIndex } from './index-parser.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Index Parser', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-index-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('parses HTTP request entries', () => {
    const indexContent = [
      '1705312345-abc123\t1705312345\tGET\t/api/users\tUserController@index\t200\t45.5\trequest',
      '1705312346-def456\t1705312346\tPOST\t/api/users\tUserController@store\t201\t120.3\trequest',
    ].join('\n');

    writeFileSync(join(testDir, 'index'), indexContent);

    const entries = parseIndex(testDir);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      id: '1705312346-def456',
      time: 1705312346,
      method: 'POST',
      uri: '/api/users',
      controller: 'UserController@store',
      responseStatus: 201,
      responseDuration: 120.3,
      type: 'request',
    });
  });

  it('parses command entries', () => {
    const indexContent = '1705312345-abc123\t1705312345\t\tmigrate\t\t0\t500\tcommand';
    writeFileSync(join(testDir, 'index'), indexContent);

    const entries = parseIndex(testDir);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      id: '1705312345-abc123',
      time: 1705312345,
      method: undefined,
      uri: undefined,
      controller: undefined,
      responseStatus: 0,
      responseDuration: 500,
      type: 'command',
      commandName: 'migrate',
    });
  });

  it('returns empty array when index does not exist', () => {
    const entries = parseIndex(testDir);
    expect(entries).toEqual([]);
  });

  it('returns entries in reverse chronological order', () => {
    const indexContent = [
      '1705312345-abc\t1705312345\tGET\t/first\t\t200\t10\trequest',
      '1705312347-ghi\t1705312347\tGET\t/third\t\t200\t10\trequest',
      '1705312346-def\t1705312346\tGET\t/second\t\t200\t10\trequest',
    ].join('\n');

    writeFileSync(join(testDir, 'index'), indexContent);

    const entries = parseIndex(testDir);

    expect(entries[0].uri).toBe('/third');
    expect(entries[1].uri).toBe('/second');
    expect(entries[2].uri).toBe('/first');
  });
});

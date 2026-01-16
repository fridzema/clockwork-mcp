import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listCommands, getCommand } from './commands.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Command Tools', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `clockwork-cmd-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create index with commands
    const indexContent = [
      'cmd-1\t1705312345\t\tmigrate\t\t0\t500\tcommand',
      'cmd-2\t1705312400\t\tdb:seed\t\t0\t1200\tcommand',
      'req-1\t1705312350\tGET\t/api/users\tUserController\t200\t50\trequest',
    ].join('\n');
    writeFileSync(join(testDir, 'index'), indexContent);

    writeFileSync(join(testDir, 'cmd-1.json'), JSON.stringify({
      id: 'cmd-1',
      type: 'command',
      time: 1705312345,
      commandName: 'migrate',
      commandArguments: {},
      commandOptions: { force: true },
      commandExitCode: 0,
      commandOutput: 'Migration completed successfully',
      databaseQueries: [
        { query: 'CREATE TABLE users', duration: 50 },
      ],
    }));

    writeFileSync(join(testDir, 'cmd-2.json'), JSON.stringify({
      id: 'cmd-2',
      type: 'command',
      time: 1705312400,
      commandName: 'db:seed',
      commandExitCode: 0,
    }));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('listCommands', () => {
    it('returns only command entries', () => {
      const result = listCommands(testDir, {});
      expect(result).toHaveLength(2);
      expect(result.every(e => e.type === 'command')).toBe(true);
    });

    it('filters by command name', () => {
      const result = listCommands(testDir, { name: 'migrate' });
      expect(result).toHaveLength(1);
      expect(result[0].commandName).toBe('migrate');
    });
  });

  describe('getCommand', () => {
    it('returns full command data', () => {
      const result = getCommand(testDir, { requestId: 'cmd-1' });
      expect(result).not.toBeNull();
      expect(result?.commandName).toBe('migrate');
      expect(result?.commandOutput).toBe('Migration completed successfully');
      expect(result?.databaseQueries).toHaveLength(1);
    });
  });
});

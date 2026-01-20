import type { Storage } from '../storage/storage.js';
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import type { ListCommandsInput, GetCommandInput } from '../types/tools.js';

/**
 * Lists profiled Artisan command executions.
 * @param storage - Storage interface
 * @param input - Filter by command name and time range
 * @returns Array of command index entries
 */
export function listCommands(storage: Storage, input: ListCommandsInput): IndexEntry[] {
  let entries = storage.list();

  // Filter to commands only
  entries = entries.filter((e) => e.type === 'command');

  if (input.name) {
    entries = entries.filter((e) => e.commandName?.includes(input.name!));
  }

  if (input.from !== undefined) {
    entries = entries.filter((e) => e.time >= input.from!);
  }

  if (input.to !== undefined) {
    entries = entries.filter((e) => e.time <= input.to!);
  }

  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

/**
 * Gets full details of an Artisan command execution.
 * @param storage - Storage interface
 * @param input - Command request ID
 * @returns Full command execution data or null if not found
 */
export function getCommand(storage: Storage, input: GetCommandInput): ClockworkRequest | null {
  return storage.find(input.requestId);
}

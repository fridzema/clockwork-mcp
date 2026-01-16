import { parseIndex } from '../storage/index-parser.js';
import { readRequest } from '../storage/reader.js';
import type { ClockworkRequest, IndexEntry } from '../types/clockwork.js';
import type { ListCommandsInput, GetCommandInput } from '../types/tools.js';

export function listCommands(storagePath: string, input: ListCommandsInput): IndexEntry[] {
  let entries = parseIndex(storagePath);

  // Filter to commands only
  entries = entries.filter(e => e.type === 'command');

  if (input.name) {
    entries = entries.filter(e => e.commandName?.includes(input.name!));
  }

  if (input.from !== undefined) {
    entries = entries.filter(e => e.time >= input.from!);
  }

  if (input.to !== undefined) {
    entries = entries.filter(e => e.time <= input.to!);
  }

  const offset = input.offset ?? 0;
  const limit = input.limit ?? 20;

  return entries.slice(offset, offset + limit);
}

export function getCommand(storagePath: string, input: GetCommandInput): ClockworkRequest | null {
  return readRequest(storagePath, input.requestId);
}

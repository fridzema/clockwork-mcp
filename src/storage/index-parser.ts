import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { IndexEntry, RequestType } from '../types/clockwork.js';

export function parseIndex(storagePath: string): IndexEntry[] {
  const indexPath = join(storagePath, 'index');

  if (!existsSync(indexPath)) {
    return [];
  }

  const content = readFileSync(indexPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  const entries: IndexEntry[] = lines.map(line => {
    const parts = line.split('\t');
    const type = parts[7] as RequestType;

    const entry: IndexEntry = {
      id: parts[0],
      time: parseFloat(parts[1]),
      type,
      responseStatus: parts[5] ? parseInt(parts[5], 10) : undefined,
      responseDuration: parts[6] ? parseFloat(parts[6]) : undefined,
    };

    if (type === 'command') {
      entry.commandName = parts[3] || undefined;
    } else {
      entry.method = parts[2] || undefined;
      entry.uri = parts[3] || undefined;
      entry.controller = parts[4] || undefined;
    }

    return entry;
  });

  // Sort by time descending (most recent first)
  return entries.sort((a, b) => b.time - a.time);
}

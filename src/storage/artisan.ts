import { execSync } from 'child_process';
import type { ClockworkRequest } from '../types/clockwork.js';

export interface ArtisanOptions {
  phpPath?: string;
  timeout?: number;
}

/**
 * Executes PHP code via artisan tinker and returns parsed JSON result.
 * @param projectPath - Path to Laravel project root
 * @param phpCode - PHP code to execute (should echo JSON)
 * @param options - Execution options
 * @returns Parsed JSON result
 */
export function executePhp<T = unknown>(
  projectPath: string,
  phpCode: string,
  options: ArtisanOptions = {}
): T {
  const phpBinary = options.phpPath ?? 'php';
  const timeout = options.timeout ?? 30000;

  // Escape the PHP code for shell execution
  const escapedCode = phpCode.replace(/'/g, "'\\''");
  const command = `${phpBinary} artisan tinker --execute='${escapedCode}'`;

  let output: string;
  try {
    output = execSync(command, {
      cwd: projectPath,
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === 'ENOENT') {
      throw new Error(
        `PHP executable not found. Ensure PHP is installed and in PATH, or set CLOCKWORK_PHP_PATH.`
      );
    }
    if (err.message.includes('Could not open input file: artisan')) {
      throw new Error(
        `Laravel artisan not found at ${projectPath}. Ensure this is a Laravel project root.`
      );
    }
    throw new Error(`PHP execution failed: ${err.message}`);
  }

  // Check for Clockwork not installed
  if (output.includes('Target class [clockwork] does not exist')) {
    throw new Error(
      'Clockwork is not installed in the Laravel project. Run: composer require itsgoingd/clockwork'
    );
  }

  // Find JSON in output (tinker may output extra lines)
  const lines = output.trim().split('\n');
  const jsonLine = lines.find((line) => line.startsWith('{') || line.startsWith('[') || line === 'null');

  if (!jsonLine) {
    throw new Error(`No JSON output from PHP execution. Output: ${output}`);
  }

  return JSON.parse(jsonLine) as T;
}

/**
 * Fetches a single Clockwork request by ID via artisan tinker.
 * @param projectPath - Path to Laravel project root
 * @param requestId - Clockwork request ID
 * @param options - Execution options
 * @returns Request data or null if not found
 */
export function getRequestViaArtisan(
  projectPath: string,
  requestId: string,
  options: ArtisanOptions = {}
): ClockworkRequest | null {
  const phpCode = `echo json_encode(app('clockwork')->storage()->find('${requestId}')?->toArray());`;
  return executePhp<ClockworkRequest | null>(projectPath, phpCode, options);
}

/**
 * Fetches the most recent Clockwork request via artisan tinker.
 * @param projectPath - Path to Laravel project root
 * @param options - Execution options
 * @returns Latest request data or null if none exist
 */
export function getLatestRequestViaArtisan(
  projectPath: string,
  options: ArtisanOptions = {}
): ClockworkRequest | null {
  const phpCode = `echo json_encode(app('clockwork')->storage()->latest()?->toArray());`;
  return executePhp<ClockworkRequest | null>(projectPath, phpCode, options);
}

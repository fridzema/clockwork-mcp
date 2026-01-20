import { execSync } from 'child_process';

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

  const output = execSync(command, {
    cwd: projectPath,
    timeout,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Tinker may output extra lines, find the JSON
  const lines = output.trim().split('\n');
  const jsonLine = lines.find((line) => line.startsWith('{') || line.startsWith('['));

  if (!jsonLine) {
    throw new Error(`No JSON output from PHP execution. Output: ${output}`);
  }

  return JSON.parse(jsonLine) as T;
}

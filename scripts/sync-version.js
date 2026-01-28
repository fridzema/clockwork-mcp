#!/usr/bin/env node

/**
 * Syncs version from package.json to plugin metadata files.
 * Run before publishing to ensure all version numbers are consistent.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;

console.log(`Syncing version ${version} to plugin metadata files...`);

// Update .claude-plugin/plugin.json
const pluginJsonPath = join(rootDir, '.claude-plugin', 'plugin.json');
const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
if (pluginJson.version !== version) {
  pluginJson.version = version;
  writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2) + '\n');
  console.log(`  Updated .claude-plugin/plugin.json to ${version}`);
} else {
  console.log(`  .claude-plugin/plugin.json already at ${version}`);
}

// Update .claude-plugin/marketplace.json
const marketplaceJsonPath = join(rootDir, '.claude-plugin', 'marketplace.json');
const marketplaceJson = JSON.parse(readFileSync(marketplaceJsonPath, 'utf8'));
let marketplaceUpdated = false;
for (const plugin of marketplaceJson.plugins || []) {
  if (plugin.version !== version) {
    plugin.version = version;
    marketplaceUpdated = true;
  }
}
if (marketplaceUpdated) {
  writeFileSync(marketplaceJsonPath, JSON.stringify(marketplaceJson, null, 2) + '\n');
  console.log(`  Updated .claude-plugin/marketplace.json to ${version}`);
} else {
  console.log(`  .claude-plugin/marketplace.json already at ${version}`);
}

console.log('Version sync complete!');

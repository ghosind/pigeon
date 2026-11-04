/**
 * Validates that both translation catalogs are complete and in sync:
 * - en.json and zh-CN.json must contain exactly the same keys;
 * - every string passed to t('...') must exist in both catalogs;
 * - catalog values must not be empty.
 * Dictionaries live in src/renderer/src/i18n/locales/*.json.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const localeDir = join(root, 'src/renderer/src/i18n/locales');

function readLocale(name) {
  try {
    return JSON.parse(readFileSync(join(localeDir, name), 'utf8'));
  } catch (error) {
    console.error(`Failed to read ${name}: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}

const dictionaries = { en: readLocale('en.json'), 'zh-CN': readLocale('zh-CN.json') };
const keys = new Set(Object.keys(dictionaries['zh-CN']));

for (const [name, dictionary] of Object.entries(dictionaries)) {
  const empty = Object.entries(dictionary)
    .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
    .map(([key]) => key);
  if (empty.length > 0) {
    console.error(`Empty translations in ${name}: ${empty.join(', ')}`);
    process.exit(1);
  }
}

const missingInZh = Object.keys(dictionaries.en).filter((key) => !keys.has(key));
const missingInEn = [...keys].filter((key) => !(key in dictionaries.en));
if (missingInZh.length > 0 || missingInEn.length > 0) {
  if (missingInZh.length > 0) {
    console.error(`Keys present in en.json but missing from zh-CN.json (${missingInZh.length}):`);
    for (const key of missingInZh) console.error(`  - ${key}`);
  }
  if (missingInEn.length > 0) {
    console.error(`Keys present in zh-CN.json but missing from en.json (${missingInEn.length}):`);
    for (const key of missingInEn) console.error(`  - ${key}`);
  }
  process.exit(1);
}

const used = new Set();
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const target = join(directory, entry);
    const info = statSync(target);
    if (info.isDirectory()) {
      if (!['node_modules', 'out', 'release', 'docs'].includes(entry)) walk(target);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry) || target.includes('/i18n/')) continue;
    const content = readFileSync(target, 'utf8');
    for (const match of content.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) used.add(match[1]);
    for (const match of content.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) used.add(match[1]);
  }
}

walk(join(root, 'src'));

const missingUsage = [...used].filter((key) => !(key in dictionaries.en) || !(key in dictionaries['zh-CN'])).sort();
if (missingUsage.length > 0) {
  console.error(`Missing ${missingUsage.length} translation key(s) used by the UI:`);
  for (const key of missingUsage) console.error(`  - ${key}`);
  process.exit(1);
}

console.log(`i18n validation passed: ${keys.size} keys in both catalogs, ${used.size} used.`);

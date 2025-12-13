import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '../package.json');
const entryPath = path.resolve(__dirname, '../src/index.ts');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const { version } = packageJson;

if (!version) {
  console.error('[Reagent] Missing version field in package.json');
  process.exit(1);
}

const source = readFileSync(entryPath, 'utf8');
const versionPattern = /(\.version\(\s*['"])([^'"]+)(['"]\s*\))/;

if (!versionPattern.test(source)) {
  console.error('[Reagent] Could not find program.version(...) in src/index.ts');
  process.exit(1);
}

const updatedSource = source.replace(versionPattern, (_, prefix, _currentVersion, suffix) => {
  return `${prefix}${version}${suffix}`;
});

if (source === updatedSource) {
  console.error('[Reagent] CLI version already up to date');
  process.exit(0);
}

writeFileSync(entryPath, updatedSource);
console.error(`[Reagent] CLI version updated to ${version}`);

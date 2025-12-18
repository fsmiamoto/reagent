import * as esbuild from 'esbuild';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

// Recursively get all .ts files from src directory
function getEntryPoints(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    if (statSync(fullPath).isDirectory()) {
      getEntryPoints(fullPath, files);
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Get all .js files from output directory
function getJsFiles(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    if (statSync(fullPath).isDirectory()) {
      getJsFiles(fullPath, files);
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Add .js extensions to relative imports in output files
function addJsExtensionsToOutputs(outdir) {
  const files = getJsFiles(outdir);

  for (const file of files) {
    let content = readFileSync(file, 'utf8');

    // Add .js to relative imports that don't have an extension
    content = content.replace(
      /from\s+(['"])(\.\.[\/\w\-\.]*|\.\/[\w\-\/\.]*)\1/g,
      (match, quote, path) => {
        // Don't modify if it already has .js extension
        if (path.endsWith('.js')) return match;
        // Add .js extension
        return `from ${quote}${path}.js${quote}`;
      }
    );

    // Also handle export from statements
    content = content.replace(
      /export\s+\{[^}]+\}\s+from\s+(['"])(\.\.[\/\w\-\.]*|\.\/[\w\-\/\.]*)\1/g,
      (match, quote, path) => {
        if (path.endsWith('.js')) return match;
        return match.replace(path, path + '.js');
      }
    );

    writeFileSync(file, content, 'utf8');
  }
}

const entryPoints = getEntryPoints('src');

await esbuild.build({
  entryPoints,
  outdir: 'dist',
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  outExtension: { '.js': '.js' },
  // Keep individual files (no bundling) for easier debugging
  bundle: false,
  // Preserve directory structure
  outbase: 'src',
});

// Post-process to add .js extensions to imports
addJsExtensionsToOutputs('dist');

console.log('Build complete!');

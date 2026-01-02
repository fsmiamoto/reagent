#!/usr/bin/env bun
/**
 * Build script using Bun's native build API
 * Replaces esbuild.config.mjs
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Recursively get all .ts files from src directory
function getEntryPoints(dir: string, files: string[] = []): string[] {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    if (statSync(fullPath).isDirectory()) {
      getEntryPoints(fullPath, files);
    } else if (item.endsWith(".ts") && !item.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

// Get all .js files from output directory
function getJsFiles(dir: string, files: string[] = []): string[] {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    if (statSync(fullPath).isDirectory()) {
      getJsFiles(fullPath, files);
    } else if (item.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

// Add .js extensions to relative imports in output files
function addJsExtensionsToOutputs(outdir: string) {
  const files = getJsFiles(outdir);

  for (const file of files) {
    let content = readFileSync(file, "utf8");

    // Add .js to relative imports that don't have an extension
    content = content.replace(
      /from\s+(['"])(\.\.[\/\w\-\.]*|\.\/[\w\-\/\.]*)\1/g,
      (match, quote, path) => {
        // Don't modify if it already has .js extension
        if (path.endsWith(".js")) return match;
        // Add .js extension
        return `from ${quote}${path}.js${quote}`;
      }
    );

    // Also handle export from statements
    content = content.replace(
      /export\s+\{[^}]+\}\s+from\s+(['"])(\.\.[\/\w\-\.]*|\.\/[\w\-\/\.]*)\1/g,
      (match, quote, path) => {
        if (path.endsWith(".js")) return match;
        return match.replace(path, path + ".js");
      }
    );

    writeFileSync(file, content, "utf8");
  }
}

const entryPoints = getEntryPoints("src");

const result = await Bun.build({
  entrypoints: entryPoints,
  outdir: "dist",
  format: "esm",
  target: "node",
  sourcemap: "external",
  root: "src",
  minify: false,
  splitting: false,
});

if (!result.success) {
  console.error("Build failed:");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

// Post-process to add .js extensions to imports
addJsExtensionsToOutputs("dist");

console.log("Build complete!");

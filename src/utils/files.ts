import { readFileSync, existsSync, statSync } from 'fs';
import * as path from 'path';
import type { ReviewFile } from '../shared/types';

/**
 * Get the language/file extension from a file path
 * Duplicated from git.ts - ideally should be shared
 */
function getLanguageFromPath(filePath: string): string | undefined {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const languageMap: Record<string, string> = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        rb: 'ruby',
        go: 'go',
        rs: 'rust',
        java: 'java',
        c: 'c',
        cpp: 'cpp',
        cs: 'csharp',
        php: 'php',
        swift: 'swift',
        kt: 'kotlin',
        md: 'markdown',
        json: 'json',
        yaml: 'yaml',
        yml: 'yaml',
        html: 'html',
        css: 'css',
        scss: 'scss',
        sql: 'sql',
        sh: 'shell',
        bash: 'shell',
    };
    return languageMap[ext] || ext;
}

/**
 * Get review files from local filesystem
 */
export function getLocalFiles(files: string[], cwd?: string): ReviewFile[] {
    const workingDir = cwd || process.cwd();
    const reviewFiles: ReviewFile[] = [];

    for (const filePath of files) {
        const fullPath = path.join(workingDir, filePath);

        if (!existsSync(fullPath)) {
            console.warn(`[Reagent] File not found: ${fullPath}`);
            continue;
        }

        const stats = statSync(fullPath);
        if (!stats.isFile()) {
            console.warn(`[Reagent] Not a file: ${fullPath}`);
            continue;
        }

        try {
            const content = readFileSync(fullPath, 'utf-8');

            reviewFiles.push({
                path: filePath,
                content,
                // For local files, we don't have "old content" unless we want to try to read from git
                // For now, we treat them as "new" files (added)
                oldContent: undefined,
                language: getLanguageFromPath(filePath),
            });
        } catch (error) {
            console.error(`[Reagent] Failed to read file ${fullPath}:`, error);
        }
    }

    return reviewFiles;
}

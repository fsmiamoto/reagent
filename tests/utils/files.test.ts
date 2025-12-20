import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import { getLocalFiles } from '@src/files/files';

describe('getLocalFiles', () => {
    let tempDir: string;

    beforeEach(() => {
        const tmpBase = process.env.TMPDIR || '/tmp';
        tempDir = mkdtempSync(path.join(tmpBase, 'reagent-test-files-'));
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('should read existing files correctly', () => {
        const filePath = path.join(tempDir, 'test.ts');
        const content = 'console.log("hello");';
        writeFileSync(filePath, content);

        const result = getLocalFiles(['test.ts'], tempDir);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            path: 'test.ts',
            content,
            oldContent: undefined,
            language: 'typescript',
        });
    });

    it('should handle non-existent files gracefully', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const result = getLocalFiles(['non-existent.ts'], tempDir);

        expect(result).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('File not found'));
    });

    it('should skip directories', () => {
        const dirPath = path.join(tempDir, 'subdir');
        mkdirSync(dirPath);
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const result = getLocalFiles(['subdir'], tempDir);

        expect(result).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Not a file'));
    });

    it('should detect languages correctly', () => {
        const files = {
            'test.py': 'print("hello")',
            'test.md': '# Hello',
            'test.json': '{}',
            'test.unknown': 'content'
        };

        for (const [name, content] of Object.entries(files)) {
            writeFileSync(path.join(tempDir, name), content);
        }

        const result = getLocalFiles(Object.keys(files), tempDir);

        const langMap = new Map(result.map(f => [f.path, f.language]));
        expect(langMap.get('test.py')).toBe('python');
        expect(langMap.get('test.md')).toBe('markdown');
        expect(langMap.get('test.json')).toBe('json');
        expect(langMap.get('test.unknown')).toBe('unknown');
    });
});

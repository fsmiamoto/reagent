import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';
import { getReviewFilesFromGit } from '@src/utils/git.js';

describe('getReviewFilesFromGit', () => {
  let tempDir: string;

  beforeEach(() => {
    const tmpBase = process.env.TMPDIR || '/tmp';
    tempDir = mkdtempSync(path.join(tmpBase, 'reagent-test-'));

    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle untracked files in nested directories', () => {
    // Arrange
    mkdirSync(path.join(tempDir, 'tmp', 'nested'), { recursive: true });
    writeFileSync(path.join(tempDir, 'tmp', 'nested', 'file.ts'), 'export const nested = 1;\n');

    // Act
    const result = getReviewFilesFromGit({
      source: 'uncommitted',
      workingDirectory: tempDir,
    });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      path: 'tmp/nested/file.ts',
      content: 'export const nested = 1;\n',
      language: 'typescript',
    });
    expect(result[0].oldContent).toBeUndefined();
  });

  it('should preserve empty untracked files', () => {
    // Arrange
    writeFileSync(path.join(tempDir, 'empty.txt'), '');

    // Act
    const result = getReviewFilesFromGit({
      source: 'uncommitted',
      workingDirectory: tempDir,
    });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      path: 'empty.txt',
      content: '',
      language: 'txt',
    });
    expect(result[0].oldContent).toBeUndefined();
  });

  it('should include modified tracked files alongside new files', () => {
    // Arrange
    writeFileSync(path.join(tempDir, 'existing.ts'), 'export const original = 1;\n');
    execSync('git add existing.ts', { cwd: tempDir, stdio: 'ignore' });
    execSync('git commit -m "initial commit"', { cwd: tempDir, stdio: 'ignore' });
    writeFileSync(path.join(tempDir, 'existing.ts'), 'export const modified = 2;\n');

    mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    writeFileSync(path.join(tempDir, 'src', 'new.ts'), 'export const newFile = 3;\n');

    // Act
    const result = getReviewFilesFromGit({
      source: 'uncommitted',
      workingDirectory: tempDir,
    });

    // Assert
    expect(result).toHaveLength(2);

    const existingFile = result.find(f => f.path === 'existing.ts');
    expect(existingFile).toBeDefined();
    expect(existingFile?.content).toBe('export const modified = 2;\n');
    expect(existingFile?.oldContent).toBe('export const original = 1;\n');

    const newFile = result.find(f => f.path === 'src/new.ts');
    expect(newFile).toBeDefined();
    expect(newFile?.content).toBe('export const newFile = 3;\n');
    expect(newFile?.oldContent).toBeUndefined();
  });

  it('should handle multiple nested levels correctly', () => {
    // Arrange

    mkdirSync(path.join(tempDir, 'a', 'b', 'c'), { recursive: true });
    writeFileSync(path.join(tempDir, 'a', 'b', 'c', 'd.ts'), 'deep content\n');
    writeFileSync(path.join(tempDir, 'a', 'file.ts'), 'shallow content\n');

    // Act
    const result = getReviewFilesFromGit({
      source: 'uncommitted',
      workingDirectory: tempDir,
    });

    // Assert
    expect(result).toHaveLength(2);
    const paths = result.map((f) => f.path).sort();
    expect(paths).toEqual(['a/b/c/d.ts', 'a/file.ts']);
  });

  it('should not include directory placeholders', () => {
    // Arrange
    mkdirSync(path.join(tempDir, 'dir'), { recursive: true });
    writeFileSync(path.join(tempDir, 'dir', 'file.ts'), 'file content\n');

    // Act
    const result = getReviewFilesFromGit({
      source: 'uncommitted',
      workingDirectory: tempDir,
    });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('dir/file.ts');
  });

  it('should respect the file filtering when untracked files are nested', () => {
    // Arrange
    mkdirSync(path.join(tempDir, 'feature', 'subdir'), { recursive: true });
    mkdirSync(path.join(tempDir, 'other'), { recursive: true });
    writeFileSync(path.join(tempDir, 'feature', 'subdir', 'new.ts'), 'new content\n');
    writeFileSync(path.join(tempDir, 'other', 'file.ts'), 'other content\n');

    // Act: Get only files from 'feature' directory
    const result = getReviewFilesFromGit({
      source: 'uncommitted',
      workingDirectory: tempDir,
      files: ['feature'],
    });

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('feature/subdir/new.ts');
  });
});

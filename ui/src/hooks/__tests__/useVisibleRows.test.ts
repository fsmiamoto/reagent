import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useVisibleRows } from '../useVisibleRows';
import { DiffRow } from '../useDiff';
import { ReviewFile } from '../../types';

const mockFile: ReviewFile = {
    path: 'test.txt',
    content: 'content',
    oldContent: 'old content',
    language: 'text',
};

const createDiffRows = (count: number): DiffRow[] => {
    return Array.from({ length: count }, (_, i) => ({
        type: 'unchanged',
        content: `line ${i + 1}`,
        oldLineNumber: i + 1,
        newLineNumber: i + 1,
    }));
};

describe('useVisibleRows', () => {
    it('should show all lines when showAllLines is true', () => {
        const diffRows = createDiffRows(10);
        const { result } = renderHook(() => useVisibleRows({
            diffRows,
            showAllLines: true,
            comments: [],
            file: mockFile,
        }));

        expect(result.current).toHaveLength(10);
    });

    it('should show first 5 lines if no changes or comments', () => {
        const diffRows = createDiffRows(10);
        const { result } = renderHook(() => useVisibleRows({
            diffRows,
            showAllLines: false,
            comments: [],
            file: mockFile,
        }));
        expect(result.current).toHaveLength(5);
    });

    it('should respect defaultVisibleLines prop', () => {
        const diffRows = createDiffRows(10);
        const { result } = renderHook(() => useVisibleRows({
            diffRows,
            showAllLines: false,
            comments: [],
            file: mockFile,
            defaultVisibleLines: 3,
        }));

        expect(result.current).toHaveLength(3);
    });

    it('should show context around changes', () => {
        const diffRows = createDiffRows(10);
        // Make line 5 added
        diffRows[4] = { type: 'added', content: 'new line', newLineNumber: 5 };

        const { result } = renderHook(() => useVisibleRows({
            diffRows,
            showAllLines: false,
            comments: [],
            file: mockFile,
            contextLines: 1,
        }));

        const visibleLines = result.current.map(r => r.content);
        expect(visibleLines).toContain('line 4');
        expect(visibleLines).toContain('new line');
        expect(visibleLines).toContain('line 6');
    });

    it('should show context around comments', () => {
        const diffRows = createDiffRows(10);
        const { result } = renderHook(() => useVisibleRows({
            diffRows,
            showAllLines: false,
            comments: [{
                id: '1',
                filePath: 'test.txt',
                startLine: 5,
                endLine: 5,
                side: 'new' as const,
                text: 'comment',
                createdAt: new Date().toISOString(),
            }],
            file: mockFile,
            contextLines: 1,
        }));

        // Comment is on line 5 (index 4). Context 1 -> indices 3, 4, 5.
        const visibleLines = result.current.map(r => r.content);
        expect(visibleLines).toContain('line 4');
        expect(visibleLines).toContain('line 5');
        expect(visibleLines).toContain('line 6');
    });
});

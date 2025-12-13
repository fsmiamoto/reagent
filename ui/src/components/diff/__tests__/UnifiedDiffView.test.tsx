import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UnifiedDiffView } from '../UnifiedDiffView';
import { DiffRow } from '../../../hooks/useDiff';

// Mock CodeLine
vi.mock('../CodeLine', () => ({
    CodeLine: ({ content }: { content: string }) => <span data-testid="code-line">{content}</span>
}));

const mockDiffRows: DiffRow[] = [
    { type: 'unchanged', content: 'line 1', oldLineNumber: 1, newLineNumber: 1 },
    { type: 'added', content: 'line 2', newLineNumber: 2 },
    { type: 'removed', content: 'line 3', oldLineNumber: 2 },
];

describe('UnifiedDiffView', () => {
    const defaultProps = {
        diffRows: mockDiffRows,
        oldTokens: [],
        newTokens: [],
        visibleRows: mockDiffRows,
        comments: [],
        commentingRange: null,
        onSelectionComplete: vi.fn(),
        showAllLines: true,
        onShowMore: vi.fn(),
        filePath: 'test.ts',
        onDeleteComment: vi.fn(),
        onAddComment: vi.fn(),
        onCancelComment: vi.fn(),
    };

    it('should render diff rows', () => {
        render(<UnifiedDiffView {...defaultProps} />);

        expect(screen.getByText('line 1')).toBeDefined();
        expect(screen.getByText('line 2')).toBeDefined();
        expect(screen.getByText('line 3')).toBeDefined();
    });

    it('should handle line click for commenting on new side', () => {
        render(<UnifiedDiffView {...defaultProps} />);

        const buttons = screen.getAllByTitle('Add comment');
        fireEvent.click(buttons[0]);

        // First row is unchanged with newLineNumber, so side is 'new'
        expect(defaultProps.onSelectionComplete).toHaveBeenCalledWith({ startLine: 1, endLine: 1, side: 'new' });
    });

    it('should show comment input when commentingRange matches', () => {
        render(<UnifiedDiffView {...defaultProps} commentingRange={{ startLine: 1, endLine: 1, side: 'new' }} />);

        expect(screen.getByPlaceholderText('Write a comment...')).toBeDefined();
    });

    it('should show comments on new side', () => {
        const comments = [{
            id: '1',
            filePath: 'test.ts',
            startLine: 1,
            endLine: 1,
            side: 'new' as const,
            text: 'Test comment',
            createdAt: new Date().toISOString(),
        }];

        render(<UnifiedDiffView {...defaultProps} comments={comments} />);

        expect(screen.getByText('Test comment')).toBeDefined();
    });

    it('should allow commenting on removed lines (old side)', () => {
        const onSelectionComplete = vi.fn();
        render(<UnifiedDiffView {...defaultProps} onSelectionComplete={onSelectionComplete} />);

        // The third button should be for the removed line
        const buttons = screen.getAllByTitle('Add comment');
        fireEvent.click(buttons[2]); // removed line is at index 2

        expect(onSelectionComplete).toHaveBeenCalledWith({ startLine: 2, endLine: 2, side: 'old' });
    });

    it('should show comments on removed lines', () => {
        const comments = [{
            id: '1',
            filePath: 'test.ts',
            startLine: 2,
            endLine: 2,
            side: 'old' as const,
            text: 'Why removing this?',
            createdAt: new Date().toISOString(),
        }];

        render(<UnifiedDiffView {...defaultProps} comments={comments} />);

        expect(screen.getByText('Why removing this?')).toBeDefined();
    });
});

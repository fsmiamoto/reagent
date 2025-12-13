import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SplitDiffView } from '../SplitDiffView';
import { DiffRow } from '../../../hooks/useDiff';

// Mock CodeLine to avoid complex token rendering in tests
vi.mock('../CodeLine', () => ({
    CodeLine: ({ content }: { content: string }) => <span data-testid="code-line">{content}</span>
}));

const mockDiffRows: DiffRow[] = [
    { type: 'unchanged', content: 'line 1', oldLineNumber: 1, newLineNumber: 1 },
    { type: 'added', content: 'line 2', newLineNumber: 2 },
    { type: 'removed', content: 'line 3', oldLineNumber: 2 },
];

describe('SplitDiffView', () => {
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
        render(<SplitDiffView {...defaultProps} />);

        expect(screen.getAllByText('line 1')).toBeDefined();
        expect(screen.getByText('line 2')).toBeDefined();
        expect(screen.getByText('line 3')).toBeDefined();
    });

    it('should handle line click for commenting', () => {
        render(<SplitDiffView {...defaultProps} />);

        const buttons = screen.getAllByTitle('Add comment');
        fireEvent.click(buttons[0]);

        expect(defaultProps.onSelectionComplete).toHaveBeenCalledWith({ startLine: 1, endLine: 1 });
    });

    it('should show comment input when commentingRange matches', () => {
        render(<SplitDiffView {...defaultProps} commentingRange={{ startLine: 1, endLine: 1 }} />);

        expect(screen.getByPlaceholderText('Write a comment...')).toBeDefined();
    });

    it('should show comments', () => {
        const comments = [{
            id: '1',
            filePath: 'test.ts',
            startLine: 1,
            endLine: 1,
            text: 'Test comment',
            createdAt: new Date().toISOString(),
        }];

        render(<SplitDiffView {...defaultProps} comments={comments} />);

        expect(screen.getByText('Test comment')).toBeDefined();
    });
});


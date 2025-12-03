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
        commentingLine: null,
        onLineClick: vi.fn(),
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

    it('should handle line click for commenting', () => {
        render(<UnifiedDiffView {...defaultProps} />);

        const buttons = screen.getAllByTitle('Add comment');
        fireEvent.click(buttons[0]);

        expect(defaultProps.onLineClick).toHaveBeenCalledWith(1);
    });

    it('should show comment input when commentingLine matches', () => {
        render(<UnifiedDiffView {...defaultProps} commentingLine={1} />);

        expect(screen.getByPlaceholderText('Write a comment...')).toBeDefined();
    });

    it('should show comments', () => {
        const comments = [{
            id: '1',
            filePath: 'test.ts',
            lineNumber: 1,
            text: 'Test comment',
            createdAt: new Date().toISOString(),
        }];

        render(<UnifiedDiffView {...defaultProps} comments={comments} />);

        expect(screen.getByText('Test comment')).toBeDefined();
    });
});

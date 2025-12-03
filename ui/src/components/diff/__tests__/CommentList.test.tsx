import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CommentList } from '../CommentList';

describe('CommentList', () => {
    const mockComments = [
        {
            id: '1',
            filePath: 'test.ts',
            lineNumber: 10,
            text: 'Comment 1',
            createdAt: new Date().toISOString(),
        },
        {
            id: '2',
            filePath: 'test.ts',
            lineNumber: 10,
            text: 'Comment 2',
            createdAt: new Date().toISOString(),
        },
        {
            id: '3',
            filePath: 'other.ts',
            lineNumber: 10,
            text: 'Comment 3',
            createdAt: new Date().toISOString(),
        },
    ];

    it('should render comments for specific line', () => {
        render(
            <CommentList
                comments={mockComments}
                lineNumber={10}
                filePath="test.ts"
                onDeleteComment={vi.fn()}
            />
        );

        expect(screen.getByText('Comment 1')).toBeDefined();
        expect(screen.getByText('Comment 2')).toBeDefined();
        expect(screen.queryByText('Comment 3')).toBeNull();
    });

    it('should handle delete', () => {
        const onDeleteComment = vi.fn();
        render(
            <CommentList
                comments={mockComments}
                lineNumber={10}
                filePath="test.ts"
                onDeleteComment={onDeleteComment}
            />
        );

        const deleteButtons = screen.getAllByTitle('Delete comment');
        fireEvent.click(deleteButtons[0]);

        expect(onDeleteComment).toHaveBeenCalledWith('1');
    });

    it('should render nothing if no comments for line', () => {
        const { container } = render(
            <CommentList
                comments={mockComments}
                lineNumber={99}
                filePath="test.ts"
                onDeleteComment={vi.fn()}
            />
        );

        expect(container.firstChild).toBeNull();
    });
});

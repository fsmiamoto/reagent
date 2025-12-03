import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CommentInput } from '../CommentInput';

describe('CommentInput', () => {
    it('should render input', () => {
        render(<CommentInput onCancel={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.getByPlaceholderText('Write a comment...')).toBeDefined();
    });

    it('should handle submit', async () => {
        const onSubmit = vi.fn();
        render(<CommentInput onCancel={vi.fn()} onSubmit={onSubmit} />);

        const input = screen.getByPlaceholderText('Write a comment...');
        fireEvent.change(input, { target: { value: 'Test comment' } });

        const submitButton = screen.getByText('Add comment');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith('Test comment');
        });
    });

    it('should handle cancel', () => {
        const onCancel = vi.fn();
        render(<CommentInput onCancel={onCancel} onSubmit={vi.fn()} />);

        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        expect(onCancel).toHaveBeenCalled();
    });

    it('should disable submit when empty', () => {
        render(<CommentInput onCancel={vi.fn()} onSubmit={vi.fn()} />);

        const submitButton = screen.getByText('Add comment');
        expect(submitButton.hasAttribute('disabled')).toBe(true);
    });
});

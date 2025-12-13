import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDragSelection } from '../useDragSelection';

describe('useDragSelection', () => {
    it('should start with no selection', () => {
        const onSelectionComplete = vi.fn();
        const { result } = renderHook(() => useDragSelection({ onSelectionComplete }));

        expect(result.current.isDragging).toBe(false);
        expect(result.current.selection).toBeNull();
    });

    it('should track selection during drag with side', () => {
        const onSelectionComplete = vi.fn();
        const { result } = renderHook(() => useDragSelection({ onSelectionComplete }));

        act(() => {
            result.current.handlers.onMouseDown(5, 'new');
        });

        expect(result.current.isDragging).toBe(true);
        expect(result.current.selection).toEqual({ startLine: 5, endLine: 5, side: 'new' });

        act(() => {
            result.current.handlers.onMouseEnter(7, 'new');
        });

        expect(result.current.selection).toEqual({ startLine: 5, endLine: 7, side: 'new' });
    });

    it('should track selection on old side for removed lines', () => {
        const onSelectionComplete = vi.fn();
        const { result } = renderHook(() => useDragSelection({ onSelectionComplete }));

        act(() => {
            result.current.handlers.onMouseDown(3, 'old');
        });

        expect(result.current.isDragging).toBe(true);
        expect(result.current.selection).toEqual({ startLine: 3, endLine: 3, side: 'old' });

        act(() => {
            result.current.handlers.onMouseEnter(5, 'old');
        });

        expect(result.current.selection).toEqual({ startLine: 3, endLine: 5, side: 'old' });
    });

    it('should not extend selection across different sides', () => {
        const onSelectionComplete = vi.fn();
        const { result } = renderHook(() => useDragSelection({ onSelectionComplete }));

        act(() => {
            result.current.handlers.onMouseDown(5, 'new');
        });

        expect(result.current.selection).toEqual({ startLine: 5, endLine: 5, side: 'new' });

        // Try to enter a line on the old side - should not update
        act(() => {
            result.current.handlers.onMouseEnter(3, 'old');
        });

        // Selection should remain unchanged
        expect(result.current.selection).toEqual({ startLine: 5, endLine: 5, side: 'new' });
    });

    it('should call onSelectionComplete with side on mouseUp', () => {
        const onSelectionComplete = vi.fn();
        const { result } = renderHook(() => useDragSelection({ onSelectionComplete }));

        act(() => {
            result.current.handlers.onMouseDown(5, 'new');
            result.current.handlers.onMouseEnter(8, 'new');
        });

        act(() => {
            result.current.handlers.onMouseUp();
        });

        expect(onSelectionComplete).toHaveBeenCalledWith({ startLine: 5, endLine: 8, side: 'new' });
        expect(result.current.isDragging).toBe(false);
        expect(result.current.selection).toBeNull();
    });

    it('should call onSelectionComplete with side for old (removed) lines', () => {
        const onSelectionComplete = vi.fn();
        const { result } = renderHook(() => useDragSelection({ onSelectionComplete }));

        act(() => {
            result.current.handlers.onMouseDown(10, 'old');
        });

        act(() => {
            result.current.handlers.onMouseUp();
        });

        expect(onSelectionComplete).toHaveBeenCalledWith({ startLine: 10, endLine: 10, side: 'old' });
    });

    it('should handle reverse selection (drag upward)', () => {
        const onSelectionComplete = vi.fn();
        const { result } = renderHook(() => useDragSelection({ onSelectionComplete }));

        act(() => {
            result.current.handlers.onMouseDown(10, 'new');
            result.current.handlers.onMouseEnter(5, 'new');
        });

        // Selection should normalize to startLine < endLine
        expect(result.current.selection).toEqual({ startLine: 5, endLine: 10, side: 'new' });
    });

    it('should clear selection on clearSelection', () => {
        const onSelectionComplete = vi.fn();
        const { result } = renderHook(() => useDragSelection({ onSelectionComplete }));

        act(() => {
            result.current.handlers.onMouseDown(5, 'new');
        });

        expect(result.current.isDragging).toBe(true);

        act(() => {
            result.current.clearSelection();
        });

        expect(result.current.isDragging).toBe(false);
        expect(result.current.selection).toBeNull();
    });
});

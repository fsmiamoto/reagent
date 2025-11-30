import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { vi, describe, it, expect } from 'vitest';

describe('useKeyboardShortcuts', () => {
    it('should call the handler when the shortcut is pressed', () => {
        const handler = vi.fn();
        const { result } = renderHook(() =>
            useKeyboardShortcuts({
                SUBMIT_COMMENT: handler,
            })
        );

        const event = {
            key: 'Enter',
            metaKey: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        } as unknown as React.KeyboardEvent;

        result.current.handleKeyDown(event);

        expect(handler).toHaveBeenCalledWith(event);
    });

    it('should NOT call the handler when a different key is pressed', () => {
        const handler = vi.fn();
        const { result } = renderHook(() =>
            useKeyboardShortcuts({
                SUBMIT_COMMENT: handler,
            })
        );

        const event = {
            key: 'a',
            metaKey: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        } as unknown as React.KeyboardEvent;

        result.current.handleKeyDown(event);

        expect(handler).not.toHaveBeenCalled();
    });

    it('should NOT call the handler when modifiers are missing', () => {
        const handler = vi.fn();
        const { result } = renderHook(() =>
            useKeyboardShortcuts({
                SUBMIT_COMMENT: handler,
            })
        );

        const event = {
            key: 'Enter',
            metaKey: false, // Missing Meta
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        } as unknown as React.KeyboardEvent;

        result.current.handleKeyDown(event);

        expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple shortcuts for the same action (Ctrl+Enter)', () => {
        const handler = vi.fn();
        const { result } = renderHook(() =>
            useKeyboardShortcuts({
                SUBMIT_COMMENT: handler,
            })
        );

        const event = {
            key: 'Enter',
            metaKey: false,
            ctrlKey: true, // Ctrl instead of Meta
            shiftKey: false,
            altKey: false,
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        } as unknown as React.KeyboardEvent;

        result.current.handleKeyDown(event);

        expect(handler).toHaveBeenCalledWith(event);
    });
});

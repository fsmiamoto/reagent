import { useCallback } from 'react';
import { SHORTCUTS, type ShortcutName } from '../constants/shortcuts';

type ShortcutHandlers = Partial<Record<ShortcutName, (e: React.KeyboardEvent) => void>>;

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            Object.entries(handlers).forEach(([shortcutName, handler]) => {
                if (!handler) return;

                const keys = SHORTCUTS[shortcutName as ShortcutName];
                const isMatch = keys.some((keyCombo) => {
                    const parts = keyCombo.split('+');
                    const mainKey = parts[parts.length - 1];
                    const modifiers = parts.slice(0, -1);

                    const keyMatches = event.key.toLowerCase() === mainKey.toLowerCase();
                    const modifiersMatch = modifiers.every((mod) => {
                        if (mod === 'Meta') return event.metaKey;
                        if (mod === 'Ctrl') return event.ctrlKey;
                        if (mod === 'Shift') return event.shiftKey;
                        if (mod === 'Alt') return event.altKey;
                        return false;
                    });

                    // If we want strict matching (e.g. ONLY Ctrl+Enter, not Ctrl+Shift+Enter), we'd need more logic.
                    return keyMatches && modifiersMatch;
                });

                if (isMatch) {
                    handler(event);
                }
            });
        },
        [handlers]
    );

    return { handleKeyDown };
};

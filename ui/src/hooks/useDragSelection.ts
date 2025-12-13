import { useState, useCallback } from 'react';

export interface LineRange {
    startLine: number;
    endLine: number;
    side: 'old' | 'new';
}

interface DragSelectionState {
    isDragging: boolean;
    anchorLine: number | null;
    currentLine: number | null;
    side: 'old' | 'new' | null;
}

interface UseDragSelectionOptions {
    onSelectionComplete: (range: LineRange) => void;
}

export function useDragSelection({ onSelectionComplete }: UseDragSelectionOptions) {
    const [dragState, setDragState] = useState<DragSelectionState>({
        isDragging: false,
        anchorLine: null,
        currentLine: null,
        side: null,
    });

    const getRange = useCallback((): LineRange | null => {
        if (dragState.anchorLine === null || dragState.currentLine === null || dragState.side === null) {
            return null;
        }
        return {
            startLine: Math.min(dragState.anchorLine, dragState.currentLine),
            endLine: Math.max(dragState.anchorLine, dragState.currentLine),
            side: dragState.side,
        };
    }, [dragState.anchorLine, dragState.currentLine, dragState.side]);

    const handleMouseDown = useCallback((lineNumber: number, side: 'old' | 'new') => {
        setDragState({
            isDragging: true,
            anchorLine: lineNumber,
            currentLine: lineNumber,
            side,
        });
    }, []);

    const handleMouseEnter = useCallback((lineNumber: number, side: 'old' | 'new') => {
        setDragState((prev) => {
            // Only update if dragging and on the same side
            if (!prev.isDragging || prev.side !== side) return prev;
            return {
                ...prev,
                currentLine: lineNumber,
            };
        });
    }, []);

    const handleMouseUp = useCallback(() => {
        if (dragState.isDragging && dragState.anchorLine !== null && dragState.currentLine !== null && dragState.side !== null) {
            const range: LineRange = {
                startLine: Math.min(dragState.anchorLine, dragState.currentLine),
                endLine: Math.max(dragState.anchorLine, dragState.currentLine),
                side: dragState.side,
            };
            onSelectionComplete(range);
        }
        setDragState({
            isDragging: false,
            anchorLine: null,
            currentLine: null,
            side: null,
        });
    }, [dragState, onSelectionComplete]);

    const clearSelection = useCallback(() => {
        setDragState({
            isDragging: false,
            anchorLine: null,
            currentLine: null,
            side: null,
        });
    }, []);

    return {
        isDragging: dragState.isDragging,
        selection: getRange(),
        handlers: {
            onMouseDown: handleMouseDown,
            onMouseEnter: handleMouseEnter,
            onMouseUp: handleMouseUp,
        },
        clearSelection,
    };
}


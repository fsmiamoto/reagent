import { useState, useCallback } from 'react';

export interface LineRange {
    startLine: number;
    endLine: number;
}

interface DragSelectionState {
    isDragging: boolean;
    anchorLine: number | null;
    currentLine: number | null;
}

interface UseDragSelectionOptions {
    onSelectionComplete: (range: LineRange) => void;
}

export function useDragSelection({ onSelectionComplete }: UseDragSelectionOptions) {
    const [dragState, setDragState] = useState<DragSelectionState>({
        isDragging: false,
        anchorLine: null,
        currentLine: null,
    });

    const getRange = useCallback((): LineRange | null => {
        if (dragState.anchorLine === null || dragState.currentLine === null) {
            return null;
        }
        return {
            startLine: Math.min(dragState.anchorLine, dragState.currentLine),
            endLine: Math.max(dragState.anchorLine, dragState.currentLine),
        };
    }, [dragState.anchorLine, dragState.currentLine]);

    const handleMouseDown = useCallback((lineNumber: number) => {
        setDragState({
            isDragging: true,
            anchorLine: lineNumber,
            currentLine: lineNumber,
        });
    }, []);

    const handleMouseEnter = useCallback((lineNumber: number) => {
        setDragState((prev) => {
            if (!prev.isDragging) return prev;
            return {
                ...prev,
                currentLine: lineNumber,
            };
        });
    }, []);

    const handleMouseUp = useCallback(() => {
        if (dragState.isDragging && dragState.anchorLine !== null && dragState.currentLine !== null) {
            const range = {
                startLine: Math.min(dragState.anchorLine, dragState.currentLine),
                endLine: Math.max(dragState.anchorLine, dragState.currentLine),
            };
            onSelectionComplete(range);
        }
        setDragState({
            isDragging: false,
            anchorLine: null,
            currentLine: null,
        });
    }, [dragState, onSelectionComplete]);

    const clearSelection = useCallback(() => {
        setDragState({
            isDragging: false,
            anchorLine: null,
            currentLine: null,
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

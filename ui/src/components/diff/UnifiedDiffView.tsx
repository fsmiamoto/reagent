import { type FC } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DiffRow } from '../../hooks/useDiff';
import { Token } from '../../lib/prism';
import { CodeLine } from './CodeLine';
import { ReviewComment, CommentSide } from '../../types';
import { CommentList } from './CommentList';
import { CommentInput } from './CommentInput';
import { useDragSelection, LineRange } from '../../hooks/useDragSelection';

interface UnifiedDiffViewProps {
    diffRows: DiffRow[];
    oldTokens: Token[][];
    newTokens: Token[][];
    visibleRows: DiffRow[];
    comments: ReviewComment[];
    commentingRange: LineRange | null;
    onSelectionComplete: (range: LineRange) => void;
    showAllLines: boolean;
    onShowMore: () => void;
    filePath: string;
    onDeleteComment: (commentId: string) => Promise<void>;
    onAddComment: (startLine: number, endLine: number, side: CommentSide, text: string) => Promise<void>;
    onCancelComment: () => void;
}

/**
 * Get the line number and side for a diff row.
 * - For removed lines: use oldLineNumber with side 'old'
 * - For added/unchanged: use newLineNumber with side 'new'
 */
function getRowLineInfo(row: DiffRow): { lineNumber: number; side: CommentSide } | null {
    if (row.type === 'removed' && row.oldLineNumber) {
        return { lineNumber: row.oldLineNumber, side: 'old' };
    }
    if (row.newLineNumber) {
        return { lineNumber: row.newLineNumber, side: 'new' };
    }
    return null;
}

export const UnifiedDiffView: FC<UnifiedDiffViewProps> = ({
    diffRows,
    oldTokens,
    newTokens,
    visibleRows,
    comments,
    commentingRange,
    onSelectionComplete,
    showAllLines,
    onShowMore,
    filePath,
    onDeleteComment,
    onAddComment,
    onCancelComment,
}) => {
    const { isDragging, selection, handlers } = useDragSelection({
        onSelectionComplete,
    });

    // Determine if a line is in the active selection (either dragging or confirmed range)
    const isLineInRange = (lineNumber: number, side: CommentSide): boolean => {
        const activeRange = isDragging ? selection : commentingRange;
        if (!activeRange) return false;
        return activeRange.side === side && lineNumber >= activeRange.startLine && lineNumber <= activeRange.endLine;
    };

    return (
        <div
            className="text-sm select-none"
            onMouseUp={handlers.onMouseUp}
            onMouseLeave={handlers.onMouseUp}
        >
            {visibleRows.map((row, index) => {
                const lineInfo = getRowLineInfo(row);
                const lineNumber = lineInfo?.lineNumber;
                const side = lineInfo?.side;

                // Filter comments for this line on this side
                const lineComments = lineInfo
                    ? comments.filter((c) =>
                        c.filePath === filePath &&
                        c.side === side &&
                        lineNumber! >= c.startLine &&
                        lineNumber! <= c.endLine
                    )
                    : [];
                const hasComment = lineComments.length > 0;
                const isInSelection = lineInfo ? isLineInRange(lineNumber!, side!) : false;

                // Show CommentInput after the endLine of the commenting range
                const showCommentInputHere = commentingRange &&
                    lineInfo &&
                    commentingRange.side === side &&
                    lineNumber === commentingRange.endLine;

                const bgClass =
                    row.type === 'added' ? 'bg-green-500/10' :
                        row.type === 'removed' ? 'bg-red-500/10' :
                            '';

                const textClass =
                    row.type === 'added' ? 'text-green-700 dark:text-green-400' :
                        row.type === 'removed' ? 'text-red-700 dark:text-red-400' :
                            'text-foreground';

                const prevRow = visibleRows[index - 1];
                const isGap = !showAllLines && prevRow &&
                    ((row.oldLineNumber && prevRow.oldLineNumber && row.oldLineNumber > prevRow.oldLineNumber + 1) ||
                        (row.newLineNumber && prevRow.newLineNumber && row.newLineNumber > prevRow.newLineNumber + 1));

                return (
                    <div key={index}>
                        {isGap && (
                            <div className="bg-muted/30 py-2 text-center text-xs text-muted-foreground border-b border-border/50 cursor-pointer hover:bg-muted/50" onClick={onShowMore}>
                                Show more lines...
                            </div>
                        )}

                        <div
                            className={cn(
                                "group border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer",
                                bgClass,
                                isInSelection && "bg-primary/10 border-l-2 border-l-primary"
                            )}
                            onMouseDown={() => lineInfo && handlers.onMouseDown(lineNumber!, side!)}
                            onMouseEnter={() => lineInfo && handlers.onMouseEnter(lineNumber!, side!)}
                        >
                            <div className="flex">
                                <div className="flex items-center bg-muted/20 border-r border-border/50 sticky left-0 h-full select-none">
                                    <span className="w-10 text-right pr-2 text-muted-foreground text-xs py-1 font-mono opacity-50">
                                        {row.oldLineNumber}
                                    </span>
                                    <span className="w-10 text-right pr-2 text-muted-foreground text-xs py-1 font-mono opacity-50 border-l border-border/30">
                                        {row.newLineNumber}
                                    </span>

                                    <div className="w-8 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {lineInfo && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectionComplete({ startLine: lineNumber!, endLine: lineNumber!, side: side! });
                                                }}
                                                className={cn(
                                                    "w-5 h-5 flex items-center justify-center rounded hover:bg-primary/10 hover:text-primary transition-colors",
                                                    hasComment ? "text-primary opacity-100" : "text-muted-foreground",
                                                    isInSelection && "bg-primary/10 text-primary opacity-100"
                                                )}
                                                title={hasComment ? 'View comments' : 'Add comment'}
                                            >
                                                {hasComment ? <MessageSquare className="h-3 w-3" /> : <Plus className="h-3.5 w-3.5" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 px-4 py-1 overflow-x-auto">
                                    <div className="flex">
                                        <span className={cn("w-4 select-none opacity-50", textClass)}>
                                            {row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' '}
                                        </span>
                                        <CodeLine
                                            content={row.content}
                                            tokens={row.type === 'removed'
                                                ? oldTokens[(row.oldLineNumber || 0) - 1]
                                                : newTokens[(row.newLineNumber || 0) - 1]
                                            }
                                            className={textClass}
                                        />
                                    </div>
                                </div>
                            </div>

                            {lineInfo && (
                                <CommentList
                                    comments={comments}
                                    lineNumber={lineNumber!}
                                    side={side!}
                                    filePath={filePath}
                                    onDeleteComment={onDeleteComment}
                                />
                            )}
                            {showCommentInputHere && (
                                <CommentInput
                                    startLine={commentingRange.startLine}
                                    endLine={commentingRange.endLine}
                                    side={commentingRange.side}
                                    onCancel={onCancelComment}
                                    onSubmit={(text) => onAddComment(commentingRange.startLine, commentingRange.endLine, commentingRange.side, text)}
                                />
                            )}
                        </div>
                    </div>
                );
            })}

            {!showAllLines && diffRows.length > visibleRows.length && (
                <div className="bg-muted/30 py-4 text-center text-sm text-muted-foreground border-t border-border/50 cursor-pointer hover:bg-muted/50" onClick={onShowMore}>
                    Show {diffRows.length - visibleRows.length} hidden lines
                </div>
            )}
        </div>
    );
};

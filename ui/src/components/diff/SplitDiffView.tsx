import { type FC } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DiffRow } from '../../hooks/useDiff';
import { Token } from '../../lib/prism';
import { CodeLine } from './CodeLine';
import { ReviewComment } from '../../types';
import { CommentList } from './CommentList';
import { CommentInput } from './CommentInput';
import { useDragSelection, LineRange } from '../../hooks/useDragSelection';

interface SplitDiffViewProps {
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
    onAddComment: (startLine: number, endLine: number, text: string) => Promise<void>;
    onCancelComment: () => void;
}

export const SplitDiffView: FC<SplitDiffViewProps> = ({
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
    const isLineInRange = (lineNumber: number | undefined): boolean => {
        if (!lineNumber) return false;
        const activeRange = isDragging ? selection : commentingRange;
        if (!activeRange) return false;
        return lineNumber >= activeRange.startLine && lineNumber <= activeRange.endLine;
    };

    // Find the last line of the commenting range to show CommentInput there
    const showCommentInputAfterLine = commentingRange?.endLine;

    return (
        <div
            className="text-sm select-none"
            onMouseUp={handlers.onMouseUp}
            onMouseLeave={handlers.onMouseUp}
        >
            {visibleRows.map((row, index) => {
                const lineNumber = row.newLineNumber;
                const lineComments = lineNumber ? comments.filter((c) => lineNumber >= c.startLine && lineNumber <= c.endLine) : [];
                const hasComment = lineComments.length > 0;
                const isInSelection = isLineInRange(lineNumber);

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
                            onMouseDown={() => lineNumber && handlers.onMouseDown(lineNumber)}
                            onMouseEnter={() => lineNumber && handlers.onMouseEnter(lineNumber)}
                        >
                            <div className="flex">
                                {/* Left Side (Old/Removed/Unchanged) */}
                                <div className="w-1/2 flex border-r border-border/50">
                                    <div className="w-10 text-right pr-2 text-muted-foreground text-xs py-1 font-mono opacity-50 bg-muted/20 border-r border-border/50 select-none">
                                        {row.oldLineNumber || ''}
                                    </div>
                                    <div className={cn("flex-1 px-3 py-1 overflow-x-auto", row.type === 'added' && "bg-muted/5 opacity-30")}>
                                        {row.type !== 'added' && (
                                            <CodeLine
                                                content={row.content}
                                                tokens={oldTokens[(row.oldLineNumber || 0) - 1]}
                                                className={row.type === 'removed' ? textClass : "text-foreground"}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Right Side (New/Added/Unchanged) */}
                                <div className="w-1/2 flex relative">
                                    <div className="w-10 text-right pr-2 text-muted-foreground text-xs py-1 font-mono opacity-50 bg-muted/20 border-r border-border/50 select-none">
                                        {row.newLineNumber || ''}
                                    </div>
                                    <div className="w-8 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 z-10">
                                        {lineNumber && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectionComplete({ startLine: lineNumber, endLine: lineNumber });
                                                }}
                                                className={cn(
                                                    "w-5 h-5 flex items-center justify-center rounded hover:bg-primary/10 hover:text-primary transition-colors bg-card shadow-sm border border-border",
                                                    hasComment ? "text-primary opacity-100" : "text-muted-foreground",
                                                    isInSelection && "bg-primary/10 text-primary opacity-100"
                                                )}
                                                title={hasComment ? 'View comments' : 'Add comment'}
                                            >
                                                {hasComment ? <MessageSquare className="h-3 w-3" /> : <Plus className="h-3.5 w-3.5" />}
                                            </button>
                                        )}
                                    </div>
                                    <div className={cn("flex-1 px-3 py-1 overflow-x-auto", row.type === 'removed' && "bg-muted/5 opacity-30")}>
                                        {row.type !== 'removed' && (
                                            <CodeLine
                                                content={row.content}
                                                tokens={newTokens[(row.newLineNumber || 0) - 1]}
                                                className={row.type === 'added' ? textClass : "text-foreground"}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {lineNumber && (
                                <CommentList
                                    comments={comments}
                                    lineNumber={lineNumber}
                                    filePath={filePath}
                                    onDeleteComment={onDeleteComment}
                                />
                            )}
                            {lineNumber === showCommentInputAfterLine && commentingRange && (
                                <CommentInput
                                    startLine={commentingRange.startLine}
                                    endLine={commentingRange.endLine}
                                    onCancel={onCancelComment}
                                    onSubmit={(text) => onAddComment(commentingRange.startLine, commentingRange.endLine, text)}
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

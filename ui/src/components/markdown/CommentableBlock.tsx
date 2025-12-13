import { useMemo } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useMarkdownContext, useNestingContext, NestingContext } from './MarkdownContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export const CommentableBlock = ({ children, node, ...props }: any) => {
    const {
        file,
        comments,
        commentingLine,
        commentText,
        setCommentingLine,
        setCommentText,
        onAddComment,
        onDeleteComment
    } = useMarkdownContext();

    const isInsideCommentable = useNestingContext();

    const line = node?.position?.start?.line;
    const isHoverable = !!line && !isInsideCommentable;

    const fileComments = useMemo(() =>
        comments.filter((c) => c.filePath === file.path),
        [comments, file.path]
    );

    const lineComments = line ? fileComments.filter(c => c.lineNumber === line) : [];
    const hasComments = lineComments.length > 0;
    const isCommenting = commentingLine === line;

    const handleSubmitComment = async () => {
        if (!commentText.trim() || !line) return;
        try {
            await onAddComment(line, commentText.trim());
            setCommentingLine(null);
            setCommentText('');
        } catch (error) {
            console.error('Failed to submit comment:', error);
        }
    };

    const { handleKeyDown } = useKeyboardShortcuts({
        SUBMIT_COMMENT: (e) => {
            if (isCommenting) {
                e.preventDefault();
                handleSubmitComment();
            }
        },
    });

    if (!isHoverable) {
        return <div {...props}>{children}</div>;
    }

    return (
        <NestingContext.Provider value={true}>
            <div className="relative group/markdown-block -mx-4 px-4 rounded-sm transition-colors hover:bg-muted/30">
                <div {...props}>{children}</div>

                {/* Hover Trigger */}
                <div className={cn(
                    "absolute right-2 top-2 opacity-0 transition-opacity",
                    "group-hover/markdown-block:opacity-100",
                    (hasComments || isCommenting) && "opacity-100"
                )}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-6 w-6 rounded-full shadow-sm border border-border bg-background",
                            hasComments ? "text-primary" : "text-muted-foreground"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCommentingLine(isCommenting ? null : line);
                            if (!isCommenting) setCommentText('');
                        }}
                        title={hasComments ? "View comments" : "Add comment"}
                    >
                        {hasComments ? <MessageSquare className="h-3 w-3" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                </div>

                {/* Comments Section */}
                {(hasComments || isCommenting) && (
                    <div className="mt-2 mb-4 ml-4 pl-4 border-l-2 border-border/50 space-y-3 font-sans">
                        {lineComments.map((comment) => (
                            <div
                                key={comment.id}
                                className="flex items-start justify-between group/comment bg-card border border-border rounded p-3 shadow-sm"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-primary">Comment</span>
                                        <span className="text-xs text-muted-foreground">on line {line}</span>
                                    </div>
                                    <p className="text-sm text-foreground leading-relaxed">{comment.text}</p>
                                </div>
                                <button
                                    onClick={() => onDeleteComment(comment.id)}
                                    className="ml-3 text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-muted"
                                    title="Delete comment"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}

                        {/* Comment Input */}
                        {isCommenting && (
                            <div className="bg-card border border-border rounded-lg shadow-sm p-3 space-y-3 ring-1 ring-primary/20 font-sans">
                                <textarea
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none min-h-[80px]"
                                    autoFocus
                                    onKeyDown={handleKeyDown}
                                />
                                <div className="flex gap-2 justify-end border-t border-border pt-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setCommentingLine(null);
                                            setCommentText('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSubmitComment}
                                        disabled={!commentText.trim()}
                                    >
                                        Add comment
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </NestingContext.Provider>
    );
};

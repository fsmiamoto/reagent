import { type FC } from 'react';
import { Trash2 } from 'lucide-react';
import { ReviewComment } from '../../types';

interface CommentListProps {
    comments: ReviewComment[];
    lineNumber: number;
    filePath: string;
    onDeleteComment: (commentId: string) => Promise<void>;
}

export const CommentList: FC<CommentListProps> = ({
    comments,
    lineNumber,
    filePath,
    onDeleteComment,
}) => {
    const lineComments = comments.filter((c) => c.filePath === filePath && c.lineNumber === lineNumber);

    if (lineComments.length === 0) return null;

    return (
        <div className="flex bg-muted/10 border-t border-border/30">
            <div className="w-[88px] border-r border-border/50" />
            <div className="flex-1 p-4 space-y-3">
                {lineComments.map((comment) => (
                    <div
                        key={comment.id}
                        className="flex items-start justify-between group/comment bg-card border border-border rounded p-3 shadow-sm"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-primary">Comment</span>
                                <span className="text-xs text-muted-foreground">on line {lineNumber}</span>
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
            </div>
        </div>
    );
};

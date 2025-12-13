import { useState, type FC } from 'react';
import type { ReviewFile, ReviewComment } from '../types';
import { Button } from './ui/Button';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface SimpleDiffViewerProps {
  file: ReviewFile;
  comments: ReviewComment[];
  onAddComment: (lineNumber: number, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export const SimpleDiffViewer: FC<SimpleDiffViewerProps> = ({
  file,
  comments,
  onAddComment,
  onDeleteComment,
}) => {
  const [commentingLine, setCommentingLine] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  const lines = file.content.split('\n');
  const fileComments = comments.filter((c) => c.filePath === file.path);

  const handleLineClick = (lineNumber: number) => {
    if (commentingLine === lineNumber) {
      setCommentingLine(null);
      setCommentText('');
    } else {
      setCommentingLine(lineNumber);
      setCommentText('');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || commentingLine === null) return;

    try {
      await onAddComment(commentingLine, commentText.trim());
      setCommentingLine(null);
      setCommentText('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-4 border-b border-border bg-card sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-foreground">{file.path}</h3>
        {file.language && (
          <span className="text-xs text-muted-foreground mt-1">Language: {file.language}</span>
        )}
      </div>

      <div className="text-sm">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const lineComments = fileComments.filter((c) => c.lineNumber === lineNumber);
          const hasComment = lineComments.length > 0;
          const isCommenting = commentingLine === lineNumber;

          return (
            <div key={lineNumber} className="group border-b border-border/50 last:border-0">
              <div className="flex hover:bg-muted/30 transition-colors">
                {/* Line number + comment button */}
                <div className="flex items-center bg-muted/20 border-r border-border/50 sticky left-0 h-full">
                  <span className="w-12 text-right pr-2 text-muted-foreground select-none flex-shrink-0 text-xs py-1 font-mono">
                    {lineNumber}
                  </span>
                  <div className="w-8 flex justify-center">
                    <button
                      onClick={() => handleLineClick(lineNumber)}
                      className={cn(
                        "w-6 h-6 flex items-center justify-center rounded transition-all",
                        hasComment
                          ? "text-primary opacity-100"
                          : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground",
                        isCommenting && "bg-primary/10 text-primary opacity-100"
                      )}
                      title={hasComment ? 'View comments' : 'Add comment'}
                    >
                      {hasComment ? <MessageSquare className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Code line */}
                <div className="flex-1 px-4 py-1 overflow-x-auto">
                  <code className="font-mono text-foreground whitespace-pre">{line || ' '}</code>
                </div>
              </div>

              {/* Comments */}
              {lineComments.length > 0 && (
                <div className="flex">
                  <div className="w-20 bg-muted/5 border-r border-border/50" />
                  <div className="flex-1 px-4 py-3 bg-muted/30 border-l-4 border-primary space-y-2 font-sans">
                    {lineComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="mb-2 last:mb-0 flex items-start justify-between group/comment"
                      >
                        <p className="text-sm text-foreground flex-1">{comment.text}</p>
                        <button
                          onClick={() => onDeleteComment(comment.id)}
                          className="ml-3 text-xs text-destructive opacity-0 group-hover/comment:opacity-100 transition-opacity hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment input */}
              {isCommenting && (
                <div className="flex">
                  <div className="w-20 bg-muted/5 border-r border-border/50" />
                  <div className="flex-1 px-4 py-3 bg-muted/30 border-l-4 border-primary space-y-2 font-sans">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add your comment..."
                      className="w-full bg-input text-foreground border border-input rounded-md p-2 text-sm resize-none focus:ring-1 focus:ring-ring focus:border-input focus:outline-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2 justify-end">
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

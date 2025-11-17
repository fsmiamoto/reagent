import { useState, type FC } from 'react';
import type { ReviewFile, ReviewComment } from '../types';

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
    <div className="flex-1 overflow-auto bg-[var(--bg-base)]">
      <div className="p-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{file.path}</h3>
        {file.language && (
          <span className="text-xs text-[var(--text-muted)] mt-1">Language: {file.language}</span>
        )}
      </div>

      <div className="font-mono text-sm">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const lineComments = fileComments.filter((c) => c.lineNumber === lineNumber);
          const hasComment = lineComments.length > 0;
          const isCommenting = commentingLine === lineNumber;

          return (
            <div key={lineNumber}>
              <div className="flex hover:bg-[var(--bg-muted)] group">
                {/* Line number + comment button */}
                <div className="flex items-center bg-[var(--bg-base)] sticky left-0">
                  <span className="w-12 text-right pr-2 text-[var(--text-subtle)] select-none flex-shrink-0">
                    {lineNumber}
                  </span>
                  <button
                    onClick={() => handleLineClick(lineNumber)}
                    className={`
                      w-6 h-6 flex items-center justify-center
                      transition-colors flex-shrink-0
                      ${
                        hasComment
                          ? 'text-[var(--text-accent)] opacity-100'
                          : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100'
                      }
                      ${isCommenting ? 'text-[var(--accent)]' : ''}
                    `}
                    title={hasComment ? 'View comments' : 'Add comment'}
                  >
                    {hasComment ? '💬' : '+'}
                  </button>
                </div>

                {/* Code line */}
                <div className="flex-1 px-4 py-0.5 overflow-x-auto">
                  <code className="text-[var(--text-primary)] whitespace-pre">{line || ' '}</code>
                </div>
              </div>

              {/* Comments */}
              {lineComments.length > 0 && (
                <div className="bg-[var(--bg-comment)] border-l-4 border-[var(--comment-border)] ml-20 mr-4 my-2 p-3">
                  {lineComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="mb-2 last:mb-0 flex items-start justify-between"
                    >
                      <p className="text-sm text-[var(--text-primary)] flex-1">{comment.text}</p>
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="ml-3 text-xs text-[var(--text-danger)] hover:text-[var(--danger-hover)] flex-shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              {isCommenting && (
                <div className="bg-[var(--bg-comment-input)] border-l-4 border-[var(--accent)] ml-20 mr-4 my-2 p-3">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add your comment..."
                    className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-default)] rounded p-2 text-sm resize-none focus:border-[var(--accent)] focus:outline-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim()}
                      className="px-3 py-1.5 bg-[var(--success)] text-white rounded text-sm font-medium hover:bg-[var(--success-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add comment
                    </button>
                    <button
                      onClick={() => {
                        setCommentingLine(null);
                        setCommentText('');
                      }}
                      className="px-3 py-1.5 bg-[var(--bg-muted)] text-[var(--text-primary)] rounded text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      Cancel
                    </button>
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

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
    <div className="flex-1 overflow-auto bg-[#0d1117]">
      <div className="p-4 border-b border-[#30363d] bg-[#161b22] sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-[#c9d1d9]">{file.path}</h3>
        {file.language && (
          <span className="text-xs text-[#8b949e] mt-1">Language: {file.language}</span>
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
              <div className="flex hover:bg-[#161b22] group">
                {/* Line number + comment button */}
                <div className="flex items-center bg-[#0d1117] sticky left-0">
                  <span className="w-12 text-right pr-2 text-[#6e7681] select-none flex-shrink-0">
                    {lineNumber}
                  </span>
                  <button
                    onClick={() => handleLineClick(lineNumber)}
                    className={`
                      w-6 h-6 flex items-center justify-center
                      transition-colors flex-shrink-0
                      ${
                        hasComment
                          ? 'text-[#58a6ff] opacity-100'
                          : 'text-[#8b949e] opacity-0 group-hover:opacity-100'
                      }
                      ${isCommenting ? 'text-[#1f6feb]' : ''}
                    `}
                    title={hasComment ? 'View comments' : 'Add comment'}
                  >
                    {hasComment ? '💬' : '+'}
                  </button>
                </div>

                {/* Code line */}
                <div className="flex-1 px-4 py-0.5 overflow-x-auto">
                  <code className="text-[#c9d1d9] whitespace-pre">{line || ' '}</code>
                </div>
              </div>

              {/* Comments */}
              {lineComments.length > 0 && (
                <div className="bg-[#21262d] border-l-4 border-[#58a6ff] ml-20 mr-4 my-2 p-3">
                  {lineComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="mb-2 last:mb-0 flex items-start justify-between"
                    >
                      <p className="text-sm text-[#c9d1d9] flex-1">{comment.text}</p>
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="ml-3 text-xs text-[#f85149] hover:text-[#ff7b72] flex-shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment input */}
              {isCommenting && (
                <div className="bg-[#161b22] border-l-4 border-[#1f6feb] ml-20 mr-4 my-2 p-3">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add your comment..."
                    className="w-full bg-[#0d1117] text-[#c9d1d9] border border-[#30363d] rounded p-2 text-sm resize-none focus:border-[#1f6feb] focus:outline-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim()}
                      className="px-3 py-1.5 bg-[#238636] text-white rounded text-sm font-medium hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add comment
                    </button>
                    <button
                      onClick={() => {
                        setCommentingLine(null);
                        setCommentText('');
                      }}
                      className="px-3 py-1.5 bg-[#21262d] text-[#c9d1d9] rounded text-sm font-medium hover:bg-[#30363d] transition-colors"
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

import { diffLines } from 'diff';
import { useMemo, useState, type FC } from 'react';
import type { ReviewFile, ReviewComment } from '../types';
import { SimpleDiffViewer } from './SimpleDiffViewer';

interface DiffViewerProps {
  file: ReviewFile;
  comments: ReviewComment[];
  onAddComment: (lineNumber: number, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

type Side = 'context' | 'add' | 'remove';

interface SideCell {
  text: string;
  lineNumber?: number;
  type: Side;
}

interface SplitRow {
  key: string;
  left?: SideCell;
  right?: SideCell;
}

const SIDE_BG: Record<Side, string> = {
  context: 'bg-[#0d1117]',
  add: 'bg-[#052011]',
  remove: 'bg-[#200b0d]',
};

const getLines = (value: string): string[] => {
  const lines = value.split('\n');
  if (lines.length === 0) return [''];
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.length > 0 ? lines : [''];
};

function buildRows(file: ReviewFile): SplitRow[] {
  const before = file.oldContent ?? '';
  const after = file.content ?? '';

  if (!before && !after) {
    return [];
  }

  const parts = diffLines(before, after);
  let oldLine = 1;
  let newLine = 1;
  let rowCounter = 0;
  const rows: SplitRow[] = [];
  const leftQueue: SideCell[] = [];
  const rightQueue: SideCell[] = [];

  const flushQueues = () => {
    while (leftQueue.length > 0 || rightQueue.length > 0) {
      rows.push({
        key: `change-${rowCounter++}`,
        left: leftQueue.shift(),
        right: rightQueue.shift(),
      });
    }
  };

  parts.forEach((part) => {
    const lines = getLines(part.value);

    if (part.added) {
      lines.forEach((text) => {
        rightQueue.push({
          text,
          lineNumber: newLine++,
          type: 'add',
        });
      });
      return;
    }

    if (part.removed) {
      lines.forEach((text) => {
        leftQueue.push({
          text,
          lineNumber: oldLine++,
          type: 'remove',
        });
      });
      return;
    }

    flushQueues();
    lines.forEach((text) => {
      rows.push({
        key: `context-${rowCounter++}`,
        left: {
          text,
          lineNumber: oldLine++,
          type: 'context',
        },
        right: {
          text,
          lineNumber: newLine++,
          type: 'context',
        },
      });
    });
  });

  flushQueues();
  return rows;
}

export const DiffViewer: FC<DiffViewerProps> = ({
  file,
  comments,
  onAddComment,
  onDeleteComment,
}) => {
  const [commentingLine, setCommentingLine] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const diffRows = useMemo(() => buildRows(file), [file.content, file.oldContent, file.path]);

  const fileComments = useMemo(
    () => comments.filter((comment) => comment.filePath === file.path),
    [comments, file.path]
  );

  if (diffRows.length === 0) {
    return (
      <SimpleDiffViewer
        file={file}
        comments={comments}
        onAddComment={onAddComment}
        onDeleteComment={onDeleteComment}
      />
    );
  }

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

  const getBackground = (cell?: SideCell) => {
    if (!cell) return 'bg-[#0d1117]';
    return SIDE_BG[cell.type];
  };

  const getIndicator = (cell?: SideCell) => {
    if (!cell) return '';
    if (cell.type === 'add') return '+';
    if (cell.type === 'remove') return '-';
    return '';
  };

  const getIndicatorColor = (cell?: SideCell) => {
    if (!cell) return 'text-[#6e7681]';
    if (cell.type === 'add') return 'text-[#3fb950]';
    if (cell.type === 'remove') return 'text-[#f85149]';
    return 'text-[#6e7681]';
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
        <div className="flex border-b border-[#30363d] bg-[#161b22] text-xs text-[#8b949e]">
          <div className="w-1/2 flex items-center px-4 py-2 gap-3">
            <span className="uppercase tracking-wide">Base</span>
            <span className="text-[#6e7681]">Original</span>
          </div>
          <div className="w-1/2 flex items-center px-4 py-2 gap-3 border-l border-[#30363d]">
            <span className="uppercase tracking-wide">Head</span>
            <span className="text-[#6e7681]">Changes</span>
          </div>
        </div>

        {diffRows.map((row) => {
          const newLineNumber =
            row.right && typeof row.right.lineNumber === 'number' ? row.right.lineNumber : null;
          const lineComments =
            newLineNumber !== null
              ? fileComments.filter((comment) => comment.lineNumber === newLineNumber)
              : [];
          const isCommenting = newLineNumber !== null && commentingLine === newLineNumber;
          const hasComment = lineComments.length > 0;

          return (
            <div key={row.key} className="border-b border-[#21262d]">
              <div className="flex">
                <div className={`w-1/2 flex border-r border-[#21262d] ${getBackground(row.left)}`}>
                  <div className="w-12 text-right pr-2 text-xs text-[#6e7681] select-none py-1.5">
                    {row.left?.lineNumber ?? ''}
                  </div>
                  <div className="w-4 text-center font-semibold pt-1.5">
                    <span className={getIndicatorColor(row.left)}>{getIndicator(row.left)}</span>
                  </div>
                  <div className="flex-1 px-3 py-1.5">
                    <code className="text-[#c9d1d9] whitespace-pre-wrap break-words">
                      {row.left?.text ?? ' '}
                    </code>
                  </div>
                </div>

                <div className={`w-1/2 flex ${getBackground(row.right)}`}>
                  <div className="w-12 text-right pr-2 text-xs text-[#6e7681] select-none py-1.5">
                    {row.right?.lineNumber ?? ''}
                  </div>
                  <div className="w-4 text-center font-semibold pt-1.5">
                    <span className={getIndicatorColor(row.right)}>{getIndicator(row.right)}</span>
                  </div>
                  <div className="flex-1 px-3 py-1.5">
                    <code className="text-[#c9d1d9] whitespace-pre-wrap break-words">
                      {row.right?.text ?? ' '}
                    </code>
                  </div>
                  <div className="w-10 flex items-center justify-center">
                    {newLineNumber !== null && (
                      <button
                        onClick={() => handleLineClick(newLineNumber)}
                        className={`
                          w-8 h-8 flex items-center justify-center rounded transition-colors
                          ${hasComment ? 'text-[#58a6ff]' : 'text-[#8b949e] hover:text-white'}
                          ${isCommenting ? 'bg-[#1f6feb]/20' : ''}
                        `}
                        title={hasComment ? 'View comments' : 'Add comment'}
                      >
                        {hasComment ? '💬' : '+'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {lineComments.length > 0 && (
                <div className="flex">
                  <div className="w-1/2" />
                  <div className="w-1/2 px-4 py-3 bg-[#21262d] border-l-4 border-[#58a6ff] space-y-2">
                    {lineComments.map((comment) => (
                      <div key={comment.id} className="flex items-start justify-between">
                        <p className="text-sm text-[#c9d1d9] flex-1">{comment.text}</p>
                        <button
                          onClick={() => onDeleteComment(comment.id)}
                          className="ml-3 text-xs text-[#f85149] hover:text-[#ff7b72]"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isCommenting && newLineNumber !== null && (
                <div className="flex">
                  <div className="w-1/2" />
                  <div className="w-1/2 px-4 py-3 bg-[#1b1f24] border-l-4 border-[#1f6feb] space-y-2">
                    <textarea
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Add your comment..."
                      className="w-full bg-[#0d1117] text-[#c9d1d9] border border-[#30363d] rounded p-2 text-sm resize-none focus:border-[#1f6feb] focus:outline-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

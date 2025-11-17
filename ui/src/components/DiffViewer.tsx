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
  context: 'bg-[var(--diff-context)]',
  add: 'bg-[var(--diff-add)]',
  remove: 'bg-[var(--diff-remove)]',
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
    if (!cell) return 'bg-[var(--diff-context)]';
    return SIDE_BG[cell.type];
  };

  const getIndicator = (cell?: SideCell) => {
    if (!cell) return '';
    if (cell.type === 'add') return '+';
    if (cell.type === 'remove') return '-';
    return '';
  };

  const getIndicatorColor = (cell?: SideCell) => {
    if (!cell) return 'text-[var(--text-subtle)]';
    if (cell.type === 'add') return 'text-[var(--indicator-add)]';
    if (cell.type === 'remove') return 'text-[var(--indicator-remove)]';
    return 'text-[var(--text-subtle)]';
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
        <div className="flex border-b border-[var(--border-default)] bg-[var(--bg-surface)] text-xs text-[var(--text-muted)]">
          <div className="w-1/2 flex items-center px-4 py-2 gap-3">
            <span className="uppercase tracking-wide">Base</span>
            <span className="text-[var(--text-subtle)]">Original</span>
          </div>
          <div className="w-1/2 flex items-center px-4 py-2 gap-3 border-l border-[var(--border-default)]">
            <span className="uppercase tracking-wide">Head</span>
            <span className="text-[var(--text-subtle)]">Changes</span>
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
            <div key={row.key} className="border-b border-[var(--border-default)]">
              <div className="flex">
                <div className={`w-1/2 flex border-r border-[var(--border-default)] ${getBackground(row.left)}`}>
                  <div className="w-12 text-right pr-2 text-xs text-[var(--text-subtle)] select-none py-1.5">
                    {row.left?.lineNumber ?? ''}
                  </div>
                  <div className="w-4 text-center font-semibold pt-1.5">
                    <span className={getIndicatorColor(row.left)}>{getIndicator(row.left)}</span>
                  </div>
                  <div className="flex-1 px-3 py-1.5">
                    <code className="text-[var(--text-primary)] whitespace-pre-wrap break-words">
                      {row.left?.text ?? ' '}
                    </code>
                  </div>
                </div>

                <div className={`w-1/2 flex ${getBackground(row.right)}`}>
                  <div className="w-12 text-right pr-2 text-xs text-[var(--text-subtle)] select-none py-1.5">
                    {row.right?.lineNumber ?? ''}
                  </div>
                  <div className="w-4 text-center font-semibold pt-1.5">
                    <span className={getIndicatorColor(row.right)}>{getIndicator(row.right)}</span>
                  </div>
                  <div className="flex-1 px-3 py-1.5">
                    <code className="text-[var(--text-primary)] whitespace-pre-wrap break-words">
                      {row.right?.text ?? ' '}
                    </code>
                  </div>
                  <div className="w-10 flex items-center justify-center">
                    {newLineNumber !== null && (
                      <button
                        onClick={() => handleLineClick(newLineNumber)}
                        className={`
                          w-8 h-8 flex items-center justify-center rounded transition-colors
                          ${hasComment ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}
                          ${isCommenting ? 'bg-[var(--accent-soft-bg)]' : ''}
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
                  <div className="w-1/2 px-4 py-3 bg-[var(--bg-comment)] border-l-4 border-[var(--comment-border)] space-y-2">
                    {lineComments.map((comment) => (
                      <div key={comment.id} className="flex items-start justify-between">
                        <p className="text-sm text-[var(--text-primary)] flex-1">{comment.text}</p>
                        <button
                          onClick={() => onDeleteComment(comment.id)}
                          className="ml-3 text-xs text-[var(--text-danger)] hover:text-[var(--danger-hover)]"
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
                  <div className="w-1/2 px-4 py-3 bg-[var(--bg-comment-input)] border-l-4 border-[var(--accent)] space-y-2">
                    <textarea
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Add your comment..."
                      className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-default)] rounded p-2 text-sm resize-none focus:border-[var(--accent)] focus:outline-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

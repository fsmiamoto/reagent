
import { useState, useMemo, type FC } from 'react';
import type { ReviewFile, ReviewComment } from '../types';
import { cn } from '../lib/utils';
import { inferLanguage } from '../utils/language';
import { Button } from './ui/Button';
import { MessageSquare, Plus, Trash2, ChevronDown, ChevronRight, FileJson, Columns, Rows, Minimize2, Maximize2, Eye, Code } from 'lucide-react';
import { diffLines } from 'diff';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { tokenizeToLines } from '../lib/prism';
import { MarkdownPreview } from './MarkdownPreview';

interface DiffViewerProps {
  file: ReviewFile;
  comments: ReviewComment[];
  onAddComment: (lineNumber: number, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

const COLLAPSED_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'composer.lock',
  'Gemfile.lock',
  'go.sum',
];

interface DiffRow {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export const DiffViewer: FC<DiffViewerProps> = ({
  file,
  comments,
  onAddComment,
  onDeleteComment,
}) => {
  const isCollapsedByDefault = useMemo(() => {
    const fileName = file.path.split('/').pop();
    return fileName && COLLAPSED_FILES.includes(fileName);
  }, [file.path]);

  const [isExpanded, setIsExpanded] = useState(!isCollapsedByDefault);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [showAllLines, setShowAllLines] = useState(false);
  const [commentingLine, setCommentingLine] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const { oldTokens, newTokens } = useMemo(() => {
    const lang = inferLanguage(file.path, file.language);

    return {
      oldTokens: tokenizeToLines(file.oldContent || '', lang),
      newTokens: tokenizeToLines(file.content, lang),
    };
  }, [file.content, file.oldContent, file.language, file.path]);

  const diffRows = useMemo(() => {
    const changes = diffLines(file.oldContent || '', file.content);
    const rows: DiffRow[] = [];
    let oldLine = 1;
    let newLine = 1;

    changes.forEach((change) => {
      const lines = change.value.replace(/\n$/, '').split('\n');

      lines.forEach((line) => {
        if (change.added) {
          rows.push({
            type: 'added',
            content: line,
            newLineNumber: newLine++,
          });
        } else if (change.removed) {
          rows.push({
            type: 'removed',
            content: line,
            oldLineNumber: oldLine++,
          });
        } else {
          rows.push({
            type: 'unchanged',
            content: line,
            oldLineNumber: oldLine++,
            newLineNumber: newLine++,
          });
        }
      });
    });

    return rows;
  }, [file.content, file.oldContent]);

  const visibleRows = useMemo(() => {
    if (showAllLines) return diffRows;

    const CONTEXT_LINES = 3;
    const visibleIndices = new Set<number>();

    diffRows.forEach((row, index) => {
      if (row.type !== 'unchanged') {
        for (let i = Math.max(0, index - CONTEXT_LINES); i <= Math.min(diffRows.length - 1, index + CONTEXT_LINES); i++) {
          visibleIndices.add(i);
        }
      }
    });

    // Also show lines with comments
    const fileComments = comments.filter((c) => c.filePath === file.path);
    fileComments.forEach(comment => {
      const rowIndex = diffRows.findIndex(r => r.newLineNumber === comment.lineNumber);
      if (rowIndex !== -1) {
        for (let i = Math.max(0, rowIndex - CONTEXT_LINES); i <= Math.min(diffRows.length - 1, rowIndex + CONTEXT_LINES); i++) {
          visibleIndices.add(i);
        }
      }
    });

    // If no changes/comments, show first few lines
    if (visibleIndices.size === 0) {
      for (let i = 0; i < Math.min(diffRows.length, 5); i++) {
        visibleIndices.add(i);
      }
    }

    return diffRows.filter((_, index) => visibleIndices.has(index));
  }, [diffRows, showAllLines, comments, file.path]);

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

  const { handleKeyDown } = useKeyboardShortcuts({
    SUBMIT_COMMENT: (e) => {
      e.preventDefault();
      handleSubmitComment();
    },
  });

  return (
    <div className="flex-1 overflow-auto bg-card border border-border rounded-lg shadow-sm">
      <div
        className="p-3 border-b border-border bg-muted/30 sticky top-0 z-10 flex items-center justify-between"
      >
        <div
          className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <h3 className="text-sm font-semibold text-foreground font-mono">{file.path}</h3>
          {file.language && (
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
              {file.language}
            </span>
          )}
          {isCollapsedByDefault && !isExpanded && (
            <span className="text-xs text-muted-foreground italic ml-2">
              Large file collapsed by default
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="flex items-center gap-1">
            {file.path.endsWith('.md') && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 px-2 text-xs gap-1.5", previewMode && "bg-muted text-foreground")}
                  onClick={() => setPreviewMode(!previewMode)}
                  title={previewMode ? "Show diff" : "Show preview"}
                >
                  {previewMode ? <Code className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {previewMode ? "Diff" : "Preview"}
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1.5"
              onClick={() => setShowAllLines(!showAllLines)}
              title={showAllLines ? "Show less context" : "Show all lines"}
            >
              {showAllLines ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {showAllLines ? "Collapse" : "Expand"}
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", viewMode === 'unified' && "bg-muted text-foreground")}
              onClick={() => setViewMode('unified')}
              title="Unified view"
              disabled={previewMode}
            >
              <Rows className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", viewMode === 'split' && "bg-muted text-foreground")}
              onClick={() => setViewMode('split')}
              title="Split view"
              disabled={previewMode}
            >
              <Columns className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {!isExpanded ? (
        isCollapsedByDefault ? (
          <div className="p-8 flex flex-col items-center justify-center bg-muted/10">
            <FileJson className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground mb-4">
              This file is collapsed by default because it is generated or large.
            </p>
            <Button variant="outline" onClick={() => setIsExpanded(true)}>
              Show File Content
            </Button>
          </div>
        ) : null
      ) : previewMode ? (
        <MarkdownPreview
          file={file}
          comments={comments}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
        />
      ) : (
        <div className="font-mono text-sm">
          {visibleRows.map((row, index) => {
            // Use index as key since line numbers can be duplicate (e.g. removed lines) or missing
            // But for comments we need a stable line number. 
            // Comments attach to the NEW line number usually, or we disable comments on removed lines.
            // Let's attach comments to newLineNumber if present.

            const lineNumber = row.newLineNumber;
            const lineComments = lineNumber ? fileComments.filter((c) => c.lineNumber === lineNumber) : [];
            const hasComment = lineComments.length > 0;
            const isCommenting = lineNumber !== undefined && commentingLine === lineNumber;

            const bgClass =
              row.type === 'added' ? 'bg-green-500/10' :
                row.type === 'removed' ? 'bg-red-500/10' :
                  '';

            const textClass =
              row.type === 'added' ? 'text-green-700 dark:text-green-400' :
                row.type === 'removed' ? 'text-red-700 dark:text-red-400' :
                  'text-foreground';

            // Check for gap
            const prevRow = visibleRows[index - 1];
            const isGap = !showAllLines && prevRow &&
              ((row.oldLineNumber && prevRow.oldLineNumber && row.oldLineNumber > prevRow.oldLineNumber + 1) ||
                (row.newLineNumber && prevRow.newLineNumber && row.newLineNumber > prevRow.newLineNumber + 1));

            return (
              <div key={index}>
                {isGap && (
                  <div className="bg-muted/30 py-2 text-center text-xs text-muted-foreground border-b border-border/50 cursor-pointer hover:bg-muted/50" onClick={() => setShowAllLines(true)}>
                    Show more lines...
                  </div>
                )}

                <div className={cn("group border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors", bgClass)}>
                  {viewMode === 'unified' ? (
                    <div className="flex">
                      {/* Unified View */}
                      <div className="flex items-center bg-muted/20 border-r border-border/50 sticky left-0 h-full select-none">
                        <span className="w-10 text-right pr-2 text-muted-foreground text-xs py-1 font-mono opacity-50">
                          {row.oldLineNumber || ''}
                        </span>
                        <span className="w-10 text-right pr-2 text-muted-foreground text-xs py-1 font-mono opacity-50 border-l border-border/30">
                          {row.newLineNumber || ''}
                        </span>

                        <div className="w-8 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {lineNumber && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLineClick(lineNumber);
                              }}
                              className={cn(
                                "w-5 h-5 flex items-center justify-center rounded hover:bg-primary/10 hover:text-primary transition-colors",
                                hasComment ? "text-primary opacity-100" : "text-muted-foreground",
                                isCommenting && "bg-primary/10 text-primary opacity-100"
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
                          <code className={cn("whitespace-pre block min-w-full", textClass)}>
                            {(row.type === 'removed'
                              ? oldTokens[(row.oldLineNumber || 0) - 1]
                              : newTokens[(row.newLineNumber || 0) - 1])?.map((token, i) => (
                                <span
                                  key={i}
                                  className={token.types.length > 1 || token.types[0] !== 'text' ? `token ${token.types.join(' ')}` : undefined}
                                >
                                  {token.content}
                                </span>
                              )) || row.content || ' '}
                          </code>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex">
                      {/* Split View */}
                      {/* Left Side (Old/Removed/Unchanged) */}
                      <div className="w-1/2 flex border-r border-border/50">
                        <div className="w-10 text-right pr-2 text-muted-foreground text-xs py-1 font-mono opacity-50 bg-muted/20 border-r border-border/50 select-none">
                          {row.oldLineNumber || ''}
                        </div>
                        <div className={cn("flex-1 px-3 py-1 overflow-x-auto", row.type === 'added' && "bg-muted/5 opacity-30")}>
                          {row.type !== 'added' && (
                            <code className={cn("whitespace-pre block min-w-full", row.type === 'removed' ? textClass : "text-foreground")}>
                              {oldTokens[(row.oldLineNumber || 0) - 1]?.map((token, i) => (
                                <span
                                  key={i}
                                  className={token.types.length > 1 || token.types[0] !== 'text' ? `token ${token.types.join(' ')}` : undefined}
                                >
                                  {token.content}
                                </span>
                              )) || row.content || ' '}
                            </code>
                          )}
                        </div>
                      </div>

                      {/* Right Side (New/Added/Unchanged) */}
                      <div className="w-1/2 flex">
                        <div className="w-10 text-right pr-2 text-muted-foreground text-xs py-1 font-mono opacity-50 bg-muted/20 border-r border-border/50 select-none">
                          {row.newLineNumber || ''}
                        </div>
                        <div className="w-8 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 z-10">
                          {lineNumber && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLineClick(lineNumber);
                              }}
                              className={cn(
                                "w-5 h-5 flex items-center justify-center rounded hover:bg-primary/10 hover:text-primary transition-colors bg-card shadow-sm border border-border",
                                hasComment ? "text-primary opacity-100" : "text-muted-foreground",
                                isCommenting && "bg-primary/10 text-primary opacity-100"
                              )}
                              title={hasComment ? 'View comments' : 'Add comment'}
                            >
                              {hasComment ? <MessageSquare className="h-3 w-3" /> : <Plus className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                        <div className={cn("flex-1 px-3 py-1 overflow-x-auto relative", row.type === 'removed' && "bg-muted/5 opacity-30")}>
                          {row.type !== 'removed' && (
                            <code className={cn("whitespace-pre block min-w-full", row.type === 'added' ? textClass : "text-foreground")}>
                              {newTokens[(row.newLineNumber || 0) - 1]?.map((token, i) => (
                                <span
                                  key={i}
                                  className={token.types.length > 1 || token.types[0] !== 'text' ? `token ${token.types.join(' ')}` : undefined}
                                >
                                  {token.content}
                                </span>
                              )) || row.content || ' '}
                            </code>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comments (Shared for both views for now, spanning full width) */}
                  {lineComments.length > 0 && (
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
                  )}

                  {/* Comment input */}
                  {isCommenting && (
                    <div className="flex bg-muted/10 border-t border-border/30">
                      <div className="w-[88px] border-r border-border/50" />
                      <div className="flex-1 p-4">
                        <div className="bg-card border border-border rounded-lg shadow-sm p-3 space-y-3 ring-1 ring-primary/20">
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
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {!showAllLines && diffRows.length > visibleRows.length && (
            <div className="bg-muted/30 py-4 text-center text-sm text-muted-foreground border-t border-border/50 cursor-pointer hover:bg-muted/50" onClick={() => setShowAllLines(true)}>
              <Maximize2 className="h-4 w-4 inline-block mr-2" />
              Show {diffRows.length - visibleRows.length} hidden lines
            </div>
          )}
        </div>
      )}
    </div>
  );
};


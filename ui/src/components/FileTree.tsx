import type { FC } from 'react';
import type { ReviewFile, ReviewComment } from '../types';

interface FileTreeProps {
  files: ReviewFile[];
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
  comments: ReviewComment[];
}

export const FileTree: FC<FileTreeProps> = ({
  files,
  selectedFile,
  onFileSelect,
  comments,
}) => {
  // Count comments per file
  const commentCounts = comments.reduce((acc, comment) => {
    acc[comment.filePath] = (acc[comment.filePath] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-64 bg-[var(--bg-surface)] border-r border-[var(--border-default)] flex flex-col">
      <div className="p-4 border-b border-[var(--border-default)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Files Changed</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">{files.length} files</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.map((file) => {
          const isSelected = selectedFile === file.path;
          const commentCount = commentCounts[file.path] || 0;

          return (
            <button
              key={file.path}
              onClick={() => onFileSelect(file.path)}
              className={`
                w-full px-4 py-2.5 text-left text-sm transition-colors
                flex items-center justify-between
                ${
                  isSelected
                    ? 'bg-[var(--accent)] text-[var(--text-inverse)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-muted)]'
                }
              `}
            >
              <span className="truncate flex-1">{file.path}</span>
              {commentCount > 0 && (
                <span
                  className={`
                    ml-2 px-1.5 py-0.5 rounded text-xs font-medium
                    ${
                      isSelected
                        ? 'bg-white/25 text-[var(--text-inverse)]'
                        : 'bg-[var(--bg-pill)] text-[var(--text-accent)]'
                    }
                  `}
                >
                  {commentCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

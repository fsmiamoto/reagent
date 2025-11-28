import { useState, useMemo, type FC } from 'react';
import type { ReviewFile, ReviewComment } from '../types';
import { cn } from '../lib/utils';
import { FileCode, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';

interface FileTreeProps {
  files: ReviewFile[];
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
  comments: ReviewComment[];
}

type TreeNode = {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: Record<string, TreeNode>;
  file?: ReviewFile;
};

const buildTree = (files: ReviewFile[]): TreeNode => {
  const root: TreeNode = { name: '', path: '', type: 'folder', children: {} };

  files.forEach((file) => {
    const parts = file.path.split('/');
    let current = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const path = parts.slice(0, index + 1).join('/');

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path,
          type: isFile ? 'file' : 'folder',
          children: {},
          file: isFile ? file : undefined,
        };
      }
      current = current.children[part];
    });
  });

  return root;
};

const FileTreeNode: FC<{
  node: TreeNode;
  level: number;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  commentCounts: Record<string, number>;
}> = ({ node, level, selectedFile, onFileSelect, commentCounts }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = node.type === 'file' && selectedFile === node.path;
  const commentCount = node.type === 'file' ? commentCounts[node.path] || 0 : 0;

  // Calculate total comments for folder
  const getFolderCommentCount = (n: TreeNode): number => {
    if (n.type === 'file') return commentCounts[n.path] || 0;
    return Object.values(n.children).reduce((acc, child) => acc + getFolderCommentCount(child), 0);
  };

  const folderCommentCount = node.type === 'folder' ? getFolderCommentCount(node) : 0;

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-2 py-1 text-left text-sm hover:bg-muted/50 flex items-center gap-1.5 select-none transition-colors",
            "text-muted-foreground hover:text-foreground"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-blue-400" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-blue-400" />
          )}
          <span className="truncate font-medium">{node.name}</span>
          {folderCommentCount > 0 && (
            <span className="ml-auto text-[10px] bg-muted text-muted-foreground px-1.5 rounded-full">
              {folderCommentCount}
            </span>
          )}
        </button>
        {isOpen && (
          <div>
            {Object.values(node.children)
              .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'folder' ? -1 : 1;
              })
              .map((child) => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  level={level + 1}
                  selectedFile={selectedFile}
                  onFileSelect={onFileSelect}
                  commentCounts={commentCounts}
                />
              ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileSelect(node.path)}
      className={cn(
        "w-full px-2 py-1 text-left text-sm transition-colors flex items-center gap-2 group border-l-2",
        isSelected
          ? "bg-accent text-accent-foreground border-primary"
          : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
      style={{ paddingLeft: `${level * 12 + 20}px` }}
    >
      <FileCode className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="truncate flex-1">{node.name}</span>
      {commentCount > 0 && (
        <span
          className={cn(
            "ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold",
            isSelected
              ? "bg-background/20 text-accent-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {commentCount}
        </span>
      )}
    </button>
  );
};

export const FileTree: FC<FileTreeProps> = ({
  files,
  selectedFile,
  onFileSelect,
  comments,
}) => {
  const tree = useMemo(() => buildTree(files), [files]);

  // Count comments per file
  const commentCounts = useMemo(() => comments.reduce((acc, comment) => {
    acc[comment.filePath] = (acc[comment.filePath] || 0) + 1;
    return acc;
  }, {} as Record<string, number>), [comments]);

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Files Changed</h2>
        <p className="text-xs text-muted-foreground mt-1">{files.length} files</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {Object.values(tree.children)
          .sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
          })
          .map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              level={0}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              commentCounts={commentCounts}
            />
          ))}
      </div>
    </div>
  );
};

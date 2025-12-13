import { useState, useMemo, type FC } from 'react';
import { FileJson } from 'lucide-react';
import { ReviewFile, ReviewComment } from '../../types';
import { Button } from '../ui/Button';
import { MarkdownPreview } from '../MarkdownPreview';
import { useDiff } from '../../hooks/useDiff';
import { useVisibleRows } from '../../hooks/useVisibleRows';
import { FileHeader } from './FileHeader';
import { UnifiedDiffView } from './UnifiedDiffView';
import { SplitDiffView } from './SplitDiffView';
import { validateReviewFile } from './validators';

interface DiffViewerProps {
    file: ReviewFile;
    comments: ReviewComment[];
    onAddComment: (startLine: number, endLine: number, text: string) => Promise<void>;
    onDeleteComment: (commentId: string) => Promise<void>;
    readOnly?: boolean;
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

export const DiffViewer: FC<DiffViewerProps> = ({
    file,
    comments,
    onAddComment,
    onDeleteComment,
    readOnly = false,
}) => {
    const validationError = validateReviewFile(file);
    if (validationError) {
        return (
            <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
                Error: {validationError}
            </div>
        );
    }

    const isCollapsedByDefault = useMemo(() => {
        const fileName = file.path.split('/').pop();
        return fileName ? COLLAPSED_FILES.includes(fileName) : false;
    }, [file.path]);

    const [isExpanded, setIsExpanded] = useState(!isCollapsedByDefault);
    const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
    const [showAllLines, setShowAllLines] = useState(false);
    const [commentingRange, setCommentingRange] = useState<{
        startLine: number;
        endLine: number;
    } | null>(null);
    const [previewMode, setPreviewMode] = useState(false);

    const { oldTokens, newTokens, diffRows } = useDiff({
        oldContent: file.oldContent,
        newContent: file.content,
        filePath: file.path,
        language: file.language,
    });

    const visibleRows = useVisibleRows({
        diffRows,
        showAllLines,
        comments,
        file,
    });

    const handleSelectionComplete = (range: { startLine: number; endLine: number }) => {
        if (readOnly) return;
        setCommentingRange(range);
    };

    const handleAddComment = async (startLine: number, endLine: number, text: string) => {
        await onAddComment(startLine, endLine, text);
        setCommentingRange(null);
    };

    return (
        <div className="flex-1 overflow-auto bg-card border border-border rounded-lg shadow-sm">
            <FileHeader
                file={file}
                isExpanded={isExpanded}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                isCollapsedByDefault={isCollapsedByDefault}
                previewMode={previewMode}
                onTogglePreview={() => setPreviewMode(!previewMode)}
                showAllLines={showAllLines}
                onToggleShowAllLines={() => setShowAllLines(!showAllLines)}
                viewMode={viewMode}
                onSetViewMode={setViewMode}
            />

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
            ) : viewMode === 'unified' ? (
                <UnifiedDiffView
                    diffRows={diffRows}
                    oldTokens={oldTokens}
                    newTokens={newTokens}
                    visibleRows={visibleRows}
                    comments={comments}
                    commentingRange={commentingRange}
                    onSelectionComplete={handleSelectionComplete}
                    showAllLines={showAllLines}
                    onShowMore={() => setShowAllLines(true)}
                    filePath={file.path}
                    onDeleteComment={onDeleteComment}
                    onAddComment={handleAddComment}
                    onCancelComment={() => setCommentingRange(null)}
                />
            ) : (
                <SplitDiffView
                    diffRows={diffRows}
                    oldTokens={oldTokens}
                    newTokens={newTokens}
                    visibleRows={visibleRows}
                    comments={comments}
                    commentingRange={commentingRange}
                    onSelectionComplete={handleSelectionComplete}
                    showAllLines={showAllLines}
                    onShowMore={() => setShowAllLines(true)}
                    filePath={file.path}
                    onDeleteComment={onDeleteComment}
                    onAddComment={handleAddComment}
                    onCancelComment={() => setCommentingRange(null)}
                />
            )}
        </div>
    );
};

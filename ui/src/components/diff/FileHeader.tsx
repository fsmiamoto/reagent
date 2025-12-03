import { type FC } from 'react';
import { ChevronDown, ChevronRight, Code, Eye, Minimize2, Maximize2, Rows, Columns } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { ReviewFile } from '../../types';

interface FileHeaderProps {
    file: ReviewFile;
    isExpanded: boolean;
    onToggleExpand: () => void;
    isCollapsedByDefault: boolean;
    previewMode: boolean;
    onTogglePreview: () => void;
    showAllLines: boolean;
    onToggleShowAllLines: () => void;
    viewMode: 'unified' | 'split';
    onSetViewMode: (mode: 'unified' | 'split') => void;
}

export const FileHeader: FC<FileHeaderProps> = ({
    file,
    isExpanded,
    onToggleExpand,
    isCollapsedByDefault,
    previewMode,
    onTogglePreview,
    showAllLines,
    onToggleShowAllLines,
    viewMode,
    onSetViewMode,
}) => {
    return (
        <div className="p-3 border-b border-border bg-muted/30 sticky top-0 z-10 flex items-center justify-between">
            <div
                className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors"
                onClick={onToggleExpand}
            >
                {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
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
                                onClick={onTogglePreview}
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
                        onClick={onToggleShowAllLines}
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
                        onClick={() => onSetViewMode('unified')}
                        title="Unified view"
                        disabled={previewMode}
                    >
                        <Rows className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-7 w-7", viewMode === 'split' && "bg-muted text-foreground")}
                        onClick={() => onSetViewMode('split')}
                        title="Split view"
                        disabled={previewMode}
                    >
                        <Columns className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}
        </div>
    );
};

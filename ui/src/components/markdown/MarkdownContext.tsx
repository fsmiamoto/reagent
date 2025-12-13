import { createContext, useContext } from 'react';
import type { ReviewComment, ReviewFile } from '../../types';

interface MarkdownContextType {
    file: ReviewFile;
    comments: ReviewComment[];
    commentingLine: number | null;
    commentText: string;
    setCommentingLine: (line: number | null) => void;
    setCommentText: (text: string) => void;
    onAddComment: (startLine: number, endLine: number, text: string) => Promise<void>;
    onDeleteComment: (commentId: string) => Promise<void>;
}

export const MarkdownContext = createContext<MarkdownContextType | null>(null);

export const useMarkdownContext = () => {
    const context = useContext(MarkdownContext);
    if (!context) {
        throw new Error('useMarkdownContext must be used within a MarkdownProvider');
    }
    return context;
};

// Context to track if we are already inside a commentable block to prevent nesting
export const NestingContext = createContext<boolean>(false);

export const useNestingContext = () => useContext(NestingContext);

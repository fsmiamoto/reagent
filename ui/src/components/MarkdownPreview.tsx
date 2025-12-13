import { useState, type FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReviewFile, ReviewComment, CommentSide } from '../types';
import { MarkdownContext } from './markdown/MarkdownContext';
import { markdownComponents } from './markdown/MarkdownComponents';

interface MarkdownPreviewProps {
    file: ReviewFile;
    comments: ReviewComment[];
    onAddComment: (startLine: number, endLine: number, side: CommentSide, text: string) => Promise<void>;
    onDeleteComment: (commentId: string) => Promise<void>;
}

export const MarkdownPreview: FC<MarkdownPreviewProps> = ({
    file,
    comments,
    onAddComment,
    onDeleteComment,
}) => {
    const [commentingLine, setCommentingLine] = useState<number | null>(null);
    const [commentText, setCommentText] = useState('');

    return (
        <MarkdownContext.Provider value={{
            file,
            comments,
            commentingLine,
            commentText,
            setCommentingLine,
            setCommentText,
            onAddComment,
            onDeleteComment
        }}>
            <div className="p-6 prose dark:prose-invert max-w-none bg-background">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                >
                    {file.content}
                </ReactMarkdown>
            </div>
        </MarkdownContext.Provider>
    );
};

import { type FC, useState } from 'react';
import { Button } from '../ui/Button';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface CommentInputProps {
    startLine: number;
    endLine: number;
    onCancel: () => void;
    onSubmit: (text: string) => Promise<void>;
}

export const CommentInput: FC<CommentInputProps> = ({
    startLine,
    endLine,
    onCancel,
    onSubmit,
}) => {
    const [commentText, setCommentText] = useState('');

    const handleSubmit = async () => {
        if (!commentText.trim())
            return;
        await onSubmit(commentText.trim());
        setCommentText('');
    };

    const { handleKeyDown } = useKeyboardShortcuts({
        SUBMIT_COMMENT: (e) => {
            e.preventDefault();
            handleSubmit();
        },
    });

    const rangeText = startLine === endLine
        ? `Commenting on line ${startLine}`
        : `Commenting on lines ${startLine}-${endLine}`;

    return (
        <div className="flex bg-muted/10 border-t border-border/30 font-sans">
            <div className="w-[88px] border-r border-border/50" />
            <div className="flex-1 p-4">
                <div className="bg-card border border-border rounded-lg shadow-sm p-3 space-y-3 ring-1 ring-primary/20">
                    <div className="text-xs text-muted-foreground pb-2 border-b border-border/50">
                        {rangeText}
                    </div>
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
                                setCommentText('');
                                onCancel();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={!commentText.trim()}
                        >
                            Add comment
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

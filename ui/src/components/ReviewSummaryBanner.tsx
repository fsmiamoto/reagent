import type { FC } from 'react';
import { MessageSquare } from 'lucide-react';
import type { ReviewStatus } from '../types';
import { cn } from '../lib/utils';

interface ReviewSummaryBannerProps {
    status: ReviewStatus;
    generalFeedback: string;
    commentCount: number;
}

/**
 * Banner displaying review summary for completed reviews
 */
export const ReviewSummaryBanner: FC<ReviewSummaryBannerProps> = ({
    status,
    generalFeedback,
    commentCount,
}) => {
    if (status === 'pending') return null;

    const statusStyles = {
        approved: {
            bg: 'bg-success/10 border-success/30',
            icon: 'text-success',
            label: 'Approved',
        },
        changes_requested: {
            bg: 'bg-warning/10 border-warning/30',
            icon: 'text-warning',
            label: 'Changes Requested',
        },
        cancelled: {
            bg: 'bg-muted/10 border-muted/30',
            icon: 'text-muted-foreground',
            label: 'Cancelled',
        },
    };

    const style = statusStyles[status] || statusStyles.cancelled;

    return (
        <div className={cn(
            'border-b px-6 py-4',
            style.bg
        )}>
            <div className="flex items-start gap-3">
                <MessageSquare className={cn('h-5 w-5 mt-0.5 flex-shrink-0', style.icon)} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">
                            Review Summary
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                        </span>
                    </div>
                    {generalFeedback ? (
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                            {generalFeedback}
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">
                            No general feedback provided
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

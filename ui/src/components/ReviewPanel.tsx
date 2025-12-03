import type { FC } from 'react';
import { Button } from './ui/Button';
import { Check, X, MessageSquare } from 'lucide-react';

interface ReviewPanelProps {
  generalFeedback: string;
  onFeedbackChange: (feedback: string) => void;
  onApprove: () => void;
  onRequestChanges: () => void;
  isSubmitting: boolean;
  commentCount: number;
}

export const ReviewPanel: FC<ReviewPanelProps> = ({
  generalFeedback,
  onFeedbackChange,
  onApprove,
  onRequestChanges,
  isSubmitting,
  commentCount,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Review Summary
        </h2>
        <p className="text-xs text-muted-foreground">{commentCount} comments in this review</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          General Feedback
        </label>
        <textarea
          value={generalFeedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          placeholder="Add your overall feedback..."
          className="w-full h-32 bg-background/50 backdrop-blur-sm text-foreground border border-border/60 rounded-md p-3 text-sm resize-none focus:ring-2 focus:ring-primary/50 focus:outline-none focus:border-primary/30 placeholder:text-muted-foreground transition-all duration-200"
        />
      </div>

      <div className="space-y-2">
        <div className="grid gap-2">
          <Button
            onClick={onApprove}
            disabled={isSubmitting}
            className="w-full bg-success hover:bg-success/90 text-success-foreground"
            loading={isSubmitting}
          >
            {!isSubmitting && <Check className="mr-2 h-4 w-4" />}
            Approve Changes
          </Button>

          <Button
            onClick={onRequestChanges}
            disabled={isSubmitting}
            variant="destructive"
            className="w-full"
            loading={isSubmitting}
          >
            {!isSubmitting && <X className="mr-2 h-4 w-4" />}
            Request Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

import type { FC } from 'react';

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
    <div className="w-96 bg-[var(--bg-surface)] border-l border-[var(--border-default)] flex flex-col">
      <div className="p-4 border-b border-[var(--border-default)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Review Summary</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">{commentCount} comments</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            General Feedback
          </label>
          <textarea
            value={generalFeedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            placeholder="Add your overall feedback about the changes..."
            className="w-full h-40 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-default)] rounded p-3 text-sm resize-none focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="mt-6">
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Choose an action to complete your review:
          </p>

          <div className="space-y-3">
            <button
              onClick={onApprove}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-[var(--success)] text-white rounded font-medium text-sm hover:bg-[var(--success-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                  <span>Approve Changes</span>
                </>
              )}
            </button>

            <button
              onClick={onRequestChanges}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-[var(--danger)] text-white rounded font-medium text-sm hover:bg-[var(--danger-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                  </svg>
                  <span>Request Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 p-3 bg-[var(--bg-input)] border border-[var(--border-default)] rounded">
          <p className="text-xs text-[var(--text-muted)]">
            💡 <strong>Tip:</strong> You can click the <strong>+</strong> button next to any
            line number to add inline comments.
          </p>
        </div>
      </div>
    </div>
  );
};

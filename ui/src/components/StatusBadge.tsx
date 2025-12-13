import type { ReviewStatus } from '../types';

/**
 * Status badge styling based on review status
 */
export function getStatusStyles(status: ReviewStatus): { bg: string; text: string; dot: string } {
    switch (status) {
        case 'pending':
            return {
                bg: 'bg-primary/10',
                text: 'text-primary',
                dot: 'bg-primary animate-pulse'
            };
        case 'approved':
            return {
                bg: 'bg-success/10',
                text: 'text-success',
                dot: 'bg-success'
            };
        case 'changes_requested':
            return {
                bg: 'bg-warning/10',
                text: 'text-warning',
                dot: 'bg-warning'
            };
        default:
            return {
                bg: 'bg-muted/10',
                text: 'text-muted-foreground',
                dot: 'bg-muted-foreground'
            };
    }
}

export function StatusBadge({ status }: { status: ReviewStatus }) {
    const styles = getStatusStyles(status);
    const label = status === 'changes_requested' ? 'Changes Requested' : status.charAt(0).toUpperCase() + status.slice(1);

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            {label}
        </span>
    );
}

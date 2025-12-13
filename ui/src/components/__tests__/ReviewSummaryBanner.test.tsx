import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ReviewSummaryBanner } from '../ReviewSummaryBanner';

describe('ReviewSummaryBanner', () => {
    it('should not render for pending status', () => {
        const { container } = render(
            <ReviewSummaryBanner
                status="pending"
                generalFeedback="Some feedback"
                commentCount={3}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('should render for approved status', () => {
        render(
            <ReviewSummaryBanner
                status="approved"
                generalFeedback="Great work!"
                commentCount={2}
            />
        );
        expect(screen.getByText('Review Summary')).toBeDefined();
        expect(screen.getByText('Great work!')).toBeDefined();
        expect(screen.getByText('2 comments')).toBeDefined();
    });

    it('should render for changes_requested status', () => {
        render(
            <ReviewSummaryBanner
                status="changes_requested"
                generalFeedback="Please fix the issues"
                commentCount={5}
            />
        );
        expect(screen.getByText('Review Summary')).toBeDefined();
        expect(screen.getByText('Please fix the issues')).toBeDefined();
        expect(screen.getByText('5 comments')).toBeDefined();
    });

    it('should show singular "comment" for count of 1', () => {
        render(
            <ReviewSummaryBanner
                status="approved"
                generalFeedback="LGTM"
                commentCount={1}
            />
        );
        expect(screen.getByText('1 comment')).toBeDefined();
    });

    it('should show placeholder when no general feedback', () => {
        render(
            <ReviewSummaryBanner
                status="approved"
                generalFeedback=""
                commentCount={0}
            />
        );
        expect(screen.getByText('No general feedback provided')).toBeDefined();
    });

    it('should have success styling for approved status', () => {
        const { container } = render(
            <ReviewSummaryBanner
                status="approved"
                generalFeedback="Good"
                commentCount={1}
            />
        );
        const banner = container.firstChild as HTMLElement;
        expect(banner.className).toContain('bg-success');
    });

    it('should have warning styling for changes_requested status', () => {
        const { container } = render(
            <ReviewSummaryBanner
                status="changes_requested"
                generalFeedback="Fix this"
                commentCount={1}
            />
        );
        const banner = container.firstChild as HTMLElement;
        expect(banner.className).toContain('bg-warning');
    });

    it('should preserve whitespace in feedback', () => {
        render(
            <ReviewSummaryBanner
                status="approved"
                generalFeedback="Line 1\nLine 2"
                commentCount={0}
            />
        );
        const feedbackElement = screen.getByText(/Line 1/);
        expect(feedbackElement.className).toContain('whitespace-pre-wrap');
    });
});

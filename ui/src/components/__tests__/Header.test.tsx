import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';

describe('Header', () => {
    const defaultProps = {
        title: 'Test Review',
        isSidebarOpen: true,
        onToggleSidebar: vi.fn(),
    };

    it('should render title', () => {
        render(<Header {...defaultProps} />);
        expect(screen.getByText('Test Review')).toBeDefined();
    });

    it('should render description when provided', () => {
        render(<Header {...defaultProps} description="Test description" />);
        expect(screen.getByText('Test description')).toBeDefined();
    });

    it('should not render description when not provided', () => {
        render(<Header {...defaultProps} />);
        expect(screen.queryByText('Test description')).toBeNull();
    });

    it('should call onToggleSidebar when toggle button clicked', () => {
        const onToggle = vi.fn();
        render(<Header {...defaultProps} onToggleSidebar={onToggle} />);

        const button = screen.getByTitle('Close file tree');
        fireEvent.click(button);

        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should show "Open file tree" button when sidebar is closed', () => {
        render(<Header {...defaultProps} isSidebarOpen={false} />);
        expect(screen.getByTitle('Open file tree')).toBeDefined();
    });

    it('should render status badge when status is provided', () => {
        render(<Header {...defaultProps} status="approved" />);
        expect(screen.getByText('Approved')).toBeDefined();
    });

    it('should render pending status badge', () => {
        render(<Header {...defaultProps} status="pending" />);
        expect(screen.getByText('Pending')).toBeDefined();
    });

    it('should render changes_requested status badge', () => {
        render(<Header {...defaultProps} status="changes_requested" />);
        expect(screen.getByText('Changes Requested')).toBeDefined();
    });

    it('should not render status badge when status not provided', () => {
        render(<Header {...defaultProps} />);
        expect(screen.queryByText('Approved')).toBeNull();
        expect(screen.queryByText('Pending')).toBeNull();
        expect(screen.queryByText('Changes Requested')).toBeNull();
    });

    it('should render children', () => {
        render(
            <Header {...defaultProps}>
                <button>Child Button</button>
            </Header>
        );
        expect(screen.getByText('Child Button')).toBeDefined();
    });

    it('should render ReAgent branding with link to dashboard', () => {
        render(<Header {...defaultProps} />);
        const link = screen.getByTitle('Back to Dashboard');
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe('/');
    });
});

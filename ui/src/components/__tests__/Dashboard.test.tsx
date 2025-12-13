import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from '../Dashboard';
import { api } from '../../api/client';
import type { SessionSummary } from '../../types';

// Mock the API client
vi.mock('../../api/client', () => ({
    api: {
        getSessions: vi.fn(),
    },
}));

// Mock ThemeToggle to simplify tests
vi.mock('../ThemeToggle', () => ({
    ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

describe('Dashboard', () => {
    const mockSessions: SessionSummary[] = [
        {
            id: 'session-1',
            status: 'pending',
            filesCount: 3,
            title: 'Add new feature',
            description: 'This is a feature PR',
            createdAt: new Date().toISOString(),
        },
        {
            id: 'session-2',
            status: 'approved',
            filesCount: 1,
            title: 'Fix bug',
            createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        },
        {
            id: 'session-3',
            status: 'changes_requested',
            filesCount: 5,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should show loading state initially', () => {
        vi.mocked(api.getSessions).mockImplementation(() => new Promise(() => { })); // Never resolves
        render(<Dashboard />);
        expect(screen.getByText('Loading reviews...')).toBeDefined();
    });

    it('should display sessions after loading', async () => {
        vi.mocked(api.getSessions).mockResolvedValue(mockSessions);
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Add new feature')).toBeDefined();
        });

        expect(screen.getByText('Fix bug')).toBeDefined();
        expect(screen.getByText('3 files')).toBeDefined();
        expect(screen.getByText('1 file')).toBeDefined();
    });

    it('should display empty state when no sessions', async () => {
        vi.mocked(api.getSessions).mockResolvedValue([]);
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('No Reviews Yet')).toBeDefined();
        });
    });

    it('should display error state on API failure', async () => {
        vi.mocked(api.getSessions).mockRejectedValue(new Error('Network error'));
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Failed to Load Reviews')).toBeDefined();
        });

        expect(screen.getByText('Network error')).toBeDefined();
    });

    it('should refresh sessions when clicking refresh button', async () => {
        vi.mocked(api.getSessions).mockResolvedValue(mockSessions);
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Add new feature')).toBeDefined();
        });

        // Click refresh
        const refreshButton = screen.getByTitle('Refresh');
        fireEvent.click(refreshButton);

        expect(api.getSessions).toHaveBeenCalledTimes(2);
    });

    it('should display reviews count in header', async () => {
        vi.mocked(api.getSessions).mockResolvedValue(mockSessions);
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('3 reviews in total')).toBeDefined();
        });
    });

    it('should display singular form for 1 review', async () => {
        vi.mocked(api.getSessions).mockResolvedValue([mockSessions[0]]);
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('1 review in total')).toBeDefined();
        });
    });

    it('should show status badges with correct labels', async () => {
        vi.mocked(api.getSessions).mockResolvedValue(mockSessions);
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Pending')).toBeDefined();
        });

        expect(screen.getByText('Approved')).toBeDefined();
        expect(screen.getByText('Changes Requested')).toBeDefined();
    });

    it('should sort sessions by creation date (newest first)', async () => {
        const unsortedSessions: SessionSummary[] = [
            { ...mockSessions[1] }, // 1 hour ago
            { ...mockSessions[0] }, // now
        ];
        vi.mocked(api.getSessions).mockResolvedValue(unsortedSessions);
        const { container } = render(<Dashboard />);

        await waitFor(() => {
            // Get session cards (buttons in the grid, not header buttons)
            const cards = container.querySelectorAll('main button');
            // First card should be the newest
            expect(cards[0].textContent).toContain('Add new feature');
        });
    });

    it('should fallback to session ID when title is missing', async () => {
        vi.mocked(api.getSessions).mockResolvedValue([mockSessions[2]]);
        render(<Dashboard />);

        await waitFor(() => {
            // Session ID is 'session-3', displayed as first 8 chars
            expect(screen.getByText(/Review session-/)).toBeDefined();
        });
    });

    it('should render ReAgent branding in header', async () => {
        vi.mocked(api.getSessions).mockResolvedValue([]);
        render(<Dashboard />);

        // Check header contains the branding with Agent text
        expect(screen.getByText('Agent')).toBeDefined();
    });
});

import { create } from 'zustand';
import type { ReviewSession } from '../types';
import { api } from '../api/client';

interface ReviewStore {
  session: ReviewSession | null;
  selectedFile: string | null;
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;

  // Actions
  loadSession: (sessionId: string) => Promise<void>;
  setSelectedFile: (filePath: string) => void;
  addComment: (filePath: string, lineNumber: number, text: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  updateGeneralFeedback: (feedback: string) => void;
  completeReview: (status: 'approved' | 'changes_requested') => Promise<void>;
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  session: null,
  selectedFile: null,
  isLoading: false,
  error: null,
  isSubmitting: false,

  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });

    try {
      const session = await api.getSession(sessionId);
      set({
        session,
        selectedFile: session.files[0]?.path || null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load session',
        isLoading: false,
      });
    }
  },

  setSelectedFile: (filePath: string) => {
    set({ selectedFile: filePath });
  },

  addComment: async (filePath: string, lineNumber: number, text: string) => {
    const { session } = get();
    if (!session) return;

    try {
      const comment = await api.addComment(session.id, filePath, lineNumber, text);

      set({
        session: {
          ...session,
          comments: [...session.comments, comment],
        },
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  },

  deleteComment: async (commentId: string) => {
    const { session } = get();
    if (!session) return;

    try {
      await api.deleteComment(session.id, commentId);

      set({
        session: {
          ...session,
          comments: session.comments.filter((c) => c.id !== commentId),
        },
      });
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  },

  updateGeneralFeedback: (feedback: string) => {
    const { session } = get();
    if (!session) return;

    set({
      session: {
        ...session,
        generalFeedback: feedback,
      },
    });
  },

  completeReview: async (status: 'approved' | 'changes_requested') => {
    const { session } = get();
    if (!session) return;

    set({ isSubmitting: true, error: null });

    try {
      await api.completeReview(session.id, status, session.generalFeedback);

      set({
        session: {
          ...session,
          status,
        },
        isSubmitting: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to complete review',
        isSubmitting: false,
      });
      throw error;
    }
  },
}));

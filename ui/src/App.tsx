import { useEffect } from 'react';
import { useReviewStore } from './store/reviewStore';
import { FileTree } from './components/FileTree';
import { DiffViewer } from './components/DiffViewer';
import { ReviewPanel } from './components/ReviewPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { useThemeStore } from './store/themeStore';

function App() {
  const { theme } = useThemeStore();
  const {
    session,
    selectedFile,
    isLoading,
    error,
    isSubmitting,
    loadSession,
    setSelectedFile,
    addComment,
    deleteComment,
    updateGeneralFeedback,
    completeReview,
  } = useReviewStore();

  useEffect(() => {
    // Extract session ID from URL path: /review/:sessionId
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1];

    if (sessionId && sessionId !== 'review') {
      loadSession(sessionId);
    }
  }, [loadSession]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleApprove = async () => {
    try {
      await completeReview('approved');
    } catch (error) {
      console.error('Failed to approve review:', error);
    }
  };

  const handleRequestChanges = async () => {
    try {
      await completeReview('changes_requested');
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-soft)]"></div>
          <p className="mt-4 text-[var(--text-muted)]">Loading review session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center max-w-md">
          <svg
            className="mx-auto h-12 w-12 text-[var(--text-danger)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Error Loading Review</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center">
          <p className="text-[var(--text-muted)]">No review session found</p>
        </div>
      </div>
    );
  }

  const selectedFileData = session.files.find((f) => f.path === selectedFile);

  if (session.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center max-w-md">
          <svg
            className="mx-auto h-16 w-16 text-[var(--success)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Review Completed</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            This review has already been {session.status === 'approved' ? 'approved' : 'submitted'}.
            You can close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {session.title || 'Code Review'}
            </h1>
            {session.description && (
              <p className="text-sm text-[var(--text-muted)] mt-1">{session.description}</p>
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        <FileTree
          files={session.files}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          comments={session.comments}
        />

        {/* Diff viewer */}
        {selectedFileData && (
          <DiffViewer
            file={selectedFileData}
            comments={session.comments}
            onAddComment={async (lineNumber, text) => {
              await addComment(selectedFileData.path, lineNumber, text);
            }}
            onDeleteComment={deleteComment}
          />
        )}

        {/* Review panel */}
        <ReviewPanel
          generalFeedback={session.generalFeedback}
          onFeedbackChange={updateGeneralFeedback}
          onApprove={handleApprove}
          onRequestChanges={handleRequestChanges}
          isSubmitting={isSubmitting}
          commentCount={session.comments.length}
        />
      </div>
    </div>
  );
}

export default App;

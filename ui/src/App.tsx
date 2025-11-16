import { useEffect } from 'react';
import { useReviewStore } from './store/reviewStore';
import { FileTree } from './components/FileTree';
import { DiffViewer } from './components/DiffViewer';
import { ReviewPanel } from './components/ReviewPanel';

function App() {
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

  const handleApprove = async () => {
    try {
      await completeReview('approved');
      // Show success message
      alert('Review approved! You can close this window.');
    } catch (error) {
      console.error('Failed to approve review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  const handleRequestChanges = async () => {
    try {
      await completeReview('changes_requested');
      // Show success message
      alert('Review submitted! You can close this window.');
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#58a6ff]"></div>
          <p className="mt-4 text-[#8b949e]">Loading review session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-center max-w-md">
          <svg
            className="mx-auto h-12 w-12 text-[#f85149]"
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
          <h2 className="mt-4 text-lg font-semibold text-[#c9d1d9]">Error Loading Review</h2>
          <p className="mt-2 text-sm text-[#8b949e]">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-center">
          <p className="text-[#8b949e]">No review session found</p>
        </div>
      </div>
    );
  }

  const selectedFileData = session.files.find((f) => f.path === selectedFile);

  if (session.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-center max-w-md">
          <svg
            className="mx-auto h-16 w-16 text-[#238636]"
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
          <h2 className="mt-4 text-lg font-semibold text-[#c9d1d9]">Review Completed</h2>
          <p className="mt-2 text-sm text-[#8b949e]">
            This review has already been {session.status === 'approved' ? 'approved' : 'submitted'}.
            You can close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Header */}
      <header className="bg-[#161b22] border-b border-[#30363d] px-6 py-4">
        <h1 className="text-xl font-bold text-[#c9d1d9]">
          {session.title || 'Code Review'}
        </h1>
        {session.description && (
          <p className="text-sm text-[#8b949e] mt-1">{session.description}</p>
        )}
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

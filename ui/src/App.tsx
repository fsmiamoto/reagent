import { useEffect, useState, useRef, useCallback } from 'react';
import { useReviewStore } from './store/reviewStore';
import { FileTree } from './components/FileTree';
import { DiffViewer } from './components/DiffViewer';
import { ReviewPanel } from './components/ReviewPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { useThemeStore } from './store/themeStore';
import { Layout } from './components/Layout';
import { Header } from './components/Header';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/Popover';

function App() {
  const { theme } = useThemeStore();
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
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

  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isScrollingRef = useRef(false);

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
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Scroll spy implementation
  useEffect(() => {
    if (isLoading || !session?.files) return;

    const options = {
      root: null,
      rootMargin: '-20% 0px -80% 0px', // Trigger when file is near top
      threshold: 0
    };

    observerRef.current = new IntersectionObserver((entries) => {
      if (isScrollingRef.current) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const filePath = entry.target.getAttribute('data-file-path');
          if (filePath) {
            setSelectedFile(filePath);
          }
        }
      });
    }, options);

    Object.values(fileRefs.current).forEach((el) => {
      if (el) observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [isLoading, session?.files, setSelectedFile]);

  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedFile(filePath);
    isScrollingRef.current = true;

    const element = fileRefs.current[filePath];
    if (element) {
      // Use auto behavior for instant scrolling to avoid the "slow" feeling
      element.scrollIntoView({ behavior: 'auto', block: 'start' });
      // Reset scrolling flag quickly since we're not animating
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 100);
    }
  }, [setSelectedFile]);

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading review session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Error Loading Review</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">No review session found</p>
        </div>
      </div>
    );
  }

  if (session.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Review Completed</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This review has already been {session.status === 'approved' ? 'approved' : 'submitted'}.
            You can close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      header={
        <Header
          title={session.title || 'Code Review'}
          description={session.description}
          isSidebarOpen={isLeftSidebarOpen}
          onToggleSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        >
          <ThemeToggle />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white">
                Review changes
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
              <ReviewPanel
                generalFeedback={session.generalFeedback}
                onFeedbackChange={updateGeneralFeedback}
                onApprove={handleApprove}
                onRequestChanges={handleRequestChanges}
                isSubmitting={isSubmitting}
                commentCount={session.comments.length}
              />
            </PopoverContent>
          </Popover>
        </Header>
      }
      sidebar={
        isLeftSidebarOpen ? (
          <FileTree
            files={session.files}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            comments={session.comments}
          />
        ) : null
      }
    >
      <div className="flex flex-col gap-8 p-6 pb-20">
        {session.files.map((file) => (
          <div
            key={file.path}
            ref={(el) => (fileRefs.current[file.path] = el)}
            data-file-path={file.path}
            className="scroll-mt-20"
          >
            <DiffViewer
              file={file}
              comments={session.comments}
              onAddComment={async (lineNumber, text) => {
                await addComment(file.path, lineNumber, text);
              }}
              onDeleteComment={deleteComment}
            />
          </div>
        ))}

        {session.files.length === 0 && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>No files to review</p>
            </div>
          </div>
        )}
      </div>
    </Layout >
  );
}

export default App;

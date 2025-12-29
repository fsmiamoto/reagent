import { useEffect, useState } from "react";
import { useReviewStore } from "../store/reviewStore";
import { FileTree } from "./FileTree";
import { DiffViewer } from "./DiffViewer";
import { ReviewPanel } from "./ReviewPanel";
import { ReviewSummaryBanner } from "./ReviewSummaryBanner";
import { ThemeToggle } from "./ThemeToggle";
import { SettingsPopup } from "./SettingsPopup";
import { Layout } from "./Layout";
import { Header } from "./Header";
import { Loader2, AlertCircle, Home } from "lucide-react";
import { Button } from "./ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover";
import { useScrollSpy } from "../hooks/useScrollSpy";

interface ReviewViewProps {
  sessionId: string;
}

export function ReviewView({ sessionId }: ReviewViewProps) {
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

  useEffect(() => {
    if (sessionId && sessionId !== "review") {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  const { handleFileSelect, setFileRef } = useScrollSpy({
    isLoading,
    files: session?.files,
    setSelectedFile,
  });

  const navigateToDashboard = () => {
    window.location.href = "/";
  };

  const handleApprove = async () => {
    try {
      await completeReview("approved");
    } catch (error) {
      console.error("Failed to approve review:", error);
    }
  };

  const handleRequestChanges = async () => {
    try {
      await completeReview("changes_requested");
    } catch (error) {
      console.error("Failed to submit review:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">
            Loading review session...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Error Loading Review
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            onClick={navigateToDashboard}
            className="mt-4"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">No review session found</p>
          <Button
            variant="outline"
            onClick={navigateToDashboard}
            className="mt-4"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isCompleted = session.status !== "pending";

  return (
    <Layout
      header={
        <Header
          title={session.title || "Code Review"}
          description={session.description}
          status={session.status}
          isSidebarOpen={isLeftSidebarOpen}
          onToggleSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        >
          <SettingsPopup />
          <ThemeToggle />
          {!isCompleted && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Submit review
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
          )}
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
      {isCompleted && (
        <ReviewSummaryBanner
          status={session.status}
          generalFeedback={session.generalFeedback}
          commentCount={session.comments.length}
        />
      )}
      <div className="flex flex-col gap-8 p-6 pb-20">
        {session.files.map((file) => (
          <div
            key={file.path}
            ref={(el) => setFileRef(file.path, el)}
            data-file-path={file.path}
            className="scroll-mt-20 animate-fade-in"
          >
            <DiffViewer
              file={file}
              comments={session.comments}
              onAddComment={async (startLine, endLine, side, text) => {
                await addComment(file.path, startLine, endLine, side, text);
              }}
              onDeleteComment={deleteComment}
              readOnly={isCompleted}
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
    </Layout>
  );
}

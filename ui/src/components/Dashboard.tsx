import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { SessionSummary } from "../types";
import {
  FlaskConical,
  Loader2,
  AlertCircle,
  FileText,
  Clock,
  RefreshCw,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/Button";
import { StatusBadge } from "./StatusBadge";

/**
 * Format relative time from a date
 */
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function Dashboard() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setError(null);
      const data = await api.getSessions();
      // Sort by createdAt descending (newest first)
      data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchSessions();
  };

  const navigateToReview = (sessionId: string) => {
    window.location.href = `/review/${sessionId}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <FlaskConical className="h-6 w-6" />
            <span className="font-display font-bold tracking-tight text-lg">
              Re<span className="text-secondary">Agent</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh"
              className="h-8 w-8"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Reviews
          </h1>
          <p className="text-muted-foreground mt-1">
            {sessions.length} {sessions.length === 1 ? "review" : "reviews"} in
            total
          </p>
        </div>

        {/* Loading State */}
        {isLoading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading reviews...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              Failed to Load Reviews
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              {error}
            </p>
            <Button variant="outline" onClick={handleRefresh} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              No Reviews Yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Create your first review using the CLI or MCP integration.
            </p>
          </div>
        )}

        {/* Session Grid */}
        {!error && sessions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => navigateToReview(session.id)}
                className="group text-left p-5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm 
                         hover:border-primary/40 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5
                         transition-all duration-200 animate-fade-in cursor-pointer"
              >
                {/* Status Badge */}
                <div className="mb-3">
                  <StatusBadge status={session.status} />
                </div>

                {/* Title */}
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {session.title || `Review ${session.id.slice(0, 8)}`}
                </h3>

                {/* Description */}
                {session.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {session.description}
                  </p>
                )}

                {/* Meta Info */}
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {session.filesCount}{" "}
                    {session.filesCount === 1 ? "file" : "files"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelativeTime(session.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

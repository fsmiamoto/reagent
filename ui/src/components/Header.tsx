import { FlaskConical, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";
import type { ReviewStatus } from "../types";

interface HeaderProps {
  title: string;
  description?: string;
  status?: ReviewStatus;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  description,
  status,
  isSidebarOpen,
  onToggleSidebar,
  children,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 px-6 backdrop-blur-xl shadow-sm flex-shrink-0",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Close file tree" : "Open file tree"}
          className="h-8 w-8"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>

        <div className="h-4 w-[1px] bg-border mx-2" />

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity"
            title="Back to Dashboard"
          >
            <FlaskConical className="h-5 w-5" />
            <span className="font-display font-bold tracking-tight hidden sm:inline-block text-base">
              Re<span className="text-secondary">Agent</span>
            </span>
          </a>
          <span className="text-muted-foreground">/</span>
          <div className="flex flex-col justify-center">
            <h1 className="text-sm font-display font-semibold leading-none">
              {title}
            </h1>
            {description && (
              <p
                className="text-[10px] text-muted-foreground line-clamp-1 max-w-[300px] mt-0.5"
                title={description}
              >
                {description}
              </p>
            )}
          </div>
          {status && (
            <div className="ml-2">
              <StatusBadge status={status} />
            </div>
          )}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  );
}

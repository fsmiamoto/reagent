# ReAgent Product Requirements Document

## 1. Product Overview

### 1.1 Product Summary
ReAgent (Reviews for your Agent) is a lightweight Model Context Protocol (MCP) server that provides a GitHub-style code review interface for AI coding assistants. It enables human-in-the-loop review of AI-generated code through an interactive browser-based UI.

### 1.2 Problem Statement
In the age of AI coding assistants, ensuring high-quality output is essential. Developers need to provide detailed, line-specific feedback to AI agents, but:
- Pointing to specific lines through chat is clunky and error-prone
- Setting up GitHub PRs for local work-in-progress is overkill
- There's no efficient feedback loop between humans and AI coding assistants

### 1.3 Solution
ReAgent bridges this gap by providing:
- A familiar, GitHub-style review interface that opens directly in the browser
- Line-level commenting capabilities
- An approve/request changes workflow that AI agents can consume programmatically
- Git integration for reviewing uncommitted changes, commits, or branch diffs

---

## 2. Target Audience

### 2.1 Primary Users
- **Developers using AI coding assistants** (e.g., Claude, Cursor, GitHub Copilot) who need to review and provide feedback on AI-generated code
- **Teams adopting AI pair programming** who want quality control over AI contributions

### 2.2 User Personas

#### Persona 1: Solo Developer with AI Assistant
- Uses AI coding tools daily for productivity
- Needs quick, efficient way to review and approve AI changes
- Values speed and minimal context switching

#### Persona 2: Team Lead with AI Adoption
- Oversees team's use of AI coding tools
- Needs to ensure AI-generated code meets quality standards
- Values traceability and structured feedback

---

## 3. User Stories and Acceptance Criteria

### US-1: Review Uncommitted Git Changes

**As a** developer using an AI coding assistant,  
**I want to** review all uncommitted changes in my Git repository,  
**So that** I can verify the AI's work before committing.

#### Acceptance Criteria
| ID | Criterion |
|----|-----------|
| AC-1.1 | When I invoke `create_review` with `source: "uncommitted"`, a new review session is created containing all staged, unstaged, and untracked files |
| AC-1.2 | The browser automatically opens to the review URL (unless `openBrowser: false`) |
| AC-1.3 | Each file shows a diff between the HEAD version and the current working tree content |
| AC-1.4 | I can filter to specific files by providing a `files` array |
| AC-1.5 | Directories in the `files` array include all files within that directory recursively |
| AC-1.6 | The system returns an error if there are no uncommitted changes |

---

### US-2: Review Specific Git Commit

**As a** developer reviewing AI-generated commits,  
**I want to** review the changes introduced by a specific commit,  
**So that** I can audit what the AI changed in a past commit.

#### Acceptance Criteria
| ID | Criterion |
|----|-----------|
| AC-2.1 | When I invoke `create_review` with `source: "commit"` and a `commitHash`, a review session is created for that commit |
| AC-2.2 | The diff shows changes between the parent commit and the specified commit |
| AC-2.3 | The system auto-detects commit mode if `commitHash` is provided (even without explicit `source`) |
| AC-2.4 | Invalid commit hashes result in a clear error message |

---

### US-3: Compare Git Branches

**As a** developer reviewing a feature branch,  
**I want to** compare two branches and review the differences,  
**So that** I can verify AI changes before merging.

#### Acceptance Criteria
| ID | Criterion |
|----|-----------|
| AC-3.1 | When I invoke `create_review` with `source: "branch"`, `base`, and `head`, a review session shows differences between the branches |
| AC-3.2 | The system auto-detects branch mode if `base` or `head` is provided |
| AC-3.3 | The diff shows what would be merged if merging `head` into `base` |
| AC-3.4 | Invalid branch names result in a clear error message |

---

### US-4: Review Local Files Without Git

**As a** developer reviewing AI-generated implementation plans,  
**I want to** review arbitrary local files without Git tracking,  
**So that** I can review AI artifacts that aren't version controlled.

#### Acceptance Criteria
| ID | Criterion |
|----|-----------|
| AC-4.1 | When I invoke `create_review` with `source: "local"` and a `files` array, the specified files are loaded directly from the filesystem |
| AC-4.2 | Files are displayed in their entirety (no diff - treated as "new" files) |
| AC-4.3 | Non-existent files are skipped with a warning, not a hard error |
| AC-4.4 | Directories are not supported in local mode; only file paths are accepted |

---

### US-5: Manage Review Sessions

**As a** developer managing multiple review sessions,  
**I want to** list, retrieve, and track active review sessions,  
**So that** I can manage my review workflow efficiently.

#### Acceptance Criteria
| ID | Criterion |
|----|-----------|
| AC-5.1 | The `list` command shows all active sessions with ID, status, file count, title, and creation time |
| AC-5.2 | The `get` command retrieves a specific session's status and results |
| AC-5.3 | With `--wait` flag on `get`, the command blocks until the review is completed |
| AC-5.4 | Sessions have a 30-minute timeout by default, after which they are auto-cancelled |
| AC-5.5 | Old completed sessions are cleaned up after 24 hours |
| AC-5.6 | Session data includes: ID, title, description, files, comments, general feedback, status, and creation date |

---

### US-6: Provide Line-Level Code Comments

**As a** reviewer in the browser UI,  
**I want to** add comments on specific lines of code,  
**So that** the AI can understand exactly what needs to change.

#### Acceptance Criteria
| ID | Criterion |
|----|-----------|
| AC-6.1 | I can click on any line in the diff view to open a comment input |
| AC-6.2 | Comments are associated with a file path and line number |
| AC-6.3 | I can view all existing comments inline with the code |
| AC-6.4 | I can delete comments before submitting the review |
| AC-6.5 | Comments can be added via keyboard shortcut (`Cmd+Enter` / `Ctrl+Enter` to save) |
| AC-6.6 | The file tree shows comment counts per file and folder |
| AC-6.7 | I can add comments in both Unified diff view and Split diff view |
| AC-6.8 | Comments persist in the session until it is completed or cancelled |

---

### US-7: Complete a Code Review

**As a** reviewer in the browser UI,  
**I want to** approve or request changes with overall feedback,  
**So that** the AI can proceed or revise based on my decision.

#### Acceptance Criteria
| ID | Criterion |
|----|-----------|
| AC-7.1 | The review panel shows a "Review changes" button that opens a popover |
| AC-7.2 | I can enter general feedback text in the review panel |
| AC-7.3 | I can click "Approve Changes" to approve the review |
| AC-7.4 | I can click "Request Changes" to request revisions |
| AC-7.5 | The review panel shows the total comment count |
| AC-7.6 | After completing, the UI shows a "Review Completed" confirmation |
| AC-7.7 | Completing the review resolves the blocking `get_review` MCP call and returns results to the AI agent |
| AC-7.8 | The result includes: status (`approved` or `changes_requested`), general feedback, all comments with file paths and line numbers, and timestamp |

---

### US-8: Configure and Start the Server

**As a** developer using ReAgent,  
**I want to** configure and manage the ReAgent server,  
**So that** I can use it in different environments.

#### Acceptance Criteria
| ID | Criterion |
|----|-----------|
| AC-8.1 | The `start` command launches the web server on port 3636 by default |
| AC-8.2 | The port can be overridden via `--port` flag or `REAGENT_PORT` environment variable |
| AC-8.3 | The `--detach` flag runs the server in the background (daemon mode) |
| AC-8.4 | The `mcp` command starts the MCP server for stdio communication |
| AC-8.5 | The MCP server automatically ensures the web server is running |
| AC-8.6 | The `review --auto-start` flag starts the server if not already running |
| AC-8.7 | A health check endpoint (`/api/health`) reports server status and active session count |
| AC-8.8 | Graceful shutdown cancels all pending sessions when the server stops |

---

## 4. User Interface Requirements

### 4.1 Review Page Layout

| Component | Description |
|-----------|-------------|
| **Header** | Shows review title, description, theme toggle, and "Review changes" button |
| **File Tree Sidebar** | Collapsible tree view of changed files with folder hierarchy and comment counts |
| **Diff Viewer** | Main content area showing file diffs with syntax highlighting |
| **Review Panel** | Popover for entering general feedback and submitting approval/changes |

### 4.2 Diff Viewer Features

| Feature | Description |
|---------|-------------|
| **Unified View** | Single-column diff with additions in green, deletions in red |
| **Split View** | Side-by-side comparison of old and new content |
| **Syntax Highlighting** | Code highlighting based on file language (TypeScript, Python, etc.) |
| **Line Numbers** | Clickable line numbers for adding comments |
| **Comment Display** | Inline comment display with delete capability |
| **Markdown Preview** | Markdown files can be previewed with commenting support |
| **Scroll Spy** | File tree selection updates as user scrolls through files |

### 4.3 Theming

| Theme | Description |
|-------|-------------|
| **Dark Mode** | Tokyo Night color palette for comfortable code review |
| **Light Mode** | Light theme option with appropriate contrast |

---

## 5. MCP Tool Interfaces

### 5.1 create_review Tool

**Purpose**: Create a new review session (Step 1 of 2-step workflow)

**Input Schema**:
```typescript
{
  files?: string[];           // Optional file/directory paths
  source?: 'uncommitted' | 'commit' | 'branch' | 'local';
  commitHash?: string;        // For commit mode
  base?: string;              // For branch comparison
  head?: string;              // For branch comparison
  workingDirectory?: string;  // Git repo path
  title?: string;             // Review title
  description?: string;       // Review description
  openBrowser?: boolean;      // Auto-open browser (default: true)
}
```

**Output**:
```typescript
{
  sessionId: string;          // UUID for the session
  reviewUrl: string;          // Browser URL
  filesCount: number;         // Number of files in review
  title?: string;             // Review title
}
```

### 5.2 get_review Tool

**Purpose**: Retrieve review results (Step 2 of 2-step workflow)

**Input Schema**:
```typescript
{
  sessionId: string;          // Session ID from create_review
  wait?: boolean;             // Block until complete (default: true)
}
```

**Output**:
```typescript
{
  status: 'approved' | 'changes_requested' | 'pending' | 'cancelled';
  generalFeedback?: string;
  comments?: {
    id: string;
    filePath: string;
    lineNumber: number;
    text: string;
    createdAt: Date;
  }[];
  timestamp?: Date;
}
```

---

## 6. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with active session count |
| GET | `/api/sessions` | List all review sessions |
| POST | `/api/reviews` | Create a new review session |
| GET | `/api/sessions/:id` | Get session details |
| POST | `/api/sessions/:id/comments` | Add a comment |
| DELETE | `/api/sessions/:id/comments/:commentId` | Delete a comment |
| POST | `/api/sessions/:id/complete` | Complete the review |
| POST | `/api/sessions/:id/cancel` | Cancel the review |

---

## 7. CLI Commands

| Command | Description | Key Options |
|---------|-------------|-------------|
| `reagent start` | Start the web server | `--port`, `--detach` |
| `reagent mcp` | Start MCP server (stdio) | - |
| `reagent review [files...]` | Create a review session | `--source`, `--commit`, `--base`, `--head`, `--no-open`, `--auto-start` |
| `reagent get <sessionId>` | Get review results | `--wait`, `--json` |
| `reagent list` | List active sessions | `--port` |

---

## 8. Non-Functional Requirements

### 8.1 Performance
- Session data is stored in-memory for fast access
- Support for large files (10MB buffer for git operations)
- Old sessions cleaned up hourly

### 8.2 Compatibility
- Works with any MCP-compatible AI coding assistant
- Supports major programming languages for syntax highlighting
- Cross-platform (macOS, Linux, Windows)

### 8.3 Installation
- Zero-config installation via `npx @fsmiamoto/reagent@latest`
- Single MCP server configuration in client tools

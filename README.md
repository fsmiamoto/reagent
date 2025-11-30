# ReAgent 

> **Re**views for your **Agent**

## Why is this useful?

In the age of AI coding assistants, ensuring their output code is high quality is essencial. 

For that, you often need to provide detailed, line-specific feedback, just like you would do with a human teammate's code.

But pointing to specific lines through chat is clunky, and setting up GitHub PRs for local work-in-progress is overkill.

ReAgent is a lightweight MCP server that opens a familiar, GitHub-style review interface right in your browser to speed your feedback cycles.

![ReAgent Usage](./docs/usage.png)

![Plan Review](./docs/plan_review.png)

## Features

- Interactive browser-based code review UI
- Line-level comments with file tree navigation
- Approve or request changes workflow
- Git integration: review uncommitted changes, specific commits, or branch diffs
- Local file review: review arbitrary files

## Usage

1. Add it as an MCP server to your favorite Agentic coding tool.

```json
{
  "mcpServers": {
    "reagent": {
      "command": "npx",
      "args": ["@fsmiamoto/reagent"]
    }
  }
}
```

### Two-Step Workflow

ReAgent uses a two-step workflow to enable interactive browser-based code reviews:

1. **create_review**: Initiates a review session and returns a URL.
  * Optionally the it can open the browser with the review
2. **get_review**: Retrieves the completed review results

#### Individual Usage Examples

Review uncommitted changes:
```json
{
  "files": ["src/app.ts", "src/utils.ts"],
  "source": "uncommitted"
}
```

Review a specific commit:
```json
{
  "files": ["src/app.ts"],
  "source": "commit",
  "commitHash": "abc123"
}
```

> When `commitHash` or `base/head` are provided, Reagent automatically switches to commit or
> branch comparison mode even if you omit the `source` field.

Compare branches:
```json
{
  "files": ["src/app.ts"],
  "source": "branch",
  "base": "main",
  "head": "feature-branch"
}
```

Review local files without Git:
```json
{
  "files": ["src/app.ts", "README.md"],
  "source": "local"
}
```

> Note: Local mode is useful for reviewing things like implementation plans for agents which you don't want to commit to the repo.

Review every file inside a directory (recursively):
```json
{
  "files": ["src/ui"],
  "source": "uncommitted"
}
```

### Return Values

**create_review returns:**

```typescript
{
  "sessionId": "unique-session-id",
  "reviewUrl": "http://localhost:3000/review/unique-session-id",
  "filesCount": 5,
  "title": "Review title"
}
```

**get_review returns:**

```typescript
{
  "status": "approved" | "changes_requested",
  "generalFeedback": "Overall review comments",
  "comments": [
    {
      "filePath": "src/example.ts",
      "lineNumber": 42,
      "text": "Comment text"
    }
  ],
  "timestamp": "2025-11-29T10:30:00Z"
}
```

## License

MIT

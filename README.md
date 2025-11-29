# ReAgent 

> Code **Re**views for your **Agent**

## Why is this useful?

In the age of AI coding assistants, ensuring their output code is high quality is essencial. 

For that, you often need to provide detailed, line-specific feedback, just like you would do with a human teammate's code.

But pointing to specific lines through chat is clunky, and setting up GitHub PRs for local work-in-progress is overkill.

ReAgent is a lightweight MCP server that opens a familiar, GitHub-style review interface right in your browser to speed your feedback cycles.

![ReAgent Usage](./docs/usage.png)

## Features

- Interactive browser-based code review UI
- Line-level comments with file tree navigation
- Approve or request changes workflow
- Git integration: review uncommitted changes, specific commits, or branch diffs

## Usage

1. Clone the repo locally
1. Run `npm install` and `npm run build`
1. Add it as an MCP server to your favorite Agentic coding tool.

```json
{
  "mcpServers": {
    "reagent": {
      "command": "node",
      "args": ["$PATH_TO_REAGENT_REPO/dist/index.js"]
    }
  }
}
```

### Using the Tool

> Tip: Calling `ask_for_review` with no arguments will automatically review all uncommitted changes
> in your current git repository.

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

Review every file inside a directory (recursively):
```json
{
  "files": ["src/ui"],
  "source": "uncommitted"
}
```

### Return Value

Each review returns the same format:

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
  ]
}
```

## License

MIT

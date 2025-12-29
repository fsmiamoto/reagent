import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CommentList } from "../CommentList";

describe("CommentList", () => {
  const mockComments = [
    {
      id: "1",
      filePath: "test.ts",
      startLine: 10,
      endLine: 10,
      side: "new" as const,
      text: "Comment 1",
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      filePath: "test.ts",
      startLine: 10,
      endLine: 10,
      side: "new" as const,
      text: "Comment 2",
      createdAt: new Date().toISOString(),
    },
    {
      id: "3",
      filePath: "other.ts",
      startLine: 10,
      endLine: 10,
      side: "new" as const,
      text: "Comment 3",
      createdAt: new Date().toISOString(),
    },
    {
      id: "4",
      filePath: "test.ts",
      startLine: 10,
      endLine: 10,
      side: "old" as const,
      text: "Comment on removed line",
      createdAt: new Date().toISOString(),
    },
  ];

  it("should render comments for specific line and side", () => {
    render(
      <CommentList
        comments={mockComments}
        lineNumber={10}
        side="new"
        filePath="test.ts"
        onDeleteComment={vi.fn()}
      />,
    );

    expect(screen.getByText("Comment 1")).toBeDefined();
    expect(screen.getByText("Comment 2")).toBeDefined();
    expect(screen.queryByText("Comment 3")).toBeNull(); // different file
    expect(screen.queryByText("Comment on removed line")).toBeNull(); // different side
  });

  it("should render comments on old side", () => {
    render(
      <CommentList
        comments={mockComments}
        lineNumber={10}
        side="old"
        filePath="test.ts"
        onDeleteComment={vi.fn()}
      />,
    );

    expect(screen.getByText("Comment on removed line")).toBeDefined();
    expect(screen.queryByText("Comment 1")).toBeNull(); // new side
  });

  it("should handle delete", () => {
    const onDeleteComment = vi.fn();
    render(
      <CommentList
        comments={mockComments}
        lineNumber={10}
        side="new"
        filePath="test.ts"
        onDeleteComment={onDeleteComment}
      />,
    );

    const deleteButtons = screen.getAllByTitle("Delete comment");
    fireEvent.click(deleteButtons[0]);

    expect(onDeleteComment).toHaveBeenCalledWith("1");
  });

  it("should render nothing if no comments for line", () => {
    const { container } = render(
      <CommentList
        comments={mockComments}
        lineNumber={99}
        side="new"
        filePath="test.ts"
        onDeleteComment={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should show (removed) label for comments on old side", () => {
    render(
      <CommentList
        comments={mockComments}
        lineNumber={10}
        side="old"
        filePath="test.ts"
        onDeleteComment={vi.fn()}
      />,
    );

    expect(screen.getByText("on line 10 (removed)")).toBeDefined();
  });
});

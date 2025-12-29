import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CommentInput } from "../CommentInput";

describe("CommentInput", () => {
  const defaultProps = {
    startLine: 1,
    endLine: 1,
    side: "new" as const,
    onCancel: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  };

  it("should render comment input", () => {
    render(<CommentInput {...defaultProps} />);
    expect(screen.getByPlaceholderText("Write a comment...")).toBeDefined();
  });

  it("should display single line text", () => {
    render(<CommentInput {...defaultProps} startLine={5} endLine={5} />);
    expect(screen.getByText("Commenting on line 5")).toBeDefined();
  });

  it("should display multi-line range text", () => {
    render(<CommentInput {...defaultProps} startLine={3} endLine={7} />);
    expect(screen.getByText("Commenting on lines 3-7")).toBeDefined();
  });

  it("should call onCancel when cancel is clicked", () => {
    render(<CommentInput {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("should call onSubmit with text when add is clicked", async () => {
    render(<CommentInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Write a comment...");
    fireEvent.change(textarea, { target: { value: "Test comment" } });
    fireEvent.click(screen.getByText("Add comment"));

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith("Test comment");
    });
  });

  it("should disable submit when empty", () => {
    render(<CommentInput {...defaultProps} />);

    const submitButton = screen.getByText("Add comment");
    expect(submitButton.hasAttribute("disabled")).toBe(true);
  });
});

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DiffViewer } from "../DiffViewer";
import { ReviewFile } from "../../../types";
import { useSettingsStore } from "../../../store/settingsStore";

// Mock the settings store
vi.mock("../../../store/settingsStore", () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      defaultViewMode: "unified" as const,
      setDefaultViewMode: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock sub-components to simplify testing
vi.mock("../UnifiedDiffView", () => ({
  UnifiedDiffView: () => (
    <div data-testid="unified-diff-view">Unified View</div>
  ),
}));

vi.mock("../SplitDiffView", () => ({
  SplitDiffView: () => <div data-testid="split-diff-view">Split View</div>,
}));

vi.mock("../FileHeader", () => ({
  FileHeader: ({ onSetViewMode, viewMode }: any) => (
    <div data-testid="file-header">
      <button onClick={() => onSetViewMode("unified")}>Unified</button>
      <button onClick={() => onSetViewMode("split")}>Split</button>
      <span>Current: {viewMode}</span>
    </div>
  ),
}));

const mockFile: ReviewFile = {
  path: "test.ts",
  content: "new content",
  oldContent: "old content",
  language: "typescript",
};

describe("DiffViewer", () => {
  it("should render unified view by default", () => {
    render(
      <DiffViewer
        file={mockFile}
        comments={[]}
        onAddComment={vi.fn()}
        onDeleteComment={vi.fn()}
      />,
    );

    expect(screen.getByTestId("unified-diff-view")).toBeDefined();
  });

  it("should switch views", () => {
    render(
      <DiffViewer
        file={mockFile}
        comments={[]}
        onAddComment={vi.fn()}
        onDeleteComment={vi.fn()}
      />,
    );

    const splitButton = screen.getByText("Split");
    fireEvent.click(splitButton);

    expect(screen.getByTestId("split-diff-view")).toBeDefined();
  });

  it("should show error for invalid file", () => {
    const invalidFile = { ...mockFile, content: undefined } as any;
    render(
      <DiffViewer
        file={invalidFile}
        comments={[]}
        onAddComment={vi.fn()}
        onDeleteComment={vi.fn()}
      />,
    );

    expect(screen.getByText(/Error:/)).toBeDefined();
  });

  describe("global view mode integration", () => {
    it("should use global default view mode", () => {
      // Mock store to return "split"
      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        const state = {
          defaultViewMode: "split" as const,
          setDefaultViewMode: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      render(
        <DiffViewer
          file={mockFile}
          comments={[]}
          onAddComment={vi.fn()}
          onDeleteComment={vi.fn()}
        />,
      );

      expect(screen.getByTestId("split-diff-view")).toBeDefined();
    });

    it("should allow per-file override", () => {
      // Start with unified global default
      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        const state = {
          defaultViewMode: "unified" as const,
          setDefaultViewMode: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      render(
        <DiffViewer
          file={mockFile}
          comments={[]}
          onAddComment={vi.fn()}
          onDeleteComment={vi.fn()}
        />,
      );

      // Should start with unified view
      expect(screen.getByTestId("unified-diff-view")).toBeDefined();

      // Switch to split locally
      fireEvent.click(screen.getByText("Split"));
      expect(screen.getByTestId("split-diff-view")).toBeDefined();
    });
  });
});

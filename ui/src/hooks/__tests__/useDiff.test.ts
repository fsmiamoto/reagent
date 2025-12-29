import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useDiff } from "../useDiff";

describe("useDiff", () => {
  it("should handle added lines", () => {
    const { result } = renderHook(() =>
      useDiff({
        oldContent: "",
        newContent: "line 1\nline 2",
        filePath: "test.txt",
      }),
    );

    expect(result.current.diffRows).toHaveLength(2);
    expect(result.current.diffRows[0]).toMatchObject({
      type: "added",
      content: "line 1",
      newLineNumber: 1,
    });
    expect(result.current.diffRows[1]).toMatchObject({
      type: "added",
      content: "line 2",
      newLineNumber: 2,
    });
  });

  it("should handle removed lines", () => {
    const { result } = renderHook(() =>
      useDiff({
        oldContent: "line 1\nline 2",
        newContent: "",
        filePath: "test.txt",
      }),
    );

    expect(result.current.diffRows).toHaveLength(2);
    expect(result.current.diffRows[0]).toMatchObject({
      type: "removed",
      content: "line 1",
      oldLineNumber: 1,
    });
  });

  it("should handle unchanged lines", () => {
    const { result } = renderHook(() =>
      useDiff({
        oldContent: "line 1",
        newContent: "line 1",
        filePath: "test.txt",
      }),
    );

    expect(result.current.diffRows).toHaveLength(1);
    expect(result.current.diffRows[0]).toMatchObject({
      type: "unchanged",
      content: "line 1",
      oldLineNumber: 1,
      newLineNumber: 1,
    });
  });

  it("should handle mixed changes", () => {
    const { result } = renderHook(() =>
      useDiff({
        oldContent: "line 1\nline 2",
        newContent: "line 1\nline 3",
        filePath: "test.txt",
      }),
    );

    // line 1 (unchanged), line 2 (removed), line 3 (added)
    expect(result.current.diffRows).toHaveLength(3);
    expect(result.current.diffRows[0].type).toBe("unchanged");
    expect(result.current.diffRows[1].type).toBe("removed");
    expect(result.current.diffRows[2].type).toBe("added");
  });

  it("should handle empty file content", () => {
    const { result } = renderHook(() =>
      useDiff({
        oldContent: "",
        newContent: "",
        filePath: "test.txt",
      }),
    );

    expect(result.current.diffRows).toHaveLength(0);
  });
});

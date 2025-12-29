import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge, getStatusStyles } from "../StatusBadge";

describe("StatusBadge", () => {
  describe("getStatusStyles", () => {
    it("should return pending styles with pulse animation", () => {
      const styles = getStatusStyles("pending");
      expect(styles.bg).toBe("bg-primary/10");
      expect(styles.text).toBe("text-primary");
      expect(styles.dot).toContain("animate-pulse");
    });

    it("should return approved styles", () => {
      const styles = getStatusStyles("approved");
      expect(styles.bg).toBe("bg-success/10");
      expect(styles.text).toBe("text-success");
      expect(styles.dot).toBe("bg-success");
    });

    it("should return changes_requested styles", () => {
      const styles = getStatusStyles("changes_requested");
      expect(styles.bg).toBe("bg-warning/10");
      expect(styles.text).toBe("text-warning");
      expect(styles.dot).toBe("bg-warning");
    });

    it("should return default styles for unknown status", () => {
      const styles = getStatusStyles("cancelled" as any);
      expect(styles.bg).toBe("bg-muted/10");
      expect(styles.text).toBe("text-muted-foreground");
    });
  });

  describe("StatusBadge component", () => {
    it("should render pending status with correct label", () => {
      render(<StatusBadge status="pending" />);
      expect(screen.getByText("Pending")).toBeDefined();
    });

    it("should render approved status with correct label", () => {
      render(<StatusBadge status="approved" />);
      expect(screen.getByText("Approved")).toBeDefined();
    });

    it("should render changes_requested with human readable label", () => {
      render(<StatusBadge status="changes_requested" />);
      expect(screen.getByText("Changes Requested")).toBeDefined();
    });

    it("should render with correct CSS classes for pending", () => {
      const { container } = render(<StatusBadge status="pending" />);
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-primary/10");
      expect(badge?.className).toContain("text-primary");
    });

    it("should render a dot indicator", () => {
      const { container } = render(<StatusBadge status="approved" />);
      const dot = container.querySelector("span > span");
      expect(dot?.className).toContain("rounded-full");
      expect(dot?.className).toContain("bg-success");
    });
  });
});

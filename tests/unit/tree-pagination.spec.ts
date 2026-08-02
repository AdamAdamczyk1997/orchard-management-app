import { describe, expect, it } from "vitest";
import {
  buildTreePageHref,
  formatTreePageRange,
} from "@/lib/domain/tree-pagination";

describe("tree pagination helpers", () => {
  it("formats the visible tree range for the current page", () => {
    expect(formatTreePageRange(1, 50, 0)).toBe("0 z 0");
    expect(formatTreePageRange(1, 50, 126)).toBe("1-50 z 126");
    expect(formatTreePageRange(2, 50, 126)).toBe("51-100 z 126");
    expect(formatTreePageRange(3, 50, 126)).toBe("101-126 z 126");
  });

  it("preserves filters and omits page for the first page", () => {
    const params = new URLSearchParams({
      plot_id: "plot-1",
      is_active: "true",
      page: "2",
      page_size: "50",
    });

    expect(buildTreePageHref(params, 1, 50)).toBe(
      "/trees?plot_id=plot-1&is_active=true&page_size=50",
    );
    expect(buildTreePageHref(params, 3, 50)).toBe(
      "/trees?plot_id=plot-1&is_active=true&page=3&page_size=50",
    );
  });
});

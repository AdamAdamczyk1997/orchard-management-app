import { describe, expect, it } from "vitest";
import {
  buildHarvestPageHref,
  formatHarvestPageRange,
} from "@/lib/domain/harvest-pagination";

describe("harvest pagination helpers", () => {
  it("builds stable harvest page hrefs", () => {
    const params = new URLSearchParams({
      season_year: "2026",
      plot_id: "plot-1",
      page_size: "50",
    });

    expect(buildHarvestPageHref(params, 1, 50)).toBe(
      "/harvests?season_year=2026&plot_id=plot-1&page_size=50",
    );
    expect(buildHarvestPageHref(params, 3, 50)).toBe(
      "/harvests?season_year=2026&plot_id=plot-1&page_size=50&page=3",
    );
  });

  it("formats harvest page ranges", () => {
    expect(formatHarvestPageRange(1, 50, 0)).toBe("0 z 0");
    expect(formatHarvestPageRange(1, 50, 183)).toBe("1-50 z 183");
    expect(formatHarvestPageRange(4, 50, 183)).toBe("151-183 z 183");
  });
});

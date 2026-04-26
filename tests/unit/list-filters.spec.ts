import { describe, expect, it } from "vitest";
import {
  hasActiveActivityListFilters,
  hasActiveHarvestListFilters,
  hasActivePlotListFilters,
  hasActiveTreeListFilters,
  hasActiveVarietyListFilters,
} from "@/lib/domain/list-filters";

describe("list filter state helpers", () => {
  it("detects active plot and variety filters", () => {
    expect(hasActivePlotListFilters({})).toBe(false);
    expect(hasActivePlotListFilters({ status: "all" })).toBe(true);

    expect(hasActiveVarietyListFilters({})).toBe(false);
    expect(hasActiveVarietyListFilters({ q: "Ligol" })).toBe(true);
  });

  it("treats the default tree filter state as unfiltered", () => {
    expect(hasActiveTreeListFilters({ is_active: "true" })).toBe(false);
    expect(
      hasActiveTreeListFilters({
        q: "",
        condition_status: "all",
        is_active: "true",
      }),
    ).toBe(false);
    expect(hasActiveTreeListFilters({ is_active: "all" })).toBe(true);
    expect(hasActiveTreeListFilters({ condition_status: "warning" })).toBe(true);
    expect(hasActiveTreeListFilters({ plot_id: "plot-1" })).toBe(true);
  });

  it("treats default activity list filters as unfiltered", () => {
    expect(
      hasActiveActivityListFilters({
        activity_type: "all",
        status: "all",
      }),
    ).toBe(false);
    expect(
      hasActiveActivityListFilters({
        activity_type: "pruning",
        status: "all",
      }),
    ).toBe(true);
    expect(
      hasActiveActivityListFilters({
        activity_type: "all",
        status: "done",
      }),
    ).toBe(true);
    expect(
      hasActiveActivityListFilters({
        activity_type: "all",
        status: "all",
        performed_by_profile_id: "profile-1",
      }),
    ).toBe(true);
  });

  it("treats current season harvest filters as unfiltered by default", () => {
    expect(hasActiveHarvestListFilters({ season_year: 2026 }, 2026)).toBe(false);
    expect(
      hasActiveHarvestListFilters(
        {
          season_year: 2025,
        },
        2026,
      ),
    ).toBe(true);
    expect(
      hasActiveHarvestListFilters(
        {
          season_year: 2026,
          plot_id: "plot-1",
        },
        2026,
      ),
    ).toBe(true);
  });
});

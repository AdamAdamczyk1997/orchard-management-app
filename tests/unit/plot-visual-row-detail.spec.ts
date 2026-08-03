import { describe, expect, it } from "vitest";
import {
  buildPlotVisualRowFocusHref,
  buildPlotVisualRowRangeActivityHref,
  parsePlotVisualRowFocusParams,
  toPlotVisualTreeFilters,
} from "@/lib/domain/plot-visual-row-detail";

describe("plot visual row detail helpers", () => {
  it("parses focused row params and normalizes optional filters", () => {
    const params = new URLSearchParams({
      section: " A ",
      row: "12",
      lifecycle: "active",
      variety_id: "unassigned",
      condition_status: "warning",
      location_verified: "unverified",
    });

    const filters = parsePlotVisualRowFocusParams(params);

    expect(filters).toEqual({
      section_name: "A",
      row_number: 12,
      lifecycle: "active",
      variety_id: "unassigned",
      condition_status: "warning",
      location_verified: "unverified",
    });
    expect(filters ? toPlotVisualTreeFilters(filters) : null).toEqual({
      lifecycle: "active",
      variety_id: "unassigned",
      condition_status: "warning",
      location_verified: "unverified",
    });
  });

  it("ignores invalid row focus params and falls back unsafe filters", () => {
    expect(parsePlotVisualRowFocusParams(new URLSearchParams())).toBeNull();
    expect(parsePlotVisualRowFocusParams(new URLSearchParams({ row: "0" }))).toBeNull();
    expect(parsePlotVisualRowFocusParams(new URLSearchParams({ row: "abc" }))).toBeNull();
    expect(parsePlotVisualRowFocusParams(new URLSearchParams({ row: "12.7" }))).toBeNull();

    expect(
      parsePlotVisualRowFocusParams(
        new URLSearchParams({
          row: "3",
          lifecycle: "future",
          variety_id: "not-a-uuid",
          condition_status: "dead",
          location_verified: "maybe",
        }),
      ),
    ).toEqual({
      section_name: null,
      row_number: 3,
      lifecycle: "all",
      variety_id: "all",
      condition_status: "all",
      location_verified: "all",
    });
  });

  it("builds compact row focus hrefs with only non-default filters", () => {
    expect(
      buildPlotVisualRowFocusHref("plot-1", {
        section_name: "North",
        row_number: 7,
        lifecycle: "removed",
        variety_id: "all",
        condition_status: "all",
        location_verified: "verified",
      }),
    ).toBe("/plots/plot-1?row=7&section=North&lifecycle=removed&location_verified=verified");
  });

  it("builds row range activity hrefs and rejects invalid ranges", () => {
    const href = buildPlotVisualRowRangeActivityHref({
      plot_id: "plot-1",
      section_name: "North",
      row_number: 7,
      from_position: 3,
      to_position: 9,
    });

    expect(href).toContain("/activities/new?plot_id=plot-1");
    expect(decodeURIComponent(href ?? "")).toContain(
      '"scope_level":"location_range"',
    );
    expect(decodeURIComponent(href ?? "")).toContain('"section_name":"North"');
    expect(decodeURIComponent(href ?? "")).toContain('"from_position":3');
    expect(decodeURIComponent(href ?? "")).toContain('"to_position":9');
    expect(
      buildPlotVisualRowRangeActivityHref({
        plot_id: "plot-1",
        row_number: 7,
        from_position: 9,
        to_position: 3,
      }),
    ).toBeNull();
  });
});

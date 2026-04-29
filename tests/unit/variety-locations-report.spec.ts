import { describe, expect, it } from "vitest";
import {
  buildVarietyLocationRanges,
  formatVarietyLocationRangeLabel,
  groupVarietyLocationTrees,
} from "@/lib/domain/variety-locations";

describe("variety locations report helpers", () => {
  it("merges consecutive positions into ranges and tracks verification counts", () => {
    const ranges = buildVarietyLocationRanges([
      { position_in_row: 4, location_verified: true },
      { position_in_row: 2, location_verified: false },
      { position_in_row: 1, location_verified: true },
      { position_in_row: 7, location_verified: false },
      { position_in_row: 5, location_verified: true },
    ]);

    expect(ranges).toEqual([
      {
        from_position: 1,
        to_position: 2,
        tree_count: 2,
        verified_trees_count: 1,
        unverified_trees_count: 1,
      },
      {
        from_position: 4,
        to_position: 5,
        tree_count: 2,
        verified_trees_count: 2,
        unverified_trees_count: 0,
      },
      {
        from_position: 7,
        to_position: 7,
        tree_count: 1,
        verified_trees_count: 0,
        unverified_trees_count: 1,
      },
    ]);
  });

  it("groups trees by plot, section, and row in a stable order", () => {
    const groups = groupVarietyLocationTrees([
      {
        plot_id: "plot-b",
        plot_name: "Kwatera B",
        plot_status: "active",
        section_name: null,
        row_number: 1,
        position_in_row: 5,
        location_verified: true,
      },
      {
        plot_id: "plot-a",
        plot_name: "Kwatera A",
        plot_status: "active",
        section_name: "Poludnie",
        row_number: 2,
        position_in_row: 1,
        location_verified: true,
      },
      {
        plot_id: "plot-a",
        plot_name: "Kwatera A",
        plot_status: "active",
        section_name: null,
        row_number: 1,
        position_in_row: 2,
        location_verified: false,
      },
      {
        plot_id: "plot-a",
        plot_name: "Kwatera A",
        plot_status: "active",
        section_name: null,
        row_number: 1,
        position_in_row: 1,
        location_verified: true,
      },
    ]);

    expect(groups).toEqual([
      {
        plot_id: "plot-a",
        plot_name: "Kwatera A",
        plot_status: "active",
        section_name: null,
        row_number: 1,
        tree_count: 2,
        verified_trees_count: 1,
        unverified_trees_count: 1,
        ranges: [
          {
            from_position: 1,
            to_position: 2,
            tree_count: 2,
            verified_trees_count: 1,
            unverified_trees_count: 1,
          },
        ],
      },
      {
        plot_id: "plot-a",
        plot_name: "Kwatera A",
        plot_status: "active",
        section_name: "Poludnie",
        row_number: 2,
        tree_count: 1,
        verified_trees_count: 1,
        unverified_trees_count: 0,
        ranges: [
          {
            from_position: 1,
            to_position: 1,
            tree_count: 1,
            verified_trees_count: 1,
            unverified_trees_count: 0,
          },
        ],
      },
      {
        plot_id: "plot-b",
        plot_name: "Kwatera B",
        plot_status: "active",
        section_name: null,
        row_number: 1,
        tree_count: 1,
        verified_trees_count: 1,
        unverified_trees_count: 0,
        ranges: [
          {
            from_position: 5,
            to_position: 5,
            tree_count: 1,
            verified_trees_count: 1,
            unverified_trees_count: 0,
          },
        ],
      },
    ]);
    expect(formatVarietyLocationRangeLabel(groups[0]!.ranges[0]!)).toBe("Pozycje 1-2");
    expect(formatVarietyLocationRangeLabel(groups[1]!.ranges[0]!)).toBe("Pozycja 1");
  });
});

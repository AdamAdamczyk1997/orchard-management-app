import { describe, expect, it } from "vitest";
import {
  TREE_OPTION_SEARCH_DEFAULT_LIMIT,
  TREE_OPTION_SEARCH_INCLUDE_ID_LIMIT,
  TREE_OPTION_SEARCH_MAX_LIMIT,
  normalizeTreeOptionSearchInput,
  parseTreeOptionSearchParams,
  shouldFetchTreeOptionSearch,
} from "@/lib/domain/tree-option-search";

const PLOT_ID = "20000000-0000-4000-8000-000000000001";
const TREE_ID = "40000000-0000-4000-8000-000000000001";
const SECOND_TREE_ID = "40000000-0000-4000-8000-000000000002";

describe("tree option search helpers", () => {
  it("sanitizes query input and clamps limit", () => {
    expect(
      normalizeTreeOptionSearchInput({
        plot_id: PLOT_ID,
        q: "  P1, (%bad)   row  ",
        limit: "999",
      }),
    ).toMatchObject({
      plot_id: PLOT_ID,
      q: "P1 bad row",
      limit: TREE_OPTION_SEARCH_MAX_LIMIT,
    });

    expect(
      normalizeTreeOptionSearchInput({
        plot_id: "bad-id",
        q: null,
        limit: "not-a-number",
      }),
    ).toMatchObject({
      plot_id: undefined,
      q: "",
      limit: TREE_OPTION_SEARCH_DEFAULT_LIMIT,
    });
  });

  it("normalizes include_ids from repeated and comma-separated values", () => {
    const input = normalizeTreeOptionSearchInput({
      include_ids: [TREE_ID, `${SECOND_TREE_ID},bad-id`, TREE_ID],
    });

    expect(input.include_ids).toEqual([TREE_ID, SECOND_TREE_ID]);
  });

  it("caps selected id hydration inputs", () => {
    const includeIds = Array.from(
      { length: TREE_OPTION_SEARCH_INCLUDE_ID_LIMIT + 5 },
      (_, index) =>
        `40000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );

    expect(
      normalizeTreeOptionSearchInput({ include_ids: includeIds }).include_ids,
    ).toHaveLength(TREE_OPTION_SEARCH_INCLUDE_ID_LIMIT);
  });

  it("parses route search params and detects searchable requests", () => {
    const params = new URLSearchParams({
      plot_id: PLOT_ID,
      q: "R1",
      include_id: TREE_ID,
      active_only: "true",
      limit: "25",
    });
    const input = parseTreeOptionSearchParams(params);

    expect(input).toMatchObject({
      plot_id: PLOT_ID,
      q: "R1",
      include_ids: [TREE_ID],
      active_only: true,
      limit: 25,
    });
    expect(shouldFetchTreeOptionSearch(input)).toBe(true);
    expect(
      shouldFetchTreeOptionSearch(
        normalizeTreeOptionSearchInput({ q: "R" }),
      ),
    ).toBe(false);
    expect(
      shouldFetchTreeOptionSearch(
        normalizeTreeOptionSearchInput({ include_ids: [TREE_ID] }),
      ),
    ).toBe(true);
  });
});

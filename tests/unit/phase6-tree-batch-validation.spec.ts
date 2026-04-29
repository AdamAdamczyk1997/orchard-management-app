import { describe, expect, it } from "vitest";
import {
  buildTreeLocationPreviewLabel,
  buildTreeRangePositions,
  generateTreeCodeFromPattern,
} from "@/lib/domain/tree-batches";
import {
  bulkDeactivateTreesFormSchema,
  bulkTreeBatchFormSchema,
} from "@/lib/validation/trees";

const VALID_PLOT_ID = "11111111-1111-4111-8111-111111111111";
const VALID_VARIETY_ID = "22222222-2222-4222-8222-222222222222";

describe("phase 6 tree batch validation", () => {
  it("parses batch tree input and normalizes shared defaults", () => {
    const parsed = bulkTreeBatchFormSchema.parse({
      plot_id: VALID_PLOT_ID,
      variety_id: VALID_VARIETY_ID,
      species: " apple ",
      section_name: " North ",
      row_number: "7",
      from_position: "20",
      to_position: "24",
      generated_tree_code_pattern: " MAIN-R7-T{{n}} ",
      default_condition_status: "new",
      default_planted_at: "2026-03-15",
      default_rootstock: " M9 ",
      default_notes: " Wiosenny batch ",
    });

    expect(parsed).toMatchObject({
      plot_id: VALID_PLOT_ID,
      variety_id: VALID_VARIETY_ID,
      species: "apple",
      section_name: "North",
      row_number: 7,
      from_position: 20,
      to_position: 24,
      generated_tree_code_pattern: "MAIN-R7-T{{n}}",
      default_condition_status: "new",
      default_planted_at: "2026-03-15",
      default_rootstock: "M9",
      default_notes: "Wiosenny batch",
    });
  });

  it("rejects invalid batch range and code pattern", () => {
    const parsed = bulkTreeBatchFormSchema.safeParse({
      plot_id: VALID_PLOT_ID,
      species: "apple",
      row_number: "2",
      from_position: "8",
      to_position: "4",
      generated_tree_code_pattern: "MAIN-R2-T",
      default_condition_status: "good",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.to_position).toContain(
      "Pozycja poczatkowa nie moze byc wieksza od koncowej.",
    );
    expect(parsed.error?.flatten().fieldErrors.generated_tree_code_pattern).toContain(
      "Wzorzec kodu musi zawierac placeholder {{n}}.",
    );
  });

  it("parses bulk deactivate input and rejects reversed ranges", () => {
    const valid = bulkDeactivateTreesFormSchema.parse({
      plot_id: VALID_PLOT_ID,
      row_number: "5",
      from_position: "11",
      to_position: "14",
      reason: " Korekta ewidencji ",
    });

    expect(valid).toMatchObject({
      plot_id: VALID_PLOT_ID,
      row_number: 5,
      from_position: 11,
      to_position: 14,
      reason: "Korekta ewidencji",
    });

    const invalid = bulkDeactivateTreesFormSchema.safeParse({
      plot_id: VALID_PLOT_ID,
      row_number: "5",
      from_position: "14",
      to_position: "11",
    });

    expect(invalid.success).toBe(false);
    expect(invalid.error?.flatten().fieldErrors.to_position).toContain(
      "Pozycja poczatkowa nie moze byc wieksza od koncowej.",
    );
  });

  it("builds range positions, generated codes, and location preview labels", () => {
    expect(buildTreeRangePositions(3, 6)).toEqual([3, 4, 5, 6]);
    expect(generateTreeCodeFromPattern("MAIN-R4-T{{n}}", 12)).toBe("MAIN-R4-T12");
    expect(generateTreeCodeFromPattern(null, 12)).toBeNull();
    expect(
      buildTreeLocationPreviewLabel({
        section_name: "North",
        row_number: 4,
        position_in_row: 12,
        tree_code: "MAIN-R4-T12",
      }),
    ).toBe("Section North · Row 4, pos 12 · MAIN-R4-T12");
  });
});


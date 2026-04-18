import { z } from "zod";
import {
  checkboxBoolean,
  optionalDateInput,
  optionalNumberInput,
  optionalTrimmedString,
  optionalUuidString,
  trimmedString,
} from "@/lib/validation/shared";

const treeConditionStatusSchema = z.enum([
  "new",
  "good",
  "warning",
  "critical",
  "removed",
]);

export const treeFormSchema = z
  .object({
    plot_id: trimmedString().uuid("Choose a valid plot."),
    variety_id: optionalUuidString("Choose a valid variety."),
    species: trimmedString()
      .min(2, "Species must have at least 2 characters.")
      .max(120, "Species must have at most 120 characters."),
    tree_code: optionalTrimmedString().refine(
      (value) => !value || value.length <= 64,
      "Tree code must have at most 64 characters.",
    ),
    display_name: optionalTrimmedString().refine(
      (value) => !value || value.length <= 120,
      "Display name must have at most 120 characters.",
    ),
    section_name: optionalTrimmedString().refine(
      (value) => !value || value.length <= 80,
      "Section must have at most 80 characters.",
    ),
    row_number: optionalNumberInput("Row number must be a number.").refine(
      (value) => value === undefined || value > 0,
      "Row number must be greater than 0.",
    ),
    position_in_row: optionalNumberInput(
      "Position in row must be a number.",
    ).refine(
      (value) => value === undefined || value > 0,
      "Position in row must be greater than 0.",
    ),
    row_label: optionalTrimmedString().refine(
      (value) => !value || value.length <= 80,
      "Row label must have at most 80 characters.",
    ),
    position_label: optionalTrimmedString().refine(
      (value) => !value || value.length <= 80,
      "Position label must have at most 80 characters.",
    ),
    planted_at: optionalDateInput(),
    acquired_at: optionalDateInput(),
    rootstock: optionalTrimmedString().refine(
      (value) => !value || value.length <= 120,
      "Rootstock must have at most 120 characters.",
    ),
    pollinator_info: optionalTrimmedString().refine(
      (value) => !value || value.length <= 200,
      "Pollinator info must have at most 200 characters.",
    ),
    condition_status: treeConditionStatusSchema,
    health_status: optionalTrimmedString().refine(
      (value) => !value || value.length <= 120,
      "Health status must have at most 120 characters.",
    ),
    development_stage: optionalTrimmedString().refine(
      (value) => !value || value.length <= 120,
      "Development stage must have at most 120 characters.",
    ),
    last_harvest_at: optionalDateInput(),
    notes: optionalTrimmedString().refine(
      (value) => !value || value.length <= 1000,
      "Notes must have at most 1000 characters.",
    ),
    location_verified: checkboxBoolean,
  })
  .superRefine((value, context) => {
    const hasRowNumber = typeof value.row_number === "number";
    const hasPosition = typeof value.position_in_row === "number";

    if (hasRowNumber !== hasPosition) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Row number and position in row must be filled together.",
        path: hasRowNumber ? ["position_in_row"] : ["row_number"],
      });
    }
  });

export const createTreeSchema = treeFormSchema;

export const updateTreeSchema = treeFormSchema.safeExtend({
  tree_id: trimmedString().uuid("Choose a valid tree."),
});

export const treeListFiltersSchema = z.object({
  q: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Search must have at most 120 characters.",
  ),
  plot_id: optionalUuidString("Choose a valid plot."),
  variety_id: optionalUuidString("Choose a valid variety."),
  species: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Species filter must have at most 120 characters.",
  ),
  condition_status: z
    .enum(["new", "good", "warning", "critical", "removed", "all"])
    .optional(),
  is_active: z.enum(["true", "false", "all"]).optional(),
});

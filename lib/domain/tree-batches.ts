import { formatTreeLocationLabel } from "@/lib/orchard-data/trees";

const TREE_CODE_PATTERN_TOKEN = "{{n}}";

export function buildTreeRangePositions(fromPosition: number, toPosition: number) {
  return Array.from(
    { length: toPosition - fromPosition + 1 },
    (_, index) => fromPosition + index,
  );
}

export function generateTreeCodeFromPattern(
  pattern: string | null | undefined,
  positionInRow: number,
) {
  if (!pattern) {
    return null;
  }

  return pattern.replaceAll(TREE_CODE_PATTERN_TOKEN, String(positionInRow));
}

export function hasTreeCodePatternToken(pattern: string | null | undefined) {
  return typeof pattern === "string" && pattern.includes(TREE_CODE_PATTERN_TOKEN);
}

export function buildTreeLocationPreviewLabel(options: {
  section_name?: string | null;
  row_number: number;
  position_in_row: number;
  tree_code?: string | null;
}) {
  return (
    formatTreeLocationLabel({
      section_name: options.section_name,
      row_number: options.row_number,
      position_in_row: options.position_in_row,
      tree_code: options.tree_code,
    }) ?? `Row ${options.row_number}, pos ${options.position_in_row}`
  );
}


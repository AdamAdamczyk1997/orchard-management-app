export const TREE_INVENTORY_IMPORT_LIMITS = {
  max_workbook_bytes: 5 * 1024 * 1024,
  max_segment_rows: 500,
  max_exception_rows: 1_000,
  max_expanded_tree_positions_mvp: 5_000,
  max_diagnostics_returned: 500,
} as const;

export type TreeInventoryImportLimits = typeof TREE_INVENTORY_IMPORT_LIMITS;

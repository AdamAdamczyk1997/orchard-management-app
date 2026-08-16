# MVP import support notes

## Supported size

`tree_inventory_v1` MVP supports up to 1k expanded positions per import.

An expanded position is one logical row/position after `NASADZENIA` segments and
`WYJATKI` are expanded by the normalizer.

## Larger plots

For plots above 1k positions, split the work into multiple imports. Each import
still targets one active orchard and one plot, but the workbook should include
only a subset of row/position ranges.

Examples:

- Row 1 positions 1-1000 in the first import.
- Row 1 positions 1001-2000 in the second import.
- Separate sections or row ranges in separate imports when that matches the
  real orchard layout.

The first import materializes its trees. Later imports must avoid positions
already created by previous imports, because active location conflicts block
confirm.

## Support response for above-limit files

When a file exceeds the accepted MVP limit, ask the user to split the workbook
into smaller imports of at most 1k expanded positions each.

Do not promise stable 5k imports in MVP. Stable 5k is tracked separately in
`documents/01_implementation_materials/tree_inventory_import/future_5k_import_hardening_plan.md`.

## What should not change for splitting

- Do not create temporary plots only to bypass the limit.
- Do not change `plot_id` or active orchard context manually in XLSX metadata.
- Do not use future modes such as full snapshot, `update_existing` or
  `deactivate_and_create`.
- Keep variety resolution and owner confirm per staged import.

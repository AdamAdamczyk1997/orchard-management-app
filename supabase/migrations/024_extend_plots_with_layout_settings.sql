alter table public.plots
  add column layout_type text not null default 'rows'
    check (layout_type in ('rows', 'mixed', 'irregular')),
  add column row_numbering_scheme text
    check (
      row_numbering_scheme in (
        'left_to_right_from_entrance',
        'right_to_left_from_entrance',
        'north_to_south',
        'south_to_north',
        'custom'
      )
    ),
  add column tree_numbering_scheme text
    check (
      tree_numbering_scheme in (
        'from_row_start',
        'from_row_end',
        'custom'
      )
    ),
  add column entrance_description text,
  add column layout_notes text,
  add column default_row_count integer
    check (default_row_count is null or default_row_count > 0),
  add column default_trees_per_row integer
    check (default_trees_per_row is null or default_trees_per_row > 0);

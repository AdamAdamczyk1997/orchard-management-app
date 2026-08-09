# 05 Database Domain Map

Main domain entities, relationships, and cardinalities.

## Mermaid source

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "id"
  PROFILES ||--o{ ORCHARD_MEMBERSHIPS : "profile_id"
  PROFILES ||--o{ ORCHARDS : "created_by_profile_id"
  ORCHARDS ||--o{ ORCHARD_MEMBERSHIPS : "orchard_id"
  ORCHARDS ||--o{ PLOTS : "orchard_id"
  ORCHARDS ||--o{ VARIETIES : "orchard_id"
  ORCHARDS ||--o{ TREES : "orchard_id"
  ORCHARDS ||--o{ ACTIVITIES : "orchard_id"
  ORCHARDS ||--o{ HARVEST_RECORDS : "orchard_id"
  ORCHARDS ||--o{ BULK_TREE_IMPORT_BATCHES : "orchard_id"
  ORCHARDS ||--o{ INVENTORY_IMPORTS : "orchard_id"

  PLOTS ||--o{ TREES : "plot_id"
  PLOTS ||--o{ ACTIVITIES : "plot_id"
  PLOTS ||--o{ HARVEST_RECORDS : "plot_id"
  PLOTS ||--o{ BULK_TREE_IMPORT_BATCHES : "plot_id"
  PLOTS ||--o{ INVENTORY_IMPORTS : "plot_id"
  PLOTS ||--o{ INVENTORY_IMPORT_POSITIONS : "plot_id"

  VARIETIES ||--o{ TREES : "variety_id"
  VARIETIES ||--o{ HARVEST_RECORDS : "variety_id"
  VARIETIES ||--o{ BULK_TREE_IMPORT_BATCHES : "variety_id"
  VARIETIES ||--o{ INVENTORY_IMPORT_VARIETY_CANDIDATES : "suggested_variety_id"
  VARIETIES ||--o{ INVENTORY_IMPORT_VARIETY_CANDIDATES : "resolved_variety_id"
  VARIETIES ||--o{ INVENTORY_IMPORT_POSITIONS : "variety_id"

  TREES ||--o{ ACTIVITIES : "tree_id"
  TREES ||--o{ ACTIVITY_SCOPES : "tree_id"
  TREES ||--o{ HARVEST_RECORDS : "tree_id"
  TREES ||--o{ INVENTORY_IMPORT_POSITIONS : "existing_tree_id"
  TREES ||--o{ INVENTORY_IMPORT_CREATED_TREES : "tree_id"
  BULK_TREE_IMPORT_BATCHES ||--o{ TREES : "planted_batch_id"
  INVENTORY_IMPORTS ||--o{ INVENTORY_IMPORT_SOURCE_ROWS : "import_id"
  INVENTORY_IMPORTS ||--o{ INVENTORY_IMPORT_VARIETY_CANDIDATES : "import_id"
  INVENTORY_IMPORTS ||--o{ INVENTORY_IMPORT_POSITIONS : "import_id"
  INVENTORY_IMPORTS ||--o{ INVENTORY_IMPORT_CREATED_TREES : "import_id"
  INVENTORY_IMPORT_SOURCE_ROWS ||--o{ INVENTORY_IMPORT_POSITIONS : "source_row_id"
  INVENTORY_IMPORT_VARIETY_CANDIDATES ||--o{ INVENTORY_IMPORT_POSITIONS : "variety_candidate_id"
  INVENTORY_IMPORT_POSITIONS ||--o{ INVENTORY_IMPORT_CREATED_TREES : "position_id"

  ACTIVITIES ||--o{ ACTIVITY_SCOPES : "activity_id"
  ACTIVITIES ||--o{ ACTIVITY_MATERIALS : "activity_id"
  ACTIVITIES ||--o{ HARVEST_RECORDS : "activity_id"

  PROFILES ||--o{ ACTIVITIES : "performed_by_profile_id"
  PROFILES ||--o{ ACTIVITIES : "created_by_profile_id"
  PROFILES ||--o{ HARVEST_RECORDS : "created_by_profile_id"
  PROFILES ||--o{ BULK_TREE_IMPORT_BATCHES : "created_by_profile_id"
  PROFILES ||--o{ INVENTORY_IMPORTS : "created_by_profile_id"
  PROFILES ||--o{ INVENTORY_IMPORTS : "confirmed_by_profile_id"
  PROFILES ||--o{ INVENTORY_IMPORT_VARIETY_CANDIDATES : "resolved_by_profile_id"
  PROFILES ||--o{ INVENTORY_IMPORT_CREATED_TREES : "created_by_profile_id"

  PROFILES {
    uuid id PK
    text email
    text system_role
  }
  ORCHARDS {
    uuid id PK
    text name
    text status
  }
  ORCHARD_MEMBERSHIPS {
    uuid id PK
    uuid orchard_id FK
    uuid profile_id FK
    text role
    text status
  }
  PLOTS {
    uuid id PK
    uuid orchard_id FK
    text name
    text layout_type
    text status
  }
  VARIETIES {
    uuid id PK
    uuid orchard_id FK
    text species
    text name
  }
  TREES {
    uuid id PK
    uuid orchard_id FK
    uuid plot_id FK
    uuid variety_id FK
    integer row_number
    integer position_in_row
    boolean is_active
  }
  ACTIVITIES {
    uuid id PK
    uuid orchard_id FK
    uuid plot_id FK
    uuid tree_id FK
    text activity_type
    text status
    integer season_year
  }
  ACTIVITY_SCOPES {
    uuid id PK
    uuid activity_id FK
    text scope_level
    uuid tree_id FK
  }
  ACTIVITY_MATERIALS {
    uuid id PK
    uuid activity_id FK
    text name
  }
  HARVEST_RECORDS {
    uuid id PK
    uuid orchard_id FK
    text scope_level
    numeric quantity_kg
    integer season_year
  }
  BULK_TREE_IMPORT_BATCHES {
    uuid id PK
    uuid orchard_id FK
    uuid plot_id FK
    integer row_number
    text status
  }
  INVENTORY_IMPORTS {
    uuid id PK
    uuid orchard_id FK
    uuid plot_id FK
    text status
    text file_hash
  }
  INVENTORY_IMPORT_SOURCE_ROWS {
    uuid id PK
    uuid import_id FK
    text row_kind
    integer source_row_number
  }
  INVENTORY_IMPORT_VARIETY_CANDIDATES {
    uuid id PK
    uuid import_id FK
    text candidate_key
    text resolution_status
  }
  INVENTORY_IMPORT_POSITIONS {
    uuid id PK
    uuid import_id FK
    uuid plot_id FK
    integer row_number
    integer position_in_row
  }
  INVENTORY_IMPORT_CREATED_TREES {
    uuid id PK
    uuid import_id FK
    uuid tree_id FK
  }
```

## Explanation

`orchard` is the business ownership container. Most operational tables carry `orchard_id` directly. `activity_scopes` and `activity_materials` inherit ownership through their parent `activities`.

Tree Inventory staging is plot-scoped through `inventory_imports`. Source rows,
variety candidates, positions and created-tree audit rows inherit orchard access
through the parent import, with database triggers enforcing cross-orchard
references for plot, variety and tree links.

Important integrity details:

- `profiles.id` equals `auth.users.id`.
- `orchard_memberships` links profiles to orchards and defines orchard role/status.
- `trees` belongs to one `plot` and optionally one `variety`.
- `activities` belongs to one `plot`, optionally one parent `tree`, and can have many `activity_scopes` and `activity_materials`.
- `harvest_records` can be orchard, plot, variety, location_range, or tree scoped and may optionally link to a harvest-type `activity`.
- `bulk_tree_import_batches` is an operational batch entity already present in the current schema.

## Repository references

- `supabase/migrations/002_create_profiles.sql`
- `supabase/migrations/003_create_orchards.sql`
- `supabase/migrations/004_create_orchard_memberships.sql`
- `supabase/migrations/005_create_plots.sql`
- `supabase/migrations/006_create_varieties.sql`
- `supabase/migrations/007_create_trees.sql`
- `supabase/migrations/008_create_activities.sql`
- `supabase/migrations/009_create_activity_scopes.sql`
- `supabase/migrations/010_create_activity_materials.sql`
- `supabase/migrations/011_create_harvest_records.sql`
- `supabase/migrations/023_create_tree_batch_tools.sql`
- `supabase/migrations/024_extend_plots_with_layout_settings.sql`
- `types/contracts.ts`

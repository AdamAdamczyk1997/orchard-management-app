# OrchardLog / Sadownik+ - baseline SQL migrations v1 plan

## Cel dokumentu

Ten dokument opisuje finalny pakiet `baseline SQL migrations v1` dla stabilnego rdzenia OrchardLog / Sadownik+.
Ma byc praktycznym przewodnikiem do utworzenia pierwszych migracji w `supabase/migrations/`
oraz pomostem miedzy skonsolidowanym core modelem danych a faktycznym DDL.

Normatywnym source of truth dla zakresu baseline pozostaje:

- `03_domain_and_business_rules/orchardlog_database_model.md`
- sekcja `Final Core Domain and Data Model - Final Consolidated Version`

Ten dokument przeklada ten model na:

- scope baseline,
- kolejnosc plikow migracyjnych,
- decyzje implementacyjne SQL,
- rozdzial miedzy baseline a modulami odlozonymi.

## 1. Baseline v1 scope

### Wchodzi do baseline SQL migrations v1

- `profiles`
- `orchards`
- `orchard_memberships`
- `plots`
- `varieties`
- `trees`
- `activities`
- `activity_scopes`
- `activity_materials`
- `harvest_records`
- shared helper functions:
  - `set_updated_at()`
  - `derive_season_year_from_date()`
  - `normalize_harvest_quantity_to_kg()`
- trigger-based integrity for rules already closed in the core model
- helper functions przygotowujace grunt pod przyszle RLS:
  - `is_super_admin()`
  - `is_active_orchard_member(target_orchard_id uuid)`
  - `has_orchard_role(target_orchard_id uuid, allowed_roles text[])`
  - `is_orchard_owner(target_orchard_id uuid)`

### Dlaczego ten zakres

- Jest to finalnie zamkniety core model `MVP 0.1`.
- Wszystkie powyzsze encje sa juz domkniete domenowo i maja ustalone ownership, relacje, FK, `ON DELETE`, walidacje i zakres MVP.
- `activity_materials` oraz `harvest_records` wchodza do baseline, bo przestaly byc opcjonalnym dodatkiem i sa czescia stabilnego rdzenia.
- Baseline obejmuje tylko to, co jest wystarczajaco dojrzale do wdrozenia jako pierwsza baza implementacyjna.

## 2. Migration package structure

Rekomendowany katalog pakietu:

- `supabase/migrations/`

Rekomendowana kolejnosc plikow:

| Kolejnosc | Plik | Zakres | Zaleznosci |
|---|---|---|---|
| `001` | `001_enable_extensions_and_base_functions.sql` | `pgcrypto`, helper functions wspolne dla baseline | brak |
| `002` | `002_create_profiles.sql` | `profiles`, trigger bootstrapujacy profil po `auth.users` | `001` |
| `003` | `003_create_orchards.sql` | `orchards` | `002` |
| `004` | `004_create_orchard_memberships.sql` | `orchard_memberships`, partial unique owner | `002`, `003` |
| `005` | `005_create_plots.sql` | `plots` | `003` |
| `006` | `006_create_varieties.sql` | `varieties` | `003` |
| `007` | `007_create_trees.sql` | `trees`, baseline location model | `003`, `005`, `006` |
| `008` | `008_create_activities.sql` | `activities` | `002`, `003`, `005`, `007` |
| `009` | `009_create_activity_scopes.sql` | `activity_scopes` | `007`, `008` |
| `010` | `010_create_activity_materials.sql` | `activity_materials` | `008` |
| `011` | `011_create_harvest_records.sql` | `harvest_records` | `002`, `003`, `005`, `006`, `007`, `008` |
| `012` | `012_add_core_integrity_and_rls_helpers.sql` | cross-table triggers, derived fields, RLS helper functions | `002`-`011` |
| `013` | `013_create_v1_security_helpers.sql` | v1 helper functions for orchard read/write/manage policies | `012` |
| `014` | `014_enable_rls_and_v1_policies.sql` | `enable RLS` + MVP policies for all baseline tables | `013` |
| `015` | `015_create_orchard_with_owner_membership_rpc.sql` | atomowy onboarding RPC dla `orchards` + pierwszego membership `owner` | `003`, `004`, `014` |
| `016` | `016_create_invite_orchard_member_rpc.sql` | owner-only RPC do dodania lub reaktywacji membership po emailu | `002`, `004`, `013`-`015` |
| `017` | `017_harden_function_search_paths.sql` | hardening `search_path` dla helper functions i RPC | `012`-`016` |
| `018` | `018_create_activity_mutation_rpcs.sql` | transakcyjne RPC dla `activities` + child rows i odczyt performer options | `002`-`010`, `014`, `017` |
| `019` | `019_consolidate_orchard_membership_insert_policy.sql` | konsolidacja permissive `INSERT` policies dla `orchard_memberships` | `014` |
| `020` | `020_wrap_auth_uid_in_orchard_membership_select_policy.sql` | optymalizacja `auth.uid()` w polityce `SELECT` dla `orchard_memberships` | `014`, `019` |
| `021` | `021_wrap_auth_uid_in_orchards_update_policy.sql` | optymalizacja `auth.uid()` w polityce `UPDATE` dla `orchards` | `014` |
| `022` | `022_wrap_auth_uid_in_orchards_insert_policy.sql` | optymalizacja `auth.uid()` w polityce `INSERT` dla `orchards` | `014`, `021` |
| `023` | `023_create_tree_batch_tools.sql` | `bulk_tree_import_batches`, `trees.planted_batch_id`, RPC dla batch create i bulk deactivate | `005`, `007`, `014`, `017` |
| `024` | `024_extend_plots_with_layout_settings.sql` | `plots.layout_type`, schematy numeracji, punkt odniesienia i notatki ukladu | `005`, `014` |
| `025` | `025_add_plot_layout_guards_for_activity_and_harvest_locations.sql` | trigger hardening dla `activity_scopes` i `harvest_records` z uwzglednieniem `plots.layout_type` | `009`, `011`, `012`, `024` |
| `026` | `026_harden_operational_query_indexes.sql` | celowane indeksy pod dashboard, tree-filtered `activities` oraz listy i raporty `harvest_records` | `007`-`011`, `023`, `025` |

### Zaleznosci pakietu

- `profiles` musi istniec przed `orchards`, bo `orchards.created_by_profile_id` wskazuje autora.
- `orchards` i `profiles` musza istniec przed `orchard_memberships`.
- `plots` i `varieties` musza powstac przed `trees`.
- `trees` musza powstac przed `activities`, `activity_scopes` i `harvest_records`, bo te moduly moga opcjonalnie schodzic do poziomu drzewa.
- `activities` musza istniec przed `activity_scopes`, `activity_materials` i opcjonalnym powiazaniem `harvest_records.activity_id`.
- Trigger-based integrity i helper functions pod RLS powinny wejsc dopiero po utworzeniu wszystkich tabel, ktore wykorzystuja.

## 3. Design decisions

### Organizational scope and ownership

- Finalna jednostka ownership to `orchard`.
- `profiles` sa powiazane z `auth.users` i opisuja konto oraz `system_role`.
- Dostep do danych orchard jest modelowany wylacznie przez `orchard_memberships`.
- `active_orchard_id` nie jest polem domenowym w tabelach i nie wchodzi do baseline SQL.

### SQL modeling decisions

- Uzywamy `uuid` i `gen_random_uuid()` jako standardu kluczy glownych.
- Uzywamy `text + check constraints` zamiast PostgreSQL enums, zeby ulatwic ewolucje modelu i migracje produktu.
- Wszystkie tabele z `updated_at` korzystaja ze wspolnego triggera `set_updated_at()`.
- `season_year` w `activities` i `harvest_records` jest polem przechowywanym, ale wyliczanym przez trigger z daty, aby uniknac rozjazdu miedzy formularzem a baza.
- `quantity_kg` w `harvest_records` jest wyliczane deterministycznie z `quantity_value` i `quantity_unit` przez trigger oparty o helper function.

### Ownership and integrity in SQL

- Twarde lokalne reguly sa egzekwowane przez `check constraints`, unique indexes i FK.
- Cross-table consistency, ktorej nie da sie bezpiecznie zamknac samym FK, jest egzekwowana triggerami w `012_add_core_integrity_and_rls_helpers.sql`.
- Do baseline wchodza tylko trigger rules, ktore sa juz zamkniete architektonicznie:
  - zgodnosc `trees` z `plots` i `varieties`,
  - zgodnosc `activities` z `plots`, `trees` i `performed_by_profile_id`,
  - zgodnosc `activity_scopes` z `activities` i `trees`,
  - zgodnosc `harvest_records` z `plots`, `varieties`, `trees` i `activities`,
  - automatyczne ustawienie `joined_at` dla aktywnego membership.

### Preparation for Supabase Auth and RLS

- `profiles.id` pozostaje rowne `auth.users.id`.
- Baseline tworzy trigger `handle_new_user_profile()` po `auth.users`, zeby profil powstawal automatycznie.
- Baseline zawiera helper functions membership i global role, a pakiet `v1_security` rozszerza je o helper functions polityk operacyjnych.
- Pelne `enable row level security` i polityki `select/insert/update/delete` dla MVP sa dostarczone przez:
  - `013_create_v1_security_helpers.sql`
  - `014_enable_rls_and_v1_policies.sql`
- Helper functions RLS maja jawne `revoke execute ... from public` i `grant execute ... to authenticated`.

### Critical constraints and indexes in baseline

- unique `(orchard_id, profile_id)` on `orchard_memberships`
- partial unique single active `owner` per `orchard`
- unique `(orchard_id, name)` on `plots`
- partial unique `(orchard_id, code)` on `plots` when `code is not null`
- unique `(orchard_id, species, name)` on `varieties`
- partial unique active logical tree location on `(plot_id, row_number, position_in_row)`
- orchard-scoped indexes on every top-level domain table
- report-oriented indexes for `activities` and `harvest_records`

## 4. Deferred to later migrations

### Deferred to `0.2`

- optional storage / attachments
- import CSV / XLSX flows
- dalsze plot-aware walidacje drzew i batch flow oparte o `plots.layout_type`

### Delivered in current `0.2` slices

- `023_create_tree_batch_tools.sql`
- `024_extend_plots_with_layout_settings.sql`
- `025_add_plot_layout_guards_for_activity_and_harvest_locations.sql`
- `026_harden_operational_query_indexes.sql`
- `bulk_tree_import_batches`
- `trees.planted_batch_id`
- `plots.layout_type`
- `row_numbering_scheme`
- `tree_numbering_scheme`
- `entrance_description`
- `layout_notes`
- `default_row_count`
- `default_trees_per_row`
- triggerowe blokady `row` / `location_range` dla dzialek `irregular` w `activity_scopes` i `harvest_records`
- indeksy operacyjne pod dashboard feeds, tree-filtered `activities` oraz harvest list/report queries

### Delivered in immediate `v1_security` and hardening package

- `013_create_v1_security_helpers.sql`
- `014_enable_rls_and_v1_policies.sql`
- `017_harden_function_search_paths.sql`
- `019_consolidate_orchard_membership_insert_policy.sql`
- `020_wrap_auth_uid_in_orchard_membership_select_policy.sql`
- `021_wrap_auth_uid_in_orchards_update_policy.sql`
- `022_wrap_auth_uid_in_orchards_insert_policy.sql`
- `enable row level security` on all baseline domain tables
- final MVP policies for:
  - `profiles`
  - `orchards`
  - `orchard_memberships`
  - `plots`
  - `varieties`
  - `trees`
  - `activities`
  - `activity_scopes`
  - `activity_materials`
  - `harvest_records`
- helper functions:
  - `can_read_profile(target_profile_id uuid)`
  - `can_read_orchard_data(target_orchard_id uuid)`
  - `can_write_orchard_operational_data(target_orchard_id uuid)`
  - `can_manage_orchard(target_orchard_id uuid)`
  - `can_bootstrap_orchard_owner(target_orchard_id uuid, target_profile_id uuid, target_role text, target_status text)`
  - `can_read_activity_children(target_activity_id uuid)`
  - `can_write_activity_children(target_activity_id uuid)`
- dodatkowy guard trigger:
  - `guard_profile_self_service_update()`

### Delivered in immediate operational follow-up package

- `015_create_orchard_with_owner_membership_rpc.sql`
- `016_create_invite_orchard_member_rpc.sql`
- `018_create_activity_mutation_rpcs.sql`
- atomowy onboarding ownera przez `create_orchard_with_owner_membership(...)`
- owner-only dodawanie lub reaktywacja membership po emailu przez `invite_orchard_member_by_email(...)`
- transakcyjny zapis `activities + activity_scopes + activity_materials`

### Deferred beyond baseline and immediate security follow-up

- attachments and storage metadata
- customer / buyer / sales modules
- quality grades for harvest
- marketplace / contractor domain
- legacy backfill migrations from historical `user_id` model, jesli nie ma jeszcze realnych danych do migracji

## 5. What is intentionally handled outside pure SQL constraints

Ponizsze reguly zostaja w warstwie aplikacyjnej, server actions albo w przyszlych migracjach, zamiast byc wciskane na sile do baseline DDL:

- onboarding flow i zarzadzanie `active_orchard`
- transfer ownership miedzy `owner` users
- membership invite flow i tokenizacja zaproszen
- eksport account-wide i ograniczenie go do `owner`
- batch create i bulk deactivate workflows
- bardziej zaawansowane blokady usuwania rekordow z historia

## 6. Seed and verification guidance

Docelowy seed lokalnego developmentu i testow znajduje sie w:

- `supabase/seeds/001_baseline_reference_seed.sql`

Prerequisites:

- seed nalezy uruchamiac przez uprzywilejowany lokalny workflow (`supabase db reset`, `psql` jako owner bazy lub rownowazny kontekst administracyjny), a nie przez zwyklego `authenticated` usera
- wymagane konta `auth.users` mozna zbootstrapowac lokalnie komenda `pnpm seed:baseline-users` przed odpaleniem SQL seedu
- samo uruchomienie `001_baseline_reference_seed.sql` jest zautomatyzowane komenda `pnpm seed:baseline-sql`
- pelny lokalny rebuild baseline jest zautomatyzowany komenda `pnpm seed:baseline-reset`
- Supabase Studio SQL Editor nie jest wspierana droga dla tego seedu, bo update `profiles.system_role` moze wpasc tam w trigger `guard_profile_self_service_update()`
- sam seed tymczasowo wylacza tylko trigger `guard_profile_self_service_update_before_write` na czas baseline upsertu `profiles`, a potem wlacza go z powrotem; to pozwala znormalizowac `admin@orchardlog.local` do `system_role = super_admin` bez oslabenia normalnych guardow aplikacyjnych
- seed wymaga istnienia kont w `auth.users` dla emaili:
  - `admin@orchardlog.local`
  - `jan.owner@orchardlog.local`
  - `maria.owner@orchardlog.local`
  - `pawel.worker@orchardlog.local`
  - `ewa.worker@orchardlog.local`
  - `outsider@orchardlog.local`

Zakres seedu:

- 1 `super_admin`
- 2 `owners`
- 2 `workers`
- 1 outsider bez membership
- 2 orchards
- aktywne, `invited` i `revoked` membership cases
- 4 plots
- 5 varieties
- trees z kompletna lokalizacja, niepelna lokalizacja i rekordem `removed`
- activities z `winter_pruning`, `summer_pruning`, `mowing`, `spraying`, `harvest` i `inspection`
- `activity_scopes` i `activity_materials`
- `harvest_records` z jednostkami `kg` i `t`

Pokryte scenariusze:

- izolacja danych miedzy orchard
- `owner` / `worker` / `super_admin`
- cross-membership user
- invited i revoked membership
- location-based activities
- materials for spraying
- seasonal harvest summaries

### Validation status of the current package

- wykonano statyczna walidacje kolejnosci FK, trigger dependencies i referencji helper functions dla plikow `001`-`026`
- lokalne `supabase db reset` przechodzi dla aktualnego pakietu
- lokalne `pnpm seed:baseline-users` tworzy albo aktualizuje komplet 6 kont seedowych wymaganych przez `001_baseline_reference_seed.sql`
- lokalne `pnpm seed:baseline-sql` odpala referencyjny seed SQL przez Supabase CLI bez recznego SQL Editor
- lokalne `pnpm seed:baseline-reset` spina reset bazy, bootstrap `auth.users` i odpalanie referencyjnego seedu
- lokalne `pnpm qa:baseline-status` pozwala potwierdzic, czy baseline auth users i referencyjne dane seedowe sa gotowe do manual QA
- lokalne `supabase db lint` przechodzi po dodaniu `026_harden_operational_query_indexes.sql`
- lokalne `supabase db lint --local -o json` nie zgłasza juz warningow `Function Search Path Mutable`, `Multiple Permissive Policies` ani `Auth RLS Initialization Plan`; obecnie pozostaje tylko niezwiązany warning o nieuzywanej zmiennej `v_membership_joined_at` w RPC `create_orchard_with_owner_membership(...)`
- pakiet jest gotowy do uruchomienia lokalnie w srodowisku z PostgreSQL lub Supabase CLI

## 7. Readiness statement

- `baseline SQL migrations v1` jest wystarczajaco stabilny do implementacji.
- Pakiet opiera sie na finalnie skonsolidowanym core modelu danych i nie wymaga juz dodatkowych decyzji biznesowych, zeby wystartowac ze schematem.
- Aktualny lokalny workflow baseline seedu to: `pnpm seed:baseline-reset` -> `pnpm qa:baseline-status`.
- Jesli schema jest juz po resecie, wariant przyrostowy to: `pnpm seed:baseline-users` -> `pnpm seed:baseline-sql` -> `pnpm qa:baseline-status`.
- Bezposredni kolejny krok po wdrozeniu baseline to lokalne odpalenie seedu tym workflow i reczne testy izolacji RLS na `profiles`, `orchards`, `orchard_memberships`, `plots`, `varieties`, `trees`, `activities`, `activity_scopes`, `activity_materials` i `harvest_records`.

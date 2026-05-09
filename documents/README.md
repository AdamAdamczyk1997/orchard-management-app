# Struktura dokumentacji projektu OrchardLog / Sadownik+

Ten katalog porzadkuje dokumentacje wedlug typu materialu, tak aby latwo bylo znalezc aktywne source of truth podczas projektowania i implementacji.

To jest jedyny kanoniczny katalog aktywnej dokumentacji projektu.

Szybka mapa wejscia:

- [app_high_level_overview.md](./00_overview_and_checklists/app_high_level_overview.md)
- [documentation_map.md](./00_overview_and_checklists/documentation_map.md)
- [session_handoff.md](./00_overview_and_checklists/session_handoff.md)
- [01_implementation_materials/README.md](./01_implementation_materials/README.md)

## Jak czytac skroty i oznaczenia

- `MVP`
  Minimal Viable Product, czyli pierwsza realnie uzywalna wersja produktu.
- `MVP 0.1`
  podstawowy zakres pierwszego sensownego release'u. W repo jest traktowany jako zamkniety funkcjonalnie rdzen, a nie przyszly plan startowy.
- `Etap 0.2`
  kolejny krok po `MVP 0.1`. Czesc funkcji z tego etapu jest juz wdrozona, m.in. export, batch tree flows, rozszerzone lokalizacje i raporty lokalizacyjne.
- `source of truth`
  dokument, ktory traktujemy jako nadrzedna specyfikacje przy implementacji.

## Source of Truth

### Dokumenty normatywne

To sa dokumenty, na podstawie ktorych przygotowujemy migracje SQL, RLS, API, formularze, widoki i testy:

- Dla `baseline SQL migrations v1` pierwszym punktem wejscia jest sekcja
  `Final Core Domain and Data Model - Final Consolidated Version`
  w `03_domain_and_business_rules/orchardlog_database_model.md`.

- Robocza propozycja plikow baseline znajduje sie w `supabase/migrations/`,
  a opis pakietu w `05_technical/schema_migration_plan.md`.

- Pakiet `v1_security` dla baseline oraz jego follow-up hardening jest zapisany w:
  - `supabase/migrations/013_create_v1_security_helpers.sql`
  - `supabase/migrations/014_enable_rls_and_v1_policies.sql`
  - `supabase/migrations/017_harden_function_search_paths.sql`
  - `supabase/migrations/019_consolidate_orchard_membership_insert_policy.sql`
  - `supabase/migrations/020_wrap_auth_uid_in_orchard_membership_select_policy.sql`
  - `supabase/migrations/021_wrap_auth_uid_in_orchards_update_policy.sql`
  - `supabase/migrations/022_wrap_auth_uid_in_orchards_insert_policy.sql`
  - `supabase/migrations/029_wrap_auth_uid_in_orchards_select_policy.sql`
  - `supabase/migrations/034_wrap_auth_uid_in_profiles_update_policy.sql`

- Referencyjny seed lokalny dla baseline i testow znajduje sie w:
  - `supabase/seeds/001_baseline_reference_seed.sql`

- `03_domain_and_business_rules/orchardlog_database_model.md`
- `03_domain_and_business_rules/business_rules.md`
- `03_domain_and_business_rules/statuses_and_lifecycles.md`
- `03_domain_and_business_rules/validations_and_integrity.md`
- `04_ux_and_screen_design/screens_and_views.md`
- `04_ux_and_screen_design/forms_and_fields.md`
- `04_ux_and_screen_design/navigation_map.md`
- `04_ux_and_screen_design/ui_states.md`
- `05_technical/application_architecture.md`
- `05_technical/authorization_and_rls_strategy.md`
- `05_technical/schema_migration_plan.md`
- `05_technical/state_and_data_fetching_strategy.md`
- `06_backend_and_contracts/api_and_system_operations.md`
- `06_backend_and_contracts/data_contracts.md`
- `06_backend_and_contracts/errors_and_system_messages.md`
- `06_backend_and_contracts/import_export_spec.md`
- `07_security_and_quality/mvp_acceptance_criteria.md`
- `07_security_and_quality/test_plan.md`

### Dokumenty aktywne wspierajace

Te pliki nie sa glowna specyfikacja SQL/API, ale nadal wspieraja produkt i implementacje:

- `00_overview_and_checklists/codex_working_prompt.md`
- `00_overview_and_checklists/app_high_level_overview.md`
- `00_overview_and_checklists/local_dev_tools_quickstart.md`
- `00_overview_and_checklists/manual_testing_quickstart.md`
- `00_overview_and_checklists/session_handoff.md`
- `01_implementation_materials/README.md`
- `01_implementation_materials/user_flows.md`
- `01_implementation_materials/plot_visual_operations_roadmap.md` - kierunek produktu i architektury dla `Plot Visual Operations MVP`
- `01_implementation_materials/plot_visual_operations_implementation_master_plan.md` - checklista wykonawcza implementacji `Plot Visual Operations MVP`
- `02_product_documents/mvp_scope_and_priorities.md`
- `02_product_documents/personas_and_user_types.md`
- `02_product_documents/glossary.md`
- `02_product_documents/user_goals_and_success_metrics.md`
- `03_domain_and_business_rules/tree_location_policy.md`
- `03_domain_and_business_rules/variety_policy.md`
- `04_ux_and_screen_design/mobile_first_guidelines.md`
- `04_ux_and_screen_design/ui_copy_and_terminology.md`
- `05_technical/project_conventions.md`
- `05_technical/storage_and_attachments.md`
- `06_backend_and_contracts/batch_tree_creation_rules.md`
- `07_security_and_quality/security_and_privacy.md`
- `07_security_and_quality/backup_restore_and_export.md`
- `07_security_and_quality/monitoring_and_observability.md`

### Dokumenty historyczne

- Materialy historyczne i starsze szkice sa trzymane w `documents/archive/`.
- Dokumenty w archiwum nie sa podstawa do migracji, API, RLS, ekranow ani testow.
- Jesli pojawi sie konflikt miedzy aktywnym dokumentem a plikiem archiwalnym, pierwszenstwo ma dokument aktywny.

## Katalogi

- `00_overview_and_checklists`
  Checklisty, mapy dokumentacji, materialy orientacyjne i przegladowe.

- `01_implementation_materials`
  Lekki punkt startowy do implementacji: README, flow i wskazniki do aktywnych source of truth.

- `02_product_documents`
  Dokumenty produktowe: zakres, persony, slownik i cele uzytkownika.

- `03_domain_and_business_rules`
  Model domeny, model danych, zasady biznesowe, statusy i integralnosc.

- `04_ux_and_screen_design`
  Widoki, formularze, nawigacja, stany UI i copy produktu.

- `05_technical`
  Architektura techniczna, RLS, stan aplikacji, migracje i konwencje implementacyjne.

- `06_backend_and_contracts`
  Operacje systemowe, kontrakty danych, bledy i import/export.

- `07_security_and_quality`
  Kryteria akceptacji, testy, security, backup i observability.

- `archive`
  Wczesne szkice, stare implementation notes i dokumenty historyczne.

## Aktualny zestaw dokumentow

### `00_overview_and_checklists`

- `app_high_level_overview.md`
- `codex_working_prompt.md`
- `documentation_map.md`
- `local_dev_tools_quickstart.md`
- `manual_testing_quickstart.md`
- `session_handoff.md`

### `01_implementation_materials`

- `README.md`
- `user_flows.md`

### `02_product_documents`

- `mvp_scope_and_priorities.md`
- `personas_and_user_types.md`
- `glossary.md`
- `user_goals_and_success_metrics.md`

### `03_domain_and_business_rules`

- `orchardlog_database_model.md`
- `business_rules.md`
- `statuses_and_lifecycles.md`
- `validations_and_integrity.md`
- `tree_location_policy.md`
- `variety_policy.md`

### `04_ux_and_screen_design`

- `screens_and_views.md`
- `forms_and_fields.md`
- `navigation_map.md`
- `ui_states.md`
- `ui_copy_and_terminology.md`
- `mobile_first_guidelines.md`

### `05_technical`

- `application_architecture.md`
- `authorization_and_rls_strategy.md`
- `project_conventions.md`
- `schema_migration_plan.md`
- `state_and_data_fetching_strategy.md`
- `storage_and_attachments.md`

### `06_backend_and_contracts`

- `api_and_system_operations.md`
- `data_contracts.md`
- `errors_and_system_messages.md`
- `import_export_spec.md`
- `batch_tree_creation_rules.md`

### `07_security_and_quality`

- `test_plan.md`
- `mvp_acceptance_criteria.md`
- `security_and_privacy.md`
- `backup_restore_and_export.md`
- `monitoring_and_observability.md`

### `archive`

- `README.md`
- `implementation_master_plan.md`
- `high_level_plan.md`
- `startup_materials_checklist.md`
- `technology_and_responsibilities.md`
- `orchardlog_data_model_location_and_variety_reports_update.md`
- `phase_1_auth_onboarding_vertical_slice.md`
- `phase_2_core_orchard_structure_vertical_slice.md`

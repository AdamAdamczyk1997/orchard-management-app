# Materialy do implementacji

Ten katalog jest punktem startowym do wejscia w implementacje.
Nie duplikuje dokumentow z innych katalogow, tylko wskazuje minimalny zestaw source of truth potrzebny do rozpoczecia kodowania.
Historyczny `implementation_master_plan.md` zostal przeniesiony do `documents/archive/` i nie jest juz aktywnym execution guide.

## Minimalny komplet dokumentow

1. [documents/README.md](../README.md)
2. [app_high_level_overview.md](../00_overview_and_checklists/app_high_level_overview.md)
3. [project_context_for_new_chat.md](../00_overview_and_checklists/project_context_for_new_chat.md)
4. [documentation_map.md](../00_overview_and_checklists/documentation_map.md)
5. [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md)
6. [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
7. [business_rules.md](../03_domain_and_business_rules/business_rules.md)
8. [validations_and_integrity.md](../03_domain_and_business_rules/validations_and_integrity.md)
9. [user_flows.md](./user_flows.md)
10. [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md)
11. [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md)
12. [navigation_map.md](../04_ux_and_screen_design/navigation_map.md)
13. [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md)
14. [schema_migration_plan.md](../05_technical/schema_migration_plan.md)
15. [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
16. [data_contracts.md](../06_backend_and_contracts/data_contracts.md)
17. [mvp_acceptance_criteria.md](../07_security_and_quality/mvp_acceptance_criteria.md)
18. [test_plan.md](../07_security_and_quality/test_plan.md)

## Rekomendowana kolejnosc pracy

1. Najpierw zlapac szybki obraz produktu przez [app_high_level_overview.md](../00_overview_and_checklists/app_high_level_overview.md).
2. Potem zlapac aktualny stan wdrozenia przez [project_context_for_new_chat.md](../00_overview_and_checklists/project_context_for_new_chat.md) i [documentation_map.md](../00_overview_and_checklists/documentation_map.md).
3. Nastepnie potwierdzic, ktore aktywne source of truth beda potrzebne przez [documents/README.md](../README.md) i minimalny zestaw z tego katalogu.
4. Potwierdzic zgodnosc zakresu z [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md).
5. Model i reguly oprzec o [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md), [business_rules.md](../03_domain_and_business_rules/business_rules.md) i [validations_and_integrity.md](../03_domain_and_business_rules/validations_and_integrity.md).
6. UI i flow prowadzic wedlug [user_flows.md](./user_flows.md), [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md), [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md) i [navigation_map.md](../04_ux_and_screen_design/navigation_map.md).
7. Operacje serwerowe i migracje dopinac wedlug [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md), [data_contracts.md](../06_backend_and_contracts/data_contracts.md), [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md) i [schema_migration_plan.md](../05_technical/schema_migration_plan.md).
8. Na biezaco aktualizowac dokumentacje, jesli zmienia sie decyzje projektowe.

## Aktywne plany implementacyjne

Na ten moment nie ma aktywnego execution master planu dla calego produktu.
Aktywny plan techniczny dla skalowania duzych dzialek znajduje sie w:

- [large_plot_tree_scale_plan.md](./large_plot_tree_scale_plan.md)
- [large_plot_phase0_measurements.md](./large_plot_phase0_measurements.md)

Phase 0 ma lokalny fixture do pomiarow:

- `pnpm seed:large-plot-fixture`
- cleanup po pomiarach: `pnpm seed:baseline-reset`

W planie large-plot wdrozone sa juz:

- Phase 1 `/trees` pagination,
- Phase 2 async `TreePicker` dla activity/harvest create/edit forms.
- Phase 3 PVO scale overview dla medium/large plots.
- Phase 4 focused PVO row detail first slice.
- Long-row range actions i lokalny `PERF-LONG-ROW` fixture do ich pomiarow.
- Focused-row E2E dla large plot overview -> row detail path.

Nastepne rekomendowane prace to pomiar `PERF-LONG-ROW`, harvest report fixture
rows albo query-plan/index hardening, zaleznie od kolejnych pomiarow.

`Plot Visual Operations MVP` zostal domkniety automatycznie i jego dokumenty planistyczne sa teraz materialem historycznym.

Aktualny stan projektu sprawdzaj przede wszystkim w:

- [project_context_for_new_chat.md](../00_overview_and_checklists/project_context_for_new_chat.md)
- [ai_project_map.md](../ai_project_map.md)
- [ui_implementation_map.md](../ui_implementation_map.md)

## Archived implementation notes

Zamkniete notatki z wczesnych vertical slice zostaly przeniesione do archiwum:

- [implementation_master_plan.md](../archive/implementation_master_plan.md)
- [baseline_seed_enrichment_plan.md](../archive/baseline_seed_enrichment_plan.md)
- [plot_visual_operations_roadmap.md](../archive/plot_visual_operations_roadmap.md)
- [plot_visual_operations_implementation_master_plan.md](../archive/plot_visual_operations_implementation_master_plan.md)
- [phase_1_auth_onboarding_vertical_slice.md](../archive/phase_1_auth_onboarding_vertical_slice.md)
- [phase_2_core_orchard_structure_vertical_slice.md](../archive/phase_2_core_orchard_structure_vertical_slice.md)

## Ważna zasada

- Dokumenty z `documents/archive/` nie sa materialem implementacyjnym.
- Jesli jakis starszy plik archiwalny przeczy dokumentowi aktywnemu, implementacje opieramy o dokument aktywny.

# Materialy do implementacji

Ten katalog jest punktem startowym do wejscia w implementacje.
Nie duplikuje dokumentow z innych katalogow, tylko wskazuje minimalny zestaw source of truth potrzebny do rozpoczecia kodowania.

## Minimalny komplet dokumentow

1. [implementation_master_plan.md](./implementation_master_plan.md)
2. [session_handoff.md](../00_overview_and_checklists/session_handoff.md)
3. [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md)
4. [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
5. [business_rules.md](../03_domain_and_business_rules/business_rules.md)
6. [validations_and_integrity.md](../03_domain_and_business_rules/validations_and_integrity.md)
7. [user_flows.md](./user_flows.md)
8. [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md)
9. [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md)
10. [navigation_map.md](../04_ux_and_screen_design/navigation_map.md)
11. [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md)
12. [schema_migration_plan.md](../05_technical/schema_migration_plan.md)
13. [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
14. [data_contracts.md](../06_backend_and_contracts/data_contracts.md)
15. [mvp_acceptance_criteria.md](../07_security_and_quality/mvp_acceptance_criteria.md)
16. [test_plan.md](../07_security_and_quality/test_plan.md)

## Rekomendowana kolejnosc pracy

1. Najpierw oprzec wykonanie o [implementation_master_plan.md](./implementation_master_plan.md).
2. Potem zlapac aktualny stan wdrozenia przez [session_handoff.md](../00_overview_and_checklists/session_handoff.md).
3. Nastepnie potwierdzic zgodnosc zakresu z [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md).
4. Model i reguly oprzec o [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md), [business_rules.md](../03_domain_and_business_rules/business_rules.md) i [validations_and_integrity.md](../03_domain_and_business_rules/validations_and_integrity.md).
5. UI i flow prowadzic wedlug [user_flows.md](./user_flows.md), [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md), [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md) i [navigation_map.md](../04_ux_and_screen_design/navigation_map.md).
6. Operacje serwerowe i migracje dopinac wedlug [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md), [data_contracts.md](../06_backend_and_contracts/data_contracts.md), [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md) i [schema_migration_plan.md](../05_technical/schema_migration_plan.md).
7. Na biezaco aktualizowac dokumentacje, jesli zmienia sie decyzje projektowe.

## Archived implementation notes

Zamkniete notatki z wczesnych vertical slice zostaly przeniesione do archiwum:

- [phase_1_auth_onboarding_vertical_slice.md](../archive/phase_1_auth_onboarding_vertical_slice.md)
- [phase_2_core_orchard_structure_vertical_slice.md](../archive/phase_2_core_orchard_structure_vertical_slice.md)

## Ważna zasada

- Dokumenty z `documents/archive/` nie sa materialem implementacyjnym.
- Jesli jakis starszy plik archiwalny przeczy dokumentowi aktywnemu, implementacje opieramy o dokument aktywny.

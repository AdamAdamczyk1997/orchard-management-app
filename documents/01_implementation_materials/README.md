# Materialy do implementacji

Ten katalog jest punktem startowym do wejscia w implementacje.
Nie duplikuje dokumentow z innych katalogow, tylko wskazuje minimalny zestaw source of truth potrzebny do rozpoczecia kodowania.

## Minimalny komplet dokumentow

1. [implementation_master_plan.md](./implementation_master_plan.md)
2. [phase_1_auth_onboarding_vertical_slice.md](./phase_1_auth_onboarding_vertical_slice.md)
3. [phase_2_core_orchard_structure_vertical_slice.md](./phase_2_core_orchard_structure_vertical_slice.md)
4. [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md)
5. [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
6. [business_rules.md](../03_domain_and_business_rules/business_rules.md)
7. [validations_and_integrity.md](../03_domain_and_business_rules/validations_and_integrity.md)
8. [user_flows.md](./user_flows.md)
9. [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md)
10. [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md)
11. [navigation_map.md](../04_ux_and_screen_design/navigation_map.md)
12. [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md)
13. [schema_migration_plan.md](../05_technical/schema_migration_plan.md)
14. [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
15. [data_contracts.md](../06_backend_and_contracts/data_contracts.md)
16. [mvp_acceptance_criteria.md](../07_security_and_quality/mvp_acceptance_criteria.md)
17. [test_plan.md](../07_security_and_quality/test_plan.md)

## Rekomendowana kolejnosc pracy

1. Najpierw oprzec wykonanie o [implementation_master_plan.md](./implementation_master_plan.md).
2. Dla pierwszego slice'a auth / onboarding korzystac tez z [phase_1_auth_onboarding_vertical_slice.md](./phase_1_auth_onboarding_vertical_slice.md).
3. Dla core orchard structure korzystac tez z [phase_2_core_orchard_structure_vertical_slice.md](./phase_2_core_orchard_structure_vertical_slice.md).
4. Potem potwierdzic zgodnosc zakresu z [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md).
5. Nastepnie oprzec model i reguly o [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md), [business_rules.md](../03_domain_and_business_rules/business_rules.md) i [validations_and_integrity.md](../03_domain_and_business_rules/validations_and_integrity.md).
6. UI i flow prowadzic wedlug [user_flows.md](./user_flows.md), [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md), [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md) i [navigation_map.md](../04_ux_and_screen_design/navigation_map.md).
7. Operacje serwerowe i migracje dopinac wedlug [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md), [data_contracts.md](../06_backend_and_contracts/data_contracts.md), [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md) i [schema_migration_plan.md](../05_technical/schema_migration_plan.md).
8. Na biezaco aktualizowac dokumentacje, jesli zmienia sie decyzje projektowe.

## Ważna zasada

- Dokumenty z `documents/archive/` nie sa materialem implementacyjnym.
- Jesli jakis starszy plik archiwalny przeczy dokumentowi aktywnemu, implementacje opieramy o dokument aktywny.

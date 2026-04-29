# OrchardLog / Sadownik+ - documentation map

## Cel

Ten plik jest jednym, lekkim punktem wejscia do dokumentacji.

Po audycie dokumentacji przyjmujemy jedna prosta zasade:

- aktywna dokumentacja mieszka w `documents/`
- materialy historyczne mieszka w `documents/archive/`
- nie utrzymujemy drugiego rownoleglego katalogu dokumentacji

## Gdzie zaczynac

### Dla implementacji i decyzji technicznych

1. [documents/README.md](../README.md)
2. [implementation_master_plan.md](../01_implementation_materials/implementation_master_plan.md)
3. [session_handoff.md](./session_handoff.md)

### Dla modelu domeny i kontraktow

- [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
- [business_rules.md](../03_domain_and_business_rules/business_rules.md)
- [validations_and_integrity.md](../03_domain_and_business_rules/validations_and_integrity.md)
- [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
- [data_contracts.md](../06_backend_and_contracts/data_contracts.md)

### Dla UX i flow

- [user_flows.md](../01_implementation_materials/user_flows.md)
- [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md)
- [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md)
- [navigation_map.md](../04_ux_and_screen_design/navigation_map.md)
- [ui_states.md](../04_ux_and_screen_design/ui_states.md)

### Dla testowania i QA

- [manual_testing_quickstart.md](./manual_testing_quickstart.md)
- [test_plan.md](../07_security_and_quality/test_plan.md)
- [mvp_acceptance_criteria.md](../07_security_and_quality/mvp_acceptance_criteria.md)

## Krotki status funkcji

### Wdrozone i zgodne z kodem

- auth, onboarding, `active_orchard`, protected shell
- `plots`, `varieties`, `trees`
- `activities` z detail view i seasonal summary
- `harvests` z raportami sezonowymi i lokalizacyjnymi
- dashboard operacyjny
- export konta dla `owner`
- batch create i bulk deactivate dla `trees`
- seed / QA workflow

### Czesiowo wdrozone

- responsive polish terenowych flow
- monitoring i observability
- browser E2E

### Swiadomie odlozone

- detail pages dla `plots`, `varieties`, `trees`
- `upcoming_activities` na dashboardzie
- import UI i restore workflow
- osobny global admin shell dla `super_admin`

## Archiwum

`documents/archive/` zachowuje:

- stare szkice produktu
- zamkniete implementation notes z wczesnych faz
- materialy historyczne, ktore nie sa juz source of truth

Jesli material archiwalny przeczy aktywnemu dokumentowi z `documents/`,
pierwszenstwo ma dokument aktywny.

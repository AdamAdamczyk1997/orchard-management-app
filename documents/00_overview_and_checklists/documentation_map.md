# OrchardLog / Sadownik+ - documentation map

## Cel

Ten plik jest jednym, lekkim punktem wejscia do dokumentacji.

Po audycie dokumentacji przyjmujemy jedna prosta zasade:

- aktywna dokumentacja mieszka w `documents/`
- materialy historyczne mieszka w `documents/archive/`
- nie utrzymujemy drugiego rownoleglego katalogu dokumentacji

## Gdzie zaczynac

### Dla implementacji i decyzji technicznych

1. [app_high_level_overview.md](./app_high_level_overview.md)
2. [documents/README.md](../README.md)
3. [session_handoff.md](./session_handoff.md)
4. [documents/01_implementation_materials/README.md](../01_implementation_materials/README.md)
5. [plot_visual_operations_roadmap.md](../01_implementation_materials/plot_visual_operations_roadmap.md)
6. [plot_visual_operations_implementation_master_plan.md](../01_implementation_materials/plot_visual_operations_implementation_master_plan.md)

Historyczny execution index `implementation_master_plan.md` zostal przeniesiony do `documents/archive/`.

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
- [local_dev_tools_quickstart.md](./local_dev_tools_quickstart.md)
- [test_plan.md](../07_security_and_quality/test_plan.md)
- [mvp_acceptance_criteria.md](../07_security_and_quality/mvp_acceptance_criteria.md)

## Krotki status funkcji

### Wdrozone i zgodne z kodem

- auth, onboarding, `active_orchard`, protected shell
- `plots`, `varieties`, `trees`
- `activities` z detail view i seasonal summary
- `harvests` z raportami sezonowymi i lokalizacyjnymi
- dashboard operacyjny z blokiem `upcoming_activities`
- export konta dla eligible `owner`, a administracyjnie takze dla `super_admin`
- batch create i bulk deactivate dla `trees`
- plot-aware layout rules dla `plots`, `trees`, `activities` i `harvests`
- seed / QA workflow
- browser E2E przez `pnpm test:e2e`

### Wspierajace, ale wymagajace okresowej rewizji

- monitoring i observability
- storage / attachments jako dokument techniczny przyszlego slice'u
- responsive polish terenowych flow po kolejnych zmianach UI

### Planowane aktywne slice'y

- `Plot Visual Operations MVP` reaktywuje `/plots/[plotId]` jako operacyjny detail page dzialki. Do czasu implementacji tego slice'u brak tej trasy w kodzie jest oczekiwany, nie jest regresja.

### Swiadomie odlozone

- detail pages dla `varieties` i `trees`
- delete UI dla `varieties` i `trees`
- zmiana roli membership orchard
- import UI i restore workflow
- storage / attachments
- szerszy planning block wykraczajacy poza prosty feed `upcoming_activities`

## Archiwum

`documents/archive/` zachowuje:

- historyczny execution index `implementation_master_plan.md`
- stare szkice produktu
- zamkniete implementation notes z wczesnych faz
- materialy historyczne, ktore nie sa juz source of truth

Jesli material archiwalny przeczy aktywnemu dokumentowi z `documents/`,
pierwszenstwo ma dokument aktywny.

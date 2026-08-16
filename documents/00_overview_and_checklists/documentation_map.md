# OrchardLog / Sadownik+ - documentation map

## Cel

Ten plik jest jednym, lekkim punktem wejscia do dokumentacji.

Po audycie dokumentacji przyjmujemy jedna prosta zasade:

- aktywna dokumentacja mieszka w `documents/`
- aktywne, waskie plany funkcji takze mieszkaja w `documents/`, najczesciej w
  `documents/01_implementation_materials/`
- materialy historyczne mieszka w `documents/archive/`
- nie utrzymujemy drugiego rownoleglego katalogu dokumentacji poza `documents/`

## Gdzie zaczynac

### Dla implementacji i decyzji technicznych

1. [app_high_level_overview.md](./app_high_level_overview.md)
2. [documents/README.md](../README.md)
3. [project_context_for_new_chat.md](./project_context_for_new_chat.md)
4. [documents/01_implementation_materials/README.md](../01_implementation_materials/README.md)
5. [ai_project_map.md](../ai_project_map.md)
6. [ui_implementation_map.md](../ui_implementation_map.md)

Historyczny execution index `implementation_master_plan.md` oraz zamkniete dokumenty `Plot Visual Operations MVP` zostaly przeniesione do `documents/archive/`.
Zamkniety plan skalowania duzych dzialek takze jest juz w archiwum; aktywne
fakty o tym obszarze sa w mapach i pomiarach.

### Dla szybkich map architektury

- [01_app_map.md](../diagrams/01_app_map.md)
- [06_ui_routes_map.md](../diagrams/06_ui_routes_map.md)
- [08_data_flow.md](../diagrams/08_data_flow.md)
- [09_testing_map.md](../diagrams/09_testing_map.md)

### Dla modelu domeny i kontraktow

- [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
- [business_rules.md](../03_domain_and_business_rules/business_rules.md)
- [validations_and_integrity.md](../03_domain_and_business_rules/validations_and_integrity.md)
- [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
- [data_contracts.md](../06_backend_and_contracts/data_contracts.md)
- Tree Inventory import:
  - [active maintenance index](../01_implementation_materials/tree_inventory_import/README.md)
  - [recommended import contract](../01_implementation_materials/tree_inventory_import/recommended_import_contract.md)
  - [release readiness](../01_implementation_materials/tree_inventory_import/phase_10_release_readiness.md)
  - [future 5k hardening plan](../01_implementation_materials/tree_inventory_import/future_5k_import_hardening_plan.md)

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
- `tree_inventory_v1` XLSX import na `/trees/import` dla jednego aktywnego
  orchard, jednej dzialki `rows`, `incremental_create` i limitu 1k expanded
  positions
- plot-aware layout rules dla `plots`, `trees`, `activities` i `harvests`
- seed / QA workflow
- browser E2E przez `pnpm test:e2e`

### Wspierajace, ale wymagajace okresowej rewizji

- monitoring i observability
- storage / attachments jako dokument techniczny przyszlego slice'u
- responsive polish terenowych flow po kolejnych zmianach UI

### Ostatnio domkniete

- `Plot Visual Operations MVP` jest wdrozony: `/plots` ma operacyjne cards, a `/plots/[plotId]` ma visual overview, filters, tree panel, selection prefill oraz structural actions.
- Planistyczne dokumenty PVO sa zarchiwizowane i nie sa aktywnym backlogiem.
- `tree_inventory_v1` MVP jest domkniety i release-ready dla limitu 1k expanded
  positions. Aktywne dokumenty sa w
  `documents/01_implementation_materials/tree_inventory_import/`, a 5k import
  jest odlozony do future hardening.

### Planowane aktywne slice'y

- Brak jednego aktywnego execution master planu dla calego produktu.
- Plan skalowania duzych dzialek zostal domkniety i zarchiwizowany:
  - `documents/archive/large_plot_tree_scale_plan.md`
- Aktywne snapshoty pomiarow zostaja w
  `documents/01_implementation_materials/large_plot_phase0_measurements.md`.
- Wdrozone sa: `/trees` pagination, async tree picker dla activity/harvest
  forms, async tree filter na `/activities`, PVO scale overview, focused PVO
  row detail, long-row range actions, `PERF-LONG-ROW` fixture/browser
  measurement, harvest report read model, variety locations paginated read,
  `/harvests` pagination/read-model cleanup oraz focused-row E2E.
- Kolejne prace to nie jeden aktywny plan, tylko backlog do ustalenia z userem:
  report UI summarization, query-plan/index evidence, deeper long-row rendering
  refinements albo inny nowy slice.
- Kolejny slice trzeba ustalic z userem na podstawie aktualnego repo, aktywnych map projektu i biezacego celu.

### Swiadomie odlozone

- detail pages dla `varieties` i `trees`
- delete UI dla `varieties` i `trees`
- zmiana roli membership orchard
- restore workflow dla account export
- tryby importu poza `tree_inventory_v1` MVP: stable 5k, multi-plot XLSX, full
  snapshot, `update_existing`, `deactivate_and_create`
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

# Tree inventory import - test scenarios

## Istniejace testy i fixture do ponownego uzycia

Najblizsze obecnemu importerowi sa:

- `tests/unit/phase6-tree-batch-validation.spec.ts` - walidacje batch input, deactivate input i PVO prefill.
- `tests/integration/tree-batch-operations.spec.ts` - preview/confirm, conflict detection, `planted_batch_id`, bulk deactivate.
- `tests/security/tree-batch-rls.spec.ts` - owner/worker/outsider dla batch create/deactivate.
- `tests/e2e/tree-batch-and-export.spec.ts` - browser flow bulk create/deactivate i export.
- `tests/e2e/plot-visual-operations.spec.ts` - PVO selection, empty inferred positions, large plot focused row.
- `tests/unit/plot-visual-grid.spec.ts` - grouping, duplicate active locations, empty inferred positions, filters.
- `tests/unit/plot-tree-scale.spec.ts` - scale classes, duplicate active location behavior.
- `tests/integration/plot-tree-scale-profile.spec.ts` i `tests/integration/plot-visual-row-detail.spec.ts` - large/focused plot read models.
- `tests/integration/variety-locations-report.spec.ts` - active tree variety location reporting.
- `tests/security/core-orchard-structure-rls.spec.ts`, `activity-management-rls.spec.ts`, `harvest-management-rls.spec.ts` - RLS patterns.

Fixture:

- `pnpm seed:baseline-reset` -> `pnpm qa:baseline-status` jako baseline workflow.
- `scripts/shared/baseline-seed.mjs` - role owner/worker/outsider/super_admin/empty owner i expected counts.
- `supabase/seeds/001_baseline_reference_seed.sql` - MAIN/SOUTH/EMPTY orchards, plots, varieties, trees.
- `supabase/seeds/010_large_plot_performance_fixture.sql` - PERF 500/1500/MIX/LONG-ROW.

## Unit tests

### Parser XLSX

- Odrzuca plik bez `METADANE`.
- Odrzuca nieznany `contract_version`.
- Raportuje brak wymaganej kolumny z `sheet`, `row`, `column`.
- Zachowuje `raw_value` dla komorek tekstowych, liczbowych, dat i pustych.
- Rozroznia pusta komorke od jawnego `UNKNOWN`.
- Nie wykonuje DB calls.

### Normalizacja segmentow

- Jeden rzad i jedna odmiana: segment `1-10` daje 10 pozycji.
- Wiele odmian w jednym rzedzie: segmenty `1-10`, `11-25`, `26-50` nie koliduja.
- Rozne gatunki w jednym rzedzie: dozwolone, jesli varieties/species match.
- `from_position > to_position` daje error.
- Pozycje 1, 2, 3, 7, 8 sa dozwolone jako luka albo warning zgodnie z decyzja.
- Pozycja 200 bez 1-199 jest dozwolona technicznie, ale moze generowac warning.
- Nakladajace sie segmenty w tym samym `plot,row,position` daja error przed DB.
- Nakladajace sie segmenty z innym `section_name` nadal daja error dla obecnego modelu unique.

### Wyjatki

- `missing_tree` w srodku segmentu usuwa pozycje z planned create.
- `different_variety` nadpisuje species/variety dla jednej pozycji.
- `condition_override` nadpisuje status dla jednej pozycji.
- `dead_tree` wymaga skonfigurowanego mapowania; bez niego daje error.
- Wyjatek poza zakresem segmentu daje error albo warning zgodnie z decyzja.
- Dwa wyjatki na tej samej pozycji sa scalane tylko jesli kompatybilne.
- Sprzeczne wyjatki na tej samej pozycji daja error.

### Slowniki i matching

- `variety_id` z ukrytej kolumny wygrywa nad display name.
- `variety_id` spoza active orchard daje error.
- `variety_name` inna niz display dla `variety_id` daje warning/error.
- Unknown variety z `variety_status=unknown` mapuje do `variety_id=null`.
- Literowka w odmianie bez ID daje error albo candidate warning.
- Case-only roznica (`Szampion` vs `szampion`) jest raportowana zgodnie z policy.
- Diacritics variation (`Szampion` vs `Sampion`) nie jest auto-merged bez alias policy.
- Species mismatch dla variety daje error.

### Daty i stan

- Dokladne `planted_at` mapuje sie do date.
- `planted_year` nie tworzy sztucznej daty bez policy.
- `planted_year_from/to` z przyszloscia daje error albo warning zgodnie z policy.
- Zakres roku szerszy niz limit daje warning/error zgodnie z policy.
- `condition_status=removed` wymaga decyzji, czy tworzyc inactive tree czy odrzucic w `NASADZENIA`.
- `location_verified` domyslnie false, jesli puste.

### Idempotencja i hashing

- Ten sam plik daje ten sam `file_hash`.
- Te same dane po normalizacji daja ten sam `normalized_hash`.
- Zmieniona komorka merytoryczna zmienia `normalized_hash`.
- Zmiana formatowania arkusza nie zmienia `normalized_hash`.

## Database / integration tests

### Preview against current DB

- Preview wykrywa aktywne drzewo w importowanej lokalizacji.
- Preview nie blokuje inactive/removed historical tree w tej samej lokalizacji, ale pokazuje context.
- Preview odrzuca `plot_id` z innego orchard.
- Preview odrzuca archived plot.
- Preview odrzuca `layout_type=irregular`.
- Preview dopuszcza `rows`; `mixed` zgodnie z decyzja.
- Preview odrzuca variety z innego orchard.
- Preview liczy projected created tree count po uwzglednieniu `missing_tree`.

### Confirm transaction

- Confirm tworzy wszystkie drzewa w jednej transakcji.
- Jeden konflikt DB w trakcie confirm powoduje rollback calego importu.
- Confirm ponownie wykrywa konflikt, ktory pojawil sie po preview.
- Confirm zapisuje `planted_batch_id` albo nowy `inventory_import_id`, zaleznie od finalnego modelu.
- Confirm nie tworzy drzew dla `missing_tree`.
- Confirm poprawnie materializuje `different_variety`.
- Confirm zachowuje `notes` z import-only planted year range.
- Confirm nie zmienia istniejacych drzew, gdy import jest incremental create.

### Staging model

Te scenariusze dotycza aktualnego staging/audit modelu:

- Upload tworzy `inventory_imports` oraz source rows, candidates i positions.
- Reupload tego samego pliku jest wykrywany po `file_hash`.
- Confirm zatwierdzonego importu drugi raz jest idempotentny albo blokowany
  zgodnie z aktualnym confirm contract.
- Staging rows sa orchard-scoped i RLS protected.
- Final report jest dostepny tylko dla uprawnionych czlonkow orchard.
- Expired staging nie pozwala na confirm.

## RLS tests

### Owner

- Owner moze wygenerowac template dla swojego orchard.
- Owner moze upload/preview.
- Owner moze confirm.
- Owner nie moze confirmowac importu z `plot_id` innego orchard.

### Worker

- Worker moze pobrac template, jesli produkt dopuszcza.
- Worker moze upload/preview, jesli produkt dopuszcza.
- Worker confirm: test zalezy od decyzji P0.
- Worker nie moze wykonac account export; regresja istniejacej polityki.

### Super admin

- Super admin moze preview/confirm zgodnie z ustalonym admin behavior.
- Super admin bez active orchard musi miec jednoznaczny sposob wyboru target orchard albo import jest blokowany.

### Outsider

- Outsider nie moze pobrac slownikow plot/varieties.
- Outsider nie moze preview z cudzym `plot_id`.
- Outsider nie moze confirm.
- Outsider nie widzi staging/final reports.

### Revoked/invited membership

- `status=invited` nie daje dostepu.
- `status=revoked` nie daje dostepu.
- Zmiana membership miedzy preview i confirm blokuje confirm.

## API / server action tests

- Upload endpoint/server action wymaga auth.
- Upload odrzuca zbyt duzy plik.
- Upload odrzuca nie-XLSX albo nieobslugiwany MIME/extension.
- Parse errors zwracaja structured errors bez stack trace.
- Preview response ma summary, errors, warnings i normalized counts.
- Confirm wymaga `import_id`/confirm token, jesli staging istnieje.
- Confirm revalidates active orchard and current DB state.
- Confirm zwraca final report z created/updated/skipped/conflicts.
- Bledy DB unique sa mapowane na przyjazne `TREE_LOCATION_CONFLICT`.
- Bledy RLS nie ujawniaja istnienia cudzych plot/variety/tree IDs.
- Server action nie ufa `orchard_id` z formularza.

## E2E tests

### Full-cycle XLSX import acceptance

Implemented in `tests/e2e/tree-inventory-import-full-cycle.spec.ts`.

- Register a fresh user and create the first orchard through onboarding.
- Verify the new orchard dashboard empty state.
- Create one `rows` plot through `/plots/new`.
- Download the live `/trees/import` XLSX template for that plot.
- Fill the template from
  `tests/fixtures/tree-inventory-import/e2e-full-cycle.ts` using the shared
  workbook builder.
- Attach the generated XLSX to Playwright artifacts.
- Upload through the browser UI and assert preview summary counts:
  total positions, planned records, missing positions, active conflicts,
  new-candidate positions, unknown positions, grouped candidates, unresolved
  candidates and diagnostics.
- Resolve two `new_candidate` groups with `create_new`.
- Keep the `unknown` group through the current automatic `accepted_unknown`
  behavior.
- Confirm the import and assert created trees, created varieties,
  unknown-variety trees and missing positions.
- Verify `/trees` filtered by the new plot, including the missing position not
  appearing as a tree.
- Verify `/plots/[plotId]` renders the PVO grid, active markers, one inferred
  empty marker and an imported tree detail panel.
- Verify `/reports/variety-locations` for both created varieties and confirm
  the unknown-variety tree is not included in those variety reports.

### Happy path

- Owner loguje sie, wybiera orchard, generuje template dla plot.
- Uploaduje plik: jeden rzad, jedna odmiana.
- Preview pokazuje liczbe drzew i brak bledow.
- Confirm tworzy drzewa.
- `/trees` pokazuje nowe rekordy.
- Plot detail/PVO pokazuje nowe markery albo scale overview.
- Variety locations report uwzglednia aktywne drzewa.

### Multi-segment row

- Plik ma jeden rzad, kilka odmian i jeden `missing_tree`.
- Preview pokazuje segmenty, missing position i projected counts.
- Confirm tworzy drzewa z poprawnymi varieties, z pominieciem missing.

### Exceptions

- Plik ma dosadzenie innej odmiany w srodku segmentu.
- Plik ma weak/critical condition override.
- UI pokazuje exceptions w preview.
- Confirm materializuje wynik zgodnie z kontraktem.

### Conflicts

- W DB istnieje aktywne drzewo na importowanej pozycji.
- Preview blokuje confirm albo confirm blokuje po revalidation.
- Uzytkownik widzi plot/row/position i istniejace drzewo.

### Unknown varieties

- Plik zawiera nieznana odmiane.
- Preview pokazuje blad/propozycje zgodnie z policy.
- Bez decyzji usera confirm jest zablokowany.

### Permissions

- Worker flow zgodny z decyzja produktowa.
- Outsider dostaje access denied.
- Zmiana active orchard/cookie przed confirm blokuje confirm.

### Large plot

- Import do 1k expanded positions pokazuje preview bez zamrozenia UI.
- Wieksze kwatery sa dzielone na mniejsze importy w MVP.
- Confirm konczy sie w zalozonym limicie albo zwraca queued status, jesli async.
- Po confirm `/plots/:id` przechodzi w large scale overview zamiast pelnego PVO gridu.

## Performance tests

### Parser/normalizer

- 1k trees equivalent.
- 1001 trees equivalent rejects with the accepted MVP limit diagnostic.
- 5k trees equivalent remains future hardening/stress, outside MVP.
- Wiele arkuszy i ukryte slowniki.
- Memory bounded parsing.

### DB preview

- Conflict check dla 1k positions wykorzystuje indeks `(orchard_id, plot_id, row_number, position_in_row)`/pokrewne indeksy.
- 5k conflict/confirm/read evidence wraca w future hardening.
- Variety lookup batched, nie per row.
- Plot lookup jednorazowy.

### Confirm

- Bulk insert chunk size dobrany eksperymentalnie.
- Confirm all-or-nothing dla max MVP size.
- Timeout behavior czytelny.
- Re-run after failure nie tworzy czesciowych danych.

### Read models after import

- `/trees` paginated list.
- Plot detail scale profile.
- Focused row detail.
- Variety locations report.
- Harvest location/list reports nie regresuja.

## Regression tests

- Existing `createTree` nadal blokuje duplicate active location.
- Existing `create_bulk_tree_batch` nadal tworzy zakres i zapisuje `planted_batch_id`.
- Existing bulk deactivate nadal oznacza `removed` + `is_active=false`.
- PVO nadal inferuje empty positions tylko wewnatrz min/max.
- Duplicate active location across `section_name` nadal jest traktowany jako duplicate, dopoki DB unique sie nie zmieni.
- `irregular` nadal blokuje row/range activity and harvest flows.
- Account export nadal obejmuje tylko owned orchards dla zwyklego usera.
- Baseline QA nadal przechodzi po `pnpm seed:baseline-reset` -> `pnpm qa:baseline-status`.

## Minimalny zestaw edge cases do pierwszego pakietu

- Jeden rzad i jedna odmiana.
- Wiele odmian w jednym rzedzie.
- Rozne gatunki w jednym rzedzie.
- Brakujace stanowisko.
- Martwe drzewo.
- Dosadzenie innej odmiany.
- Nieznana odmiana.
- Literowka w odmianie.
- Case-only i diacritics-only roznice nazw.
- Nakladajace sie zakresy.
- Luka pomiedzy zakresami.
- Wyjatek poza zakresem.
- Konflikt z istniejacym aktywnym drzewem.
- Existing inactive tree w tej samej lokalizacji.
- Ponowne przeslanie tego samego pliku.
- Ponowne zatwierdzenie importu.
- Brak uprawnien workera, jesli owner-only.
- Outsider bez membership.
- Zmiana membership po preview.
- Zmiana aktywnego orchard po preview.
- Duzy import kilku tysiecy drzew.

## Fixture XLSX

Fixture XLSX mozna trzymac w repo, ale powinny byc male i deterministyczne. Dla testow parsera warto rownolegle trzymac canonical JSON expected output.

Rekomendowane fixture:

- `single-row-one-variety.xlsx`
- `multi-variety-row-with-missing.xlsx`
- `unknown-variety.xlsx`
- `overlapping-ranges.xlsx`
- `conflict-existing-tree.xlsx`
- `large-plot-1k.xlsx` albo generator testowy, jesli binary bylby zbyt duzy
- `large-plot-5k.xlsx` jako future hardening fixture poza MVP

Dla arkuszy z formulami/listami/ukrytymi slownikami:

- testowac wartosci wyjsciowe parsera, nie binary diff calego pliku;
- snapshotowac canonical JSON;
- trzymac generator template jako deterministyczna funkcje;
- walidowac, ze ukryte ID i listy zostaly wygenerowane dla aktualnego orchard.

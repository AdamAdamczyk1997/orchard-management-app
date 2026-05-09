# Plot Visual Operations MVP — Implementation Master Plan

## 1. How to Use This Plan

Ten dokument jest checklistą wykonawczą dla implementacji `Plot Visual Operations MVP`. Ma sluzyc jako plan pracy PR po PR, z jasnym zakresem, testami, kryteriami akceptacji i decyzjami, ktorych nie trzeba ponownie negocjowac przy kazdym kroku.

Zasady pracy:

- [ ] Pracowac fazami w kolejnosci opisanej w dokumencie.
- [ ] Nie przeskakiwac faz bez zamkniecia jej acceptance criteria albo swiadomego dopisania wyjatku w `Implementation Notes / Risks`.
- [ ] Nie rozszerzac zakresu MVP bez dopisania tematu do `Parking Lot` albo nowej decyzji w `Decision Log`.
- [ ] Kazda faza konczy sie testami odpowiednimi do jej ryzyka.
- [ ] Nie wprowadzac `TreeSlot`, `PlantingSlot`, `plot_rows` ani migracji jako warunku MVP.
- [ ] Nie zmieniac modelu domenowego tylko po to, zeby wyrenderowac pierwsza wersje mapy.
- [ ] Trzymac `active_orchard` po stronie serwera i nie przyjmowac `orchard_id` z klienta.
- [ ] Zachowac istniejace server actions, RPC, RLS i walidacje jako zrodlo prawdy dla mutacji.

## 2. Scope Summary

Budujemy operacyjny, schematyczny widok dzialki oparty o istniejace dane `plots`, `trees`, `activities` i `activity_scopes`.

Zakres MVP:

- [ ] Ulepszyc `/plots` jako kafelki dzialek z bardziej operacyjnymi statystykami.
- [ ] Dodac nowe `/plots/[plotId]`.
- [ ] Wyrenderowac read-only visual grid dla dzialek `layout_type = rows`.
- [ ] Wyrenderowac partial grid z ostrzezeniami dla `layout_type = mixed`.
- [ ] Wyrenderowac fallback bez siatki dla `layout_type = irregular`.
- [ ] Dodac tree detail panel dla kliknietego drzewa.
- [ ] Dodac `Select` mode z prostym zaznaczaniem i kompresja do scopes.
- [ ] Polaczyc selection z `/activities/new`.
- [ ] Zaplanowac, a pozniej podpiac structural actions: `Bulk Deactivate`, `Plant New`, `Add Harvest`.

## 3. Non-Goals and Guardrails

- [ ] Nie dodawac GPS map.
- [ ] Nie dodawac canvas/lasso editor.
- [ ] Nie dodawac lasso selection.
- [ ] Nie dodawac drag-and-drop drzew.
- [ ] Nie dodawac `TreeSlot`, `PlantingSlot`, `plot_rows`.
- [ ] Nie zmieniac migracji jako warunku MVP.
- [ ] Nie zapisywac prac sezonowych jako flag na `trees`, np. `is_pruned`.
- [ ] Nie udawac mapy rzedowej dla `layout_type = irregular`.
- [ ] Nie omijac `requireActiveOrchard`.
- [ ] Nie przyjmowac `orchard_id` z query params, formularza ani client state.
- [ ] Nie omijac istniejacych server actions dla `activities`.
- [ ] Nie omijac RPC `create_bulk_tree_batch` ani `bulk_deactivate_trees`.
- [ ] Nie wykonywac destructive logical operations bez preview i confirmation.
- [ ] Nie wprowadzac osobnego modelu persistent empty positions w MVP.

## 4. Decision Log

### DEC-PVO-001 — Removed trees visibility

Status: Accepted

Decision:
`/plots/[plotId]` w MVP pokazuje `removed trees` domyslnie jako przygaszone albo historyczne markery, ale nie traktuje ich jako aktywnych drzew.

Rationale:
Sadownik powinien widziec historie lokalizacji, ale operacyjne akcje typu `Add Activity` nie powinny domyslnie obejmowac drzew wycietych.

Implementation impact:

- [ ] Grid builder musi rozroznic `active_tree` i `removed_tree`.
- [ ] UI musi pokazac muted visual state dla `is_active = false` albo `condition_status = removed`.
- [ ] Selection dla `Add Activity` domyslnie blokuje `removed_tree`.

### DEC-PVO-002 — Inferred empty positions range

Status: Accepted

Decision:
`inferred empty positions` renderujemy tylko miedzy `min(position_in_row)` i `max(position_in_row)` w danym rzedzie. Nie rozszerzamy domyslnie do `default_trees_per_row`.

Rationale:
Bez persistent slot model rozszerzanie do deklarowanej liczby drzew mogloby sugerowac istnienie miejsc, ktorych dane jeszcze nie potwierdzaja.

Implementation impact:

- [ ] `buildPlotVisualGrid` wylicza puste pozycje per row z realnych rekordow `trees`.
- [ ] `default_trees_per_row` moze byc pokazane jako metadata, ale nie steruje automatycznie markerami.
- [ ] Testy musza potwierdzic, ze grid nie dodaje pozycji poza realnym `min/max`.

### DEC-PVO-003 — Activity prefill uses compressed scopes

Status: Accepted

Decision:
Do `/activities/new` przekazujemy skompresowane scopes/ranges, a nie duza liste `tree_id`.

Rationale:
Model `activity_scopes` wspiera zakresy i powinien pozostac glownym sposobem opisu pracy na grupie drzew.

Implementation impact:

- [ ] Selection helper musi kompresowac kolejne pozycje w `location_range`.
- [ ] Pojedyncze albo niepelnie zlokalizowane drzewa moga zostac `tree` scopes.
- [ ] `/activities/new` musi bezpiecznie sparsowac prefill scopes.

### DEC-PVO-004 — URL prefill limit

Status: Accepted

Decision:
Limit prefill przez URL w MVP wynosi maksymalnie 20 skompresowanych scopes/ranges albo okolo 2000 znakow query string.

Rationale:
Query string jest prosty dla MVP, ale nie powinien stac sie mechanizmem transportu bardzo duzych zaznaczen.

Implementation impact:

- [ ] UI przed przejsciem do `/activities/new` liczy liczbe scopes i dlugosc query string.
- [ ] Po przekroczeniu limitu UI pokazuje komunikat i wymaga mniejszego zaznaczenia.
- [ ] Duze selection draft storage jest tematem poza MVP.

### DEC-PVO-005 — section_name is visual grouping, not active location uniqueness

Status: Accepted

Decision:
Dla `mixed` grid minimum do renderowania drzewa na gridzie to `row_number + position_in_row`. `section_name` moze byc uzywane jako grupa wizualna, etykieta fragmentu dzialki, kontekst sortowania i zrodlo ostrzezen o niepelnych danych. `section_name` nie jest czescia aktywnej unikalnosci lokalizacji w MVP i nie legalizuje dwoch aktywnych drzew z tym samym `plot_id + row_number + position_in_row`.

Rationale:
Aktualny model i constrainty traktuja aktywna logiczna lokalizacje jako `plot_id + row_number + position_in_row`. PVO MVP nie zmienia migracji, unique indexu ani modelu danych.

Implementation impact:

- [ ] Grid builder moze grupowac wizualnie po `section_name ?? ""`, potem `row_number`.
- [ ] Konflikty active trees w tej samej logical location musza byc ostrzezeniem danych, nie legalnym stanem do narysowania jako dwa aktywne markery.
- [ ] UI dla `mixed` pokazuje partial coverage warning.
- [ ] Future support dla powtarzalnych `row_number + position_in_row` miedzy sekcjami wymaga osobnej decyzji i prawdopodobnie migracji albo rozszerzenia constraintu/modelu.

### DEC-PVO-006 — Dominant varieties source

Status: Accepted

Decision:
Dominujace odmiany na `/plots` liczymy tylko po aktywnych drzewach.

Rationale:
Karta dzialki ma opisywac aktualny stan produkcyjny, nie pelna historie nasadzen.

Implementation impact:

- [ ] Read model dla plot cards filtruje `is_active = true`.
- [ ] Removed/inactive counts sa osobnym licznikiem.
- [ ] Testy statystyk musza odroznic active i inactive trees.

### DEC-PVO-007 — Add Activity selection scope

Status: Accepted

Decision:
`Add Activity` z selection w MVP wspiera jeden `plot` i wiele skompresowanych ranges/scopes.

Rationale:
Widok `/plots/[plotId]` jest z natury scoped do jednej dzialki, a wiele zakresow w tej dzialce jest realnym workflow pracy.

Implementation impact:

- [ ] Selection waliduje jeden `plot_id`.
- [ ] `compressPlotSelectionToActivityScopes` moze zwrocic wiele `location_range` i `tree` scopes.
- [ ] Cross-plot selection nie jest wspierane.

### DEC-PVO-008 — Single tree activity payload

Status: Accepted

Decision:
Dla aktywnosci dotyczacej dokladnie jednego drzewa ustawiamy zarowno `activities.tree_id`, jak i `activity_scopes[0].tree_id`, zgodnie z obecnymi invariantami `normalizeActivityPayload`. Dla wielu scopes `activities.tree_id` musi byc `null`, a zrodlem zakresu sa `activity_scopes`.

Rationale:
To zachowuje zgodnosc z obecna walidacja i nie tworzy drugiego sposobu modelowania aktywnosci.

Implementation impact:

- [ ] Prefill single tree musi ustawic `tree_id` i jeden `tree` scope.
- [ ] Prefill multi-range musi zostawic parent `tree_id = null`.
- [ ] Testy musza pokryc oba warianty.

### DEC-PVO-009 — Tree detail history deferred

Status: Accepted

Decision:
Tree detail panel w pierwszym MVP pokazuje metadata i akcje, ale nie musi pokazywac ostatnich aktywnosci ani zbiorow.

Rationale:
Pierwszy slice ma dostarczyc visual grid i operacyjne przejscie do `Add Activity`, bez poszerzania read modelu o timeline.

Implementation impact:

- [ ] Panel pokazuje dane z `TreeSummary`.
- [ ] Historia aktywnosci i harvests trafia do `Parking Lot`.
- [ ] Brak timeline nie blokuje MVP.

## 5. Phase Overview

| Phase | Name | Main outcome | Status |
|---|---|---|---|
| Phase 0 | Audit and Preparation | Potwierdzony inventory tras, modeli, queries, testow i luk | Not started |
| Phase 1 | Improve `/plots` Cards | Operacyjne plot cards z CTA do detail page | Not started |
| Phase 2 | Read-Only `/plots/[plotId]` | Nowa route z read-only grid/fallback | Not started |
| Phase 3 | Tree Detail Interaction | Klikniecie drzewa otwiera panel metadata | Not started |
| Phase 4 | Selection MVP | Select mode i kompresja selection do scopes | Not started |
| Phase 5 | Add Activity from Selection | Prefill `/activities/new` z selection | Not started |
| Phase 6 | Structural Actions | Bezpieczne linki/prefill do batch flows | Not started |
| Phase 7 | Future Domain Hardening | Kierunki po MVP bez implementacji teraz | Backlog |

## 6. Phase 0 — Audit and Preparation

Cel:
Potwierdzic aktualny stan kodu, tras, typow, read modeli i testow przed implementacja.

Zakres:

- [ ] Ustalic faktyczny inventory route modules w `app/(app)`.
- [ ] Ustalic faktyczny inventory feature components w `features`.
- [ ] Ustalic brakujace helpery i read models.
- [ ] Doprecyzowac plan testow przed pierwsza zmiana kodowa.

Checklist implementation:

- [ ] PVO-0.1 — Complete audit and confirm route/data/test inventory.
- [ ] PVO-0.2 — Sprawdzic `app/(app)/plots/page.tsx`, `app/(app)/plots/new/page.tsx`, `app/(app)/plots/[plotId]/edit/page.tsx`.
- [ ] PVO-0.3 — Potwierdzic brak `app/(app)/plots/[plotId]/page.tsx`.
- [ ] PVO-0.4 — Sprawdzic `PlotSummary` i plot query functions w `lib/orchard-data/plots.ts`.
- [ ] PVO-0.5 — Sprawdzic `TreeSummary`, `listTreesForOrchard`, `readTreeByIdForOrchard` w `lib/orchard-data/trees.ts`.
- [ ] PVO-0.6 — Sprawdzic `ActivityForm` w `features/activities/activity-form.tsx`.
- [ ] PVO-0.7 — Sprawdzic `normalizeActivityPayload` i activity scope invariants w `lib/validation/activities.ts`.
- [ ] PVO-0.8 — Sprawdzic batch create flow w `app/(app)/trees/batch/new/page.tsx` i `features/trees/bulk-tree-batch-form.tsx`.
- [ ] PVO-0.9 — Sprawdzic bulk deactivate flow w `app/(app)/trees/batch/deactivate/page.tsx` i `features/trees/bulk-tree-deactivate-form.tsx`.
- [ ] PVO-0.10 — Sprawdzic istniejace unit tests dla layout policy, tree batches i activities.
- [ ] PVO-0.11 — Sprawdzic istniejace Playwright flows dla owner/worker/outsider.
- [ ] PVO-0.12 — Potwierdzic naming conventions dla nowych modules `lib/domain/plot-visual-grid.ts` i `lib/domain/plot-selection.ts`.
- [ ] PVO-0.13 — Spisac rozjazdy w `Implementation Notes / Risks` przed rozpoczeciem Phase 1.

Checklist tests:

- [ ] PVO-0.T1 — Uruchomic targeted existing unit tests zwiazane z plot layout policy.
- [ ] PVO-0.T2 — Uruchomic targeted existing unit tests zwiazane z activity validation.
- [ ] PVO-0.T3 — Zweryfikowac, ktore E2E scenariusze baseline beda rozszerzone.
- [ ] PVO-0.T4 — Nie dodawac nowych testow w Phase 0, jesli audit nie wymaga kodu.

Acceptance criteria:

- [ ] PVO-0.A1 — Jest potwierdzone, ze `/plots/[plotId]` nie istnieje jako detail page.
- [ ] PVO-0.A2 — Jest potwierdzone, ktore istniejace queries/formularze beda reuzyte.
- [ ] PVO-0.A3 — Jest potwierdzony zestaw testow startowych dla Phase 1 i Phase 2.
- [ ] PVO-0.A4 — Nie zmieniono modelu danych, migracji ani UI.

Dependencies:

- [ ] PVO-0.D1 — Roadmap document `plot_visual_operations_roadmap.md`.
- [ ] PVO-0.D2 — Aktualna dokumentacja domain, UX, technical i testing.
- [ ] PVO-0.D3 — Aktualny stan worktree sprawdzony przez `git status --short`.

Out of scope:

- [ ] PVO-0.O1 — Implementacja `/plots/[plotId]`.
- [ ] PVO-0.O2 — Dodawanie nowych components.
- [ ] PVO-0.O3 — Zmiany server actions.
- [ ] PVO-0.O4 — Zmiany migracji.

## 7. Phase 1 — Improve `/plots` Cards

Cel:
Ulepszyc liste dzialek tak, zeby byla bardziej operacyjna i prowadzila do detail page.

Zakres:

- [ ] Rozszerzyc read model kart dzialek.
- [ ] Pokazac statystyki drzew i dominant varieties.
- [ ] Dodac CTA do `/plots/[plotId]`.
- [ ] Zachowac istniejace akcje `edit`, `archive`, `restore`.

Checklist implementation:

- [ ] PVO-1.1 — Zaprojektowac minimalny read model dla plot card stats bez zmiany schema.
- [ ] PVO-1.2 — Dodac orchard-scoped query dla active tree count per plot.
- [ ] PVO-1.3 — Dodac orchard-scoped query dla removed/inactive tree count per plot.
- [ ] PVO-1.4 — Dodac dominant varieties per plot liczone tylko z `is_active = true`.
- [ ] PVO-1.5 — Utrzymac `listPlotsForOrchard` albo dodac osobny helper, jesli zmiana list query bylaby zbyt szeroka.
- [ ] PVO-1.6 — Zaktualizowac `features/plots/plot-list.tsx` do bardziej kafelkowego ukladu.
- [ ] PVO-1.7 — Dodac CTA `Otworz dzialke` do `/plots/[plotId]`.
- [ ] PVO-1.8 — Zachowac istniejace akcje `Edytuj`, `Archiwizuj`, `Przywroc`.
- [ ] PVO-1.9 — Zachowac obecny empty state dla braku plots albo dopasowac go do kart.
- [ ] PVO-1.10 — Zweryfikowac loading/error state, jesli route albo component go uzywa.
- [ ] PVO-1.11 — Upewnic sie, ze archived plots nie sa mylone z active tree stats.

Checklist tests:

- [ ] PVO-1.T1 — Dodac albo rozszerzyc unit tests dla plot card stats read model.
- [ ] PVO-1.T2 — Dodac test dominant varieties tylko dla active trees.
- [ ] PVO-1.T3 — Dodac Playwright smoke dla `/plots` i CTA do detail page, gdy Phase 2 route juz istnieje.
- [ ] PVO-1.T4 — Sprawdzic owner i worker access do `/plots`.
- [ ] PVO-1.T5 — Sprawdzic outsider isolation przez istniejace RLS/security tests, jesli dotyczy.

Acceptance criteria:

- [ ] PVO-1.A1 — `/plots` pokazuje `name`, `code`, `status`, `layout_type`.
- [ ] PVO-1.A2 — `/plots` pokazuje active tree count.
- [ ] PVO-1.A3 — `/plots` pokazuje removed/inactive tree count.
- [ ] PVO-1.A4 — `/plots` pokazuje dominant varieties liczone tylko z aktywnych drzew.
- [ ] PVO-1.A5 — CTA do `/plots/[plotId]` jest widoczne i nie psuje istniejacych akcji.

Dependencies:

- [ ] PVO-1.D1 — Phase 0 audit zakonczony.
- [ ] PVO-1.D2 — Potwierdzone pola `TreeSummary` i plot identifiers.
- [ ] PVO-1.D3 — Decyzja DEC-PVO-006.

Out of scope:

- [ ] PVO-1.O1 — Tworzenie read-only grid.
- [ ] PVO-1.O2 — Tree detail panel.
- [ ] PVO-1.O3 — Selection mode.
- [ ] PVO-1.O4 — Activity prefill.

## 8. Phase 2 — Create Read-Only `/plots/[plotId]`

Cel:
Stworzyc fundament nowego detail page dzialki bez interakcji mutujacych.

Zakres:

- [ ] Dodac route `/plots/[plotId]`.
- [ ] Wczytac plot i drzewa w active orchard context.
- [ ] Dodac pure helper `buildPlotVisualGrid`.
- [ ] Wyrenderowac header, metadata, legend, filters i read-only grid albo fallback.

Checklist implementation:

- [ ] PVO-2.1 — Add read-only `/plots/[plotId]` route foundation in `app/(app)/plots/[plotId]/page.tsx`.
- [ ] PVO-2.2 — Uzyc `requireActiveOrchard("/plots/[plotId]")` albo zgodnego lokalnego wzorca route recovery.
- [ ] PVO-2.3 — Wczytac plot przez `readPlotByIdForOrchard(orchardId, plotId)`.
- [ ] PVO-2.4 — Dodac orchard-scoped query dla trees in plot, np. `listTreesForPlotInOrchard`.
- [ ] PVO-2.5 — Nie przyjmowac `orchard_id` z query params.
- [ ] PVO-2.6 — Dodac pure helper `buildPlotVisualGrid` w `lib/domain/plot-visual-grid.ts`.
- [ ] PVO-2.7 — Zdefiniowac minimalne types dla grid output bez zmiany database contracts, jesli wystarczy module-local type.
- [ ] PVO-2.8 — Grupowac grid wizualnie po `section_name ?? ""`, potem `row_number`, bez traktowania `section_name` jako czesci aktywnej unikalnosci lokalizacji.
- [ ] PVO-2.9 — Renderowac row grid dla `layout_type = rows`.
- [ ] PVO-2.10 — Renderowac partial grid plus warning dla `layout_type = mixed`.
- [ ] PVO-2.11 — Renderowac fallback list/cards dla `layout_type = irregular`.
- [ ] PVO-2.12 — Renderowac `removed trees` jako muted historical markers.
- [ ] PVO-2.13 — Renderowac `inferred empty positions` tylko miedzy `min(position_in_row)` i `max(position_in_row)` w danym row.
- [ ] PVO-2.14 — Przenosic trees bez pelnych coordinates do `unlocated_trees` fallback.
- [ ] PVO-2.15 — Pokazac warnings dla missing coordinates w `rows`.
- [ ] PVO-2.16 — Pokazac warnings dla partial coverage w `mixed`.
- [ ] PVO-2.17 — Dodac legend dla active, removed, inferred empty, unverified location.
- [ ] PVO-2.18 — Dodac read-only filters: active/removed/all, variety, condition, location verified, jezeli nie wymusza to duzego state refactoru.
- [ ] PVO-2.19 — Dodac CTA back to `/plots`.
- [ ] PVO-2.20 — Dodac edit link do `/plots/[plotId]/edit`.
- [ ] PVO-2.21 — Obsluzyc missing plot recovery zgodnie z istniejacym wzorcem aplikacji.

Checklist tests:

- [ ] PVO-2.T1 — Dodac `tests/unit/plot-visual-grid.spec.ts`.
- [ ] PVO-2.T2 — Test: group by section and row.
- [ ] PVO-2.T3 — Test: different row lengths.
- [ ] PVO-2.T4 — Test: active tree wins over removed historical tree at same logical location.
- [ ] PVO-2.T5 — Test: inferred empty positions do not extend beyond min/max.
- [ ] PVO-2.T6 — Test: incomplete-location trees go to fallback.
- [ ] PVO-2.T7 — Test: `irregular` returns fallback model.
- [ ] PVO-2.T8 — Dodac Playwright smoke dla otwarcia `/plots/[plotId]` z `/plots`.
- [ ] PVO-2.T9 — Dodac E2E smoke dla `rows`, `mixed`, `irregular` seeded plots, jesli baseline ma takie dane.

Acceptance criteria:

- [ ] PVO-2.A1 — `/plots/[plotId]` istnieje i jest server-side scoped do active orchard.
- [ ] PVO-2.A2 — `rows` plot pokazuje read-only row grid.
- [ ] PVO-2.A3 — `mixed` plot pokazuje partial grid i ostrzezenie.
- [ ] PVO-2.A4 — `irregular` plot nie pokazuje fake row grid.
- [ ] PVO-2.A5 — Removed trees sa widoczne jako muted markers.
- [ ] PVO-2.A6 — Inferred empty positions sa virtual i ograniczone do min/max row.
- [ ] PVO-2.A7 — Missing coordinates nie lamia widoku i trafiaja do fallback.

Dependencies:

- [ ] PVO-2.D1 — Phase 0 audit zakonczony.
- [ ] PVO-2.D2 — Dla CTA z Phase 1 route moze byc gotowa albo PR-y moga byc odwrocone.
- [ ] PVO-2.D3 — Decyzje DEC-PVO-001, DEC-PVO-002, DEC-PVO-005.

Out of scope:

- [ ] PVO-2.O1 — Klikanie markerow.
- [ ] PVO-2.O2 — Tree detail panel.
- [ ] PVO-2.O3 — Selection mode.
- [ ] PVO-2.O4 — Mutacje i prefill `/activities/new`.
- [ ] PVO-2.O5 — Structural actions.

## 9. Phase 3 — Tree Detail Interaction

Cel:
Dodac interakcje klikniecia drzewa i panel szczegolow bez mutacji na detail page.

Zakres:

- [ ] Dodac client component dla grid interactions.
- [ ] Dodac `Browse` mode.
- [ ] Klikniecie aktywnego albo removed marker otwiera panel metadata.
- [ ] Panel pokazuje dane drzewa i akcje nawigacyjne.

Checklist implementation:

- [ ] PVO-3.1 — Wydzielic interactive grid client component, np. `features/plots/plot-visual-grid.tsx`.
- [ ] PVO-3.2 — Zachowac server-side data loading w route, przekazujac tylko potrzebne props.
- [ ] PVO-3.3 — Dodac `Browse` mode jako domyslny tryb.
- [ ] PVO-3.4 — Dodac click handler na tree marker.
- [ ] PVO-3.5 — Dodac panel/drawer component, np. `features/plots/plot-tree-detail-panel.tsx`.
- [ ] PVO-3.6 — Pokazac `tree_code`, species, variety, `row_number`, `position_in_row`, labels, status, dates, notes.
- [ ] PVO-3.7 — Pokazac state `location_verified = false`.
- [ ] PVO-3.8 — Dodac link do `/trees/[treeId]/edit`.
- [ ] PVO-3.9 — Dodac CTA `Dodaj aktywnosc dla drzewa`, poczatkowo jako link/prefill single tree zgodny z Phase 5 albo disabled placeholder, jesli Phase 5 jeszcze nie istnieje.
- [ ] PVO-3.10 — Dodac zamykanie panelu przez close button i `Escape`.
- [ ] PVO-3.11 — Dodac focus management po otwarciu i zamknieciu panelu.
- [ ] PVO-3.12 — Zapewnic minimalny responsive layout dla laptop/desktop i nie blokowac mobile polish.
- [ ] PVO-3.13 — Nie dodawac timeline aktywnosci/zbiorow w tej fazie.

Checklist tests:

- [ ] PVO-3.T1 — Unit albo component test dla wyboru selected marker state, jesli istnieje lokalny wzorzec.
- [ ] PVO-3.T2 — Playwright: click tree marker opens detail panel.
- [ ] PVO-3.T3 — Playwright: panel shows tree metadata.
- [ ] PVO-3.T4 — Playwright: edit link points to `/trees/[treeId]/edit`.
- [ ] PVO-3.T5 — Accessibility smoke: focus moves into panel and `Escape` closes it.

Acceptance criteria:

- [ ] PVO-3.A1 — W `Browse` mode klikniecie tree marker otwiera panel.
- [ ] PVO-3.A2 — Panel pokazuje podstawowe metadata bez dodatkowych server calls per marker.
- [ ] PVO-3.A3 — Panel ma dzialajacy edit link.
- [ ] PVO-3.A4 — Panel nie pokazuje jeszcze timeline aktywnosci/harvests.
- [ ] PVO-3.A5 — Interakcja nie wykonuje mutacji.

Dependencies:

- [ ] PVO-3.D1 — Phase 2 read-only route i grid.
- [ ] PVO-3.D2 — Stabilny grid output zawierajacy tree metadata potrzebne do panelu.
- [ ] PVO-3.D3 — Decyzja DEC-PVO-009.

Out of scope:

- [ ] PVO-3.O1 — Selection mode.
- [ ] PVO-3.O2 — Add Activity prefill z multi-selection.
- [ ] PVO-3.O3 — Activity/harvest timeline.
- [ ] PVO-3.O4 — Mutacje na `/plots/[plotId]`.

## 10. Phase 4 — Selection MVP

Cel:
Dodac przewidywalne zaznaczanie drzew i kompresje selection do `activity_scopes`.

Zakres:

- [ ] Dodac `Select` mode.
- [ ] Obsluzyc single tree toggle.
- [ ] Obsluzyc same-row range selection.
- [ ] Obsluzyc multi-row independent ranges.
- [ ] Dodac helper kompresji selection.

Checklist implementation:

- [ ] PVO-4.1 — Dodac mode toggle `Browse` / `Select`.
- [ ] PVO-4.2 — W `Select` mode klik active tree toggles selection.
- [ ] PVO-4.3 — W `Select` mode removed tree jest disabled dla `Add Activity`.
- [ ] PVO-4.4 — W `Select` mode inferred empty position jest disabled dla `Add Activity`.
- [ ] PVO-4.5 — Dodac same-row range selection przez wskazanie start/end.
- [ ] PVO-4.6 — W range selection wybierac tylko active trees w zakresie.
- [ ] PVO-4.7 — Pozwolic na wiele niezaleznych zakresow w roznych rows.
- [ ] PVO-4.8 — Dodac selected count.
- [ ] PVO-4.9 — Dodac compressed range summary w selection bar.
- [ ] PVO-4.10 — Dodac pure helper `compressPlotSelectionToActivityScopes` w `lib/domain/plot-selection.ts`.
- [ ] PVO-4.11 — Kompresowac kolejne pozycje w tym samym `section_name` i `row_number` do `location_range`, traktujac `section_name` jako kontekst scope, nie jako override unikalnosci active tree location.
- [ ] PVO-4.12 — Dla niepelnych coordinates generowac `tree` scopes albo blokowac akcje z jasnym komunikatem.
- [ ] PVO-4.13 — Walidowac, ze selection ma co najmniej jedno active tree dla `Add Activity`.
- [ ] PVO-4.14 — Walidowac jeden `plot_id`.
- [ ] PVO-4.15 — Nie generowac `location_range` dla `irregular`.
- [ ] PVO-4.16 — Dodac limit 20 scopes/ranges.
- [ ] PVO-4.17 — Dodac limit okolo 2000 znakow query string dla przyszlego prefill.
- [ ] PVO-4.18 — Pokazac komunikat, gdy selection przekracza limit.

Checklist tests:

- [ ] PVO-4.T1 — Dodac `tests/unit/plot-selection.spec.ts`.
- [ ] PVO-4.T2 — Test: consecutive positions become one `location_range`.
- [ ] PVO-4.T3 — Test: non-consecutive positions split ranges.
- [ ] PVO-4.T4 — Test: multi-row selection creates multiple ranges.
- [ ] PVO-4.T5 — Test: section boundaries split ranges.
- [ ] PVO-4.T6 — Test: incomplete-coordinate selected tree becomes `tree` scope or validation error per final helper contract.
- [ ] PVO-4.T7 — Test: removed/inactive trees excluded from Add Activity selection.
- [ ] PVO-4.T8 — Test: scope count limit.
- [ ] PVO-4.T9 — Test: query length estimate limit.
- [ ] PVO-4.T10 — Playwright: switch to Select mode and select single tree.
- [ ] PVO-4.T11 — Playwright: select same-row range and see compressed summary.

Acceptance criteria:

- [ ] PVO-4.A1 — `Browse` mode nadal otwiera panel.
- [ ] PVO-4.A2 — `Select` mode toggles active tree selection.
- [ ] PVO-4.A3 — Same-row range selection dziala przewidywalnie.
- [ ] PVO-4.A4 — Multi-row selection pokazuje niezalezne compressed ranges.
- [ ] PVO-4.A5 — Selection helper zwraca scopes zgodne z `activity_scopes`.
- [ ] PVO-4.A6 — UI blokuje `Add Activity`, gdy limits albo validation nie przechodza.

Dependencies:

- [ ] PVO-4.D1 — Phase 2 grid output.
- [ ] PVO-4.D2 — Phase 3 interactive client component.
- [ ] PVO-4.D3 — Decyzje DEC-PVO-003, DEC-PVO-004, DEC-PVO-007.

Out of scope:

- [ ] PVO-4.O1 — Faktyczne przejscie do `/activities/new` z prefill.
- [ ] PVO-4.O2 — Bulk deactivate mutation.
- [ ] PVO-4.O3 — Batch create mutation.
- [ ] PVO-4.O4 — Lasso selection.

## 11. Phase 5 — Add Activity from Selection

Cel:
Polaczyc selection z istniejacym formularzem aktywnosci.

Zakres:

- [ ] Dodac bezpieczny prefill parser dla `/activities/new`.
- [ ] Prefillowac `plot_id`, `tree_id` i `activity_scopes`.
- [ ] Zachowac `ActivityForm`, `createActivity` i `normalizeActivityPayload`.
- [ ] Obsluzyc one plot + many compressed ranges.

Checklist implementation:

- [ ] PVO-5.1 — Zaprojektowac URL query format dla scopes prefill.
- [ ] PVO-5.2 — Dodac safe query prefill parser dla `app/(app)/activities/new/page.tsx`.
- [ ] PVO-5.3 — Walidowac query prefill przez istniejace schema/types, nie przez ad hoc unchecked JSON.
- [ ] PVO-5.4 — Prefill `plot_id` dla selection.
- [ ] PVO-5.5 — Prefill `tree_id` dla single tree activity.
- [ ] PVO-5.6 — Prefill `activity_scopes` dla single tree i multi-range selection.
- [ ] PVO-5.7 — Dla single tree ustawic zarowno parent `tree_id`, jak i `activity_scopes[0].tree_id`.
- [ ] PVO-5.8 — Dla wielu scopes ustawic parent `tree_id = null`.
- [ ] PVO-5.9 — Zachowac `normalizeActivityPayload` invariants.
- [ ] PVO-5.10 — Nie omijac `ActivityForm`.
- [ ] PVO-5.11 — Nie omijac istniejacych server validations.
- [ ] PVO-5.12 — Obsluzyc invalid prefill komunikatem i fallback do pustego formularza.
- [ ] PVO-5.13 — Zablokowac albo zignorowac scopes spoza active orchard po stronie serwera.
- [ ] PVO-5.14 — Dodac link/action z selection bar do `/activities/new`.
- [ ] PVO-5.15 — Dodac link/action z tree detail panel dla single tree.

Checklist tests:

- [ ] PVO-5.T1 — Unit test parsera query prefill.
- [ ] PVO-5.T2 — Unit test single tree prefill payload.
- [ ] PVO-5.T3 — Unit test multi-range prefill payload.
- [ ] PVO-5.T4 — Unit test invalid prefill fallback.
- [ ] PVO-5.T5 — Regression test `normalizeActivityPayload` dla single tree invariant.
- [ ] PVO-5.T6 — Regression test `normalizeActivityPayload` dla multi-scope parent `tree_id = null`.
- [ ] PVO-5.T7 — Playwright: selection -> `/activities/new` prefilled plot/scopes.
- [ ] PVO-5.T8 — Playwright: single tree CTA -> `/activities/new` prefilled tree.
- [ ] PVO-5.T9 — Integration/security test: prefill nie pozwala zapisac danych poza active orchard.

Acceptance criteria:

- [ ] PVO-5.A1 — Single selected tree otwiera `/activities/new` z poprawnym `plot_id`, `tree_id` i tree scope.
- [ ] PVO-5.A2 — Multi-range selection otwiera `/activities/new` z wieloma compressed scopes.
- [ ] PVO-5.A3 — Activity submission uzywa istniejacego `ActivityForm` i server validations.
- [ ] PVO-5.A4 — Przekroczony URL/scope limit nie przechodzi do formularza.
- [ ] PVO-5.A5 — Invalid prefill nie powoduje crash ani cross-orchard leak.

Dependencies:

- [ ] PVO-5.D1 — Phase 4 selection helper i selection UI.
- [ ] PVO-5.D2 — Potwierdzone invariants `normalizeActivityPayload`.
- [ ] PVO-5.D3 — Decyzje DEC-PVO-003, DEC-PVO-004, DEC-PVO-007, DEC-PVO-008.

Out of scope:

- [ ] PVO-5.O1 — Add Harvest from map.
- [ ] PVO-5.O2 — Bulk Deactivate from map.
- [ ] PVO-5.O3 — Draft storage dla bardzo duzych selections.
- [ ] PVO-5.O4 — Nowe activity status flags na `trees`.

## 12. Phase 6 — Structural Actions

Cel:
Zaplanowac i pozniej podpiac dzialania strukturalne z mapy, nadal przez istniejace bezpieczne flows.

Zakres:

- [ ] Dodac link/prefill do `/trees/batch/deactivate`.
- [ ] Dodac link/prefill do `/trees/batch/new`.
- [ ] Zachowac preview-before-write.
- [ ] Zachowac ograniczenia row-range dla `rows` i `mixed`.

Checklist implementation:

- [ ] PVO-6.1 — Sprawdzic obecne parametry formularza `/trees/batch/deactivate`.
- [ ] PVO-6.2 — Dodac minimalny prefill dla jednego row range do `/trees/batch/deactivate`, jesli obecny formularz to wspiera albo latwo rozszerzyc.
- [ ] PVO-6.3 — Dla multi-row destructive selection pokazac komunikat o ograniczeniu albo podzielic operacje dopiero, jesli existing tools wspieraja to bezpiecznie.
- [ ] PVO-6.4 — Zachowac preview aktywnych drzew i ostrzezenia dla pustych/nieaktywnych pozycji.
- [ ] PVO-6.5 — Zachowac confirmation UX przed `bulk_deactivate_trees`.
- [ ] PVO-6.6 — Upewnic sie, ze operation nie wykonuje physical delete.
- [ ] PVO-6.7 — Sprawdzic obecne parametry `/trees/batch/new`.
- [ ] PVO-6.8 — Dodac minimalny prefill dla empty inferred continuous range do `/trees/batch/new`, jesli scope jest jednoznaczny.
- [ ] PVO-6.9 — Dla single empty inferred position rozwazyc link do `/trees/new` z `plot_id`, `row_number`, `position_in_row`.
- [ ] PVO-6.10 — Zachowac conflict preview i database uniqueness.
- [ ] PVO-6.11 — Nie dodawac multi-row destructive operation, jesli nie ma bezpiecznego preview dla wszystkich zakresow.

Checklist tests:

- [ ] PVO-6.T1 — Unit/integration tests dla prefill parsera batch deactivate, jesli dodany.
- [ ] PVO-6.T2 — Unit/integration tests dla prefill parsera batch create, jesli dodany.
- [ ] PVO-6.T3 — Playwright: selected one row range -> deactivate preview.
- [ ] PVO-6.T4 — Playwright: empty range -> batch create preview.
- [ ] PVO-6.T5 — Regression: bulk deactivate sets `condition_status = removed` and `is_active = false`.
- [ ] PVO-6.T6 — Regression: no physical delete.

Acceptance criteria:

- [ ] PVO-6.A1 — Structural actions prowadza do istniejacych flows, a nie nowych mutacji na mapie.
- [ ] PVO-6.A2 — Deactivate wymaga preview i confirmation.
- [ ] PVO-6.A3 — Plant New/Batch Create nadal uzywa conflict preview.
- [ ] PVO-6.A4 — `irregular` nie dostaje row-range actions.
- [ ] PVO-6.A5 — Multi-row destructive operation jest jawnie deferred albo bezpiecznie wsparta przez existing tools.

Dependencies:

- [ ] PVO-6.D1 — Phase 4 selection.
- [ ] PVO-6.D2 — Istniejace `BulkTreeBatchForm`.
- [ ] PVO-6.D3 — Istniejace `BulkTreeDeactivateForm`.
- [ ] PVO-6.D4 — RPC `create_bulk_tree_batch` i `bulk_deactivate_trees`.

Out of scope:

- [ ] PVO-6.O1 — Nowe RPC dla multi-range bulk deactivate.
- [ ] PVO-6.O2 — Physical delete drzew.
- [ ] PVO-6.O3 — Persistent empty slots.
- [ ] PVO-6.O4 — Full planting history redesign.

## 13. Phase 7 — Future Domain Hardening

Cel:
Zebrac przyszle kierunki, ktorych nie robimy w MVP.

Zakres:

- [ ] Uporzadkowac tematy domenowe po walidacji MVP w realnym workflow.
- [ ] Nie blokowac MVP oczekiwaniem na nowy model danych.

Checklist future work:

- [ ] PVO-7.1 — Rozwazyc persistent row definitions, jesli inferred grid nie wystarcza.
- [ ] PVO-7.2 — Rozwazyc persistent empty positions, jesli sadownicy potrzebuja planowania pustych miejsc.
- [ ] PVO-7.3 — Rozwazyc `TreeSlot` / `PlantingSlot` tylko po potwierdzeniu potrzeby operacyjnej.
- [ ] PVO-7.4 — Rozwazyc stronger planting history per logical location.
- [ ] PVO-7.5 — Rozwazyc `/trees/[treeId]` detail page.
- [ ] PVO-7.6 — Rozwazyc tree activity/harvest timeline w panelu.
- [ ] PVO-7.7 — Rozwazyc mobile-first field workflow.
- [ ] PVO-7.8 — Rozwazyc performance upgrade, jesli plots przekraczaja zakladany rozmiar.

Checklist tests:

- [ ] PVO-7.T1 — Nie dodawac testow bez konkretnego future ticket.
- [ ] PVO-7.T2 — Przy kazdym future hardening ticket dopisac osobna strategie testow.

Acceptance criteria:

- [ ] PVO-7.A1 — Tematy future sa zapisane, ale nie wchodza do MVP.
- [ ] PVO-7.A2 — MVP pozostaje bez migracji i bez slot model.

Dependencies:

- [ ] PVO-7.D1 — Feedback po MVP.
- [ ] PVO-7.D2 — Dane z manual seeded QA i realnych workflow.

Out of scope:

- [ ] PVO-7.O1 — Implementacja w ramach MVP.
- [ ] PVO-7.O2 — Migracje przed walidacja potrzeby.

## 14. Cross-Cutting Technical Checklist

### Data and RLS

- [ ] PVO-X.D1 — Kazda route uzywa `requireActiveOrchard`.
- [ ] PVO-X.D2 — Zadna client-side akcja nie przesyla zaufanego `orchard_id`.
- [ ] PVO-X.D3 — Queries zawsze filtrują po server-side `orchardId`.
- [ ] PVO-X.D4 — `owner` ma dostep do flow w swoim orchard.
- [ ] PVO-X.D5 — `worker` ma dostep do flow w swoim orchard zgodnie z obecnymi rules.
- [ ] PVO-X.D6 — Outsider nie widzi danych obcego orchard.
- [ ] PVO-X.D7 — Supabase RLS pozostaje enforced.

### UX

- [ ] PVO-X.U1 — Empty states sa jasne i operacyjne.
- [ ] PVO-X.U2 — Unsupported states sa jawne, zwlaszcza `irregular`.
- [ ] PVO-X.U3 — Nie renderowac fake irregular grid.
- [ ] PVO-X.U4 — `mixed` grid ma widoczne ostrzezenia o partial coverage.
- [ ] PVO-X.U5 — Destructive actions wymagaja confirmation.
- [ ] PVO-X.U6 — Selection summary pokazuje, co realnie zostanie uzyte jako scopes.

### Performance

- [ ] PVO-X.P1 — Około 1000 trees per plot dziala bez canvas.
- [ ] PVO-X.P2 — Nie wykonywac per-marker server calls.
- [ ] PVO-X.P3 — Grid builder pozostaje pure helper.
- [ ] PVO-X.P4 — Selection compression pozostaje pure helper.
- [ ] PVO-X.P5 — Filtrowanie nie powoduje kosztownych roundtripow, jesli dane sa juz na stronie.

### Accessibility

- [ ] PVO-X.A11Y1 — Marker buttons maja meaningful labels.
- [ ] PVO-X.A11Y2 — Panel/drawer ma focus management.
- [ ] PVO-X.A11Y3 — Keyboard navigation jest zapewniona tam, gdzie practical dla MVP.
- [ ] PVO-X.A11Y4 — Selected state nie opiera sie wylacznie na kolorze.
- [ ] PVO-X.A11Y5 — Warning i error messages sa czytelne dla screen readers.

### Testing

- [ ] PVO-X.T1 — Unit tests dla domain helpers.
- [ ] PVO-X.T2 — Integration tests dla data fetching i active orchard isolation.
- [ ] PVO-X.T3 — Playwright tests dla core user flows.
- [ ] PVO-X.T4 — Manual seeded QA dla owner, worker i outsider.
- [ ] PVO-X.T5 — Regression tests dla existing batch create/deactivate nie sa oslabiane.

## 15. QA Gates Per Phase

### Phase 0 QA Gate

- [ ] PVO-QA0.1 — `git status --short` reviewed before work.
- [ ] PVO-QA0.2 — Route/data/test inventory zapisany w notatkach PR.
- [ ] PVO-QA0.3 — Existing targeted tests identified.

### Phase 1 QA Gate

- [ ] PVO-QA1.1 — `pnpm lint`.
- [ ] PVO-QA1.2 — `pnpm typecheck`.
- [ ] PVO-QA1.3 — `pnpm test`.
- [ ] PVO-QA1.4 — Relevant plot card stats tests pass.
- [ ] PVO-QA1.5 — `/plots` manual smoke for owner and worker.

### Phase 2 QA Gate

- [ ] PVO-QA2.1 — `pnpm lint`.
- [ ] PVO-QA2.2 — `pnpm typecheck`.
- [ ] PVO-QA2.3 — `pnpm test`.
- [ ] PVO-QA2.4 — Relevant unit tests for `buildPlotVisualGrid` pass.
- [ ] PVO-QA2.5 — Relevant Playwright smoke passes.
- [ ] PVO-QA2.6 — `pnpm seed:baseline-reset`.
- [ ] PVO-QA2.7 — `pnpm qa:baseline-status` returns READY.
- [ ] PVO-QA2.8 — Seeded QA checked for `rows`, `mixed`, `irregular`.

### Phase 3 QA Gate

- [ ] PVO-QA3.1 — `pnpm lint`.
- [ ] PVO-QA3.2 — `pnpm typecheck`.
- [ ] PVO-QA3.3 — `pnpm test`.
- [ ] PVO-QA3.4 — Playwright click tree -> detail panel passes.
- [ ] PVO-QA3.5 — Accessibility smoke for focus and close behavior.

### Phase 4 QA Gate

- [ ] PVO-QA4.1 — `pnpm lint`.
- [ ] PVO-QA4.2 — `pnpm typecheck`.
- [ ] PVO-QA4.3 — `pnpm test`.
- [ ] PVO-QA4.4 — Unit tests for `compressPlotSelectionToActivityScopes` pass.
- [ ] PVO-QA4.5 — Playwright select mode smoke passes.
- [ ] PVO-QA4.6 — Manual check for scope limit message.

### Phase 5 QA Gate

- [ ] PVO-QA5.1 — `pnpm lint`.
- [ ] PVO-QA5.2 — `pnpm typecheck`.
- [ ] PVO-QA5.3 — `pnpm test`.
- [ ] PVO-QA5.4 — Playwright selection -> activity prefill passes.
- [ ] PVO-QA5.5 — Integration/security tests for active orchard prefill pass.
- [ ] PVO-QA5.6 — `pnpm seed:baseline-reset`.
- [ ] PVO-QA5.7 — `pnpm qa:baseline-status` returns READY.
- [ ] PVO-QA5.8 — `pnpm test:e2e`.

### Phase 6 QA Gate

- [ ] PVO-QA6.1 — `pnpm lint`.
- [ ] PVO-QA6.2 — `pnpm typecheck`.
- [ ] PVO-QA6.3 — `pnpm test`.
- [ ] PVO-QA6.4 — Existing tree batch tests pass.
- [ ] PVO-QA6.5 — Playwright batch create/deactivate smoke passes.
- [ ] PVO-QA6.6 — Manual confirmation UX checked.

### Phase 7 QA Gate

- [ ] PVO-QA7.1 — Future ticket includes its own QA gate.
- [ ] PVO-QA7.2 — MVP scope remains unchanged unless new decision is accepted.

## 16. Acceptance Criteria for MVP

- [ ] `/plots` shows operational plot cards.
- [ ] `/plots/[plotId]` exists.
- [ ] `rows` plot renders read-only grid.
- [ ] `mixed` plot renders partial grid with warnings.
- [ ] `irregular` plot renders fallback, not fake grid.
- [ ] Tree markers show active/removed/inferred states correctly.
- [ ] Clicking tree opens detail panel.
- [ ] Selection mode works.
- [ ] Selection compresses to scopes.
- [ ] Add Activity from selection prefills activity form.
- [ ] Single tree activity preserves `tree_id` invariants.
- [ ] Owner and worker can use the flow in their orchard.
- [ ] Outsider cannot access another orchard data.
- [ ] Tests and seeded QA pass.
- [ ] No MVP migration is required.
- [ ] No `TreeSlot`, `PlantingSlot` or `plot_rows` model is introduced.

## 17. Recommended PR Breakdown

### PR 1 — Documentation master plan only

Zakres:

- [ ] Create `documents/01_implementation_materials/plot_visual_operations_implementation_master_plan.md`.
- [ ] Optionally link it from documentation indexes only if worktree and doc conventions make that safe.

Files likely touched:

- [ ] `documents/01_implementation_materials/plot_visual_operations_implementation_master_plan.md`
- [ ] Optional: `documents/01_implementation_materials/README.md`
- [ ] Optional: `documents/00_overview_and_checklists/documentation_map.md`

Tests:

- [ ] Documentation review only.

Acceptance criteria:

- [ ] Master plan exists and includes phase checklists, decision log and QA gates.

### PR 2 — Plot cards read model and CTA

Zakres:

- [ ] Add plot card stats read model.
- [ ] Add active/removed counts.
- [ ] Add dominant varieties from active trees.
- [ ] Add CTA to `/plots/[plotId]`.

Files likely touched:

- [ ] `app/(app)/plots/page.tsx`
- [ ] `features/plots/plot-list.tsx`
- [ ] `lib/orchard-data/plots.ts`
- [ ] `lib/orchard-data/trees.ts`
- [ ] Possible tests under `tests/unit` or `tests/integration`

Tests:

- [ ] Unit tests for stats.
- [ ] Typecheck.
- [ ] `/plots` smoke.

Acceptance criteria:

- [ ] `/plots` cards are operational and existing edit/archive/restore actions still work.

### PR 3 — `/plots/[plotId]` route and data loading

Zakres:

- [ ] Add detail route.
- [ ] Use `requireActiveOrchard`.
- [ ] Load plot and trees.
- [ ] Handle missing plot recovery.

Files likely touched:

- [ ] `app/(app)/plots/[plotId]/page.tsx`
- [ ] `lib/orchard-data/plots.ts`
- [ ] `lib/orchard-data/trees.ts`

Tests:

- [ ] Integration/security smoke for orchard-scoped loading.
- [ ] Typecheck.

Acceptance criteria:

- [ ] Route loads correct plot within active orchard and blocks outsider data leakage.

### PR 4 — `buildPlotVisualGrid` helper + tests

Zakres:

- [ ] Add pure grid builder.
- [ ] Cover rows, mixed, irregular and empty inference.

Files likely touched:

- [ ] `lib/domain/plot-visual-grid.ts`
- [ ] `tests/unit/plot-visual-grid.spec.ts`

Tests:

- [ ] Unit tests for all grid rules.

Acceptance criteria:

- [ ] Helper output can drive read-only UI without React-specific logic.

### PR 5 — Read-only grid UI

Zakres:

- [ ] Render plot header.
- [ ] Render metadata, legend, filters.
- [ ] Render row grid, mixed partial grid and irregular fallback.

Files likely touched:

- [ ] `app/(app)/plots/[plotId]/page.tsx`
- [ ] `features/plots/plot-visual-grid.tsx`
- [ ] `features/plots/plot-visual-legend.tsx`
- [ ] Possible CSS/module files depending on project conventions

Tests:

- [ ] Playwright smoke for rows/mixed/irregular.
- [ ] Typecheck.

Acceptance criteria:

- [ ] User can open a plot and understand active, removed, empty and unsupported states.

### PR 6 — Tree detail panel

Zakres:

- [ ] Add Browse interaction.
- [ ] Add panel/drawer with tree metadata.
- [ ] Add edit link and single-tree activity CTA placeholder/link.

Files likely touched:

- [ ] `features/plots/plot-visual-grid.tsx`
- [ ] `features/plots/plot-tree-detail-panel.tsx`
- [ ] `tests/e2e/plot-visual-operations.spec.ts`

Tests:

- [ ] Playwright click tree -> panel.
- [ ] Accessibility smoke for focus.

Acceptance criteria:

- [ ] Clicking a marker opens a useful detail panel without mutation.

### PR 7 — Selection helper + tests

Zakres:

- [ ] Add selection compression helper.
- [ ] Add validation and URL limit estimation.

Files likely touched:

- [ ] `lib/domain/plot-selection.ts`
- [ ] `tests/unit/plot-selection.spec.ts`

Tests:

- [ ] Unit tests for compression, limits and validation.

Acceptance criteria:

- [ ] Selection can be represented as valid `activity_scopes`.

### PR 8 — Selection UI

Zakres:

- [ ] Add Select mode.
- [ ] Add single selection and range selection.
- [ ] Add selection bar and compressed summary.

Files likely touched:

- [ ] `features/plots/plot-visual-grid.tsx`
- [ ] `features/plots/plot-selection-bar.tsx`
- [ ] `tests/e2e/plot-visual-operations.spec.ts`

Tests:

- [ ] Playwright select mode smoke.
- [ ] Manual selection validation.

Acceptance criteria:

- [ ] User can select active trees/ranges and see the compressed scope summary.

### PR 9 — Add Activity prefill

Zakres:

- [ ] Add safe prefill parser for `/activities/new`.
- [ ] Wire selection and single tree CTA to activity form.
- [ ] Preserve `normalizeActivityPayload` invariants.

Files likely touched:

- [ ] `app/(app)/activities/new/page.tsx`
- [ ] `features/activities/activity-form.tsx`
- [ ] `features/plots/plot-selection-bar.tsx`
- [ ] `features/plots/plot-tree-detail-panel.tsx`
- [ ] `lib/validation/activities.ts`
- [ ] `tests/unit/phase3-activities-validation.spec.ts`
- [ ] `tests/e2e/plot-visual-operations.spec.ts`

Tests:

- [ ] Unit tests for parser and invariants.
- [ ] Playwright selection -> activity form prefill.
- [ ] Security/integration tests for active orchard isolation.

Acceptance criteria:

- [ ] Add Activity works for single tree and multi-range selection through existing form and validations.

### PR 10 — Playwright + seeded QA hardening

Zakres:

- [ ] Stabilize E2E coverage.
- [ ] Add seeded QA scenarios for owner, worker, outsider.
- [ ] Verify rows, mixed and irregular plots.

Files likely touched:

- [ ] `tests/e2e/plot-visual-operations.spec.ts`
- [ ] Existing E2E helpers/fixtures if needed
- [ ] Documentation QA notes if conventions require

Tests:

- [ ] `pnpm seed:baseline-reset`
- [ ] `pnpm qa:baseline-status`
- [ ] `pnpm test:e2e`

Acceptance criteria:

- [ ] MVP flow passes seeded QA and automated E2E.

## 18. Parking Lot

- [ ] GPS map.
- [ ] Full map geometry.
- [ ] Canvas/lasso editor.
- [ ] Mobile field mode.
- [ ] Persistent slots.
- [ ] Persistent row definitions.
- [ ] Activity/harvest timeline in tree detail panel.
- [ ] Multi-row destructive bulk operation.
- [ ] Harvest from map.
- [ ] Plant new from inferred empty positions.
- [ ] Draft storage for very large activity selections.
- [ ] Dedicated `/trees/[treeId]` detail page.
- [ ] Advanced map performance if plots exceed expected size.

## 19. Current Next Step

Pierwszy realny krok po zaakceptowaniu dokumentu:

- [ ] `PVO-0.1 — Complete audit and confirm route/data/test inventory`

Pierwszy kodowy ticket:

- [ ] `PVO-2.1 — Add read-only /plots/[plotId] route foundation`

## Implementation Notes / Risks

- [ ] `app/(app)/plots/[plotId]/page.tsx` nie istnieje obecnie jako detail page; istnieje tylko edit route dla plot.
- [ ] `features/activities/activity-form.tsx` obsluguje `activity_scopes`, ale roadmap zaklada nowy query prefill parser dla `/activities/new`.
- [ ] `listTreesForOrchard` istnieje, ale dedicated `listTreesForPlotInOrchard` albo row-grid read model wymaga dopiero dodania.
- [ ] Nie ma obecnie `buildPlotVisualGrid` ani `compressPlotSelectionToActivityScopes`.
- [ ] Nie ma obecnie `/trees/[treeId]` detail page, tylko `/trees/[treeId]/edit`.
- [ ] `mixed` plots moga ujawnic niejednoznaczne local coordinates; w MVP konflikt aktywnych drzew dla tego samego `plot_id + row_number + position_in_row` jest data integrity issue / warning, nawet jesli rekordy maja rozne `section_name`.
- [ ] Implementation note: If future product requirements need repeated `row_number + position_in_row` values across sections in the same plot, this is outside the MVP and requires explicit model/constraint redesign. MVP must stay aligned with the current active logical location uniqueness.
- [ ] URL prefill jest wystarczajacy dla MVP, ale moze wymagac draft mechanism po przekroczeniu realnych rozmiarow selection.
- [ ] Dokument nie dodaje linkow do `documents/01_implementation_materials/README.md` ani `documents/00_overview_and_checklists/documentation_map.md`, zeby nie dotykac istniejacych zmian w worktree bez osobnej decyzji.

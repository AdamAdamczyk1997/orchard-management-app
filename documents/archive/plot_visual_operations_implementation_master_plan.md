# Archived note

This `Plot Visual Operations MVP` execution plan is historical planning context.
The implemented state is tracked in active documentation, especially `documents/00_overview_and_checklists/project_context_for_new_chat.md`, `documents/ai_project_map.md` and `documents/ui_implementation_map.md`.

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
- [x] Dodac nowe `/plots/[plotId]`.
- [x] Wyrenderowac read-only visual grid dla dzialek `layout_type = rows`.
- [x] Wyrenderowac partial grid z ostrzezeniami dla `layout_type = mixed`.
- [x] Wyrenderowac fallback bez siatki dla `layout_type = irregular`.
- [x] Dodac tree detail panel dla kliknietego drzewa.
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

- [x] Grid builder musi rozroznic `active_tree` i `removed_tree`.
- [x] UI musi pokazac muted visual state dla `is_active = false` albo `condition_status = removed`.
- [ ] Selection dla `Add Activity` domyslnie blokuje `removed_tree`.

### DEC-PVO-002 — Inferred empty positions range

Status: Accepted

Decision:
`inferred empty positions` renderujemy tylko miedzy `min(position_in_row)` i `max(position_in_row)` w danym rzedzie. Nie rozszerzamy domyslnie do `default_trees_per_row`.

Rationale:
Bez persistent slot model rozszerzanie do deklarowanej liczby drzew mogloby sugerowac istnienie miejsc, ktorych dane jeszcze nie potwierdzaja.

Implementation impact:

- [x] `buildPlotVisualGrid` wylicza puste pozycje per row z realnych rekordow `trees`.
- [x] `default_trees_per_row` moze byc pokazane jako metadata, ale nie steruje automatycznie markerami.
- [x] Testy musza potwierdzic, ze grid nie dodaje pozycji poza realnym `min/max`.

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

- [x] Grid builder moze grupowac wizualnie po `section_name ?? ""`, potem `row_number`.
- [x] Konflikty active trees w tej samej logical location musza byc ostrzezeniem danych, nie legalnym stanem do narysowania jako dwa aktywne markery.
- [x] UI dla `mixed` pokazuje partial coverage warning.
- [ ] Future support dla powtarzalnych `row_number + position_in_row` miedzy sekcjami wymaga osobnej decyzji i prawdopodobnie migracji albo rozszerzenia constraintu/modelu.

### DEC-PVO-006 — Dominant varieties source

Status: Accepted

Decision:
Dominujace odmiany na `/plots` liczymy tylko po aktywnych drzewach.

Rationale:
Karta dzialki ma opisywac aktualny stan produkcyjny, nie pelna historie nasadzen.

Implementation impact:

- [x] Read model dla plot cards filtruje dominant varieties do aktywnych drzew.
- [x] Removed/inactive counts sa osobnym licznikiem.
- [x] Testy statystyk odrozniaja active, inactive i removed trees.

### DEC-PVO-007 — Add Activity selection scope

Status: Accepted

Decision:
`Add Activity` z selection w MVP wspiera jeden `plot` i wiele skompresowanych ranges/scopes.

Rationale:
Widok `/plots/[plotId]` jest z natury scoped do jednej dzialki, a wiele zakresow w tej dzialce jest realnym workflow pracy.

Implementation impact:

- [x] Selection waliduje jeden `plot_id`.
- [x] `compressPlotSelectionToActivityScopes` moze zwrocic wiele `location_range` i `tree` scopes.
- [x] Cross-plot selection nie jest wspierane.

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

- [x] Panel pokazuje dane z `TreeSummary`.
- [x] Historia aktywnosci i harvests trafia do `Parking Lot`.
- [x] Brak timeline nie blokuje MVP.

## 5. Phase Overview

| Phase | Name | Main outcome | Status |
|---|---|---|---|
| Phase 0 | Audit and Preparation | Potwierdzony inventory tras, modeli, queries, testow i luk | Done |
| Phase 1 | Improve `/plots` Cards | Operacyjne plot cards ze stats i CTA do detail page | Automated done; manual owner/worker smoke pending |
| Phase 2 | Read-Only `/plots/[plotId]` | Nowa route z read-only grid/fallback | Done |
| Phase 3 | Tree Detail Interaction | Klikniecie drzewa otwiera panel metadata | Done |
| Phase 4 | Selection MVP | Select mode i kompresja selection do scopes | Automated done; manual QA pending |
| Phase 5 | Add Activity from Selection | Prefill `/activities/new` z selection | Done |
| Phase 6 | Structural Actions | Bezpieczne linki/prefill do batch flows | Automated done; manual UX confirmation pending |
| Phase 7 | Future Domain Hardening | Kierunki po MVP bez implementacji teraz | Backlog |

## 6. Phase 0 — Audit and Preparation

Cel:
Potwierdzic aktualny stan kodu, tras, typow, read modeli i testow przed implementacja.

Zakres:

- [x] Ustalic faktyczny inventory route modules w `app/(app)`.
- [x] Ustalic faktyczny inventory feature components w `features`.
- [x] Ustalic brakujace helpery i read models.
- [x] Doprecyzowac plan testow przed pierwsza zmiana kodowa.

Checklist implementation:

- [x] PVO-0.1 — Complete audit and confirm route/data/test inventory.
- [x] PVO-0.2 — Sprawdzic `app/(app)/plots/page.tsx`, `app/(app)/plots/new/page.tsx`, `app/(app)/plots/[plotId]/edit/page.tsx`.
- [x] PVO-0.3 — Potwierdzic brak `app/(app)/plots/[plotId]/page.tsx`.
- [x] PVO-0.4 — Sprawdzic `PlotSummary` i plot query functions w `lib/orchard-data/plots.ts`.
- [x] PVO-0.5 — Sprawdzic `TreeSummary`, `listTreesForOrchard`, `readTreeByIdForOrchard` w `lib/orchard-data/trees.ts`.
- [x] PVO-0.6 — Sprawdzic `ActivityForm` w `features/activities/activity-form.tsx`.
- [x] PVO-0.7 — Sprawdzic `normalizeActivityPayload` i activity scope invariants w `lib/validation/activities.ts`.
- [x] PVO-0.8 — Sprawdzic batch create flow w `app/(app)/trees/batch/new/page.tsx` i `features/trees/bulk-tree-batch-form.tsx`.
- [x] PVO-0.9 — Sprawdzic bulk deactivate flow w `app/(app)/trees/batch/deactivate/page.tsx` i `features/trees/bulk-tree-deactivate-form.tsx`.
- [x] PVO-0.10 — Sprawdzic istniejace unit tests dla layout policy, tree batches i activities.
- [x] PVO-0.11 — Sprawdzic istniejace Playwright flows dla owner/worker/outsider.
- [x] PVO-0.12 — Potwierdzic naming conventions dla nowych modules `lib/domain/plot-visual-grid.ts` i `lib/domain/plot-selection.ts`.
- [x] PVO-0.13 — Spisac rozjazdy w `Implementation Notes / Risks` przed rozpoczeciem Phase 1.

Checklist tests:

- [x] PVO-0.T1 — Uruchomic targeted existing unit tests zwiazane z plot layout policy.
- [x] PVO-0.T2 — Uruchomic targeted existing unit tests zwiazane z activity validation.
- [x] PVO-0.T3 — Zweryfikowac, ktore E2E scenariusze baseline beda rozszerzone.
- [x] PVO-0.T4 — Nie dodawac nowych testow w Phase 0, jesli audit nie wymaga kodu.

Acceptance criteria:

- [x] PVO-0.A1 — Jest potwierdzone, ze `/plots/[plotId]` nie istnieje jako detail page.
- [x] PVO-0.A2 — Jest potwierdzone, ktore istniejace queries/formularze beda reuzyte.
- [x] PVO-0.A3 — Jest potwierdzony zestaw testow startowych dla Phase 1 i Phase 2.
- [x] PVO-0.A4 — Nie zmieniono modelu danych, migracji ani UI.

Dependencies:

- [x] PVO-0.D1 — Roadmap document `plot_visual_operations_roadmap.md`.
- [x] PVO-0.D2 — Aktualna dokumentacja domain, UX, technical i testing.
- [x] PVO-0.D3 — Aktualny stan worktree sprawdzony przez `git status --short`.

Out of scope:

- [ ] PVO-0.O1 — Implementacja `/plots/[plotId]`.
- [ ] PVO-0.O2 — Dodawanie nowych components.
- [ ] PVO-0.O3 — Zmiany server actions.
- [ ] PVO-0.O4 — Zmiany migracji.

## 7. Phase 1 — Improve `/plots` Cards

Cel:
Ulepszyc liste dzialek tak, zeby byla bardziej operacyjna i prowadzila do detail page.

Zakres:

- [x] Rozszerzyc read model kart dzialek.
- [x] Pokazac statystyki drzew i dominant varieties.
- [x] Dodac CTA do `/plots/[plotId]`.
- [x] Zachowac istniejace akcje `edit`, `archive`, `restore`.

Checklist implementation:

- [x] PVO-1.1 — Zaprojektowac minimalny read model dla plot card stats bez zmiany schema.
- [x] PVO-1.2 — Dodac orchard-scoped query dla active tree count per plot.
- [x] PVO-1.3 — Dodac orchard-scoped query dla removed/inactive tree count per plot.
- [x] PVO-1.4 — Dodac dominant varieties per plot liczone tylko z aktywnych drzew.
- [x] PVO-1.5 — Utrzymac `listPlotsForOrchard` albo dodac osobny helper, jesli zmiana list query bylaby zbyt szeroka.
- [x] PVO-1.6 — Zaktualizowac `features/plots/plot-list.tsx` do bardziej kafelkowego ukladu.
- [x] PVO-1.7 — Dodac CTA `Otworz dzialke` do `/plots/[plotId]`.
- [x] PVO-1.8 — Zachowac istniejace akcje `Edytuj`, `Archiwizuj`, `Przywroc`.
- [x] PVO-1.9 — Zachowac obecny empty state dla braku plots albo dopasowac go do kart.
- [x] PVO-1.10 — Zweryfikowac loading/error state, jesli route albo component go uzywa.
- [x] PVO-1.11 — Upewnic sie, ze archived plots nie sa mylone z active tree stats.

Checklist tests:

- [x] PVO-1.T1 — Dodac albo rozszerzyc unit tests dla plot card stats read model.
- [x] PVO-1.T2 — Dodac test dominant varieties tylko dla active trees.
- [x] PVO-1.T3 — Dodac Playwright smoke dla `/plots` i CTA do detail page, gdy Phase 2 route juz istnieje.
- [ ] PVO-1.T4 — Sprawdzic owner i worker access do `/plots`.
- [ ] PVO-1.T5 — Sprawdzic outsider isolation przez istniejace RLS/security tests, jesli dotyczy.

Acceptance criteria:

- [x] PVO-1.A1 — `/plots` pokazuje `name`, `code`, `status`, `layout_type`.
- [x] PVO-1.A2 — `/plots` pokazuje active tree count.
- [x] PVO-1.A3 — `/plots` pokazuje removed/inactive tree count.
- [x] PVO-1.A4 — `/plots` pokazuje dominant varieties liczone tylko z aktywnych drzew.
- [x] PVO-1.A5 — CTA do `/plots/[plotId]` jest widoczne i nie psuje istniejacych akcji.

Dependencies:

- [x] PVO-1.D1 — Phase 0 audit zakonczony.
- [x] PVO-1.D2 — Potwierdzone pola `TreeSummary` i plot identifiers.
- [x] PVO-1.D3 — Decyzja DEC-PVO-006.

Out of scope:

- [ ] PVO-1.O1 — Tworzenie read-only grid.
- [ ] PVO-1.O2 — Tree detail panel.
- [ ] PVO-1.O3 — Selection mode.
- [ ] PVO-1.O4 — Activity prefill.

## 8. Phase 2 — Create Read-Only `/plots/[plotId]`

Cel:
Stworzyc fundament nowego detail page dzialki bez interakcji mutujacych.

Zakres:

- [x] Dodac route `/plots/[plotId]`.
- [x] Wczytac plot i drzewa w active orchard context.
- [x] Dodac pure helper `buildPlotVisualGrid`.
- [x] Wyrenderowac header, metadata, legend i read-only grid albo fallback.
- [x] Wyrenderowac read-only filters.

Checklist implementation:

- [x] PVO-2.1 — Add read-only `/plots/[plotId]` route foundation in `app/(app)/plots/[plotId]/page.tsx`.
- [x] PVO-2.2 — Uzyc `requireActiveOrchard("/plots/[plotId]")` albo zgodnego lokalnego wzorca route recovery.
- [x] PVO-2.3 — Wczytac plot przez `readPlotByIdForOrchard(orchardId, plotId)`.
- [x] PVO-2.4 — Dodac orchard-scoped query dla trees in plot, np. `listTreesForPlotInOrchard`.
- [x] PVO-2.5 — Nie przyjmowac `orchard_id` z query params.
- [x] PVO-2.6 — Dodac pure helper `buildPlotVisualGrid` w `lib/domain/plot-visual-grid.ts`.
- [x] PVO-2.7 — Zdefiniowac minimalne types dla grid output bez zmiany database contracts, jesli wystarczy module-local type.
- [x] PVO-2.8 — Grupowac grid wizualnie po `section_name ?? ""`, potem `row_number`, bez traktowania `section_name` jako czesci aktywnej unikalnosci lokalizacji.
- [x] PVO-2.9 — Renderowac row grid dla `layout_type = rows`.
- [x] PVO-2.10 — Renderowac partial grid plus warning dla `layout_type = mixed`.
- [x] PVO-2.11 — Renderowac fallback list/cards dla `layout_type = irregular`.
- [x] PVO-2.12 — Renderowac `removed trees` jako muted historical markers.
- [x] PVO-2.13 — Renderowac `inferred empty positions` tylko miedzy `min(position_in_row)` i `max(position_in_row)` w danym row.
- [x] PVO-2.14 — Przenosic trees bez pelnych coordinates do `unlocated_trees` fallback.
- [x] PVO-2.15 — Pokazac warnings dla missing coordinates w `rows`.
- [x] PVO-2.16 — Pokazac warnings dla partial coverage w `mixed`.
- [x] PVO-2.17 — Dodac legend dla active, removed, inferred empty, unverified location.
- [x] PVO-2.18 — Dodac read-only filters: active/removed/all, variety, condition, location verified, jezeli nie wymusza to duzego state refactoru.
- [x] PVO-2.19 — Dodac CTA back to `/plots`.
- [x] PVO-2.20 — Dodac edit link do `/plots/[plotId]/edit`.
- [x] PVO-2.21 — Obsluzyc missing plot recovery zgodnie z istniejacym wzorcem aplikacji.

Checklist tests:

- [x] PVO-2.T1 — Dodac `tests/unit/plot-visual-grid.spec.ts`.
- [x] PVO-2.T2 — Test: group by section and row.
- [x] PVO-2.T3 — Test: different row lengths.
- [x] PVO-2.T4 — Test: active tree wins over removed historical tree at same logical location.
- [x] PVO-2.T5 — Test: inferred empty positions do not extend beyond min/max.
- [x] PVO-2.T6 — Test: incomplete-location trees go to fallback.
- [x] PVO-2.T7 — Test: `irregular` returns fallback model.
- [x] PVO-2.T8 — Dodac Playwright smoke dla otwarcia `/plots/[plotId]` z `/plots`.
- [x] PVO-2.T9 — Dodac E2E smoke dla `rows`, `mixed`, `irregular` seeded plots, jesli baseline ma takie dane.

Acceptance criteria:

- [x] PVO-2.A1 — `/plots/[plotId]` istnieje i jest server-side scoped do active orchard.
- [x] PVO-2.A2 — `rows` plot pokazuje read-only row grid.
- [x] PVO-2.A3 — `mixed` plot pokazuje partial grid i ostrzezenie.
- [x] PVO-2.A4 — `irregular` plot nie pokazuje fake row grid.
- [x] PVO-2.A5 — Removed trees sa widoczne jako muted markers.
- [x] PVO-2.A6 — Inferred empty positions sa virtual i ograniczone do min/max row.
- [x] PVO-2.A7 — Missing coordinates nie lamia widoku i trafiaja do fallback.

Dependencies:

- [x] PVO-2.D1 — Phase 0 audit zakonczony.
- [x] PVO-2.D2 — Dla CTA z Phase 1 route moze byc gotowa albo PR-y moga byc odwrocone.
- [x] PVO-2.D3 — Decyzje DEC-PVO-001, DEC-PVO-002, DEC-PVO-005.

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

- [x] Dodac client component dla grid interactions.
- [x] Dodac `Browse` mode.
- [x] Klikniecie aktywnego albo removed marker otwiera panel metadata.
- [x] Panel pokazuje dane drzewa i akcje nawigacyjne.

Checklist implementation:

- [x] PVO-3.1 — Wydzielic albo wykorzystac interactive grid client component, np. `features/plots/plot-visual-overview.tsx`.
- [x] PVO-3.2 — Zachowac server-side data loading w route, przekazujac tylko potrzebne props.
- [x] PVO-3.3 — Dodac `Browse` mode jako domyslny tryb.
- [x] PVO-3.4 — Dodac click handler na tree marker.
- [x] PVO-3.5 — Dodac panel/drawer component, np. `features/plots/plot-tree-detail-panel.tsx`.
- [x] PVO-3.6 — Pokazac `tree_code`, species, variety, `row_number`, `position_in_row`, labels, status, dates, notes.
- [x] PVO-3.7 — Pokazac state `location_verified = false`.
- [x] PVO-3.8 — Dodac link do `/trees/[treeId]/edit`.
- [x] PVO-3.9 — Dodac CTA `Dodaj aktywnosc dla drzewa`, poczatkowo jako link/prefill single tree zgodny z Phase 5 albo disabled placeholder, jesli Phase 5 jeszcze nie istnieje.
- [x] PVO-3.10 — Dodac zamykanie panelu przez close button i `Escape`.
- [x] PVO-3.11 — Dodac focus management po otwarciu i zamknieciu panelu.
- [x] PVO-3.12 — Zapewnic minimalny responsive layout dla laptop/desktop i nie blokowac mobile polish.
- [x] PVO-3.13 — Nie dodawac timeline aktywnosci/zbiorow w tej fazie.

Checklist tests:

- [x] PVO-3.T1 — Selected marker state pokryty w Playwright smoke; lokalny component-test pattern nie istnieje.
- [x] PVO-3.T2 — Playwright: click tree marker opens detail panel.
- [x] PVO-3.T3 — Playwright: panel shows tree metadata.
- [x] PVO-3.T4 — Playwright: edit link points to `/trees/[treeId]/edit`.
- [x] PVO-3.T5 — Accessibility smoke: focus moves into panel and `Escape` closes it.

Acceptance criteria:

- [x] PVO-3.A1 — W `Browse` mode klikniecie tree marker otwiera panel.
- [x] PVO-3.A2 — Panel pokazuje podstawowe metadata bez dodatkowych server calls per marker.
- [x] PVO-3.A3 — Panel ma dzialajacy edit link.
- [x] PVO-3.A4 — Panel nie pokazuje jeszcze timeline aktywnosci/harvests.
- [x] PVO-3.A5 — Interakcja nie wykonuje mutacji.

Dependencies:

- [x] PVO-3.D1 — Phase 2 read-only route i grid.
- [x] PVO-3.D2 — Stabilny grid output zawierajacy tree metadata potrzebne do panelu.
- [x] PVO-3.D3 — Decyzja DEC-PVO-009.

Out of scope:

- [ ] PVO-3.O1 — Selection mode.
- [ ] PVO-3.O2 — Add Activity prefill z multi-selection.
- [ ] PVO-3.O3 — Activity/harvest timeline.
- [ ] PVO-3.O4 — Mutacje na `/plots/[plotId]`.

## 10. Phase 4 — Selection MVP

Cel:
Dodac przewidywalne zaznaczanie drzew i kompresje selection do `activity_scopes`.

Zakres:

- [x] Dodac `Select` mode.
- [x] Obsluzyc single tree toggle.
- [x] Obsluzyc same-row range selection.
- [x] Obsluzyc multi-row independent ranges.
- [x] Dodac helper kompresji selection.

Checklist implementation:

- [x] PVO-4.1 — Dodac mode toggle `Browse` / `Select`.
- [x] PVO-4.2 — W `Select` mode klik active tree toggles selection.
- [x] PVO-4.3 — W `Select` mode removed tree jest disabled dla `Add Activity`.
- [x] PVO-4.4 — W `Select` mode inferred empty position jest disabled dla `Add Activity`.
- [x] PVO-4.5 — Dodac same-row range selection przez wskazanie start/end.
- [x] PVO-4.6 — W range selection wybierac tylko active trees w zakresie.
- [x] PVO-4.7 — Pozwolic na wiele niezaleznych zakresow w roznych rows.
- [x] PVO-4.8 — Dodac selected count.
- [x] PVO-4.9 — Dodac compressed range summary w selection bar.
- [x] PVO-4.10 — Dodac pure helper `compressPlotSelectionToActivityScopes` w `lib/domain/plot-selection.ts`.
- [x] PVO-4.11 — Kompresowac kolejne pozycje w tym samym `section_name` i `row_number` do `location_range`, traktujac `section_name` jako kontekst scope, nie jako override unikalnosci active tree location.
- [x] PVO-4.12 — Dla niepelnych coordinates generowac `tree` scopes albo blokowac akcje z jasnym komunikatem.
- [x] PVO-4.13 — Walidowac, ze selection ma co najmniej jedno active tree dla `Add Activity`.
- [x] PVO-4.14 — Walidowac jeden `plot_id`.
- [x] PVO-4.15 — Nie generowac `location_range` dla `irregular`.
- [x] PVO-4.16 — Dodac limit 20 scopes/ranges.
- [x] PVO-4.17 — Dodac limit okolo 2000 znakow query string dla przyszlego prefill.
- [x] PVO-4.18 — Pokazac komunikat, gdy selection przekracza limit.

Checklist tests:

- [x] PVO-4.T1 — Dodac `tests/unit/plot-selection.spec.ts`.
- [x] PVO-4.T2 — Test: consecutive positions become one `location_range`.
- [x] PVO-4.T3 — Test: non-consecutive positions split ranges.
- [x] PVO-4.T4 — Test: multi-row selection creates multiple ranges.
- [x] PVO-4.T5 — Test: section boundaries split ranges.
- [x] PVO-4.T6 — Test: incomplete-coordinate selected tree becomes `tree` scope or validation error per final helper contract.
- [x] PVO-4.T7 — Test: removed/inactive trees excluded from Add Activity selection.
- [x] PVO-4.T8 — Test: scope count limit.
- [x] PVO-4.T9 — Test: query length estimate limit.
- [x] PVO-4.T10 — Playwright: switch to Select mode and select single tree.
- [x] PVO-4.T11 — Playwright: select same-row range and see compressed summary.

Acceptance criteria:

- [x] PVO-4.A1 — `Browse` mode nadal otwiera panel.
- [x] PVO-4.A2 — `Select` mode toggles active tree selection.
- [x] PVO-4.A3 — Same-row range selection dziala przewidywalnie.
- [x] PVO-4.A4 — Multi-row selection pokazuje niezalezne compressed ranges.
- [x] PVO-4.A5 — Selection helper zwraca scopes zgodne z `activity_scopes`.
- [x] PVO-4.A6 — UI blokuje `Add Activity`, gdy limits albo validation nie przechodza.

Dependencies:

- [x] PVO-4.D1 — Phase 2 grid output.
- [x] PVO-4.D2 — Phase 3 interactive client component.
- [x] PVO-4.D3 — Decyzje DEC-PVO-003, DEC-PVO-004, DEC-PVO-007.

Out of scope:

- [ ] PVO-4.O1 — Faktyczne przejscie do `/activities/new` z prefill.
- [ ] PVO-4.O2 — Bulk deactivate mutation.
- [ ] PVO-4.O3 — Batch create mutation.
- [ ] PVO-4.O4 — Lasso selection.

## 11. Phase 5 — Add Activity from Selection

Cel:
Polaczyc selection z istniejacym formularzem aktywnosci.

Zakres:

- [x] Dodac bezpieczny prefill parser dla `/activities/new`.
- [x] Prefillowac `plot_id`, `tree_id` i `activity_scopes`.
- [x] Zachowac `ActivityForm`, `createActivity` i `normalizeActivityPayload`.
- [x] Obsluzyc one plot + many compressed ranges.

Checklist implementation:

- [x] PVO-5.1 — Zaprojektowac URL query format dla scopes prefill.
- [x] PVO-5.2 — Dodac safe query prefill parser dla `app/(app)/activities/new/page.tsx`.
- [x] PVO-5.3 — Walidowac query prefill przez istniejace schema/types, nie przez ad hoc unchecked JSON.
- [x] PVO-5.4 — Prefill `plot_id` dla selection.
- [x] PVO-5.5 — Prefill `tree_id` dla single tree activity.
- [x] PVO-5.6 — Prefill `activity_scopes` dla single tree i multi-range selection.
- [x] PVO-5.7 — Dla single tree ustawic zarowno parent `tree_id`, jak i `activity_scopes[0].tree_id`.
- [x] PVO-5.8 — Dla wielu scopes ustawic parent `tree_id = null`.
- [x] PVO-5.9 — Zachowac `normalizeActivityPayload` invariants.
- [x] PVO-5.10 — Nie omijac `ActivityForm`.
- [x] PVO-5.11 — Nie omijac istniejacych server validations.
- [x] PVO-5.12 — Obsluzyc invalid prefill komunikatem i fallback do pustego formularza.
- [x] PVO-5.13 — Zablokowac albo zignorowac scopes spoza active orchard po stronie serwera.
- [x] PVO-5.14 — Dodac link/action z selection bar do `/activities/new`.
- [x] PVO-5.15 — Dodac link/action z tree detail panel dla single tree.

Checklist tests:

- [x] PVO-5.T1 — Unit test parsera query prefill.
- [x] PVO-5.T2 — Unit test single tree prefill payload.
- [x] PVO-5.T3 — Unit test multi-range prefill payload.
- [x] PVO-5.T4 — Unit test invalid prefill fallback.
- [x] PVO-5.T5 — Regression test `normalizeActivityPayload` dla single tree invariant.
- [x] PVO-5.T6 — Regression test `normalizeActivityPayload` dla multi-scope parent `tree_id = null`.
- [x] PVO-5.T7 — Playwright: selection -> `/activities/new` prefilled plot/scopes.
- [x] PVO-5.T8 — Playwright: single tree CTA -> `/activities/new` prefilled tree.
- [x] PVO-5.T9 — Integration/security test: prefill nie pozwala zapisac danych poza active orchard.
- [x] PVO-5.T10 — Playwright: direct `/activities/new` prefill renders plot/scopes.

Acceptance criteria:

- [x] PVO-5.A1 — Single selected tree otwiera `/activities/new` z poprawnym `plot_id`, `tree_id` i tree scope.
- [x] PVO-5.A2 — Multi-range selection otwiera `/activities/new` z wieloma compressed scopes.
- [x] PVO-5.A3 — Activity submission uzywa istniejacego `ActivityForm` i server validations.
- [x] PVO-5.A4 — Przekroczony URL/scope limit nie przechodzi do formularza.
- [x] PVO-5.A5 — Invalid prefill nie powoduje crash ani cross-orchard leak.

Dependencies:

- [x] PVO-5.D1 — Phase 4 selection helper i selection UI.
- [x] PVO-5.D2 — Potwierdzone invariants `normalizeActivityPayload`.
- [x] PVO-5.D3 — Decyzje DEC-PVO-003, DEC-PVO-004, DEC-PVO-007, DEC-PVO-008.

Out of scope:

- [ ] PVO-5.O1 — Add Harvest from map.
- [ ] PVO-5.O2 — Bulk Deactivate from map.
- [ ] PVO-5.O3 — Draft storage dla bardzo duzych selections.
- [ ] PVO-5.O4 — Nowe activity status flags na `trees`.

## 12. Phase 6 — Structural Actions

Cel:
Zaplanowac i pozniej podpiac dzialania strukturalne z mapy, nadal przez istniejace bezpieczne flows.

Zakres:

- [x] Dodac link/prefill do `/trees/batch/deactivate`.
- [x] Dodac link/prefill do `/trees/batch/new`.
- [x] Zachowac preview-before-write.
- [x] Zachowac ograniczenia row-range dla `rows` i `mixed`.

Checklist implementation:

- [x] PVO-6.1 — Sprawdzic obecne parametry formularza `/trees/batch/deactivate`.
- [x] PVO-6.2 — Dodac minimalny prefill dla jednego row range do `/trees/batch/deactivate`, jesli obecny formularz to wspiera albo latwo rozszerzyc.
- [x] PVO-6.3 — Dla multi-row destructive selection pokazac komunikat o ograniczeniu albo podzielic operacje dopiero, jesli existing tools wspieraja to bezpiecznie.
- [x] PVO-6.4 — Zachowac preview aktywnych drzew i ostrzezenia dla pustych/nieaktywnych pozycji.
- [x] PVO-6.5 — Zachowac confirmation UX przed `bulk_deactivate_trees`.
- [x] PVO-6.6 — Upewnic sie, ze operation nie wykonuje physical delete.
- [x] PVO-6.7 — Sprawdzic obecne parametry `/trees/batch/new`.
- [x] PVO-6.8 — Dodac minimalny prefill dla empty inferred continuous range do `/trees/batch/new`, jesli scope jest jednoznaczny.
- [x] PVO-6.9 — Dla single empty inferred position uzyc `/trees/batch/new` z zakresem 1 pozycji, zamiast dodawac osobny prefill do `/trees/new`.
- [x] PVO-6.10 — Zachowac conflict preview i database uniqueness.
- [x] PVO-6.11 — Nie dodawac multi-row destructive operation, jesli nie ma bezpiecznego preview dla wszystkich zakresow.

Checklist tests:

- [x] PVO-6.T1 — Unit/integration tests dla prefill parsera batch deactivate, jesli dodany.
- [x] PVO-6.T2 — Unit/integration tests dla prefill parsera batch create, jesli dodany.
- [x] PVO-6.T3 — Playwright: selected one row range -> deactivate preview.
- [x] PVO-6.T4 — Playwright: empty range -> batch create preview.
- [x] PVO-6.T5 — Regression: bulk deactivate sets `condition_status = removed` and `is_active = false`.
- [x] PVO-6.T6 — Regression: no physical delete.

Acceptance criteria:

- [x] PVO-6.A1 — Structural actions prowadza do istniejacych flows, a nie nowych mutacji na mapie.
- [x] PVO-6.A2 — Deactivate wymaga preview i confirmation.
- [x] PVO-6.A3 — Plant New/Batch Create nadal uzywa conflict preview.
- [x] PVO-6.A4 — `irregular` nie dostaje row-range actions.
- [x] PVO-6.A5 — Multi-row destructive operation jest jawnie deferred albo bezpiecznie wsparta przez existing tools.

Dependencies:

- [x] PVO-6.D1 — Phase 4 selection.
- [x] PVO-6.D2 — Istniejace `BulkTreeBatchForm`.
- [x] PVO-6.D3 — Istniejace `BulkTreeDeactivateForm`.
- [x] PVO-6.D4 — RPC `create_bulk_tree_batch` i `bulk_deactivate_trees`.

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

- [x] PVO-X.D1 — Kazda route uzywa `requireActiveOrchard`.
- [x] PVO-X.D2 — Zadna client-side akcja nie przesyla zaufanego `orchard_id`.
- [x] PVO-X.D3 — Queries zawsze filtrują po server-side `orchardId`.
- [ ] PVO-X.D4 — `owner` ma dostep do flow w swoim orchard.
- [ ] PVO-X.D5 — `worker` ma dostep do flow w swoim orchard zgodnie z obecnymi rules.
- [ ] PVO-X.D6 — Outsider nie widzi danych obcego orchard.
- [x] PVO-X.D7 — Supabase RLS pozostaje enforced.

### UX

- [x] PVO-X.U1 — Empty states sa jasne i operacyjne.
- [x] PVO-X.U2 — Unsupported states sa jawne, zwlaszcza `irregular`.
- [x] PVO-X.U3 — Nie renderowac fake irregular grid.
- [x] PVO-X.U4 — `mixed` grid ma widoczne ostrzezenia o partial coverage.
- [ ] PVO-X.U5 — Destructive actions wymagaja confirmation.
- [x] PVO-X.U6 — Selection summary pokazuje, co realnie zostanie uzyte jako scopes.

### Performance

- [ ] PVO-X.P1 — Około 1000 trees per plot dziala bez canvas.
- [x] PVO-X.P2 — Nie wykonywac per-marker server calls.
- [x] PVO-X.P3 — Grid builder pozostaje pure helper.
- [x] PVO-X.P4 — Selection compression pozostaje pure helper.
- [x] PVO-X.P5 — Filtrowanie nie powoduje kosztownych roundtripow, jesli dane sa juz na stronie.

### Accessibility

- [x] PVO-X.A11Y1 — Marker buttons maja meaningful labels.
- [x] PVO-X.A11Y2 — Panel/drawer ma focus management.
- [x] PVO-X.A11Y3 — Keyboard navigation jest zapewniona tam, gdzie practical dla MVP.
- [x] PVO-X.A11Y4 — Selected state nie opiera sie wylacznie na kolorze.
- [ ] PVO-X.A11Y5 — Warning i error messages sa czytelne dla screen readers.

### Testing

- [x] PVO-X.T1 — Unit tests dla domain helpers.
- [x] PVO-X.T2 — Integration tests dla data fetching i active orchard isolation.
- [x] PVO-X.T3 — Playwright tests dla core user flows.
- [ ] PVO-X.T4 — Manual seeded QA dla owner, worker i outsider.
- [x] PVO-X.T5 — Regression tests dla existing batch create/deactivate nie sa oslabiane.

## 15. QA Gates Per Phase

### Phase 0 QA Gate

- [x] PVO-QA0.1 — `git status --short` reviewed before work.
- [x] PVO-QA0.2 — Route/data/test inventory zapisany w notatkach PR.
- [x] PVO-QA0.3 — Existing targeted tests identified.

### Phase 1 QA Gate

- [x] PVO-QA1.1 — `pnpm lint`.
- [x] PVO-QA1.2 — `pnpm typecheck`.
- [x] PVO-QA1.3 — `pnpm test`.
- [x] PVO-QA1.4 — Relevant plot card stats tests pass.
- [ ] PVO-QA1.5 — `/plots` manual smoke for owner and worker.

### Phase 2 QA Gate

- [x] PVO-QA2.1 — `pnpm lint`.
- [x] PVO-QA2.2 — `pnpm typecheck`.
- [x] PVO-QA2.3 — `pnpm test`.
- [x] PVO-QA2.4 — Relevant unit tests for `buildPlotVisualGrid` pass.
- [x] PVO-QA2.5 — Relevant Playwright smoke passes.
- [x] PVO-QA2.6 — `pnpm seed:baseline-reset`.
- [x] PVO-QA2.7 — `pnpm qa:baseline-status` returns READY.
- [x] PVO-QA2.8 — Seeded QA checked for `rows`, `mixed`, `irregular`.

### Phase 3 QA Gate

- [x] PVO-QA3.1 — `pnpm lint`.
- [x] PVO-QA3.2 — `pnpm typecheck`.
- [x] PVO-QA3.3 — `pnpm test`.
- [x] PVO-QA3.4 — Playwright click tree -> detail panel passes.
- [x] PVO-QA3.5 — Accessibility smoke for focus and close behavior.

### Phase 4 QA Gate

- [x] PVO-QA4.1 — `pnpm lint`.
- [x] PVO-QA4.2 — `pnpm typecheck`.
- [x] PVO-QA4.3 — `pnpm test`.
- [x] PVO-QA4.4 — Unit tests for `compressPlotSelectionToActivityScopes` pass.
- [x] PVO-QA4.5 — Playwright select mode smoke passes.
- [ ] PVO-QA4.6 — Manual check for scope limit message.

### Phase 5 QA Gate

- [x] PVO-QA5.1 — `pnpm lint`.
- [x] PVO-QA5.2 — `pnpm typecheck`.
- [x] PVO-QA5.3 — `pnpm test`.
- [x] PVO-QA5.4 — Playwright selection -> activity prefill passes.
- [x] PVO-QA5.5 — Integration/security tests for active orchard prefill pass.
- [x] PVO-QA5.6 — `pnpm seed:baseline-reset`.
- [x] PVO-QA5.7 — `pnpm qa:baseline-status` returns READY.
- [x] PVO-QA5.8 — `pnpm test:e2e`.

### Phase 6 QA Gate

- [x] PVO-QA6.1 — `pnpm lint`.
- [x] PVO-QA6.2 — `pnpm typecheck`.
- [x] PVO-QA6.3 — `pnpm test`.
- [x] PVO-QA6.4 — Existing tree batch tests pass.
- [x] PVO-QA6.5 — Playwright batch create/deactivate/Plant New smoke passes.
- [ ] PVO-QA6.6 — Manual confirmation UX checked.

### Phase 7 QA Gate

- [ ] PVO-QA7.1 — Future ticket includes its own QA gate.
- [ ] PVO-QA7.2 — MVP scope remains unchanged unless new decision is accepted.

## 16. Acceptance Criteria for MVP

- [x] `/plots` shows operational plot cards.
- [x] `/plots/[plotId]` exists.
- [x] `rows` plot renders read-only grid.
- [x] `mixed` plot renders partial grid with warnings.
- [x] `irregular` plot renders fallback, not fake grid.
- [x] Tree markers show active/removed/inferred states correctly.
- [x] Clicking tree opens detail panel.
- [x] Selection mode works.
- [x] Selection compresses to scopes.
- [x] Add Activity from selection prefills activity form.
- [x] Single tree activity preserves `tree_id` invariants.
- [ ] Owner and worker can use the flow in their orchard.
- [ ] Outsider cannot access another orchard data.
- [x] Tests and seeded QA pass.
- [x] No MVP migration is required.
- [x] No `TreeSlot`, `PlantingSlot` or `plot_rows` model is introduced.

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

- [x] Add plot card stats read model.
- [x] Add active/removed counts.
- [x] Add dominant varieties from active trees.
- [x] Add CTA to `/plots/[plotId]`.

Files likely touched:

- [x] `app/(app)/plots/page.tsx`
- [x] `features/plots/plot-list.tsx`
- [x] `lib/orchard-data/plots.ts`
- [ ] `lib/orchard-data/trees.ts`
- [x] Possible tests under `tests/unit` or `tests/integration`

Tests:

- [x] Unit tests for stats.
- [x] Typecheck.
- [ ] `/plots` manual smoke.

Acceptance criteria:

- [x] `/plots` cards are operational and existing edit/archive/restore actions still work.

### PR 3 — `/plots/[plotId]` route and data loading

Zakres:

- [x] Add detail route.
- [x] Use `requireActiveOrchard`.
- [x] Load plot and trees.
- [x] Handle missing plot recovery.

Files likely touched:

- [x] `app/(app)/plots/[plotId]/page.tsx`
- [ ] `lib/orchard-data/plots.ts`
- [x] `lib/orchard-data/trees.ts`

Tests:

- [ ] Integration/security smoke for orchard-scoped loading.
- [x] Typecheck.

Acceptance criteria:

- [x] Route loads correct plot within active orchard and blocks outsider data leakage.

### PR 4 — `buildPlotVisualGrid` helper + tests

Zakres:

- [x] Add pure grid builder.
- [x] Cover rows, mixed, irregular and empty inference.

Files likely touched:

- [x] `lib/domain/plot-visual-grid.ts`
- [x] `tests/unit/plot-visual-grid.spec.ts`

Tests:

- [x] Unit tests for all grid rules.

Acceptance criteria:

- [x] Helper output can drive read-only UI without React-specific logic.

### PR 5 — Read-only grid UI

Zakres:

- [x] Render plot header.
- [x] Render metadata and legend.
- [x] Render filters.
- [x] Render row grid, mixed partial grid and irregular fallback.

Files likely touched:

- [x] `app/(app)/plots/[plotId]/page.tsx`
- [x] `features/plots/plot-visual-overview.tsx`
- [ ] `features/plots/plot-visual-grid.tsx`
- [ ] `features/plots/plot-visual-legend.tsx`
- [ ] Possible CSS/module files depending on project conventions

Tests:

- [x] Playwright smoke for rows/mixed/irregular.
- [x] Typecheck.

Acceptance criteria:

- [x] User can open a plot and understand active, removed, empty and unsupported states.

### PR 6 — Tree detail panel

Zakres:

- [x] Add Browse interaction.
- [x] Add panel/drawer with tree metadata.
- [x] Add edit link and single-tree activity CTA placeholder/link.

Files likely touched:

- [x] `features/plots/plot-visual-overview.tsx`
- [x] `features/plots/plot-tree-detail-panel.tsx`
- [x] `tests/e2e/plot-visual-operations.spec.ts`

Tests:

- [x] Playwright click tree -> panel.
- [x] Accessibility smoke for focus.

Acceptance criteria:

- [x] Clicking a marker opens a useful detail panel without mutation.

### PR 7 — Selection helper + tests

Zakres:

- [x] Add selection compression helper.
- [x] Add validation and URL limit estimation.

Files likely touched:

- [x] `lib/domain/plot-selection.ts`
- [x] `tests/unit/plot-selection.spec.ts`

Tests:

- [x] Unit tests for compression, limits and validation.

Acceptance criteria:

- [x] Selection can be represented as valid `activity_scopes`.

### PR 8 — Selection UI

Zakres:

- [x] Add Select mode.
- [x] Add single tree selection.
- [x] Add selection summary with compressed scopes.
- [x] Add explicit same-row range selection by choosing start/end.

Files likely touched:

- [x] `features/plots/plot-visual-overview.tsx`
- [x] `tests/e2e/plot-visual-operations.spec.ts`

Tests:

- [x] Playwright select mode smoke.
- [ ] Manual selection validation.

Acceptance criteria:

- [x] User can select active trees and see the compressed scope summary.
- [x] User can create same-row ranges through explicit start/end range UX.
- [x] Add Activity action state is blocked for empty, invalid or over-limit selection.

### PR 9 — Add Activity prefill

Zakres:

- [x] Add safe prefill parser for `/activities/new`.
- [x] Wire selection and single tree CTA to activity form.
- [x] Preserve `normalizeActivityPayload` invariants.

Files likely touched:

- [x] `app/(app)/activities/new/page.tsx`
- [x] `features/activities/activity-form.tsx`
- [ ] `features/plots/plot-selection-bar.tsx`
- [x] `features/plots/plot-tree-detail-panel.tsx`
- [x] `lib/domain/activity-prefill.ts`
- [x] `lib/validation/activity-prefill.ts`
- [x] `lib/validation/activities.ts`
- [x] `tests/unit/activity-prefill.spec.ts`
- [x] `tests/unit/phase3-activities-validation.spec.ts`
- [x] `tests/e2e/plot-visual-operations.spec.ts`

Tests:

- [x] Unit tests for parser and invariants.
- [x] Playwright selection -> activity form prefill.
- [x] Security/integration tests for active orchard isolation.

Acceptance criteria:

- [x] Add Activity works for single tree and multi-range selection through existing form and validations.

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

- [x] `PVO-0.1 — Complete audit and confirm route/data/test inventory`

Pierwszy kodowy ticket:

- [x] `PVO-2.1 — Add read-only /plots/[plotId] route foundation`

Zamkniety follow-up:

- [x] `PVO-2 follow-up — Add read-only filters and Playwright smoke for /plots/[plotId]`

Zamkniety ticket:

- [x] `PVO-3.1 — Tree detail interaction in Browse mode`

Nastepny kodowy ticket:

- [x] `PVO-4.1 — Selection MVP: mode toggle and single tree selection`

Zamkniety follow-up:

- [x] `PVO-4.5 — Same-row range selection przez wskazanie start/end`

Nastepny follow-up:

- [x] `PVO-4.A6 — Selection action state: blokowac Add Activity przy invalid/over-limit selection przed prefill`

Nastepny kodowy ticket:

- [x] `PVO-5.1/PVO-5.2 — URL query format i safe prefill parser dla /activities/new`

Zamkniety follow-up:

- [x] `PVO-5.14/PVO-5.15 — Link/action z selection bar i tree detail panel do /activities/new z prefill`

Zamkniety follow-up:

- [x] `PVO-6A — Bulk deactivate from plot selection przez /trees/batch/deactivate prefill`

Zamkniety follow-up:

- [x] `PVO-1 — plot card stats`

Zamkniety follow-up:

- [x] `PVO-6B — Plant New / batch create prefill z mapy`

Nastepny kodowy ticket:

- [ ] `PVO Phase 6 QA/manual closeout` albo `PVO Phase 7/Future Domain Hardening`

## Implementation Notes / Risks

- [x] `app/(app)/plots/[plotId]/page.tsx` istnieje jako read-only route foundation z server-side active orchard context, plot metadata, tree stats i grid/fallback renderem.
- [x] `/plots/[plotId]` ma local read-only filters po stronie client componentu: lifecycle, variety, condition i location verified, bez dodatkowych query, mutacji ani przyjmowania `orchard_id` z klienta.
- [x] `features/activities/activity-form.tsx` obsluguje `activity_scopes` i przyjmuje bezpieczny create prefill z parsera `/activities/new`.
- [x] `listTreesForPlotInOrchard` istnieje jako orchard-scoped wrapper wokol tree query dla jednej dzialki.
- [x] `buildPlotVisualGrid` istnieje jako pure helper z unit coverage dla rows, mixed, irregular, empty inference i active-vs-removed marker precedence.
- [x] `filterPlotVisualTrees` istnieje jako pure helper z unit coverage dla lifecycle, variety, unassigned, condition, verified/unverified i combined filters.
- [x] `features/plots/plot-tree-detail-panel.tsx` istnieje jako read-only panel metadata bez timeline i bez mutacji.
- [x] `PlotVisualOverview` obsluguje `Browse` interaction: marker/fallback tree selection, selected state, focus into panel, close button, `Escape` close i focus restore.
- [x] Phase 3 selected marker state jest pokryty w Playwright smoke; repo nie ma osobnego lokalnego component-test pattern dla tego typu React state.
- [x] `compressPlotSelectionToActivityScopes` istnieje w `lib/domain/plot-selection.ts` i ma unit coverage dla kompresji, limitow oraz walidacji selection.
- [x] `buildSameRowPlotSelectionRange` istnieje w `lib/domain/plot-selection.ts` i ma unit coverage dla start/end, same-row validation oraz pomijania inactive/removed trees.
- [x] `PlotVisualOverview` ma explicit same-row range selection w `Select` mode przez przycisk `Zakres`, wskazanie start/end i Playwright smoke.
- [x] `getPlotSelectionActivityActionState` istnieje w `lib/domain/plot-selection.ts` i ma unit coverage dla empty, ready, cross-plot oraz scope/query limit states.
- [x] `PlotVisualOverview` pokazuje `Add Activity` action state: empty/blocked selection renderuje disabled CTA, a valid selection linkuje do `/activities/new` z prefill query.
- [x] `buildActivityPrefillFromPlotSelection` istnieje w `lib/domain/activity-prefill.ts`; single tree selection generuje parent `tree_id` i scope `tree`, a multi-selection uzywa skompresowanych scopes.
- [x] `buildActivityPrefillHref` i `buildActivityPrefillSearchParams` istnieja w `lib/domain/activity-prefill.ts` jako format `/activities/new?plot_id=...&tree_id=...&scopes=...`.
- [x] `resolveActivityPrefillFromSearchParams` istnieje w `lib/validation/activity-prefill.ts` i waliduje query prefill przez `activityScopeSchema`, limity PVO oraz aktywny orchard-scoped option set z server page.
- [x] `ActivityForm` przyjmuje bezpieczny `prefill` dla create flow i nadal zapisuje przez `createActivity` oraz `normalizeActivityPayload`.
- [x] Selection bar i tree detail panel buduja linki z query prefill do `/activities/new`; removed/inactive tree CTA pozostaje disabled.
- [x] `resolveBulkDeactivateTreesPrefillFromPlotSelection` istnieje w `lib/domain/tree-batch-prefill.ts` i dopuszcza tylko jeden kompletny `location_range` w jednej dzialce.
- [x] `/trees/batch/deactivate` parsuje query prefill przez `resolveBulkDeactivatePrefillFromSearchParams`, waliduje active orchard `plotOptions`, odrzuca `irregular` i nie przyjmuje `orchard_id` z klienta.
- [x] `BulkTreeDeactivateForm` przyjmuje bezpieczny prefill i nadal wymaga preview + osobnego confirmation przez istniejacy `submitBulkDeactivateTrees` / `bulk_deactivate_trees`.
- [x] `PlotVisualOverview` pokazuje `Wycofaj drzewa` dla pojedynczego range selection; empty, tree-scope, multi-range i invalid selection renderuja disabled CTA z komunikatem.
- [x] `buildBulkTreeBatchPrefillFromEmptyRange` istnieje w `lib/domain/tree-batch-prefill.ts` i dopuszcza tylko ciagly zakres `empty_inferred` w jednym plot/section/row.
- [x] `/trees/batch/new` parsuje query prefill przez `resolveBulkTreeBatchPrefillFromSearchParams`, waliduje active orchard `plotOptions`, odrzuca `irregular` i nie przyjmuje `orchard_id` z klienta.
- [x] `BulkTreeBatchForm` przyjmuje bezpieczny prefill i nadal wymaga preview + opcjonalnego confirmation przez istniejacy `submitBulkTreeBatch` / `create_bulk_tree_batch`.
- [x] `PlotVisualOverview` pokazuje `Dosadz drzewa` dla inferowanego pustego zakresu w `Select` mode; akcja jest blokowana przy aktywnych filtrach, zeby ukryte drzewa nie tworzyly falszywych empty positions.
- [x] `buildPlotTreeStatsByPlot` istnieje w `lib/domain/plot-card-stats.ts`; `listPlotsForOrchard` dolacza `tree_stats` i kompatybilny `tree_count` dla kart `/plots`.
- [x] Plot card stats pokrywaja active tree count, removed/inactive count, dominant varieties z aktywnych drzew, unassigned active trees oraz archived plot status regression.
- [ ] Nie ma obecnie `/trees/[treeId]` detail page, tylko `/trees/[treeId]/edit`.
- [ ] `mixed` plots moga ujawnic niejednoznaczne local coordinates; w MVP konflikt aktywnych drzew dla tego samego `plot_id + row_number + position_in_row` jest data integrity issue / warning, nawet jesli rekordy maja rozne `section_name`.
- [ ] Implementation note: If future product requirements need repeated `row_number + position_in_row` values across sections in the same plot, this is outside the MVP and requires explicit model/constraint redesign. MVP must stay aligned with the current active logical location uniqueness.
- [ ] URL prefill jest wystarczajacy dla MVP, ale moze wymagac draft mechanism po przekroczeniu realnych rozmiarow selection.
- [ ] Manual UX confirmation dla Phase 6 structural actions nadal moze byc wykonany recznie na seeded baseline.
- [ ] Dokument nie dodaje linkow do `documents/01_implementation_materials/README.md` ani `documents/00_overview_and_checklists/documentation_map.md`, zeby nie dotykac istniejacych zmian w worktree bez osobnej decyzji.

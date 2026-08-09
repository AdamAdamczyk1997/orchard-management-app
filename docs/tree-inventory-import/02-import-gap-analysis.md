# Tree inventory import - gap analysis

## Legenda klasyfikacji

- `obslugiwane obecnie` - da sie zmapowac na istniejacy model i flow bez zmiany schematu.
- `czesciowo obslugiwane` - istnieje czesc modelu albo helperow, ale import wymaga nowej logiki.
- `nieobslugiwane` - brak obecnej reprezentacji albo procesu.
- `wymaga decyzji biznesowej` - nie da sie bezpiecznie rozstrzygnac z kodu.
- `wymaga migracji` - potrzebne nowe pola/tabele/constraints albo storage metadata.
- `wymaga wylacznie nowego UI` - model/backend wystarczaja, ale brakuje ekranu/workflow.

## Tabela luk

| Potrzeba importu inwentaryzacyjnego | Obecne mozliwosci aplikacji | Klasyfikacja | Dowody | Wplyw na import | Rekomendacja |
|---|---|---|---|---|---|
| Wybieranie gospodarstwa/sadu dla pliku | Server-side `active_orchard`, cookie `ol_active_orchard`, orchard memberships | obslugiwane obecnie | `lib/orchard-context/resolve-active-orchard.ts`:42-143, `app/auth/sync-active-orchard/route.ts`:8-48 | Import musi byc orchard-scoped i nie moze zaufac `orchard_id` z arkusza | Generowac plik dla aktywnego orchard i potwierdzac zgodnosc przy preview/confirm |
| Formalne gospodarstwo/dzialka ewidencyjna | Brak encji `farm` i brak formal cadastral plot; jest `orchards` i `plots` | wymaga decyzji biznesowej | `supabase/migrations/003_create_orchards.sql`:1-12, `supabase/migrations/005_create_plots.sql`:1-17 | Szablon moze uzyc zlego slownictwa | Uzgodnic, czy "dzialka" w XLSX to `plot`, czy trzeba nazwac ja "kwatera/plot" |
| Import jednego plot | Aktualne batch create/deactivate zakladaja jeden `plot_id` | czesciowo obslugiwane | `server/actions/trees.ts`:321-577, `supabase/migrations/023_create_tree_batch_tools.sql`:73-399 | Najmniejszy bezpieczny zakres MVP | Rekomendowany MVP: jeden plik = jeden `plot` |
| Import wielu plotow w jednym pliku | Model ma wiele `plots`, ale obecny bulk flow jest single-plot | czesciowo obslugiwane + wymaga nowego UI | `bulk-tree-batch-form.tsx`:92-405, `bulk-tree-deactivate-form.tsx`:74-275 | Wymaga walidacji per plot, cross-sheet slownikow i czytelnego preview | Odlozyc po MVP albo dopuscic jako wiele niezaleznych sekcji w stagingu |
| Ciagle jednorodne segmenty rzedu | Bulk create wspiera jeden ciagly zakres o jednej odmianie/gatunku | czesciowo obslugiwane | `create_bulk_tree_batch`:236-272, `lib/orchard-data/tree-batches.ts`:133-197 | Segmenty sa naturalnym inputem, ale trzeba obsluzyc wiele segmentow i wyjatki | Reuzyc logike zakresow, ale zbudowac osobny importer |
| Wiele odmian w jednym rzedzie | Model `trees` pozwala kazdemu drzewu miec inna `variety_id`; obecny batch tylko jedna variety | czesciowo obslugiwane | `supabase/migrations/007_create_trees.sql`:1-27, `supabase/migrations/023_create_tree_batch_tools.sql`:73-285 | Import musi rozwinac segmenty do wielu rekordow `trees` | Walidowac segmenty bez overlap, potem materializowac per position |
| Wiele gatunkow w jednym plot/rzedzie | `trees.species` i `varieties.species` sa tekstem per rekord | obslugiwane obecnie | `supabase/migrations/006_create_varieties.sql`:1-16, `supabase/migrations/007_create_trees.sql`:1-27 | Dozwolone technicznie | Wymagac zgodnosci `tree.species` z wybrana odmiana |
| Rozne systemy nasadzen w jednym plot | Tylko plot-level `layout_type` i notes; brak segment-level planting system | nieobslugiwane + wymaga migracji | `supabase/migrations/024_extend_plots_with_layout_settings.sql`:1-27 | Informacja o systemie prowadzenia/rozstawie moze trafic tylko do notes | W MVP potraktowac jako `notes`; strukturalnie odlozyc |
| Sekcje z osobna numeracja | `section_name` jest etykieta, nie czesc unique location | nieobslugiwane + wymaga decyzji biznesowej | `supabase/migrations/007_create_trees.sql`:35-39, `plot-visual-grid.ts`:343-348 | Segmenty w sekcjach o tych samych row/position beda kolidowac | Uzgodnic, czy trzeba rozszerzyc unique o `section_name` |
| Encja rzedu z metadanymi | Brak tabeli row; plot ma tylko default row count/trees per row i numbering schemes | nieobslugiwane + wymaga migracji | `supabase/migrations/024_extend_plots_with_layout_settings.sql`:1-27 | Nie da sie przechowac per-row length, direction, spacing, GPS endpoints | Arkusz `RZEDY` tylko jako validation/input metadata w MVP |
| Trwale stanowisko po drzewie | Brak encji station; puste miejsce jest inferowane albo brakiem rekordu | nieobslugiwane + wymaga decyzji biznesowej/migracji | `plot-visual-grid.ts`:8-14, 367-383 | Brak drzewa nie ma stable ID ani historii | Decyzja P0: czy stanowisko ma byc encja |
| Brakujace drzewo w segmencie | PVO inferuje empty positions, ale DB nie zapisuje pustego stanowiska | czesciowo obslugiwane | `plot-visual-grid.ts`:367-383 | Brak moze byc tylko wyjatkiem walidacyjnym albo notes | W MVP `missing_tree` jako exception importowa bez tworzenia `tree`, chyba ze produkt zdecyduje inaczej |
| Martwe drzewo | Statusy maja `critical` i `removed`; brak enum `dead` | czesciowo obslugiwane + wymaga decyzji | `types/contracts.ts`:66-71, `supabase/migrations/007_create_trees.sql`:18-19 | Trzeba zmapowac "martwe" na `critical`, `removed`, albo nowy status | Uzgodnic slownik stanu przed XLSX |
| Usuniete drzewo | `condition_status='removed'` plus `is_active=false` | obslugiwane obecnie | `supabase/migrations/007_create_trees.sql`:32, `bulk_deactivate_trees`:370-385 | Moze byc wynikiem importu, jesli plik jest autoryzowany do dezaktywacji | W MVP nie dezaktywowac automatycznie bez trybu konfliktu |
| Dosadzenie | Nowy rekord `tree`, opcjonalnie `condition_status='new'`, `planted_at` | czesciowo obslugiwane | `supabase/migrations/007_create_trees.sql`:15-19, `lib/validation/trees.ts`:143-214 | Replanting w tej samej lokalizacji wymaga braku aktywnego konfliktu | Konflikt: reject albo explicit deactivate+create |
| Historia kilku drzew w jednym miejscu | Partial unique tylko active, wiec historia mozliwa przez inactive old + new active | czesciowo obslugiwane | `supabase/migrations/007_create_trees.sql`:35-39 | Technicznie mozliwe, ale brak formalnej semantyki replant | Opisac w preview jako operacja historyczna |
| Przyblizony rok posadzenia | Jest `planted_at date`, brak year-only/range/confidence | nieobslugiwane + wymaga migracji albo notes | `supabase/migrations/007_create_trees.sql`:15 | "okolo 2015-2017" nie miesci sie natywnie | MVP: `planted_year_from/to` jako import-only + zapis do notes albo decyzja o migracji |
| Podkladka | `rootstock` jako tekst na `trees`, brak tabeli | czesciowo obslugiwane | `supabase/migrations/007_create_trees.sql`:17, `features/trees/tree-form.tsx`:312-464 | Mozna wpisac surowo, brak slownika i relacji | MVP: optional free text; slownik pozniej |
| Zapylacz/rola drzewa | `pollinator_info` jako tekst, brak kontrolowanego modelu | czesciowo obslugiwane | `supabase/migrations/007_create_trees.sql`:18 | Import moze tylko zapisac opis | Nie robic z tego P0 |
| GPS | Brak pol GPS na `trees`, rows, plots beyond opisowa lokalizacja plot | nieobslugiwane + wymaga migracji | `supabase/migrations/005_create_plots.sql`:1-17, `007_create_trees.sql`:1-27 | Nie umieszczac jako wymagane pole MVP | Odlozyc P2 |
| Health observations history | `health_status`, `development_stage`, `notes`; brak historii obserwacji per tree | czesciowo obslugiwane + wymaga decyzji | `supabase/migrations/007_create_trees.sql`:18-23, `supabase/migrations/008_create_activities.sql`:1-38 | Stan startowy moze byc polem drzewa albo aktywnoscia | Dla MVP zapisac aktualny stan na `trees`, historie obserwacji odlozyc |
| Odmiana znana z bazy | `variety_id` opcjonalne, orchard-local varieties | obslugiwane obecnie | `variety_policy.md`, `supabase/migrations/006_create_varieties.sql`:1-16 | Najbezpieczniejsze przez ukryte `variety_id` | Slowniki generowane z bazy |
| Odmiana nieznana | Drzewo moze miec `variety_id=null`, ale nie ma raw variety field | czesciowo obslugiwane + wymaga decyzji | `supabase/migrations/007_create_trees.sql`:5, `lib/validation/trees.ts`:25-90 | Mozna zapisac gatunek bez odmiany, ale tracimy nazwe surowa poza notes | Decyzja: reject/propose/auto-create/raw to notes |
| Aliasy odmian | Brak modelu aliasow | nieobslugiwane + wymaga migracji | `supabase/migrations/006_create_varieties.sql`:1-16 | Matching po aliasach wymaga zewnetrznej mapy | MVP: nie zgadywac, wymagac wyboru ze slownika |
| Case/diacritics matching | DB unique jest exact text; UI species normalizuje tylko known presets | czesciowo obslugiwane + wymaga decyzji | `lib/domain/species.ts`:1-25, `server/actions/varieties.ts`:24-39 | Ryzyko duplikatow i false negatives | Canonical matching po `variety_id`; fuzzy tylko jako warning |
| Plot code w XLSX | `plots.code` jest opcjonalny, unique per orchard gdy not null | obslugiwane obecnie | `supabase/migrations/005_create_plots.sql`:19-21, `lib/orchard-data/plots.ts`:181-195 | Przyjazny identyfikator dla pliku | Generowac z `plot_id` ukrytym i `plot_code/name` widocznym |
| UUID w XLSX | Backend pracuje na UUID, UI nie powinien wymagac recznego wpisu | czesciowo obslugiwane | `types/contracts.ts`:272-286 | Ukryte ID poprawia matching | Ukryc i zablokowac techniczne kolumny |
| Preview bez zapisu | Obecny batch ma preview bez zapisu dla jednej operacji | czesciowo obslugiwane | `server/actions/trees.ts`:321-457 | Import musi miec wielorekordowy dry-run | Zbudowac preview jako osobny etap, confirm revalidates |
| Persisted staging | Brak importer staging tables | nieobslugiwane + wymaga migracji | brak tabel poza `bulk_tree_import_batches` | Bez stagingu trudna idempotencja, retry, owner approval | Dla powaznego importu dodac `inventory_imports` i rows |
| Idempotency key/hash pliku | Brak | nieobslugiwane + wymaga migracji | `bulk_tree_import_batches` nie ma hash/key | Ponowne confirm moze dublowac lub kolidowac | W kontrakcie wymagac file hash + import id |
| Cofniecie importu | Brak bezpiecznego rollbacku po commit | nieobslugiwane + wymaga migracji/decyzji | brak audit log, tylko `planted_batch_id` dla prostego batch | Undo moze skasowac pozniejsze zmiany | W MVP brak auto-undo; wymagac backup/export i jawny raport |
| Oryginalny XLSX w storage | Storage planowane na przyszlosc, brak flow | nieobslugiwane + wymaga migracji/storage | `storage_and_attachments.md`:8-10, 58-64 | Brak materialu dowodowego po imporcie | Dla MVP albo nie przechowywac pliku, albo dodac private storage + metadata |
| Raport walidacji per sheet/row/column | Brak | nieobslugiwane | brak importer/parser | Potrzebne do uzywalnego preview | Canonical error format: sheet, row, column, raw_value, message, severity |
| Transakcyjnosc confirm | Obecne RPC batch jest transakcyjne jako pojedyncza funkcja | czesciowo obslugiwane | `supabase/migrations/023_create_tree_batch_tools.sql`:73-285 | Import multi-segment powinien miec wlasne RPC transaction | Confirm w DB RPC, nie seria niezaleznych server action insertow |
| Konflikt z istniejacym active tree | Obecny batch wykrywa conflict active location | czesciowo obslugiwane | `create_bulk_tree_batch`:183-197, `server/actions/trees.ts`:45-60 | Trzeba rozszerzyc na wiele segmentow i strategie konfliktu | Domyslnie reject; inne strategie jako decyzje P1 |
| Nakladajace sie segmenty w pliku | Brak importer validation | nieobslugiwane | brak parsera | Konieczne przed DB | Unit validation w normalizerze po `plot,row,position` |
| Luka miedzy segmentami | DB pozwala na luki; PVO inferuje tylko miedzy min/max | wymaga decyzji biznesowej | `plot-visual-grid.ts`:367-383 | Luka moze byc poprawna, warning albo blad | Decyzja P0/P1 w zaleznosci od typu importu |
| Wyjatek poza segmentem | Brak importer validation | nieobslugiwane | brak parsera | Musi byc error albo osobny segment | Unit validation |
| Raport po zakonczeniu | Bulk form pokazuje basic result, brak persisted final report | czesciowo obslugiwane | `BulkTreeBatchCreateResult` w `types/contracts.ts`:567-575 | Import wymaga bogatszego raportu | Final report w staging modelu lub response JSON |
| Role upload/validate/confirm | Obecne write roles owner/worker/super_admin | czesciowo obslugiwane + wymaga decyzji | `can_write_orchard_operational_data`:32-41, `tree-batch-rls.spec.ts`:22-157 | Brak rozdzialu submit vs approve | Decyzja produktowa przed implementacja |
| PVO preview przed confirm | PVO istnieje po danych w DB, nie jako import preview | czesciowo obslugiwane | `features/plots/plot-visual-overview.tsx`, `plot-tree-scale-overview.tsx` | Wizualizacja prospective data wymaga nowego adaptera | MVP moze miec tabelaryczny preview; PVO preview jako P1/P2 |
| 1000 drzew po imporcie | Large plot flow wspiera 500/1500 fixtures z overview/focused row | czesciowo obslugiwane | `large_plot_phase0_measurements.md`:7-28, `plot-tree-scale.ts`:9-12 | 1k jest blisko obecnych testow | Performance test confirm + read models |
| 10k/100k drzew | Brak potwierdzonego limitu i query-plan evidence | nieustalone + wymaga architektury | `large_plot_phase0_measurements.md` closeout follow-ups | Ryzyko timeoutow i wolnych raportow | Async/chunking before large production imports |
| XLSX read/write | Brak dependency i brak implementacji | nieobslugiwane + wymaga dependency decision | `package.json`, `rg` po XLSX libs | Trzeba wybrac biblioteke | Porownac opcje w osobnym spike, bez instalowania w audycie |

## Najkrotsza bezpieczna sciezka MVP

1. Jeden import = jeden aktywny `orchard` i jeden `plot`.
2. Tylko `layout_type = rows` na start; `mixed` po dodatkowych zasadach.
3. XLSX wygenerowany przez aplikacje, z ukrytymi `orchard_id`, `plot_id`, `variety_id`.
4. Widoczne dla pracownika: `plot_code`, `row_number`, `from_position`, `to_position`, `species`, `variety_name`, `condition_status`, opcjonalnie `planted_year`, `rootstock`, `notes`.
5. `WYJATKI` obsluguje pojedyncze pozycje w MVP.
6. Preview bez zapisu, confirm all-or-nothing, revalidation przy confirm.
7. Konflikty z aktywnymi drzewami domyslnie blokuja confirm.

## Luki wymagajace migracji, jesli wejda do MVP

- Persisted `inventory_imports` i `inventory_import_rows`.
- File hash/idempotency key.
- Source row mapping z utworzonymi `trees`.
- Storage metadata dla oryginalnego XLSX.
- Year-only/range planting date i confidence.
- Permanent `tree_positions`/station model.
- Variety aliases/canonicalization.
- Per-row metadata.

## Luki wymagajace decyzji, ale niekoniecznie migracji

- Czy `plot` odpowiada biznesowej "dzialce".
- Czy plik jest full snapshot czy incremental.
- Czy brak rekordu w pliku oznacza brak drzewa, brak wiedzy, czy brak zmiany.
- Czy worker moze zatwierdzac.
- Czy importer moze auto-create varieties.
- Jak mapowac "dead", "removed", "missing", "replacement".
- Czy luki sa bledem, warningiem, czy poprawnym stanem.

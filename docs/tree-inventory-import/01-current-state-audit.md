# Tree inventory import - current state audit

## Zakres

Stan na potrzeby zaprojektowania importu inwentaryzacji nasadzen. Ten dokument opisuje tylko potwierdzony stan aplikacji, z rozroznieniem na kod, migracje, typy, testy i aktywna dokumentacje.

Zasada source of truth dla tego audytu:

- Kod aplikacji, migracje Supabase, typy i testy sa zrodlem prawdy dla zachowania systemu.
- Dokumenty w `documents/archive/` nie byly uzywane jako aktywny plan.
- Gdy dokumentacja produktowa jest bardziej ogolna niz kod, wniosek oznaczam jako wymagajacy decyzji albo jako rekomendacje.
- W tym zadaniu nie wykonano zmian w kodzie, migracjach, RLS, RPC, UI, testach ani zaleznosciach.

Nota po rozpoczeciu implementacji:

- Ten audyt opisuje stan sprzed implementacji `tree_inventory_v1`.
- Aktualne checkpointy implementacyjne sa w:
  - `docs/tree-inventory-import/07-phase-1-completion-report.md`
  - `docs/tree-inventory-import/08-phase-2-completion-report.md`
  - `docs/tree-inventory-import/09-phase-3-completion-report.md`
- Po Phase 2 repo ma juz `exceljs@4.4.0`; sekcja o braku biblioteki XLSX jest
  zachowana jako historyczny wynik audytu startowego.

## Ustalenie 1 - ownership, active orchard i kontekst pracy

Stan:
POTWIERDZONE

Odpowiedz:
Aplikacja jest orchard-scoped. `orchards` sa glownym kontenerem biznesowym, a dostep uzytkownika wynika z `orchard_memberships`. UI i server actions pracuja w kontekscie `active_orchard`, ktory jest rozwiazywany po stronie serwera i synchronizowany przez cookie `ol_active_orchard`.

Dowody:

- `documents/03_domain_and_business_rules/orchardlog_database_model.md`: zasady nadrzedne, final ownership model.
- `lib/orchard-context/active-orchard-cookie.ts`:4-43 - nazwa i obsluga cookie `ol_active_orchard`.
- `lib/orchard-context/resolve-active-orchard.ts`:42-143 - resolver sesji, profilu, memberships i preferowanego orchard.
- `lib/orchard-context/list-accessible-orchards.ts`:54-94 - tylko aktywne memberships i niearchiwalne orchards trafiaja do listy.
- `lib/orchard-context/require-active-orchard.ts`:13-44 - guard protected routes.
- `app/auth/sync-active-orchard/route.ts`:8-48 - endpoint synchronizacji cookie sprawdza auth i dostep do orchard.
- `app/(app)/layout.tsx`:11-51 - protected layout przekazuje aktywny orchard do shell.

Znaczenie dla importu:
Importer nie powinien przyjmowac zaufanego `orchard_id` z pliku jako authority. Import musi byc wykonywany w kontekscie server-side `active_orchard`, a ewentualne `orchard_id` w XLSX moze byc tylko ukrytym, blokowanym identyfikatorem pomocniczym do wykrycia pomylki pliku.

Ryzyko:
Plik przeslany dla innego orchard albo stary plik po zmianie aktywnego orchard moze doprowadzic do blednego matchingu plot/variety, jesli importer zaufa danym z arkusza.

Rekomendacja:
Preview i confirm powinny ponownie rozwiazywac active orchard, sprawdzac membership i porownywac ukryty `orchard_id`/`orchard_code` z aktualnym kontekstem.

## Ustalenie 2 - model gospodarstwa, orchard, plot, sekcji i rzedu

Stan:
POTWIERDZONE

Odpowiedz:
Nie ma osobnej encji `farm`, formalnej dzialki ewidencyjnej, kwatery, sekcji, rzedu ani stanowiska. `orchards` reprezentuja glowny kontener sadu/gospodarstwa. `plots` reprezentuja praktyczny fizyczny obszar pracy w orchard. Sekcja jest tekstowym polem `section_name` na rekordach drzewa i zakresach, a rzad to wartosc `row_number`, nie osobna tabela.

Dowody:

- `supabase/migrations/003_create_orchards.sql`:1-12 - tabela `orchards`.
- `supabase/migrations/005_create_plots.sql`:1-17 - tabela `plots` z `orchard_id`, nazwa, kod, opis, lokalizacja i statusem.
- `supabase/migrations/007_create_trees.sql`:1-27 - lokalizacja drzewa siedzi na `trees`.
- `documents/02_product_documents/glossary.md`:20-83 - definicje `Orchard`, `Dzialka`, `Sekcja`, `Rzad`, `Pozycja w rzedzie`.
- `documents/03_domain_and_business_rules/tree_location_policy.md`:79-81 - `plot_sections` nie istnieje, na start wystarcza `section_name`.

Znaczenie dla importu:
Szablon nie moze zakladac, ze aplikacja zna formalne gospodarstwo, dzialke ewidencyjna, rzad jako rekord albo stale stanowisko. Wszystkie segmenty inwentaryzacji musza ostatecznie mapowac sie na istniejacy `plot` i docelowe rekordy `trees`.

Ryzyko:
Jezeli uzytkownik uzywa slowa "dzialka" jako formalnej dzialki ewidencyjnej, a aplikacja traktuje `plot` jako praktyczna kwatere/obszar, szablon moze zbierac dane pod zly poziom domenowy.

Rekomendacja:
Przed finalnym XLSX trzeba potwierdzic, ze biznesowe "dzialka" w instrukcji odpowiada aktualnemu `plot`, albo nazwac w arkuszu pole jako `plot_code`/`kwatera`.

## Ustalenie 3 - znaczenie `plot` i layout

Stan:
POTWIERDZONE

Odpowiedz:
`plot` jest orchard-scoped obszarem pracy, nie formalnie rozrozniona dzialka ewidencyjna. Ma `layout_type` oraz ustawienia numeracji/orientacji na poziomie calego plot. Obslugiwane `layout_type` to `rows`, `mixed`, `irregular`. Te wartosci wplywaja na walidacje domenowe i DB triggers, nie tylko na prezentacje.

Dowody:

- `supabase/migrations/024_extend_plots_with_layout_settings.sql`:1-27 - `layout_type`, `row_numbering_scheme`, `tree_numbering_scheme`, `entrance_description`, `layout_notes`, `default_row_count`, `default_trees_per_row`.
- `lib/domain/plots.ts`:136-164 - helpers dla wymaganej lokalizacji i obslugi row/range workflows.
- `lib/domain/plots.ts`:205-254 - `validateTreeLocationForPlotLayout`.
- `lib/domain/plots.ts`:260-283 - walidacja activity/harvest scopes wg layout.
- `supabase/migrations/025_add_plot_layout_guards_for_activity_and_harvest_locations.sql`:30-34, 75-95 - DB guard odrzuca zakresy rzedowe dla `irregular`.
- `features/plots/plot-form.tsx`:151-270 - UI edytuje layout i ustawienia numeracji plot.

Znaczenie dla importu:
Import segmentow rzedowych ma sens tylko dla `rows` i czesciowo `mixed`. Dla `irregular` importer segmentowy po `row_number/from/to` powinien byc zablokowany albo wymaga osobnego trybu.

Ryzyko:
Plik z zakresami rzedowymi dla `irregular` przejdzie parser, ale nie powinien przejsc walidacji domenowej/confirm.

Rekomendacja:
MVP importu ograniczyc do jednego `plot` o `layout_type = rows` albo `mixed`, z twarda walidacja layout przed preview.

## Ustalenie 4 - `section_name`

Stan:
POTWIERDZONE

Odpowiedz:
`section_name` jest opcjonalna etykieta tekstowa. Pomaga w prezentacji, grupowaniu i scope'ach, ale nie wchodzi do unikalnosci aktywnej lokalizacji drzewa. Nie zastepuje `row_number` w row/range workflows.

Dowody:

- `supabase/migrations/007_create_trees.sql`:8-14 - `section_name`, `row_number`, `position_in_row`, label fields.
- `supabase/migrations/007_create_trees.sql`:35-39 - `uq_trees_active_logical_location` obejmuje `(plot_id,row_number,position_in_row)`, bez `section_name`.
- `lib/domain/plot-visual-grid.ts`:343-348 - duplikaty active location liczone po `rowNumber:position`.
- `lib/domain/plot-selection.ts`:222-240 - `location_range` moze miec `section_name`, ale bazuje na `row_number/from/to`.
- `documents/03_domain_and_business_rules/tree_location_policy.md`:50-61 - `section_name` jako elastyczna nazwa sekcji lub kwatery.

Znaczenie dla importu:
Dwa segmenty w tym samym `plot`, `row_number` i `position_in_row`, ale z innym `section_name`, beda kolidowaly jako aktywne drzewa. Szablon nie moze uzywac `section_name` jako oddzielnej osi unikalnosci stanowisk.

Ryzyko:
Jezeli pracownik opisuje "sekcje" jako niezalezne numeracje rzedow, obecny model tego nie rozroznia i import moze blokowac poprawne dane terenowe.

Rekomendacja:
W instrukcji XLSX jasno opisac, ze numer rzedu w obranym `plot` musi byc unikalny niezaleznie od `section_name`, dopoki model DB nie zostanie rozszerzony.

## Ustalenie 5 - rekord `tree` i lokalizacja logiczna

Stan:
POTWIERDZONE

Odpowiedz:
Rekord `tree` reprezentuje jeden fizyczny obiekt w sadzie wedlug dokumentacji i obecnego modelu operacyjnego. W praktyce jest to aktualny lub historyczny rekord drzewa przypisany do `plot` i opcjonalnej lokalizacji rzedowej. Puste stanowisko nie ma wlasnego rekordu; PVO potrafi inferowac puste pozycje pomiedzy minimalna i maksymalna zajeta pozycja.

Dowody:

- `documents/03_domain_and_business_rules/orchardlog_database_model.md`: tabela `trees` - "Jeden rekord = jedno fizyczne drzewo".
- `supabase/migrations/007_create_trees.sql`:1-27 - struktura `trees`.
- `supabase/migrations/007_create_trees.sql`:28-39 - row/position pair i partial unique active location.
- `lib/domain/plot-visual-grid.ts`:8-14 - `empty_inferred` jako typ pozycji wizualizacji.
- `lib/domain/plot-visual-grid.ts`:367-383 - inferowanie pustych pozycji tylko w zakresie min/max rzedu.

Znaczenie dla importu:
Segmenty nasadzen musza byc materializowane do pojedynczych rekordow `trees`, jesli maja dzialac PVO, tree picker, aktywnosci tree-scoped, harvest tree-scoped i raporty odmian.

Ryzyko:
Import "segment-only" wymagalby nowego modelu i istotnych zmian w PVO, raportach, aktywnosciach oraz zbiorach.

Rekomendacja:
MVP importu powinien traktowac XLSX segmenty jako wygodny input, ale confirm powinien tworzyc/aktualizowac materialized `trees`.

## Ustalenie 6 - aktywnosc drzewa, usuniecie i historia miejsca

Stan:
POTWIERDZONE

Odpowiedz:
Aktywne drzewo to zasadniczo `is_active = true` i `condition_status != 'removed'` w warstwach raportowych/PVO. DB wymusza, ze `condition_status = 'removed'` wymaga `is_active = false`. Partial unique index dotyczy tylko aktywnych drzew, wiec historycznie moze istniec kilka rekordow w tej samej lokalizacji, o ile tylko jeden jest aktywny.

Dowody:

- `supabase/migrations/007_create_trees.sql`:18-19 - statusy `new`, `good`, `warning`, `critical`, `removed`.
- `supabase/migrations/007_create_trees.sql`:32 - `removed` wymaga `is_active = false`.
- `supabase/migrations/007_create_trees.sql`:35-39 - unique tylko dla aktywnych z pelna lokalizacja.
- `lib/domain/plot-card-stats.ts`:18-95 - statystyki aktywne vs inactive/removed.
- `lib/domain/plot-visual-grid.ts`:108-110 - active tree predicate.
- `lib/domain/plot-tree-scale.ts`:58-60 - active tree predicate.
- `supabase/migrations/023_create_tree_batch_tools.sql`:370-385 - bulk deactivate ustawia `condition_status = 'removed'`, `is_active = false` i dopisuje reason do notes.

Znaczenie dla importu:
Dosadzenie w tej samej lokalizacji powinno najpierw dezaktywowac stare aktywne drzewo albo zostac odrzucone jako konflikt. Brak drzewa nie powinien byc automatycznie zapisywany jako `removed`, dopoki produkt nie zdecyduje, czy plik jest pelnym stanem inwentaryzacji.

Ryzyko:
Delete/recreate usunie lub osieroci powiazania historyczne. Dezaktywacja bez decyzji biznesowej moze blednie oznaczyc brak danych w pliku jako usuniete drzewo.

Rekomendacja:
Konflikty domyslnie blokowac. Tryb "deactivate and create new" dopuscic dopiero jako jawny wariant importu z preview.

## Ustalenie 7 - pola drzewa

Stan:
POTWIERDZONE

Odpowiedz:
`trees` przechowuje `species`, opcjonalne `variety_id`, kody i etykiety terenowe, `planted_at`, `acquired_at`, `rootstock`, `pollinator_info`, `condition_status`, `health_status`, `development_stage`, `last_harvest_at`, `notes`, `location_verified`, `is_active` i timestampy. Nie ma `created_by_profile_id`, `updated_by_profile_id`, GPS, per-tree deactivation reason field, roku/przedzialu posadzenia ani confidence.

Dowody:

- `supabase/migrations/007_create_trees.sql`:1-27 - pelny zestaw kolumn `trees`.
- `types/contracts.ts`:360-416 - `TreeFormInput` i `TreeSummary`.
- `features/trees/tree-form.tsx`:111-464 - UI single tree.
- `lib/validation/trees.ts`:25-102 - schema formularza i regula row/position pair.
- `supabase/migrations/023_create_tree_batch_tools.sql`:36-39 - tylko `planted_batch_id` dodane do `trees` po baseline.

Znaczenie dla importu:
Dokladna data posadzenia mapuje sie na `planted_at`; przyblizony rok lub zakres lat nie ma natywnego pola i musialby trafic do `notes` albo wymagac migracji. Oryginalny wiersz XLSX nie moze byc dzis jednoznacznie zapisany na `trees`.

Ryzyko:
Utrata semantyki przy danych typu "okolo 2015-2017", "niepewna odmiana", "martwe do wymiany" albo "brak stanowiska" jesli wrzucimy je do obecnych pol bez kontraktu.

Rekomendacja:
W kontrakcie rozdzielic pola natywnie wspierane od pol `import_only`/`notes` oraz oznaczyc, ktore wymagaja przyszlej migracji.

## Ustalenie 8 - odmiany i gatunki

Stan:
POTWIERDZONE

Odpowiedz:
`varieties` sa orchard-local i maja `species` jako tekst oraz `name` jako tekst. Unikalnosc jest wymuszona przez `(orchard_id, species, name)`. Gatunek istnieje tez na `trees.species`. Nie ma osobnej tabeli gatunkow, enum gatunkow, aliasow odmian ani technicznych kodow odmian.

Dowody:

- `supabase/migrations/006_create_varieties.sql`:1-16 - tabela `varieties` i unique `(orchard_id,species,name)`.
- `documents/03_domain_and_business_rules/variety_policy.md`:9-22 - odmiany prywatne per `orchard`.
- `lib/domain/species.ts`:1-25 - preset `apple`, `pear`, `plum`, `cherry`; custom text dopuszczony.
- `lib/validation/varieties.ts`:10-61 - `species` i `name` wymagane.
- `features/varieties/variety-form.tsx`:41-63 - datalist z presetami, ale user moze wpisac wlasna wartosc.
- `server/actions/varieties.ts`:24-39 - mapowanie duplikatu exact unique.

Znaczenie dla importu:
Szablon powinien uzywac slownika odmian z bazy aktywnego orchard. Matching po samej nazwie wyswietlanej jest ryzykowny, bo system nie obsluguje aliasow ani normalizacji diakrytyki.

Ryzyko:
`Szampion`, `szampion`, `Champion` i `Sampion` moga byc potraktowane jako rozne wpisy albo nierozpoznane dane, zaleznie od strategii importu. Seed i testy pokazuja tez niespojna kapitalizacje gatunku (`Apple` w seedach, lower-case presets w UI).

Rekomendacja:
Wygenerowany XLSX powinien zawierac ukryte `variety_id` i przyjazna nazwe. Dla nowych/nieznanych odmian potrzebna jest decyzja: reject, propose, auto-create albo raw value.

## Ustalenie 9 - obecny single tree create/update

Stan:
POTWIERDZONE

Odpowiedz:
Reczne utworzenie drzewa wymaga `plot_id`, `species` i `condition_status`; layout plot decyduje o wymaganiach lokalizacji. Server action sprawdza active orchard, plot ownership/status, layout rules, variety ownership i mapuje konflikt unique location.

Dowody:

- `lib/validation/trees.ts`:25-102 - formularz drzewa i wspolna regola row/position.
- `server/actions/trees.ts`:45-60 - mapowanie `uq_trees_active_logical_location`.
- `server/actions/trees.ts`:100-122 - `buildTreePayload`.
- `server/actions/trees.ts`:136-227 - `createTree` z walidacja plot, layout i variety.
- `features/trees/tree-form.tsx`:111-464 - pola UI.

Znaczenie dla importu:
Importer powinien korzystac z tych samych domenowych zasad lokalizacji i ownership. Roznica jest taka, ze importer musi walidowac wiele rekordow i nakladanie segmentow zanim dotknie DB.

Ryzyko:
Walidacje importer-only moga rozjechac sie z single tree flow, jesli powstana poza istniejacymi helperami.

Rekomendacja:
W implementacji uzyc wspolnych funkcji domenowych dla plot layout, tree status i conflict mapping.

## Ustalenie 10 - obecny bulk tree batch

Stan:
POTWIERDZONE

Odpowiedz:
Obecny bulk create tworzy jeden ciagly zakres pozycji w jednym `plot`, jednym `row_number`, jednym `species` i opcjonalnie jednej `variety_id`. Ma preview konfliktow, confirm recheck i transakcyjny RPC `create_bulk_tree_batch`. Nie obsluguje wielu odmian w jednej operacji, macierzy wielu rzedow, pliku, stagingu, idempotency key ani rollbacku calego importu po pozniejszych zmianach.

Dowody:

- `supabase/migrations/023_create_tree_batch_tools.sql`:1-23 - `bulk_tree_import_batches`.
- `supabase/migrations/023_create_tree_batch_tools.sql`:73-285 - RPC `create_bulk_tree_batch`.
- `supabase/migrations/023_create_tree_batch_tools.sql`:183-197 - wykrywanie konfliktow aktywnych drzew.
- `supabase/migrations/023_create_tree_batch_tools.sql`:236-272 - insert przez `generate_series`.
- `server/actions/trees.ts`:321-457 - preview/confirm dla batch create.
- `lib/orchard-data/tree-batches.ts`:133-197 - preview planned trees i conflicts.
- `features/trees/bulk-tree-batch-form.tsx`:92-405 - UI preview + confirm.
- `tests/integration/tree-batch-operations.spec.ts`:25-169 - integracyjne pokrycie batch create.
- `tests/security/tree-batch-rls.spec.ts`:22-157 - RLS dla batchy.

Znaczenie dla importu:
Mozna ponownie wykorzystac logike konfliktu, zakresu, preview i podejscie all-or-nothing. Nie wystarczy to jednak do importu inwentaryzacji segmentowej z wieloma odmianami i wyjatkami.

Ryzyko:
Rozszerzanie obecnego RPC do wieloarkuszowego importu moze przeciazyc funkcje, ktora jest wyspecjalizowana w jednej prostej operacji zakresowej.

Rekomendacja:
Stworzyc osobny proces `inventory import`, ktory moze korzystac z czesci helperow, ale ma wlasny kontrakt staging/preview/confirm. Obecny `bulk_tree_import_batches` moze zostac zrodlem wzorca, nie docelowym modelem calego importu.

## Ustalenie 11 - bulk deactivate

Stan:
POTWIERDZONE

Odpowiedz:
Bulk deactivate dziala dla jednego `plot`, jednego `row_number` i zakresu pozycji. Preview pokazuje aktywne dopasowania i brakujace pozycje. Confirm wywoluje RPC, ktore oznacza trafione aktywne drzewa jako `removed` i `is_active = false`, z dopisaniem reason do `notes`.

Dowody:

- `supabase/migrations/023_create_tree_batch_tools.sql`:287-399 - RPC `bulk_deactivate_trees`.
- `server/actions/trees.ts`:459-577 - preview/confirm server action.
- `lib/orchard-data/tree-batches.ts`:199-255 - preview deactivate.
- `features/trees/bulk-tree-deactivate-form.tsx`:74-275 - UI.
- `tests/integration/tree-batch-operations.spec.ts`:171-279 - integracyjne pokrycie bulk deactivate.

Znaczenie dla importu:
Mechanika preview/confirm i update zakresu moze byc ponownie wykorzystana do strategii konfliktu "deactivate and create new", ale tylko po jawnej decyzji produktowej.

Ryzyko:
Automatyczna dezaktywacja podczas importu moze usunac aktywne drzewo z raportow bez wystarczajacej kontroli.

Rekomendacja:
Domyslnie traktowac istniejace aktywne drzewa jako konflikt blokujacy. Tryb dezaktywacji wymagac osobnego podgladu zmian.

## Ustalenie 12 - statusy batcha i rozbieznosc dokumentacji

Stan:
POTWIERDZONE

Odpowiedz:
Aktualny kod i SQL dopuszczaja statusy `draft`, `done`, `failed`. Dokument `batch_tree_creation_rules.md` wspomina `partially_done` jako przyszla mozliwosc, ale nie jest ona wdrozona.

Dowody:

- `supabase/migrations/023_create_tree_batch_tools.sql`:19-20 - check statusow `draft`, `done`, `failed`.
- `types/contracts.ts`:517 - `BulkTreeImportBatchStatus = "draft" | "done" | "failed"`.
- `documents/06_backend_and_contracts/batch_tree_creation_rules.md`:73-78 - `partially_done` opisane jako future possibility.

Znaczenie dla importu:
Nie nalezy projektowac importu inventory na zalozeniu, ze obecny batch moze byc `partially_done`.

Ryzyko:
Raport importu z czesciowym sukcesem wymagalby nowego modelu lub nowych statusow.

Rekomendacja:
MVP importu powinien byc all-or-nothing dla confirm. Jezeli produkt chce partial commit, to jest osobny temat migracji i UX.

## Ustalenie 13 - RLS i role

Stan:
POTWIERDZONE

Odpowiedz:
Role globalne to `user` i `super_admin`; role orchard to `owner`, `worker`, `manager`, `viewer`, ale aktywne zachowanie produktu koncentruje sie na `owner`, `worker`, `super_admin` i outsider bez membership. `owner` i `worker` moga mutowac dane operacyjne; `owner` i `super_admin` maja uprawnienia zarzadcze/eksportowe; outsider nie ma dostepu do orchard-scoped data.

Dowody:

- `types/contracts.ts`:50-51 - role globalne i orchard membership roles.
- `supabase/migrations/013_create_v1_security_helpers.sql`:22-51 - `can_read_orchard_data`, `can_write_orchard_operational_data`, `can_manage_orchard`.
- `supabase/migrations/014_enable_rls_and_v1_policies.sql`:101-199, 251-274 - RLS dla `plots`, `varieties`, `trees`, `activities`, `harvest_records`.
- `supabase/migrations/023_create_tree_batch_tools.sql`:46-71 - RLS dla `bulk_tree_import_batches`.
- `tests/security/tree-batch-rls.spec.ts`:22-157 - worker allowed, outsider denied dla batch/deactivate.

Znaczenie dla importu:
Parser/preview moze byc dostepny szerzej tylko jesli nie zapisuje danych, ale confirm musi respektowac role mutacyjne. Dzisiejszy model pozwala workerowi tworzyc drzewa, odmiany i batch trees.

Ryzyko:
Decyzja "worker moze uploadowac, ale owner zatwierdza" nie wynika z obecnego modelu i wymaga nowego flow/uprawnien/stagingu.

Rekomendacja:
Zaprojektowac osobno uprawnienia dla upload, validate, preview i confirm. Domyslnie confirm powinien uzywac tej samej klasy uprawnien co tree create, chyba ze produkt zdecyduje inaczej.

## Ustalenie 14 - aktywnosci, zakresy i PVO prefill

Stan:
POTWIERDZONE

Odpowiedz:
`activity_scopes` reprezentuja zakresy `plot`, `section`, `row`, `location_range`, `tree`. Scope `tree` wskazuje `tree_id`; zakresy rzedowe przechowuja numery rzedow i pozycji. PVO kompresuje zaznaczenie aktywnych drzew do scope'ow i deep linkuje do formularza aktywnosci. Nieaktywne/usuniete drzewa nie sa selectable w PVO.

Dowody:

- `supabase/migrations/009_create_activity_scopes.sql`:1-50 - levels i constraints.
- `lib/domain/plot-selection.ts`:105-107 - tylko aktywne, nie removed jako selectable.
- `lib/domain/plot-selection.ts`:208-240 - tree i location_range scopes.
- `lib/domain/plot-selection.ts`:243-333 - kompresja drzew w zakresy.
- `lib/validation/activity-prefill.ts`:170-312 - walidacja prefill plot/tree/scopes.
- `tests/e2e/plot-visual-operations.spec.ts`:107-337 - PVO to activity prefill.

Znaczenie dla importu:
Importer musi materializowac drzewa, jesli PVO ma pozniej pozwalac na tree/range operations. Same segmenty inwentaryzacji nie wystarcza dzisiejszym activity flows.

Ryzyko:
Zmiana struktury drzew po imporcie moze sprawic, ze starsze scope'y tree-scoped straca precyzje po delete, a range-scoped pozostana numeryczne, ale moga nie odzwierciedlac nowych drzew.

Rekomendacja:
Importer nie powinien hard-delete istniejacych drzew. Konflikty i zmiany stanu robic przez update/deactivate+new.

## Ustalenie 15 - harvests i raporty

Stan:
POTWIERDZONE

Odpowiedz:
`harvest_records` moga byc orchard/plot/variety/location_range/tree scoped. Dla tree-scoped raporty potrafia odziedziczyc lokalizacje z `trees`. Raporty odmian i PVO licza aktywne drzewa, zwykle pomijajac `condition_status = 'removed'`.

Dowody:

- `supabase/migrations/011_create_harvest_records.sql`:1-62 - scope levels i optional FK.
- `supabase/migrations/035_create_harvest_location_report_rpc.sql`:1-70 - tree-scoped harvest location przez join `trees`.
- `supabase/migrations/036_create_harvest_list_page_rpcs.sql`:1-153 - paginated harvest list RPC.
- `lib/domain/harvests.ts`:194-325 - agregacja lokalizacji zbiorow.
- `lib/domain/variety-locations.ts`:1-140 - grupowanie aktywnych drzew odmiany.
- `lib/orchard-data/varieties.ts`:111-216 - raport lokalizacji odmiany czyta aktywne drzewa chunkami po 1000.
- `lib/domain/plot-card-stats.ts`:18-95 - aktywne/inactive/removed liczniki plot.

Znaczenie dla importu:
Po imporcie rekordy `trees` natychmiast wplyna na raporty liczby drzew odmiany i PVO. Brakujace/martwe/usuniete stanowiska musza miec jednoznaczna semantyke, bo inaczej raporty beda mylace.

Ryzyko:
Import kilkudziesieciu tysiecy trees moze ujawnic wydajnosciowe ograniczenia raportow, szczegolnie tych, ktore czytaja duze zbiory i agreguja po stronie aplikacji.

Rekomendacja:
Do MVP przewidziec performance tests dla kilku tysiecy rekordow i nie zakladac gotowosci na 100k bez dodatkowego query-plan/index audit.

## Ustalenie 16 - PVO, duze ploty i ograniczenia skali

Stan:
POTWIERDZONE

Odpowiedz:
PVO ma progi skali: small do 200 drzew, medium do 800, large powyzej. Dla duzych plotow aplikacja pokazuje scale overview i focused row zamiast pelnego gridu. Focused row ma marker limit 300 i table preview 100. `/trees` i `/harvests` maja paginacje, ale czesc raportow nadal agreguje po stronie aplikacji.

Dowody:

- `lib/domain/plot-tree-scale.ts`:9-12 - progi small/medium i row preview limit 60.
- `lib/orchard-data/trees.ts`:263-329 - paginated tree list.
- `lib/orchard-data/trees.ts`:338-374 - plot tree scale profile czyta chunkami po 1000.
- `lib/orchard-data/trees.ts`:376-490 - focused row limits.
- `lib/domain/plot-visual-row-detail.ts`:15-16 - marker/table limits.
- `features/plots/plot-tree-scale-overview.tsx`:144-302 - large plot overview.
- `documents/01_implementation_materials/large_plot_phase0_measurements.md`:7-28 - PERF fixtures 500, 1500, MIX, LONG-ROW i route UUID.
- `documents/01_implementation_materials/large_plot_phase0_measurements.md`: closeout follow-ups - query-plan/index evidence nadal do wykonania.

Znaczenie dla importu:
Import kilku tysiecy drzew jest zgodny z obecnym kierunkiem skalowania, ale wielkosci typu 10k-100k wymagaja osobnej decyzji o asynchronicznosci, chunkingu, indeksach i raportach.

Ryzyko:
Masowy confirm synchroniczny w server action/RPC moze przekroczyc limity czasu hostingu lub klienta Supabase przy bardzo duzych plikach.

Rekomendacja:
MVP importu ograniczyc limitem liczby tworzonych/zmienianych drzew na confirm i mierzyc scenariusze 1k/5k. Dla wiekszych importow projektowac job/staging.

## Ustalenie 17 - export, import i storage

Stan:
POTWIERDZONE

Odpowiedz:
Eksport konta JSON jest wdrozony. Import i restore pozostaja planowane, bez UI i workflow recovery. Storage i zalaczniki nie sa wymagane w MVP i nie sa obecnie wdrozone jako flow importowy.

Dowody:

- `documents/06_backend_and_contracts/import_export_spec.md`:9-14 - export wdrozony, import planowany.
- `documents/06_backend_and_contracts/import_export_spec.md`:80-102 - CSV/prosty import jako potencjalne zastosowanie i zasady.
- `documents/07_security_and_quality/backup_restore_and_export.md`:70 - import i restore poza glownym MVP flow.
- `lib/orchard-data/export.ts`:260-400 - account export zbiera orchards, memberships, plots, varieties, trees, activities, scopes/materials, harvests.
- `app/(account)/settings/profile/export/route.ts`:1-42 - route `GET /settings/profile/export`.
- `documents/05_technical/storage_and_attachments.md`:8-10, 58-64 - storage na przyszlosc, namespacing wokol `orchard_id`.

Znaczenie dla importu:
Nie ma istniejacego importera XLSX/CSV ani przechowywania oryginalnych plikow. Trzeba zaprojektowac nowy proces.

Ryzyko:
Bez stagingu i storage nie da sie bezpiecznie wracac do niedokonczonych importow ani laczyc utworzonych drzew z oryginalnym wierszem pliku.

Rekomendacja:
Nie rozszerzac account export. Dla inventory import zaprojektowac osobny kontrakt i ewentualny staging/audit model.

## Ustalenie 18 - audit log i historia importu

Stan:
POTWIERDZONE

Odpowiedz:
Nie znaleziono ogolnego audit logu. `trees` nie przechowuja `created_by_profile_id` ani `updated_by_profile_id`. `bulk_tree_import_batches` przechowuje autora, czas, status, count i parametry wejscia prostej operacji batch, a `trees.planted_batch_id` laczy utworzone drzewa z batch. Nie ma oryginalnego pliku, normalized JSON, walidacji per row, hash ani idempotency key.

Dowody:

- `supabase/migrations/007_create_trees.sql`:1-27 - brak created/updated by na `trees`.
- `supabase/migrations/023_create_tree_batch_tools.sql`:1-23 - batch ma `created_by_profile_id`, status, parametry i `created_trees_count`.
- `supabase/migrations/023_create_tree_batch_tools.sql`:36-39 - `trees.planted_batch_id`.
- `supabase/migrations/023_create_tree_batch_tools.sql`:199-234 - insert batch draft z parametrami.
- `supabase/migrations/023_create_tree_batch_tools.sql`:276-280 - update batch done/count.
- `documents/05_technical/storage_and_attachments.md`:58-64 - export files ad hoc; storage planned later.

Znaczenie dla importu:
Audyt "ktory wiersz XLSX utworzyl ktore drzewo" nie jest dzis wspierany. Bez nowego modelu importu cofniecie lub ponowne zatwierdzenie pliku bedzie trudne.

Ryzyko:
Brak idempotencji i row-level provenance grozi duplikatami albo nieodwracalnymi zmianami po ponownym confirm.

Rekomendacja:
Dla inventory import zaprojektowac nowe encje lub techniczny kontrakt stagingu: import id, source row id, file hash, normalized JSON, validation report, final report i idempotency key.

## Ustalenie 19 - seedy, slowniki i konta QA

Stan:
POTWIERDZONE

Odpowiedz:
Baseline seed ma 3 orchards, 5 plots, 12 varieties, 45 trees, 8 activities, 10 scopes, 2 materials i 7 harvest records. Large plot fixture dodaje orchard PERF z plotami 500, 1500, MIX i LONG-ROW oraz 183 harvest records. Testowe persony obejmuja ownerow, workerow, outsidera, super admina i empty owner.

Dowody:

- `scripts/shared/baseline-seed.mjs`:3-32 - `BASELINE_USERS`.
- `scripts/shared/baseline-seed.mjs`:107-117 - baseline counts.
- `scripts/shared/baseline-seed.mjs`:167-188 - QA personas.
- `supabase/seeds/001_baseline_reference_seed.sql`:89-359 - orchards i plots.
- `supabase/seeds/001_baseline_reference_seed.sql`:360-542 - baseline varieties.
- `supabase/seeds/010_large_plot_performance_fixture.sql`:112-156 - PERF orchard memberships.
- `supabase/seeds/010_large_plot_performance_fixture.sql`:251-509 - PERF plots and trees.
- `supabase/seeds/010_large_plot_performance_fixture.sql`:511-620 - PERF harvest records.

Znaczenie dla importu:
Seed varieties i plot codes moga dac startowy slownik XLSX dla testow, ale nie rozwiazuja aliasow, nowych odmian ani niepewnych nazw.

Ryzyko:
Seed ma gatunki w formie `Apple`, `Pear`, itp., podczas gdy UI presets sa lower-case. Importer musi miec jawna normalizacje albo dzialac na `variety_id`.

Rekomendacja:
Pierwsze fixture importu zbudowac na baseline orchard MAIN i PERF, z ukrytymi IDs/kodami w slownikach.

## Ustalenie 20 - testy i brak biblioteki XLSX

Stan:
HISTORYCZNE - POTWIERDZONE DLA STANU SPRZED PHASE 2

Odpowiedz:
Repo ma unit, integration, security i E2E tests dla tree batch, PVO, RLS, raportow i baseline. W momencie audytu nie bylo zaleznosci do odczytu/zapisu XLSX ani implementacji importera arkuszy. Po Phase 2 zaleznosc `exceljs@4.4.0` jest juz zainstalowana, a po Phase 3 istnieje server-side generator szablonu; parser/importer nadal nie istnieje.

Dowody:

- `tests/unit/phase6-tree-batch-validation.spec.ts`:93-320 - walidacje batch/prefill.
- `tests/integration/tree-batch-operations.spec.ts`:25-279 - RPC i batch/deactivate.
- `tests/security/tree-batch-rls.spec.ts`:22-157 - RLS.
- `tests/e2e/tree-batch-and-export.spec.ts`:9-102 - flow browser.
- `tests/e2e/plot-visual-operations.spec.ts`:107-506 - PVO operations and large row.
- Stan pierwotny: `package.json` - brak `xlsx`, `exceljs`, `sheetjs` lub podobnej zaleznosci.
- Stan po Phase 2: `package.json` - `exceljs@4.4.0` jako server-side XLSX dependency.
- `rg -n "XLSX|xlsx|excel|sheetjs|csv-parse|papaparse"` - brak implementacji, poza wzmianka w dokumentacji migracji.

Znaczenie dla importu:
Pierwszy etap implementacji wymagal wyboru parsera/generatora XLSX oraz testow fixture plikow. Ten krok zostal wykonany w Phase 2. Phase 3 dodala generator szablonu, ale nie dodala parsera ani upload/preview/confirm workflow.

Ryzyko:
Parser XLSX moze wprowadzic roznice runtime server/client, rozmiar bundla albo ryzyko supply-chain.

Rekomendacja:
Historyczna rekomendacja zostala wykonana w Phase 2. Wybrano `exceljs@4.4.0`; szczegoly ryzyk i security overrides sa w `docs/tree-inventory-import/08-phase-2-completion-report.md`.

## Podsumowanie

Czy mozna juz zaprojektowac finalny szablon XLSX?
NIE.

Mozna przygotowac roboczy MVP draft, ale finalny szablon wymaga decyzji P0 z `03-open-product-questions.md`.

Blokujace pytania:

- Czy biznesowe "dzialka" oznacza aktualny `plot`.
- Czy MVP plik dotyczy jednego `plot`, jednego `orchard`, czy wielu plotow.
- Czy pierwszy import jest pelnym stanem plot, czy przyrostem.
- Jak traktowac braki, martwe drzewa, dosadzenia i konflikty z istniejacymi aktywnymi drzewami.
- Jak importer ma rozpoznawac odmiany, aliasy i niepewnosc.
- Czy worker moze zatwierdzic zapis do bazy.

Najwieksze ryzyka architektoniczne:

- Brak encji stanowiska i brak persistowanych pustych miejsc.
- Unique active location nie obejmuje `section_name`.
- Brak row-level provenance, idempotency key i storage dla pliku.
- Import segmentowy musi materializowac pojedyncze `trees`.
- Case/diacritics/alias matching odmian nie jest uregulowany.
- Duze importy moga wymagac stagingu, chunkingu i query-plan audit.

Elementy obecnego systemu mozliwe do ponownego wykorzystania:

- Server-side `active_orchard` resolver i RLS helpery.
- Plot layout validators.
- Tree create payload mapping i conflict mapping.
- Bulk batch preview/confirm pattern.
- `create_bulk_tree_batch` jako wzorzec all-or-nothing dla prostego range insert.
- Bulk deactivate logic jako wzorzec jawnej dezaktywacji.
- PVO selection/range helpers.
- Baseline i PERF fixtures.

Elementy wymagajace rozbudowy:

- XLSX parser/generator.
- Inventory import staging/audit model.
- Idempotency/hash/source row mapping.
- Slownik aliasow odmian albo polityka normalizacji.
- Przyblizony rok/przedzial posadzenia.
- Strategia missing/dead/replacement.
- Preview/confirm dla wielu segmentow i wyjatkow.
- Test fixtures XLSX i performance coverage.

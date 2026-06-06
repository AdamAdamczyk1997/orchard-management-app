# OrchardLog / Sadownik+ - session handoff

## Cel

Ten plik sluzy do szybkiego przekazania stanu projektu do nowego chatu albo nowej sesji pracy.

Ma zawierac:

- stabilne fakty o projekcie
- ostatni potwierdzony stan implementacji
- rzeczy sprawdzone recznie
- rzeczy, ktore nadal czekaja
- kilka pol, ktore uzupelniasz sam po swojej lokalnej pracy

## Jak uzywac

1. Przed startem nowego chatu podaj temu plikowi priorytet razem z:
   - `documents/README.md`
   - `documents/00_overview_and_checklists/documentation_map.md`
   - `documents/01_implementation_materials/README.md`
   - `documents/02_product_documents/mvp_scope_and_priorities.md`
2. Po kazdej wiekszej sesji uzupelnij sekcje `UZUPELNIJ SAM`.
3. Nie duplikuj tutaj calej dokumentacji; zapisuj tylko najwazniejszy stan operacyjny.

## Aktualny stabilny stan projektu

### Architektura i model

- `active_orchard` jest rozwiazywany po stronie serwera i utrwalany w `httpOnly` cookie `ol_active_orchard`
- ownership danych jest `orchard`-scoped
- auth, onboarding, membership i protected app shell sa wdrozone
- core orchard structure dla `plots`, `varieties`, `trees` jest wdrozona
- `Plot Visual Operations MVP` ma automatycznie domkniete Phase 1, Phase 5 i Phase 6: `/plots` ma operacyjne plot cards ze statystykami drzew i CTA, `/plots/[plotId]` ma grid/fallback, lokalne filters, `Browse` tree detail panel, `Select` mode, Add Activity prefill do `/activities/new`, bulk deactivate prefill do `/trees/batch/deactivate` oraz Plant New / batch create prefill do `/trees/batch/new`, wszystko oparte o server-side active orchard context
- baza, baseline migrations, seed i `v1_security` sa juz przygotowane
- lokalny bootstrap seedowych kont `auth.users` jest zautomatyzowany komenda `pnpm seed:baseline-users`
- lokalne uruchamianie referencyjnego SQL seedu jest zautomatyzowane komenda `pnpm seed:baseline-sql`
- pelny lokalny rebuild baseline jest zautomatyzowany komenda `pnpm seed:baseline-reset`
- lokalna walidacja gotowosci referencyjnego baseline do manual QA jest zautomatyzowana komenda `pnpm qa:baseline-status`
- Supabase Studio SQL Editor nie jest wspieranym fallbackiem dla referencyjnego seedu, bo update `profiles.system_role` moze tam wpasc w `guard_profile_self_service_update()`
- referencyjny seed tymczasowo wylacza tylko `guard_profile_self_service_update_before_write` na czas baseline upsertu `profiles`, a potem wlacza trigger z powrotem
- historyczne szkice i zamkniete implementation notes sa trzymane w `documents/archive/` i nie powinny byc traktowane jako aktywne source of truth

### Aktualnie wdrozone vertical slice

- `Phase 1`
  - auth
  - onboarding
  - `createOrchard`
  - `active_orchard`
  - protected shell
- `Phase 2`
  - `plots`
    - list
    - create
    - edit
    - archive / restore
  - `varieties`
    - list
    - create
    - edit
    - search
  - `trees`
    - list
    - create
    - edit
    - filters
    - baseline location fields
  - `settings`
    - owner-only `orchard settings`
    - owner-only `members`
    - add existing user to orchard as `worker`
    - revoke membership
- `Phase 3 core slice`
  - `activities`
    - list z filtrami
    - create
    - edit
    - detail page
    - szybka zmiana statusu
    - delete
    - seasonal summary + coverage
  - transakcyjny zapis `activity_scopes` i `activity_materials`
  - owner i worker moga operacyjnie pracowac na wpisach w swoim orchard
  - shell i dashboard maja wejscie do `Aktywnosci`
- `Phase 4A`
  - `harvests`
    - list z filtrami
    - create
    - edit
    - detail page
    - delete jako korekta pomylki
  - formularz wspiera scope `orchard`, `plot`, `variety`, `location_range` i `tree`
  - wpis zbioru moze byc opcjonalnie powiazany z aktywnoscia typu `harvest`
  - owner i worker moga operacyjnie pracowac na wpisach zbioru w swoim orchard
  - shell ma stale wejscie do `Zbiory`
- `Phase 4 continuation`
  - `/reports/season-summary` jest wdrozone jako harvestowy ekran raportowania
  - raport pokazuje sume globalna, breakdown per odmiana, breakdown per dzialka i timeline
  - filtruje po `season_year`, `plot_id` i `variety_id`
  - linkuje z powrotem do filtrowanej listy `/harvests`
- `Phase 5A`
  - `/dashboard` nie jest juz placeholderem i pokazuje realny snapshot aktywnego sadu
  - dashboard ma liczniki aktywnych dzialek i aktywnych drzew
  - dashboard pokazuje ostatnie aktywnosci i ostatnie zbiory z linkami do detail pages
  - dashboard pokazuje tez blok `upcoming_activities` dla najblizszych wpisow `planned`
  - dashboard ma szybkie akcje do tworzenia rekordow i wejscie do harvestowego raportu sezonu
  - dodany jest route-level loading skeleton oraz empty / partial empty states dla dashboardu
- `Phase 5B1`
  - glowne listy `plots`, `varieties`, `trees`, `activities` i `harvests` maja wspolny wzorzec pustych stanow
  - listy rozrozniaja teraz `brak rekordow` od `brak wynikow po filtrach`
  - kazda z tych list ma streamingowy loading skeleton podczas ladowania danych
  - CTA w pustych stanach prowadza do tworzenia pierwszego rekordu albo do czyszczenia filtrow
- `Phase 5B2a`
  - krytyczne detail/edit/settings routes nie koncza sie juz cichym redirectem przy braku rekordu
  - `activities`, `harvests`, `plots`, `trees`, `varieties` oraz `settings` pokazuja czytelne recovery cards dla `record not found`
  - create/edit flows wymagajace dzialki albo aktywnej dzialki korzystaja ze wspolnego `prerequisite card`
  - `requireActiveOrchard` zwraca teraz zwezony kontekst po wszystkich redirect guards, co upraszcza strony chronione
  - w tym kroku nie zamknieto jeszcze seeded QA hardening; zostal jako osobny follow-up
- `Phase 5B2b`
  - dodana komenda `pnpm qa:baseline-status`, ktora sprawdza gotowosc referencyjnego baseline do manual QA
  - narzedzie waliduje `auth.users`, profile, orchardy, membership matrix, liczby rekordow i harvest normalization
  - dodane komendy `pnpm seed:baseline-sql` i `pnpm seed:baseline-reset` do automatyzacji referencyjnego SQL seedu
  - manual testing docs prowadza teraz przez workflow `seed:baseline-reset -> baseline status -> smoke pass`
  - seeded QA ma tez automatyczne unit tests dla evaluatora gotowosci baseline
- `Phase 5C1`
  - core redirect-based flows pokazuja teraz success feedback zamiast milczacego powrotu na liste albo detail
  - `plots`, `trees`, `varieties`, `activities` i `harvests` maja wspolny wzorzec sukcesu po create / edit
  - `plots`, `activities` i `harvests` pokazują tez success feedback po archive / restore / delete / status change tam, gdzie te akcje istnieja
  - bannery sukcesu zachowuja biezacy kontekst listy i pozwalaja ukryc komunikat bez utraty filtrow
- `Phase 5C2`
  - reczny seeded smoke pass zostal wykonany na lokalnym baseline z `pnpm qa:baseline-status = READY`
  - przejrzane zostaly konta `owner`, `worker` i outsider wedlug `manual_testing_quickstart.md`
  - na tym przejsciu nie znaleziono blokujacych bledow aplikacji
- `Phase 6A`
  - `exportAccountData` jest wdrozone jako account-wide eksport JSON na `/settings/profile`
  - eksport jest dostepny dla usera z co najmniej jednym aktywnym membership `owner`, a administracyjnie takze dla `super_admin`
  - zwykly user eksportuje tylko orchard z aktywnym membership `owner`, a `super_admin` moze pobrac wszystkie orchard dostepne administracyjnie
  - payload obejmuje profil oraz eksportowany zestaw `orchards` razem z `orchard_memberships`, `plots`, `varieties`, `trees`, `activities`, `activity_scopes`, `activity_materials` i `harvest_records`
  - `worker` widzi jawny stan zablokowanego eksportu bez aktywnego CTA
  - route download zwraca plik JSON z `Content-Disposition`, a UI ma pending state i komunikat sukcesu / bledu
- `Phase 6B`
  - `trees` maja teraz dwa operacyjne flow `0.2`:
    - `/trees/batch/new` dla transakcyjnego batch create z preview konfliktow
    - `/trees/batch/deactivate` dla preview i masowego oznaczania drzew jako `removed`
  - zapis batcha jest wsparty tabela `bulk_tree_import_batches` i linkage `trees.planted_batch_id`
  - batch create dziala w formule `all-or-nothing`, wykrywa konflikt lokalizacji przed zapisem i zapisuje historie batcha
  - bulk deactivate nie kasuje rekordow fizycznie; ustawia `condition_status = removed` oraz `is_active = false`
  - `worker` moze wykonywac oba flow w swoim orchard, outsider jest blokowany przez RPC auth/RLS
  - flow maja unit, integration i security coverage
- `Phase 6C`
  - `/reports/variety-locations` jest wdrozone jako raport lokalizacji odmiany
  - entry pointy do raportu sa dostepne z naglowka `/varieties` oraz z kart pojedynczych odmian
  - raport wybiera jedna odmiane i pokazuje:
    - liczbe aktywnych drzew tej odmiany
    - liczbe drzew z raportowalna lokalizacja
    - liczbe lokalizacji potwierdzonych i niepotwierdzonych
    - grupy po `plot`, `section_name`, `row_number` z zakresami kolejnych pozycji
  - grupy raportu pomijaja drzewa nieaktywne oraz rekordy bez kompletnego `row_number + position_in_row`, ale UI jawnie pokazuje licznik drzew poza raportem
  - `worker` moze odczytac raport w swoim orchard, outsider jest blokowany przez RLS i nie odczyta wybranej odmiany
  - raport ma unit i integration coverage dla scalania zakresow i read modelu
- `Phase 6D`
  - `/reports/harvest-locations` jest wdrozone jako location-aware raport wpisow zbioru
  - raport korzysta z filtrow `season_year`, `plot_id`, `variety_id`, tak samo jak harvestowe `season-summary`
  - pokazuje sume globalna, wpisy z precyzyjna lokalizacja, wpisy bez precyzyjnej lokalizacji oraz osobno rekordy tylko na poziomie sadu
  - breakdown terenowy jest grupowany po dzialce, sekcji, rzedzie i zakresie pozycji
  - wpis `tree` moze odziedziczyc lokalizacje z rekordu drzewa nawet wtedy, gdy sam harvest nie ma zapisanego `plot_id`
  - z `/harvests` i `/reports/season-summary` mozna przejsc bezposrednio do nowego raportu
  - raport ma unit i integration coverage dla agregacji i read modelu
- `Phase 6E`
  - `plots` maja teraz rozszerzone ustawienia ukladu dzialki bezposrednio w create / edit
  - formularz i model obsluguja `layout_type`, `row_numbering_scheme`, `tree_numbering_scheme`, `entrance_description`, `layout_notes`, `default_row_count` i `default_trees_per_row`
  - lista dzialek pokazuje zapisany uklad, numeracje oraz planowana siatke rzedow / drzew
  - schema jest rozszerzona migracja `024_extend_plots_with_layout_settings.sql`
  - slice ma unit i integration coverage dla walidacji oraz zapisu / aktualizacji tych pol
- `Phase 6F`
  - `trees` create / edit wykorzystuja juz zapisane ustawienia dzialki i pokazuja guidance po wyborze `plot_id`
  - dla `layout_type = rows` zapis drzewa wymaga `row_number` i `position_in_row`
  - dla `layout_type = mixed` i `layout_type = irregular` zapis wymaga co najmniej jednej praktycznej wskazowki lokalizacyjnej
  - `/trees/batch/new` i `/trees/batch/deactivate` sa dostepne tylko dla dzialek `rows` i `mixed`
  - dzialki `irregular` pokazuja jawny stan `unsupported` dla flow opartych o zakres rzedowy
  - slice ma unit coverage dla polityki layoutu i server action guards dla create / edit / batch flows
- `Phase 6G`
  - `activities` i `harvests` pokazuja teraz guidance z ustawien wybranej dzialki po wyborze `plot_id`
  - formularz aktywnosci blokuje zakresy `row` i `location_range` dla dzialek `irregular`
  - formularz zbioru blokuje `scope_level = location_range` dla dzialek `irregular`
  - server actions zwracaja czytelne field errors jeszcze przed zapisem, a baza pilnuje tych samych reguł triggerami dla `activity_scopes` i `harvest_records`
  - slice ma unit coverage dla helperow layoutu oraz integration coverage dla odrzucenia niepoprawnych zapisow na poziomie RPC / DB
- `Phase 6H`
  - pierwszy oficjalny pakiet `Playwright` jest wdrozony i odpalany komenda `pnpm test:e2e`
  - browser E2E pokrywa onboarding nowego usera, orchard switcher, ograniczenia `worker`, outsider onboarding, flow `plot -> variety -> tree`, aktywnosci sezonowe, raport zbiorow oraz batch create / bulk deactivate
  - dodane sa stabilne helpery logowania, baseline fixture users i minimalne `data-testid` dla krytycznych flow terenowych
  - skonczony jest tez ukierunkowany pass izolacji dostepu: orchard switch nie przecieka danych, `worker` nie ma eksportu ani membership management, outsider nie wchodzi w raporty operacyjne
  - w trakcie wdrozenia naprawiony zostal realny bug batch create / confirm, w ktorym formularz po preview potrafil zgubic `plot_id` przy potwierdzeniu zapisu
- `Phase 6I`
  - pakiet migracji jest rozszerzony o `026_harden_operational_query_indexes.sql` jako forward-only follow-up bez ruszania historycznych migracji `001`-`025`
  - dodane sa celowane indeksy pod dashboard feeds, tree-filtered `activities` oraz harvest list/report queries
  - `getHarvestLocationSummary` zawęza teraz dane po `plot_id` juz na poziomie SQL i cache kluczuje pelny zestaw filtrow `season_year + plot_id + variety_id`
  - `listActivities(..., { tree_id })` zachowuje obecny model `activities.tree_id OR activity_scopes.tree_id`, ale ma teraz integration regression dla direct i scoped tree links bez przecieku orchard
- `Phase 6I follow-up`
  - dodana migracja `027_reharden_harvest_trigger_search_path.sql` jako forward-only poprawka hardeningowa
  - follow-up przywraca `set search_path = public` dla `public.set_harvest_derived_fields_and_validate()`, bo redefinicja funkcji w `025` nadpisala wczesniejsze ustawienie z `017`
  - dodana migracja `028_reharden_activity_scope_trigger_search_path.sql` jako analogiczny follow-up dla `public.validate_activity_scope_consistency()`
  - follow-up przywraca `set search_path = public` po redefinicji trigger function w `025`, zeby nie wracal warning `Function Search Path Mutable`
  - dodana migracja `029_wrap_auth_uid_in_orchards_select_policy.sql` jako follow-up wydajnosciowy dla RLS `SELECT` na `public.orchards`
  - follow-up zamienia gole `auth.uid()` na `(select auth.uid())` w polityce `orchards_select_member_creator_or_super_admin`, zeby nie bylo per-row reevaluacji w lint `Auth RLS Initialization Plan`
  - dodana migracja `030_add_covering_foreign_key_indexes.sql` jako follow-up wydajnosciowy dla brakujacych indeksow pokrywajacych FK
  - follow-up dodaje brakujace indeksy z kluczem obcym jako kolumna wiodaca dla `orchard_memberships`, `trees`, `activities`, `harvest_records` i `bulk_tree_import_batches`, zeby domknac warningi `Unindexed foreign keys`
  - dodana migracja `031_remove_unused_membership_joined_at_variable.sql` jako follow-up porzadkujacy dla RPC onboardingu orchard
  - follow-up usuwa nieuzywana zmienna `v_membership_joined_at` z `public.create_orchard_with_owner_membership(...)`, dzieki czemu `supabase db lint` przechodzi juz bez ostatniego warningu PL/pgSQL
  - dodana migracja `032_drop_redundant_multicolumn_shadowed_indexes.sql` jako follow-up po audycie `Unused Index`
  - follow-up usuwa tylko te single-column indeksy, ktore byly realnie redundantne wobec indeksow wielokolumnowych z tym samym leading column; warning dla `idx_orchard_memberships_profile_status` zostal uznany za nieakcyjny na swiezym local baseline i indeks zostaje, bo wspiera lookupy `profile_id + status`
  - dodana migracja `033_prune_unused_and_overwide_operational_indexes.sql` jako drugi follow-up po audycie `Unused Index`
  - follow-up zamienia `bulk_tree_import_batches(orchard_id, created_at desc)` i `(plot_id, row_number, created_at desc)` na prostsze indeksy FK `orchard_id` i `plot_id`, usuwa nieuzywany `activity_scopes(scope_level, row_number)` oraz usuwa legacy indeksy `harvest_records`, ktore byly juz zastapione bardziej trafnymi indeksami z `026`
  - dodana migracja `034_wrap_auth_uid_in_profiles_update_policy.sql` jako follow-up wydajnosciowy dla RLS `UPDATE` na `public.profiles`
  - follow-up zamienia gole `auth.uid()` na `(select auth.uid())` w polityce `profiles_update_self_or_super_admin`, zeby uniknac per-row reevaluacji w lint `Auth RLS Initialization Plan`
- `Phase 5D / 6J`
  - `/settings/profile` i `GET /settings/profile/export` sa wydzielone do osobnego authenticated account shell, ktory nie wymaga aktywnego orchard
  - zalogowany `super_admin` bez orchard nie trafia juz na onboarding przy starcie z `/`, tylko na `/settings/profile`
  - publiczny kontrakt `ExportAvailabilitySummary` ma teraz jawny `scope = owned_orchards | all_orchards_admin` oraz `orchards_count`
  - source-of-truth docs dla kontraktow, eksportu i UX sa zsynchronizowane z wdrozonym zachowaniem `owner` vs `super_admin`
  - automatyka ma nowe integration coverage dla administracyjnego eksportu wielu orchard oraz E2E dla seeded `super_admin` na `/settings/profile`
- `Phase 5E`
  - shared `EmptyStateCard`, `PrerequisiteCard`, `RecordNotFoundCard`, `AccessDeniedCard` i `FeedbackBanner` maja mobilny uklad CTA bez tracenia dotychczasowych kontraktow
  - `orchard switcher` zachowuje auto-submit, ale komunikuje stan zablokowany dla jednego orchard i pending podczas zmiany kontekstu
  - dashboard, listy i raporty maja ujednolicony reset filtrow wokol `Wyczysc filtry`, a `reports/season-summary` dostal route-level loading skeleton
  - E2E obejmuje teraz rozroznienie `global empty` vs `filtered empty`, recovery dla brakujacej aktywnosci, single-orchard switcher state oraz mobilny smoke pass bez poziomego scrolla
- `Phase 5F`
  - `DashboardSummary` jest rozszerzony o `upcoming_activities` jako orchard-scoped feed planowanych wpisow od dzis wzwyz
  - dashboard pokazuje osobny blok `Nadchodzace aktywnosci` z empty state, CTA do tworzenia wpisu i linkiem do listy aktywnosci
  - planningowy feed nie wprowadza nowego modelu planowania; korzysta z istniejacych `activities.status = planned`
  - automatyka ma nowe integration coverage dla sortowania, limitu i izolacji `upcoming_activities` oraz E2E dla pustego i niepustego stanu tego bloku
- `Phase 5G`
  - `ActionResult<T>.error_code` jest teraz zamknietym katalogiem MVP, a docs maja unit test pilnujacy zgodnosci z realnie zwracanymi kodami
  - batch preview dla drzew zachowuje teraz spojny kontrakt bledu z `data`, bez recznie skladanych wyjatkow od helpera
  - `orchard switcher` zachowuje biezaca trase po zmianie aktywnego orchard, zamiast zawsze wracac na `/dashboard`
  - nieudany orchard switch i zablokowany revoke membership koncza sie jawnym warning bannerem, a udany revoke pokazuje success banner na `/settings/members`
- `Release closeout / final QA sign-off`
  - referencyjny baseline jest odbudowywany komenda `pnpm seed:baseline-reset`, a gotowosc danych potwierdza `pnpm qa:baseline-status = READY`
  - pelny gate `supabase db lint`, `pnpm typecheck`, `pnpm test` i `pnpm test:e2e` przechodzi na czystym baseline
  - `pnpm dev` startuje poprawnie lokalnie po aktualnym closeoucie
  - audit walidacyjnych / permission / missing-active-orchard komunikatow jest domkniety dla MVP, a user-facing copy nie miesza juz technicznego `orchard` z polskim UX poza swiadomie technicznymi miejscami
  - pelna automatyka mutuje liczby rekordow w baseline, wiec przed recznym seeded smoke trzeba ponownie wykonac `pnpm seed:baseline-reset`
- `Plot Visual Operations MVP - start`
  - Phase 0 audit zostal wykonany dla route/data/test inventory
  - potwierdzono, ze przed tym krokiem istnialy `/plots`, `/plots/new` i `/plots/[plotId]/edit`, ale nie istnialo `/plots/[plotId]`
  - dodano read-only route foundation `app/(app)/plots/[plotId]/page.tsx`
  - route uzywa `requireActiveOrchard`, wczytuje dzialke przez `readPlotByIdForOrchard(orchardId, plotId)` i nie przyjmuje `orchard_id` z klienta
  - dodano orchard-scoped wrapper `listTreesForPlotInOrchard(orchardId, plotId)`
  - dodano pure helper `buildPlotVisualGrid` w `lib/domain/plot-visual-grid.ts`
  - read-only widok pokazuje metadata dzialki, liczniki drzew, grid dla `layout_type = rows`, partial grid z ostrzezeniami dla `mixed` oraz fallback bez sztucznej siatki dla `irregular`
  - removed / inactive trees sa widoczne jako muted historical markers, a inferred empty positions sa liczone tylko miedzy realnym `min(position_in_row)` i `max(position_in_row)` w rzedzie
  - helper ostrzega o niekompletnych lokalizacjach, partial coverage dla `mixed` i zdublowanych aktywnych logicznych lokalizacjach liczonych po `row_number + position_in_row`
  - `/plots` ma CTA `Otworz dzialke` do nowej trasy
  - `/plots` pokazuje teraz plot card stats: active tree count, removed/inactive tree count oraz dominant varieties liczone tylko z aktywnych drzew
  - `listPlotsForOrchard` dolacza `tree_stats` i kompatybilny `tree_count`; agregacja jest w pure helperze `buildPlotTreeStatsByPlot` bez migracji, RPC ani mutacji
  - statystyki kart sa pokryte unit tests oraz integration regression dla active/removed/inactive trees, unassigned active tree, dominant varieties i archived plot status
  - dodano unit coverage `tests/unit/plot-visual-grid.spec.ts`
  - dodano local read-only filters w `features/plots/plot-visual-overview.tsx`: lifecycle, variety, condition i location verified
  - filtry dzialaja na juz zaladowanych `trees`, bez nowych query, migracji, RPC, server actions ani `orchard_id` z klienta
  - top-level stat cards na `/plots/[plotId]` zostaja totalami calej dzialki, a grid/fallback lista sa liczone po filtrach
  - dodano filtered empty state z resetem i licznik `Pokazano X z Y drzew`
  - dodano helper `filterPlotVisualTrees` z unit coverage dla lifecycle, variety, unassigned, condition, verified/unverified i combined filters
  - dodano `tests/e2e/plot-visual-operations.spec.ts` dla przejscia `/plots -> /plots/[plotId]`, `rows`, `mixed`, `irregular` i smoke filtrow
  - dodano `Browse` interaction: klikniecie tree marker albo fallback tree otwiera read-only panel metadata
  - dodano `features/plots/plot-tree-detail-panel.tsx` z tree metadata, edit linkiem, aktywnym `Dodaj aktywnosc` dla active tree, disabled `Dodaj aktywnosc` dla removed/inactive tree, close button, `Escape` close i focus restore
  - panel nie wykonuje mutacji, nie pobiera danych per marker i nie pokazuje jeszcze timeline aktywnosci/zbiorow
  - Playwright smoke sprawdza panel, metadata, edit link oraz focus/escape behavior
  - dodano `Select` mode, single tree toggle, explicit same-row range selection i selection summary oparty o skompresowane `activity_scopes`
  - `compressPlotSelectionToActivityScopes` i `buildSameRowPlotSelectionRange` maja unit coverage dla ranges, section boundaries, inactive/removed exclusions, limits i invalid states
  - `buildActivityPrefillFromPlotSelection` buduje prefill do `/activities/new`: single tree ustawia parent `tree_id` i scope `tree`, multi-selection uzywa skompresowanych scopes
  - selection bar prowadzi do `/activities/new?plot_id=...&tree_id=...&scopes=...` tylko dla valid selection; empty/invalid/over-limit selection renderuje disabled CTA
  - `/activities/new` bezpiecznie parsuje prefill przez `resolveActivityPrefillFromSearchParams`, waliduje option set aktywnego orchard i nie przyjmuje `orchard_id` z klienta
  - security regression blokuje zapis activity z parent plot z jednego orchard i `tree` scope z innego orchard
  - Playwright pokrywa direct prefill, selection single tree -> activity form, same-row range -> activity form, tree detail CTA -> activity form oraz removed tree disabled CTA
  - dodano `resolveBulkDeactivateTreesPrefillFromPlotSelection` i `resolveBulkDeactivatePrefillFromSearchParams` dla `/trees/batch/deactivate`
  - selection bar pokazuje `Wycofaj drzewa` tylko dla jednego kompletnego `location_range`; empty, multi-range, tree-scope i invalid selection sa blokowane komunikatem
  - `/trees/batch/deactivate` uzupelnia `plot_id`, `row_number`, `from_position`, `to_position` z query prefill, ale nadal wymaga preview i osobnego confirmation
  - Playwright pokrywa selected one row range -> bulk deactivate prefill -> preview bez potwierdzania destrukcyjnej operacji
  - dodano `buildBulkTreeBatchPrefillFromEmptyRange` oraz query builder dla `/trees/batch/new`
  - `/trees/batch/new` parsuje prefill przez `resolveBulkTreeBatchPrefillFromSearchParams`, waliduje active orchard `plotOptions`, odrzuca `irregular` i nie przyjmuje `orchard_id` z klienta
  - `BulkTreeBatchForm` przyjmuje bezpieczny prefill dla `plot_id`, `section_name`, `row_number`, `from_position`, `to_position`, ale nadal wymaga preview i opcjonalnego confirmation przez istniejacy `submitBulkTreeBatch`
  - `PlotVisualOverview` pokazuje `Dosadz drzewa` dla ciaglego zakresu `empty_inferred` w jednym rzedzie; przy aktywnych filtrach akcja jest blokowana, zeby ukryte drzewa nie tworzyly falszywych pustych pozycji
  - Playwright pokrywa utworzenie testowej dziury w rzedzie, empty inferred position -> `/trees/batch/new` prefill -> batch create preview
  - aktywny master plan PVO zostal zsynchronizowany: Phase 0 = Done, Phase 1 = Automated done / manual owner-worker smoke pending, Phase 2 = Done, Phase 3 = Done, Phase 4 = Automated done / manual QA pending, Phase 5 = Done, Phase 6 = Automated done / manual UX confirmation pending

### Swiadomie odlozone po obecnym etapie

- przyszle harvest entry pointy z mapy
- detail pages dla `varieties` i `trees`
- delete UI dla `varieties` i `trees`
- zmiana roli membership orchard
- import UI i restore workflow
- storage / attachments
- szerszy planning block wykraczajacy poza prosty feed `upcoming_activities`

### Najwazniejsze punkty wejscia do dokumentacji

- [documents/README.md](../README.md)
- [documentation_map.md](./documentation_map.md)
- [documents/01_implementation_materials/README.md](../01_implementation_materials/README.md)
- [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md)
- [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
- [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md)
- [test_plan.md](../07_security_and_quality/test_plan.md)
- [local_dev_tools_quickstart.md](./local_dev_tools_quickstart.md)
- [manual_testing_quickstart.md](./manual_testing_quickstart.md)

### Najwazniejsze punkty wejscia do kodu

- `app/`
- `features/`
- `server/actions/`
- `lib/orchard-context/`
- `supabase/migrations/`
- `supabase/seeds/`
- `tests/`

### Ostatni potwierdzony stan automatycznej weryfikacji

Ostatnio potwierdzone jako przechodzace:

- `supabase db lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm qa:baseline-status`
- `pnpm dev`

Ostatnio potwierdzone lokalnie po starcie `Plot Visual Operations MVP`:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
  - `36` plikow testowych
  - `164` testy
- `pnpm seed:baseline-reset`
- `pnpm qa:baseline-status = READY`
- `pnpm test:e2e`
  - `12` testow Playwright passed

Dodatkowy status lokalnego baseline QA:

- po `pnpm seed:baseline-reset` referencyjny baseline wraca do `READY`
- po `pnpm test` i `pnpm test:e2e` baseline nie jest juz referencyjny, bo suite'y dopisuja dane scenariuszy; przed manual QA trzeba zrobic kolejny `pnpm seed:baseline-reset`

### Rekomendowany nastepny vertical slice

- `Plot Visual Operations MVP closeout / next backlog`
  - najblizszy krok: reczny QA closeout Phase 1/4/6 albo przejscie do PVO Phase 7/Future Domain Hardening
  - Phase 1 Plot Card Stats, Phase 5 Add Activity from Selection i Phase 6 Structural Actions sa domkniete automatycznie i zsynchronizowane w master planie
  - zachowac server-side active orchard context; klient nadal nie moze przekazywac zaufanego `orchard_id`

## UZUPELNIJ SAM - stan lokalny i reczna weryfikacja

### 1. Ostatnia reczna weryfikacja w przegladarce

- Data:
  - `2026-04-27`
- Co sprawdziles:
  - `pelny seeded smoke pass wedlug manual_testing_quickstart.md`
  - `owner`, `worker`, outsider
  - `activities`, `harvests`, dashboard, settings i raport sezonu
- Wynik:
  - baseline przeszedl bez blokujacych bledow; aplikacja reaguje stabilnie i nie wychwycono regresji krytycznych

### 2. Aktualny lokalny stan narzedzi

- Czy `supabase start` jest uruchomiony:
  - `tak`
- Czy `pnpm dev` startuje poprawnie:
  - `tak`
- Czy aplikacja otwiera sie pod `http://localhost:3000`:
  - `tak`

### 3. Ostatnie rzeczy zauwazone recznie

- UI / UX do poprawy, Bledy albo edge case'y zauwazone recznie, Security Issues:
  - Zamkniete w Pre-Phase 3 Stabilization Pass:
  - pierwotny warning `Function Search Path Mutable` byl hardenowany migracja `017_harden_function_search_paths.sql`, a regresje po redefinicji trigger functions w `025` dostaly follow-upy `027_reharden_harvest_trigger_search_path.sql` i `028_reharden_activity_scope_trigger_search_path.sql`
  - polski jest teraz domyslnym jezykiem glownego UX i copy dla aktualnie wdrozonych flow
  - dodane glowne `README.md` repo
  - onboarding intro ma lepszy kontrast i czytelniejszy naglowek
  - glowne CTA i link-buttony maja czytelniejszy kontrast
  - create plot proponuje kolejny `code`, gdy da sie bezpiecznie rozpoznac wzorzec
  - `species` w `variety` i `tree` ma presety `apple`, `pear`, `plum`, `cherry` z opcja wlasnej wartosci
  - dodane owner-only strony `/settings/orchard` i `/settings/members`
  - worker dostaje czytelny stan `forbidden` przy bezposrednim wejsciu w owner-only settings
  - Zamkniete w follow-up RLS hardening:
  - `Multiple Permissive Policies` dla `orchard_memberships` naprawione migracja `019_consolidate_orchard_membership_insert_policy.sql`
  - `Auth RLS Initialization Plan` dla `orchard_memberships` naprawiony migracja `020_wrap_auth_uid_in_orchard_membership_select_policy.sql`
  - `Auth RLS Initialization Plan` dla `orchards` naprawiony migracjami `021_wrap_auth_uid_in_orchards_update_policy.sql`, `022_wrap_auth_uid_in_orchards_insert_policy.sql` i `029_wrap_auth_uid_in_orchards_select_policy.sql`
  - `Auth RLS Initialization Plan` dla `profiles` naprawiony migracja `034_wrap_auth_uid_in_profiles_update_policy.sql`
  - brakujace indeksy pokrywajace FK dla `orchard_memberships`, `trees`, `activities`, `harvest_records` i `bulk_tree_import_batches` domkniete migracja `030_add_covering_foreign_key_indexes.sql`
  - ostatni warning o nieuzywanej zmiennej `v_membership_joined_at` w `create_orchard_with_owner_membership(...)` domkniety migracja `031_remove_unused_membership_joined_at_variable.sql`
  - po audycie `Unused Index` usuniete zostaly redundantne indeksy `idx_orchards_status`, `idx_plots_orchard_id`, `idx_varieties_orchard_id`, `idx_trees_orchard_id`, `idx_activities_orchard_id` i `idx_harvest_records_orchard_id`; `idx_orchard_memberships_profile_status` zostal swiadomie zachowany
  - w drugim passie `Unused Index` uproszczone zostaly indeksy `bulk_tree_import_batches`, usuniety zostal nieuzywany `idx_activity_scopes_scope_level_row`, a `harvest_records` stracily stare indeksy `idx_harvest_records_season_date`, `idx_harvest_records_orchard_variety_season` i `idx_harvest_records_orchard_plot_season`, bo ich role przejal pakiet `026`
  - lokalny `supabase db lint --local -o json` przechodzi bez pozostalych warningow schematu `public`
  - Zamkniete w Phase 3 Core Slice:
  - dodane trasy `/activities`, `/activities/new` i `/activities/[activityId]/edit`
  - lista aktywnosci ma filtry po dacie, dzialce, drzewie, typie, statusie i wykonawcy
  - formularz aktywnosci obsluguje `scopes` i `materials` przez JSON hidden payloads
  - `pruning` wymaga `activity_subtype`, a `pruning` / `mowing` / `spraying` wymagaja zakresu
  - `spraying` wspiera wiele materialow, pogode i `result_notes`
  - zapis parent + `activity_scopes` + `activity_materials` jest transakcyjny przez RPC
  - worker i owner moga tworzyc, edytowac, zmieniac status i usuwac aktywnosci w swoim orchard
  - Zamkniete w Phase 3 continuation:
  - dodana trasa `/activities/[activityId]` z pelnym podgladem wpisu, zakresow i materialow
  - lista aktywnosci linkuje do detail page, a zmiana statusu / delete rewaliduja tez detail route
  - `/activities` ma drugi panel filtrow dla sezonowego summary z query params `summary_*`
  - summary liczy tylko wpisy `done` i grupuje wynik po dzialkach z `last_activity_date`
  - coverage dla wybranej dzialki opiera sie wylacznie na zapisanych `activity_scopes`
  - dodane typy i read modele dla `SeasonalActivitySummary` oraz `SeasonalActivityCoverage`
  - source-of-truth docs dla UX, architektury, kontraktow i testow zostaly zaktualizowane pod detail route oraz osadzone `summary + coverage`
  - automatycznie potwierdzone lokalnie: `pnpm typecheck` oraz testy `phase3-activities-validation` i `activity-management-flow`
  - Zamkniete w Phase 4A:
  - dodane trasy `/harvests`, `/harvests/new`, `/harvests/[harvestRecordId]` i `/harvests/[harvestRecordId]/edit`
  - shell aplikacji ma juz staly link do `Zbiory`
  - formularz harvests obsluguje scope `orchard`, `plot`, `variety`, `location_range` i `tree`
  - wpis zbioru moze byc opcjonalnie powiazany z aktywnoscia typu `harvest`
  - read/write path dla `harvest_records` dziala przez server actions i read modele bez nowych RPC
  - triggerowa normalizacja `season_year` i `quantity_kg` jest pokryta unit i integration tests
  - owner i worker moga tworzyc, edytowac, czytac i usuwac harvest records w swoim orchard
  - dodane testy `phase4-harvest-validation`, `harvest-management-flow` i `harvest-management-rls`
  - automatycznie potwierdzone lokalnie: `pnpm typecheck`, `pnpm lint` i pelne `pnpm test`
  - Zamkniete w Phase 4 continuation:
  - dodana trasa `/reports/season-summary` jako harvestowy raport sezonu
  - raport filtruje po `season_year`, `plot_id` i `variety_id`
  - summary pokazuje globalna sume, liczbe wpisow, breakdown per odmiana i per dzialka
  - timeline grupuje rekordy po `harvest_date` i linkuje z powrotem do listy wpisow
  - z `/harvests` mozna przejsc bezposrednio do `Podsumowanie sezonu`
  - dodane testy unit dla agregacji summary i timeline oraz integration test dla read modeli reportingowych
  - automatycznie potwierdzone lokalnie: `pnpm lint` oraz targeted `pnpm test` dla harvest summary
  - Zamkniete w local QA baseline automation:
  - dodana komenda `pnpm seed:baseline-users` do bootstrapu wymaganych kont `auth.users` dla referencyjnego seedu
  - skrypt tworzy albo aktualizuje 6 kont seedowych i ustawia wspolne lokalne haslo testowe
  - `README`, `local_dev_tools_quickstart`, `manual_testing_quickstart`, `test_plan` i `.env.example` zostaly zaktualizowane pod nowy workflow
  - automatycznie potwierdzone lokalnie: `pnpm seed:baseline-users`
  - Zamkniete w Phase 5A:
  - `/dashboard` pokazuje teraz realne summary aktywnego sadu zamiast placeholdera
  - read model `getDashboardSummaryForOrchard` liczy aktywne dzialki, aktywne drzewa, ostatnie aktywnosci, ostatnie zbiory i `upcoming_activities`
  - owner widzi szybkie wejscia do `settings/orchard` i `settings/members`, a wszyscy maja link do `/reports/season-summary`
  - dashboard ma onboardingowy empty state oraz partial empty state dla pustych feedow aktywnosci, zbiorow i planowanych prac
  - dodany integration test dla dashboard summary z limitem, sortowaniem i izolacja orchard, w tym dla `upcoming_activities`
  - automatycznie potwierdzone lokalnie: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  - Zamkniete w Phase 5B1:
  - `plots`, `varieties`, `trees`, `activities` i `harvests` maja wspolny wzorzec `global empty state` vs `filtered empty state`
  - list pages streamuja loading skeleton bez czekania na pelne pobranie danych listy
  - dodane helpery do wykrywania aktywnych filtrow i unit tests dla tych warunkow
  - automatycznie potwierdzone lokalnie: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  - Zamkniete w Phase 5B2a:
  - detail i edit routes dla `activities`, `harvests`, `plots`, `trees` i `varieties` renderuja recovery cards zamiast cichego redirectu po brakujacym rekordzie
  - `/settings/orchard` i `/settings/profile` pokazuja czytelne recovery cards przy brakujacych danych zamiast surowego bledu
  - create/edit flows zalezne od istnienia dzialki maja wspolny `PrerequisiteCard`
  - dodany unit test `route-state-cards.spec.tsx` dla shared cards
  - automatycznie potwierdzone lokalnie: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  - Zamkniete w Phase 5B2b:
  - dodana komenda `pnpm qa:baseline-status` do walidacji baseline auth users i referencyjnych danych seedowych przed manual QA
  - narzedzie sprawdza profile, orchardy, membership matrix, liczby rekordow i normalizacje harvest w tonach
  - przy zabrudzonej lokalnej bazie po testach narzedzie rekomenduje `pnpm seed:baseline-reset` zamiast samego rerunu SQL seedu
  - `manual_testing_quickstart`, `local_dev_tools_quickstart`, `schema_migration_plan`, `test_plan`, `README` i aktywne mapy dokumentacji zostaly zaktualizowane pod nowy workflow; historyczny `implementation_master_plan` jest teraz w `documents/archive/`
  - dodane unit tests dla evaluatora gotowosci seeded QA
  - automatycznie potwierdzone lokalnie: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  - Zamkniete w Phase 5C1:
  - dodany wspolny helper `notice` dla redirect-based success feedback
  - listy `plots`, `trees`, `varieties`, `activities` i `harvests` pokazuja zielony banner po create / edit
  - `plots`, `activities` i `harvests` pokazuja tez banner po archive / restore / delete / status change
  - `activities/[activityId]` i `harvests/[harvestRecordId]` renderuja success feedback po szybkich akcjach detail view
  - dodane unit tests dla helperow feedback i zaktualizowane source-of-truth docs dla UI states i acceptance
  - automatycznie potwierdzone lokalnie: `pnpm typecheck`, `pnpm lint`, `pnpm test`
  - Zamkniete w Plot Visual Operations MVP start:
  - wykonany Phase 0 audit tras, read modeli, formularzy, walidacji i testow
  - dodany read-only fundament `/plots/[plotId]`
  - dodany `buildPlotVisualGrid` z unit testami
  - dodany `PlotVisualOverview` dla grid/fallback renderu
  - dodane read-only filters dla grid/fallback renderu bez nowych roundtripow
  - dodany `Browse` tree detail panel bez mutacji i bez per-marker server calls
  - dodany focus management: wejscie do panelu, `Escape` close i powrot fokusu na marker
  - dodany `Select` mode w `PlotVisualOverview` z single tree toggle dla active trees
  - dodany pure helper `compressPlotSelectionToActivityScopes` w `lib/domain/plot-selection.ts`
  - dodany pure helper `buildSameRowPlotSelectionRange` dla explicit start/end range selection i pomijania inactive/removed trees
  - dodany pure helper `getPlotSelectionActivityActionState` dla empty/ready/blocked Add Activity state
  - selection summary pokazuje selected count, compressed `location_range` / `tree` scopes i ostrzezenia limitow
  - `Select` mode ma przycisk `Zakres`, pending start marker i dodawanie same-row zakresu po wskazaniu konca
  - selection summary ma `Add Activity` action state: pusty albo over-limit wybór blokuje CTA, a valid selection linkuje do `/activities/new` z prefill query
  - `buildActivityPrefillFromPlotSelection` buduje single tree prefill jako parent `tree_id` + scope `tree`, a multi-range selection jako skompresowane scopes bez parent `tree_id`
  - dodany URL query format dla activity prefill: `/activities/new?plot_id=...&tree_id=...&scopes=...`
  - dodany `resolveActivityPrefillFromSearchParams`, ktory waliduje query prefill przez `activityScopeSchema`, limity PVO i orchard-scoped `plotOptions` / `treeOptions`
  - `ActivityForm` przyjmuje bezpieczny create prefill dla `plot_id`, `tree_id` i `activity_scopes`, nadal zapisujac przez `createActivity` i `normalizeActivityPayload`
  - `/activities/new` pokazuje applied/invalid prefill message i przy invalid prefill wraca do pustego formularza bez crasha
  - dodane unit tests dla selection compression, same-row range selection, action state, validation i query/scope limits
  - dodane unit tests dla activity prefill parsera oraz regression tests dla single tree / multi-scope `normalizeActivityPayload`
  - Playwright smoke sprawdza, ze `Select` mode nie otwiera panelu, explicit start/end range selection kompresuje drzewa do range summary, action state przechodzi z empty do ready, direct `/activities/new` prefill wypelnia plot/scopes/tree, a selection/tree panel CTA wypelnia activity form
  - security regression sprawdza odrzucenie activity z parent plot z jednego orchard i `tree` scope z innego orchard
  - dodany Playwright smoke dla seeded `rows`, `mixed` i `irregular`
  - dodany CTA `Otworz dzialke` na `/plots`
  - automatycznie potwierdzone lokalnie: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm seed:baseline-reset`, `pnpm qa:baseline-status`, `pnpm test:e2e`
  - Nadal odlozone albo wymagajace osobnej decyzji:
  - przelacznik jezyka PL / EN i pelne i18n
  - globalny admin / super user shell, podglad userow i remove user
  - reczny smoke test nowych stron `activities` w przegladarce
  - reczny smoke test nowych stron `harvests` w przegladarce
  - szerszy planningowy block na dashboardzie wykraczajacy poza prosty feed `upcoming_activities`
  - reczny smoke test na kontach seedowych

- Rzeczy, ktore dzialaja dobrze i nie wymagaja ruszania:
  - `większość dotychczasowej implementacji`

### 4. Najblizszy cel kolejnej sesji

- Co chcesz zrobic jako nastepne:
  - `wykonac reczny QA closeout PVO Phase 1/4/6 albo przejsc do PVO Phase 7/Future Domain Hardening`
- Co ma byc zakresem nowego chatu:
  - `bazujemy na aktualnym PVO master planie; Phase 1 Plot Card Stats, Phase 5 Add Activity From Selection i Phase 6 Structural Actions sa domkniete automatycznie, a manual UX/owner-worker smoke check pozostaje jako QA closeout`

### 5. Kontekst organizacyjny

- Nazwa brancha, jesli uzywasz gita:
  - `main`
- Czy masz lokalne niecommitowane zmiany, na ktore trzeba uwazac:
  - `troszkę się znajdzie`
- Czy byly robione dodatkowe reczne zmiany poza repo / dokumentacja:
  - `nie`

## Gotowy prompt startowy do nowego chatu

Mozesz wkleić cos w tym stylu:

```text
Pracujemy nad OrchardLog / Sadownik+.
Rozmawiamy po polsku, ale nazwy techniczne, pliki, DTO, endpointy, encje i SQL trzymamy po angielsku.

Najpierw przeczytaj:
- documents/00_overview_and_checklists/codex_working_prompt.md
- documents/00_overview_and_checklists/app_high_level_overview.md
- documents/00_overview_and_checklists/session_handoff.md
- documents/README.md
- documents/00_overview_and_checklists/documentation_map.md
- documents/01_implementation_materials/README.md
- documents/02_product_documents/mvp_scope_and_priorities.md

Dokument documents/01_implementation_materials/plot_visual_operations_implementation_master_plan.md jest naszym planem który chcemy zrealizować jako rozwój tej aplikacji.

Potem zorientuj sie w repo:
- sprawdz `git status --short`, bo worktree moze byc brudny,
- nie cofaj i nie nadpisuj zmian, ktorych sam nie zrobiles,
- traktuj `documents/archive/` jako material historyczny, nie source of truth,
- jesli dokumenty, migracje, testy i kod sa niespojne, sprawdz faktyczny stan implementacji i jasno nazwij rozjazd.

Nie zaczynaj projektowania od zera.
Bazuj na aktualnym repo, aktywnej dokumentacji, migracjach Supabase, seedach, testach i juz wdrozonych vertical slice'ach.
Najpierw ustal, ktory slice albo follow-up jest kontynuowany, a dopiero potem proponuj zmiany.

Szczegolnie zwracaj uwage na:
- `active_orchard` rozwiazywany po stronie serwera i cookie `ol_active_orchard`,
- orchard-scoped ownership i RLS,
- role `owner`, `worker`, `super_admin` oraz outsider bez membership,
- aktualny pakiet migracji `001`-`034`,
- workflow baseline: `pnpm seed:baseline-reset` -> `pnpm qa:baseline-status`,
- gate jakosci: `supabase db lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`,
- swiadomie odlozone funkcje: future harvest entry points z mapy, detail pages dla `varieties` / `trees`, delete UI dla `varieties` / `trees`, zmiana roli membership, import / restore, storage / attachments i szerszy planning block.

Nastepnie kontynuuj `Plot Visual Operations MVP` od sekcji "Rekomendowany nastepny vertical slice" oraz "Najblizszy cel kolejnej sesji" z `session_handoff.md`.
Jesli dokumenty i kod sa niespojne, pierwszenstwo ma faktyczny stan implementacji oraz `plot_visual_operations_implementation_master_plan.md`.
```

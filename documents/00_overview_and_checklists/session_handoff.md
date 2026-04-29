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
   - `documents/01_implementation_materials/implementation_master_plan.md`
2. Po kazdej wiekszej sesji uzupelnij sekcje `UZUPELNIJ SAM`.
3. Nie duplikuj tutaj calej dokumentacji; zapisuj tylko najwazniejszy stan operacyjny.

## Aktualny stabilny stan projektu

### Architektura i model

- `active_orchard` jest rozwiazywany po stronie serwera i utrwalany w `httpOnly` cookie `ol_active_orchard`
- ownership danych jest `orchard`-scoped
- auth, onboarding, membership i protected app shell sa wdrozone
- core orchard structure dla `plots`, `varieties`, `trees` jest wdrozona
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
  - eksport jest dostepny tylko dla usera z co najmniej jednym aktywnym membership `owner`
  - payload obejmuje profil oraz tylko orchard z aktywnym membership `owner`, razem z `orchard_memberships`, `plots`, `varieties`, `trees`, `activities`, `activity_scopes`, `activity_materials` i `harvest_records`
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

### Swiadomie odlozone po obecnym etapie

- detail pages dla `plots`, `varieties`, `trees`
- delete UI dla `varieties` i `trees`
- `upcoming_activities` i szerszy planning block na dashboardzie
- dalszy responsive polish dla mobilnych flow terenowych

### Najwazniejsze punkty wejscia do dokumentacji

- [documents/README.md](../README.md)
- [documentation_map.md](./documentation_map.md)
- [documents/01_implementation_materials/README.md](../01_implementation_materials/README.md)
- [implementation_master_plan.md](../01_implementation_materials/implementation_master_plan.md)
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

- `pnpm seed:baseline-reset`
- `pnpm qa:baseline-status`
- `supabase db lint`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`

### Rekomendowany nastepny vertical slice

- `Phase 6I - migration and query hardening`, czyli przeglad MVP migracji pod spojnoscia nazw, forward-only safety i realnym pokryciem indeksami pod dashboard, harvest reporting oraz najczestsze query operacyjne

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
  - `Function Search Path Mutable` z Supabase lint naprawiony migracja `017_harden_function_search_paths.sql`
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
  - `Auth RLS Initialization Plan` dla `orchards` naprawiony migracjami `021_wrap_auth_uid_in_orchards_update_policy.sql` i `022_wrap_auth_uid_in_orchards_insert_policy.sql`
  - lokalny `supabase db lint --local -o json` nie zgłasza juz tych warningow; obecnie zostaje tylko niezwiązany warning o nieuzywanej zmiennej `v_membership_joined_at` w `create_orchard_with_owner_membership(...)`
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
  - read model `getDashboardSummaryForOrchard` liczy aktywne dzialki, aktywne drzewa, ostatnie aktywnosci i ostatnie zbiory
  - owner widzi szybkie wejscia do `settings/orchard` i `settings/members`, a wszyscy maja link do `/reports/season-summary`
  - dashboard ma onboardingowy empty state oraz partial empty state dla pustych feedow aktywnosci i zbiorow
  - dodany integration test dla dashboard summary z limitem, sortowaniem i izolacja orchard
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
  - `manual_testing_quickstart`, `local_dev_tools_quickstart`, `schema_migration_plan`, `test_plan`, `README` i `implementation_master_plan` zostaly zaktualizowane pod nowy workflow
  - dodane unit tests dla evaluatora gotowosci seeded QA
  - automatycznie potwierdzone lokalnie: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  - Zamkniete w Phase 5C1:
  - dodany wspolny helper `notice` dla redirect-based success feedback
  - listy `plots`, `trees`, `varieties`, `activities` i `harvests` pokazuja zielony banner po create / edit
  - `plots`, `activities` i `harvests` pokazuja tez banner po archive / restore / delete / status change
  - `activities/[activityId]` i `harvests/[harvestRecordId]` renderuja success feedback po szybkich akcjach detail view
  - dodane unit tests dla helperow feedback i zaktualizowane source-of-truth docs dla UI states i acceptance
  - automatycznie potwierdzone lokalnie: `pnpm typecheck`, `pnpm lint`, `pnpm test`
  - Nadal odlozone albo wymagajace osobnej decyzji:
  - przelacznik jezyka PL / EN i pelne i18n
  - globalny admin / super user shell, podglad userow i remove user
  - reczny smoke test nowych stron `activities` w przegladarce
  - reczny smoke test nowych stron `harvests` w przegladarce
  - planningowy blok `upcoming_activities` na dashboardzie
  - reczny smoke test na kontach seedowych

- Rzeczy, ktore dzialaja dobrze i nie wymagaja ruszania:
  - `większość dotychczasowej implementacji`

### 4. Najblizszy cel kolejnej sesji

- Co chcesz zrobic jako nastepne:
  - `zrobic reczny seeded smoke pass w przegladarce na gotowym baseline`
- Co ma byc zakresem nowego chatu:
  - `bazujemy na zamknietym Phase 5C1, nie ruszamy dashboard summary ani harvest reporting, tylko wykonujemy reczny smoke pass i zbieramy responsive / UX follow-upy`

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
Przeczytaj najpierw:
- documents/00_overview_and_checklists/codex_working_prompt.md
- documents/00_overview_and_checklists/session_handoff.md
- documents/README.md
- documents/01_implementation_materials/README.md
- documents/01_implementation_materials/implementation_master_plan.md

Nastepnie kontynuuj prace od sekcji "Najblizszy cel kolejnej sesji" z session_handoff.md.
Nie zaczynaj od projektowania od zera - bazuj na aktualnym repo, dokumentacji, migracjach, testach i wdrozonych slice'ach.
```

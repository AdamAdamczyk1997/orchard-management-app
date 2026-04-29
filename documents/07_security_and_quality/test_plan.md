# OrchardLog / Sadownik+ - test plan

## Cel dokumentu

Ten dokument opisuje minimalny plan testow potrzebny do bezpiecznego wdrazania OrchardLog.
Plan jest dopasowany do aplikacji webowej w Next.js z backendem opartym o Supabase.

## Aktualny status wdrozenia testow

Na obecnym etapie projektu dziala pierwszy pakiet testow automatycznych oparty o `Vitest`.

Aktualnie wdrozone:

- `unit tests` dla logiki wyboru `active_orchard`
- `unit tests` dla walidacji `plots`, `varieties` i `trees`
- `unit tests` dla walidacji ustawien ukladu dzialki
- `unit tests` dla polityki `rows / mixed / irregular` w flow drzew
- `unit tests` dla guardow `createTree` / `updateTree`
- `integration tests` dla `profile` bootstrap po utworzeniu usera w `auth.users`
- `integration tests` dla flow `create_orchard_with_owner_membership`
- `security / RLS tests` dla `owner`, `worker` i outsidera
- `integration tests` dla `plots`, `varieties` i `trees`
- `integration tests` dla lifecycle `plot -> variety -> tree` w Phase 2
- `integration tests` dla zapisu i aktualizacji ustawien ukladu dzialki
- `security / RLS tests` dla `plots`, `varieties` i `trees`
- `unit tests` dla parsera filtrow `summary_*` w `activities`
- `unit tests` dla helperow wykrywania aktywnych filtrow list
- `unit tests` dla helperow redirect success feedback i parsera notice codes
- `unit tests` dla walidacji batch create / bulk deactivate drzew
- `unit tests` dla helperow scalania zakresow w raporcie lokalizacji odmiany
- `unit tests` dla plot-aware ograniczen `activities` i `harvests`
- `integration tests` dla detail read model `activities`
- `integration tests` dla sezonowego `summary + coverage` w `activities`
- `unit tests` dla walidacji i normalizacji `harvest_records`
- `unit tests` dla agregacji sezonowego summary i timeline dla harvests
- `integration tests` dla harvest CRUD, read modeli i sezonowego summary
- `integration tests` dla dashboard summary z countami, limitami feedow i izolacja orchard
- `integration tests` dla preview i write flow `batch create` / `bulk deactivate` drzew
- `integration tests` dla odrzucenia row-based `activity_scopes` i harvestowego `location_range` na dzialkach `irregular`
- `integration tests` dla read modelu `getVarietyLocationsReport`
- `integration tests` dla read modelu `getHarvestLocationSummary`
- `security / RLS tests` dla `harvest_records`
- `security / RLS tests` dla RPC i tabeli `bulk_tree_import_batches`
- `unit tests` dla seeded QA readiness evaluator i referencyjnego baseline workflow

Lokalizacja testow:

- `tests/unit`
- `tests/integration`
- `tests/security`

Uruchamianie lokalne:

```bash
supabase status
pnpm seed:baseline-users
pnpm seed:baseline-sql
pnpm seed:baseline-reset
pnpm qa:baseline-status
pnpm test
```

Wymagania lokalne:

- lokalny stack Supabase musi byc uruchomiony
- `.env.local` musi zawierac `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` i `SUPABASE_SECRET_KEY`

## 1. Cele jakosciowe

- brak przecieku danych miedzy kontami i orchard
- poprawna walidacja formularzy i operacji
- zachowanie spojnosci relacji miedzy orchard, dzialkami, drzewami, odmianami, aktywnosciami i zbiorami
- stabilne dzialanie glownego flow na telefonie i desktopie

## 2. Warstwy testow

### Testy jednostkowe

Co testujemy:

- funkcje walidacji danych formularzy
- walidacje `layout_type`, numeracji i domyslnej siatki dzialki
- mapowanie `activity_date -> season_year / season_phase`
- logike generowania `tree_code`, jesli bedzie automatyczna
- logike wykrywania konfliktu lokalizacji drzewa
- logike scalania pozycji do raportu zakresow odmiany
- logike grupowania raportu lokalizacji po dzialce, sekcji i rzedzie
- logike przeliczania `quantity_value + quantity_unit -> quantity_kg`
- logike agregacji sezonowych zbiorow
- logike agregacji lokalizacji zbiorow z fallbackiem dla scope `tree`
- logike walidacji `activity_scopes`
- logike raportowania wykonanych zakresow prac sezonowych
- parser filtrow `summary_*` dla sezonowego panelu `activities`
- helpery odrozniajace `global empty state` od `filtered empty state`
- logike wyboru i zmiany `active_orchard`
- logike oceny, czy baseline seed jest gotowy do manual QA
- logike blokowania row-range batch flow dla dzialek `irregular`

### Testy integracyjne

Co testujemy:

- server actions i warstwe serwerowa
- zapis encji do bazy z poprawnymi walidacjami
- RLS i ograniczenia dostepu
- tworzenie orchard i membership
- tworzenie aktywnosci razem z materialami
- tworzenie aktywnosci razem z `activity_scopes`
- zapis `harvest_records` z poprawna normalizacja jednostek
- preview i write dla batch create drzew
- preview i write dla bulk deactivate drzew
- odczyt raportu lokalizacji odmiany
- odczyt raportu lokalizacji zbiorow
- brak eksportu dla `worker`

Na dzis realnie pokryte automatycznie:

- tworzenie `profile` przez bootstrap z `auth.users`
- atomowe tworzenie `orchard` i `orchard_membership`
- relacja `owner -> orchard -> orchard_membership`
- brak dostepu usera bez membership do danych orchard
- izolacja RLS dla `orchards`
- izolacja RLS dla `profiles`
- tworzenie `plot`
- tworzenie `variety`
- tworzenie `tree`
- create / edit / archive / restore `plots`
- zapis `layout_type`, numeracji i ustawien ukladu w `plots`
- create / edit / search `varieties`
- create / edit / filter `trees`
- odrzucenie zapisu drzewa do `archived plot` w warstwie akcji serwerowej
- trigger spojnosc `tree -> plot -> variety -> orchard`
- konflikt aktywnej lokalizacji drzewa
- automatyczne `is_active = false` dla drzewa `removed`
- preview batch create z wykryciem konfliktu lokalizacji
- transakcyjny zapis batch create z `bulk_tree_import_batches` i `trees.planted_batch_id`
- preview bulk deactivate z ostrzezeniami o pustych lub juz nieaktywnych pozycjach
- write bulk deactivate z logicznym usunieciem i dopisaniem opcjonalnego powodu do `trees.notes`
- raport lokalizacji odmiany grupuje aktywne drzewa po dzialce, sekcji i rzedzie oraz scala kolejne pozycje
- raport lokalizacji odmiany pomija drzewa nieaktywne i bez kompletnego `row_number + position_in_row`
- raport lokalizacji zbiorow odziedzicza lokalizacje drzewa dla scope `tree`
- raport lokalizacji zbiorow oddziela wpisy `orchard` oraz wpisy bez precyzyjnej lokalizacji od grup terenowych
- create / edit / filter / status / delete `activities`
- detail read model `activities`
- transakcyjny zapis `activities + activity_scopes + activity_materials`
- walidacja `pruning -> activity_subtype`
- walidacja `activity_scopes` i `materials` z JSON payloadow
- sezonowe `summary` dla `activities` liczone tylko z rekordow `done`
- sezonowe `coverage` dla `activities` oparte tylko na zapisanych `activity_scopes`
- create / edit / filter / delete `harvest_records`
- detail read model `harvest_records`
- triggerowa normalizacja `quantity_kg` i `season_year` dla harvests
- sezonowe `summary` i timeline dla `harvest_records`
- dashboard summary dla aktywnego orchard
- RLS dla `activities`, `activity_scopes` i `activity_materials`
- RLS dla `harvest_records`
- write permissions `worker` dla aktywnosci w swoim orchard
- write permissions `worker` dla wpisow zbioru w swoim orchard
- RLS dla `plots`, `varieties` i `trees`
- write permissions `worker` dla danych operacyjnych
- brak delete permissions dla `worker` na `plots`
- `worker` moze wykonac `create_bulk_tree_batch` i `bulk_deactivate_trees` w swoim orchard
- outsider nie widzi `bulk_tree_import_batches` i nie wykona RPC batchowych

### Testy end-to-end

Co testujemy:

#### MVP 0.1

- rejestracja i logowanie
- onboarding `Create orchard`
- zmiane `active_orchard`
- dodanie dzialki
- dodanie odmiany
- dodanie drzewa
- dodanie aktywnosci
- dodanie aktywnosci sezonowej na zakresie
- dodanie rekordu zbioru
- filtrowanie dziennika
- raport sezonowych zbiorow

#### Etap 0.2

- batch create drzew
- raport lokalizacji odmiany
- bulk deactivate drzew

## 3. Krytyczne scenariusze do pokrycia na pewno

- user bez membership trafia do onboardingu orchard
- `owner` moze utworzyc orchard i staje sie aktywnym `owner`
- `worker` nie widzi ani nie wykonuje eksportu
- zwykly user nie moze podniesc sobie `profiles.system_role` ani zmienic `profiles.email` przez self-service update
- user A nie widzi danych orchard usera B bez membership
- nie da sie utworzyc drzewa na dzialce z innego `orchard`
- nie da sie przypisac do drzewa odmiany z innego `orchard`
- nie da sie zapisac drzewa dla dzialki `rows` bez `row_number + position_in_row`
- nie da sie zapisac drzewa dla dzialki `mixed` albo `irregular` bez zadnej czytelnej wskazowki lokalizacyjnej
- nie da sie przypisac aktywnosci do drzewa z innej dzialki
- nie da sie zapisac konfliktowej lokalizacji aktywnego drzewa
- batch create nie zapisuje niczego, jesli preview albo write wykryje konflikt lokalizacji
- batch create i bulk deactivate nie startuja dla dzialki `irregular`
- bulk deactivate nie wychodzi poza jedna dzialke i jeden rzad
- bulk deactivate nie usuwa rekordow fizycznie z bazy
- raport lokalizacji odmiany nie przecieka danych odmiany ani drzew poza aktywny `orchard`
- raport lokalizacji odmiany poprawnie scala pozycje `1-2` i rozdziela luki na osobne zakresy
- raport lokalizacji zbiorow poprawnie przypisuje rekord `tree` do dzialki drzewa nawet bez zapisanego `plot_id`
- materialy aktywnosci zapisuja sie i odczytuja razem z wpisem
- zakresy aktywnosci zapisuja sie i odczytuja razem z wpisem
- nie da sie zapisac `activity_scopes.tree_id` dla drzewa z innej dzialki niz `activities.plot_id`
- detail aktywnosci pokazuje uporzadkowane `activity_scopes` i `activity_materials`
- sezonowe `summary` dla aktywnosci nie liczy rekordow `planned`, `skipped` ani `cancelled`
- sezonowe `coverage` dla aktywnosci nie inferuje zakresow z samych danych drzew lub dzialek
- rekord zbioru poprawnie liczy `quantity_kg` dla `kg` i `t`
- raport sezonowy poprawnie sumuje rekordy per odmiana i per dzialka
- timeline harvestow poprawnie grupuje rekordy po `harvest_date`
- dashboard liczy aktywne dzialki i aktywne drzewa zgodnie z kontraktem
- dashboardowe feedy aktywnosci i zbiorow sa orchard-scoped, ograniczone do 5 wpisow i poprawnie posortowane
- shared `record not found` cards pokazuja opis problemu oraz CTA powrotu do bezpiecznej listy
- shared `prerequisite` cards pokazuja dalszy krok, gdy create/edit flow jest zablokowany przez brak dzialki
- redirect success feedback zachowuje biezaca liste albo detail jako cel powrotu i nie gubi filtrow

## 4. Rekomendowane narzedzia

Robocza rekomendacja dla stacku testowego:

- `Vitest` do testow jednostkowych
- `Testing Library` do testow komponentow i formularzy
- `Playwright` do testow end-to-end

Jesli zespol wybierze inny zestaw narzedzi, logika planu testow pozostaje taka sama.

## 5. Minimalny zakres testow przed pierwszym releasem

- testy jednostkowe dla krytycznych walidacji domenowych
- testy integracyjne dla CRUD glownych encji
- stabilny pakiet `Playwright` dla krytycznych flow:
  - rejestracja nowego usera, onboarding i utworzenie pierwszego orchard
  - przelaczanie `active_orchard` bez przecieku danych miedzy sadami
  - ograniczenia `worker` dla membership i eksportu konta
  - blokada outsidera na raportach i danych operacyjnych
  - flow `plot -> variety -> tree`
  - `pruning`, `spraying` multi-scope i `mowing`
  - dodanie `harvest_record` i weryfikacja `/reports/season-summary`
  - `batch create`, `bulk deactivate` i jawny `export forbidden` dla `worker`

## 5a. Aktualny workflow Playwright

Przed lokalnym odpaleniem browser E2E:

- `pnpm seed:baseline-reset`
- `pnpm qa:baseline-status`

Glowna komenda:

- `pnpm test:e2e`

Dodatkowe warianty:

- `pnpm test:e2e -- tests/e2e/<nazwa-pliku>.spec.ts`
- `pnpm test:e2e:headed`

## 6. Scenariusze testowe wedlug modulu

### Autoryzacja i orchard context

- poprawne logowanie
- bledne haslo
- reset hasla
- brak dostepu do widokow zalogowanych bez sesji
- brak membership kieruje do onboardingu
- poprawne ustawienie `active_orchard`

### Membership

- `owner` moze dodac istniejace konto jako `worker`
- aktywny duplikat membership jest blokowany, a `revoked` membership jest reaktywowany
- zmiana roli membership jest testowana dopiero po aktywacji tego flow w UI
- `worker` nie moze zarzadzac membership

### Listy operacyjne

- puste `plots` pokazuja CTA do utworzenia pierwszej dzialki
- przefiltrowane `plots` pokazuja CTA do czyszczenia filtrow
- analogiczny wzorzec dotyczy `varieties`, `trees`, `activities` i `harvests`

### Detail / edit route states

- brakujacy rekord na krytycznych trasach detail/edit nie konczy sie cichym redirectem
- user dostaje recovery card z jednoznacznym CTA do listy modulu
- blocked create/edit flows z powodu braku dzialki pokazuja wspolny prerequisite state
- udane create / edit / delete / archive / restore / status change pokazuja success banner po redirect na ekran docelowy

### Dashboard

- dashboard pokazuje aktywne dzialki i aktywne drzewa zgodnie z kontraktem
- dashboard pokazuje ostatnie aktywnosci z linkami do detail view
- dashboard pokazuje ostatnie zbiory z linkami do detail view
- pusty sad pokazuje onboardingowy empty state zamiast martwych list

### Dzialki

- utworzenie dzialki
- walidacja unikalnej nazwy
- edycja dzialki
- archiwizacja dzialki

### Odmiany

- utworzenie odmiany
- walidacja duplikatu `species + name`
- edycja odmiany
- wyszukiwanie odmiany

### Drzewa

- utworzenie drzewa z odmiana
- utworzenie drzewa bez odmiany
- walidacja `rows -> row_number + position_in_row`
- walidacja `mixed / irregular -> co najmniej jedna wskazowka lokalizacyjna`
- walidacja konfliktu lokalizacji
- edycja kondycji drzewa

### Aktywnosci

- utworzenie aktywnosci dla dzialki
- utworzenie aktywnosci dla konkretnego drzewa
- utworzenie aktywnosci `pruning` z `activity_subtype = winter_pruning`
- utworzenie aktywnosci `spraying` z kilkoma rekordami `activity_scopes`
- utworzenie aktywnosci `mowing` dla calej dzialki
- walidacja `location_range` w `activity_scopes`
- blokada `row` i `location_range` dla `activity_scopes` na dzialce `irregular`
- edycja statusu aktywnosci
- dodanie wielu materialow
- filtrowanie po typie i dacie
- wejscie z listy do detail view aktywnosci
- sezonowe `summary + coverage` na `/activities`

### Zbiory

- utworzenie rekordu zbioru dla odmiany
- utworzenie rekordu zbioru dla dzialki i zakresu lokalizacji
- utworzenie rekordu zbioru dla pojedynczego drzewa
- filtrowanie listy zbiorow po sezonie, dacie, dzialce i odmianie
- wejscie z listy do detail view wpisu zbioru
- edycja i usuniecie wpisu zbioru jako korekta pomylki
- walidacja `from_position <= to_position`
- blokada `location_range` dla harvestu na dzialce `irregular`
- poprawne przeliczenie `t -> kg`
- poprawne sumowanie po `season_year`
- poprawne pomijanie rekordow bez `variety_id` w raporcie per odmiana
- raport `/reports/season-summary` linkuje z powrotem do filtrowanej listy `harvests`
- raport `/reports/harvest-locations` rozdziela wpisy precyzyjnie zlokalizowane od wpisow bez konkretnego rzedu i pozycji

### Batch create - etap 0.2

- poprawne utworzenie zakresu drzew
- wykrycie konfliktu pozycji
- blokada flow dla dzialki `irregular`
- poprawne zapisanie `bulk_tree_import_batches`

### Uklad dzialki

- poprawne zapisanie `layout_type`
- poprawne zapisanie opcjonalnych schematow numeracji
- odrzucenie niedodatnich albo niecalkowitych wartosci `default_row_count` i `default_trees_per_row`

### Raport odmianowy - etap 0.2

- poprawne grupowanie po dzialce, sekcji i rzedzie
- pomijanie drzew nieaktywnych
- poprawne scalanie zakresow pozycji

### Export - etap 0.2

- `owner` moze wykonac `exportAccountData`
- `worker` nie moze wykonac eksportu
- eksport zawiera tylko orchard, w ktorych user ma aktywne membership `owner`
- eksport zachowuje `orchard_memberships`, `activity_scopes`, `activity_materials` i `harvest_records`
- integracyjnie pokryte jest, ze eksport pomija orchard, w ktorych user ma tylko aktywne membership `worker`

## 7. Dane testowe

Bazowy seed referencyjny dla lokalnego developmentu i testow znajduje sie w:

- `supabase/seeds/001_baseline_reference_seed.sql`

Seed jest przeznaczony do uruchamiania w lokalnym, uprzywilejowanym workflow bazy (`supabase db reset`, `psql` jako owner bazy lub rownowazny kontekst administracyjny), a nie przez zwyklego `authenticated` usera.

Nie traktuj Supabase Studio SQL Editor jako rownowaznego fallbacku dla tego seedu, bo aktualizacja `profiles.system_role` moze tam wpasc w trigger `guard_profile_self_service_update()`. Wspierana droga to `pnpm seed:baseline-sql` albo `pnpm seed:baseline-reset`.

Do przygotowania wymaganych kont `auth.users` przed odpaleniem seedu sluzy lokalna komenda:

```bash
pnpm seed:baseline-users
```

Do automatycznego uruchomienia referencyjnego SQL seedu sluzy:

```bash
pnpm seed:baseline-sql
```

Do pelnego odtworzenia baseline od zera sluzy:

```bash
pnpm seed:baseline-reset
```

Przed uruchomieniem seedu trzeba miec przygotowane konta `auth.users` dla:

- `admin@orchardlog.local`
- `jan.owner@orchardlog.local`
- `maria.owner@orchardlog.local`
- `pawel.worker@orchardlog.local`
- `ewa.worker@orchardlog.local`
- `outsider@orchardlog.local`

Seed pokrywa:

- 1 `super_admin`
- 2 orchards
- 2 `owners`
- 2 `workers`
- 1 outsider bez membership
- membership cases: `active`, `invited`, `revoked`
- 4 plots
- 5 varieties
- trees z lokalizacja i bez lokalizacji
- aktywnosci o roznych statusach i typach sezonowych
- `activity_scopes`
- `activity_materials`
- `harvest_records` w `kg` i `t`

Scenariusze szczegolnie dobrze pokryte przez seed:

- izolacja danych miedzy orchard
- `owner` i `worker` w tym samym orchard
- cross-membership user pomiedzy dwoma orchard
- outsider bez dostepu do danych domenowych
- `spraying` z materialami
- `winter_pruning` i `summer_pruning` w jednym sezonie
- rekordy zbioru dla `orchard`, `plot`, `variety`, `location_range` i `tree`

## 8. Checki w CI przed merge

Minimalny zestaw:

- `typecheck`
- `lint`
- `unit tests`
- `integration tests` dla krytycznych operacji

Aktualnie uruchamiane lokalnie:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`

## 9. Decyzje operacyjne do domkniecia podczas wdrozenia

Te decyzje nie blokuja startu implementacji, ale powinny zostac zamkniete przed stabilizacja CI i releasem:

- Czy do testow integracyjnych uruchamiamy lokalne srodowisko Supabase czy mockujemy czesc warstwy danych.
- Czy testy E2E beda od razu odpalane na kazdym PR, czy tylko na branchu release.
- Jaki bedzie finalny zestaw seed danych dla lokalnego developmentu i testow.

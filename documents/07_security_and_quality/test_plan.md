# OrchardLog / Sadownik+ - test plan

## Cel dokumentu

Ten dokument opisuje minimalny plan testow potrzebny do bezpiecznego wdrazania OrchardLog.
Plan jest dopasowany do aplikacji webowej w Next.js z backendem opartym o Supabase.

## Aktualny status wdrozenia testow

Na obecnym etapie projektu dziala pierwszy pakiet testow automatycznych oparty o `Vitest`.

Aktualnie wdrozone:

- `unit tests` dla logiki wyboru `active_orchard`
- `unit tests` dla walidacji `plots`, `varieties` i `trees`
- `unit tests` dla guardow `createTree` / `updateTree`
- `integration tests` dla `profile` bootstrap po utworzeniu usera w `auth.users`
- `integration tests` dla flow `create_orchard_with_owner_membership`
- `security / RLS tests` dla `owner`, `worker` i outsidera
- `integration tests` dla `plots`, `varieties` i `trees`
- `integration tests` dla lifecycle `plot -> variety -> tree` w Phase 2
- `security / RLS tests` dla `plots`, `varieties` i `trees`

Lokalizacja testow:

- `tests/unit`
- `tests/integration`
- `tests/security`

Uruchamianie lokalne:

```bash
supabase status
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
- mapowanie `activity_date -> season_year / season_phase`
- logike generowania `tree_code`, jesli bedzie automatyczna
- logike wykrywania konfliktu lokalizacji drzewa
- logike scalania pozycji do raportu zakresow odmiany
- logike przeliczania `quantity_value + quantity_unit -> quantity_kg`
- logike agregacji sezonowych zbiorow
- logike walidacji `activity_scopes`
- logike raportowania wykonanych zakresow prac sezonowych
- logike wyboru i zmiany `active_orchard`

### Testy integracyjne

Co testujemy:

- server actions i warstwe serwerowa
- zapis encji do bazy z poprawnymi walidacjami
- RLS i ograniczenia dostepu
- tworzenie orchard i membership
- tworzenie aktywnosci razem z materialami
- tworzenie aktywnosci razem z `activity_scopes`
- zapis `harvest_records` z poprawna normalizacja jednostek
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
- create / edit / search `varieties`
- create / edit / filter `trees`
- odrzucenie zapisu drzewa do `archived plot` w warstwie akcji serwerowej
- trigger spojnosc `tree -> plot -> variety -> orchard`
- konflikt aktywnej lokalizacji drzewa
- automatyczne `is_active = false` dla drzewa `removed`
- create / edit / filter / status / delete `activities`
- transakcyjny zapis `activities + activity_scopes + activity_materials`
- walidacja `pruning -> activity_subtype`
- walidacja `activity_scopes` i `materials` z JSON payloadow
- RLS dla `activities`, `activity_scopes` i `activity_materials`
- write permissions `worker` dla aktywnosci w swoim orchard
- RLS dla `plots`, `varieties` i `trees`
- write permissions `worker` dla danych operacyjnych
- brak delete permissions dla `worker` na `plots`

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
- nie da sie przypisac aktywnosci do drzewa z innej dzialki
- nie da sie zapisac konfliktowej lokalizacji aktywnego drzewa
- materialy aktywnosci zapisuja sie i odczytuja razem z wpisem
- zakresy aktywnosci zapisuja sie i odczytuja razem z wpisem
- nie da sie zapisac `activity_scopes.tree_id` dla drzewa z innej dzialki niz `activities.plot_id`
- rekord zbioru poprawnie liczy `quantity_kg` dla `kg` i `t`
- raport sezonowy poprawnie sumuje rekordy per odmiana i per dzialka

## 4. Rekomendowane narzedzia

Robocza rekomendacja dla stacku testowego:

- `Vitest` do testow jednostkowych
- `Testing Library` do testow komponentow i formularzy
- `Playwright` do testow end-to-end

Jesli zespol wybierze inny zestaw narzedzi, logika planu testow pozostaje taka sama.

## 5. Minimalny zakres testow przed pierwszym releasem

- testy jednostkowe dla krytycznych walidacji domenowych
- testy integracyjne dla CRUD glownych encji
- co najmniej jeden scenariusz E2E dla glownego flow:
  - logowanie
  - utworzenie orchard
  - dodanie dzialki
  - dodanie drzewa
  - dodanie aktywnosci

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
- walidacja konfliktu lokalizacji
- edycja kondycji drzewa

### Aktywnosci

- utworzenie aktywnosci dla dzialki
- utworzenie aktywnosci dla konkretnego drzewa
- utworzenie aktywnosci `pruning` z `activity_subtype = winter_pruning`
- utworzenie aktywnosci `spraying` z kilkoma rekordami `activity_scopes`
- utworzenie aktywnosci `mowing` dla calej dzialki
- walidacja `location_range` w `activity_scopes`
- edycja statusu aktywnosci
- dodanie wielu materialow
- filtrowanie po typie i dacie

### Zbiory

- utworzenie rekordu zbioru dla odmiany
- utworzenie rekordu zbioru dla dzialki i zakresu lokalizacji
- walidacja `from_position <= to_position`
- poprawne przeliczenie `t -> kg`
- poprawne sumowanie po `season_year`
- poprawne pomijanie rekordow bez `variety_id` w raporcie per odmiana

### Batch create - etap 0.2

- poprawne utworzenie zakresu drzew
- wykrycie konfliktu pozycji
- poprawne zapisanie `bulk_tree_import_batches`

### Raport odmianowy - etap 0.2

- poprawne grupowanie po dzialce, sekcji i rzedzie
- pomijanie drzew nieaktywnych
- poprawne scalanie zakresow pozycji

### Export - etap 0.2

- `owner` moze wykonac `exportAccountData`
- `worker` nie moze wykonac eksportu
- eksport zawiera tylko orchard, w ktorych user ma aktywne membership `owner`
- eksport zachowuje `orchard_memberships`, `activity_scopes`, `activity_materials` i `harvest_records`

## 7. Dane testowe

Bazowy seed referencyjny dla lokalnego developmentu i testow znajduje sie w:

- `supabase/seeds/001_baseline_reference_seed.sql`

Seed jest przeznaczony do uruchamiania w lokalnym, uprzywilejowanym workflow bazy (`supabase db reset`, `psql` jako owner bazy lub rownowazny kontekst administracyjny), a nie przez zwyklego `authenticated` usera.

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

Po dodaniu stabilnych testow E2E:

- smoke E2E na glowne flow

## 9. Decyzje operacyjne do domkniecia podczas wdrozenia

Te decyzje nie blokuja startu implementacji, ale powinny zostac zamkniete przed stabilizacja CI i releasem:

- Czy do testow integracyjnych uruchamiamy lokalne srodowisko Supabase czy mockujemy czesc warstwy danych.
- Czy testy E2E beda od razu odpalane na kazdym PR, czy tylko na branchu release.
- Jaki bedzie finalny zestaw seed danych dla lokalnego developmentu i testow.

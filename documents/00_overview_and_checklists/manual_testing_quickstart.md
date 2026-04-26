# OrchardLog / Sadownik+ - manual testing quickstart

## Cel

Ten plik ma dawac testerowi i developerowi jeden praktyczny punkt wejscia do recznych testow.

Ma odpowiadac na cztery pytania:

- co jest aktualnie wdrozone i warto testowac
- kiedy robic szybki smoke test, a kiedy pelniejszy seeded QA pass
- jak przygotowac lokalne srodowisko
- jak korzystac z referencyjnych danych seed

## Dwa tryby pracy

### 1. Szybki smoke test bez seedu

Uzyj tego trybu, gdy:

- sprawdzasz jedna konkretna zmiane UI lub formularza
- nie potrzebujesz gotowych danych referencyjnych
- wystarczy Ci jedno swieze konto i jeden orchard

To jest najszybsza sciezka po zmianach w jednym module.

### 2. Seeded QA baseline

Uzyj tego trybu, gdy:

- chcesz sprawdzic role `owner` / `worker` / outsider
- testujesz filtry, detail views, summary albo cross-membership
- weryfikujesz RLS lub zachowanie po `supabase db reset`
- chcesz pracowac na stabilnym zestawie danych referencyjnych

To jest glowny tryb do pelniejszej recznej weryfikacji przed merge albo przed releasem.

## Co jest aktualnie wdrozone i powinno byc testowane

Na obecnym etapie mozna realnie testowac:

- auth:
  - `register`
  - `login`
  - `reset-password`
- onboarding i orchard context:
  - `create orchard`
  - `active_orchard`
  - orchard switcher
- `plots`:
  - list
  - create
  - edit
  - archive / restore
- `varieties`:
  - list
  - create
  - edit
  - search
- `trees`:
  - list
  - create
  - edit
  - filters
- `settings`:
  - `profile`
  - `orchard settings`
  - `members`
- `activities`:
  - list
  - filters
  - create
  - edit
  - detail
  - change status
  - delete
  - seasonal `summary + coverage` na `/activities`
- `harvests`:
  - list
  - filters
  - create
  - edit
  - detail
  - delete
  - optional link do aktywnosci typu `harvest`
  - `Season Summary` i timeline na `/reports/season-summary`

## Swiadomie jeszcze nie traktowac jako bug

Te obszary sa nadal odlozone albo nie sa jeszcze domkniete:

- detail pages dla `plots`, `varieties` i `trees`
- browser E2E
- `batch create` drzew
- `bulk deactivate`
- osobny global admin shell dla `super_admin`

Jesli cos z tej listy nie dziala albo nie istnieje w UI, to na ten moment nie jest to regresja.

## Minimalne przygotowanie lokalnego srodowiska

1. Zainstaluj zaleznosci:

```bash
pnpm install
```

2. Uruchom lokalny stack:

```bash
supabase start
pnpm dev
```

3. Otworz:

- aplikacja: `http://localhost:3000`
- Supabase Studio: `http://127.0.0.1:54323`

4. Gdy chcesz sprawdzic stan lokalnego stacku:

```bash
supabase status
docker ps
```

## Workflow A - szybki smoke test bez seedu

To jest rekomendowana sciezka po mniejszej zmianie w jednym module.

1. Zresetuj lokalna baze:

```bash
supabase db reset
```

2. Uruchom aplikacje:

```bash
pnpm dev
```

3. Wejdz na `http://localhost:3000/register` i utworz nowe konto testowe.

4. Po zalogowaniu utworz pierwszy orchard.

5. Przetestuj tylko ten fragment aplikacji, ktory byl ruszany.

Przyklady:

- po zmianach w `plots`: create -> edit -> archive / restore
- po zmianach w `varieties`: create -> edit -> search
- po zmianach w `trees`: create -> edit -> filter
- po zmianach w `activities`: create -> detail -> status -> edit -> delete
- po zmianach w `harvests`: create -> detail -> edit -> delete

## Workflow B - seeded QA baseline

To jest rekomendowana sciezka przed merge, po zmianach w RLS albo gdy chcesz testowac na realistycznych danych.

### Krok 1. Postaw lokalne srodowisko

```bash
supabase start
pnpm dev
```

### Krok 2. Zresetuj baze

```bash
supabase db reset
```

W tym repo na czystym lokalnym stacku seed moze zatrzymac sie na prerequisite check, jesli nie istnieja jeszcze wymagane konta w `auth.users`.

To nie oznacza, ze migracje sa zepsute.
To znaczy tylko, ze trzeba najpierw utworzyc lokalne konta seedowe, a potem odpalic sam seed.

### Krok 3. Zbootstrapuj wymagane konta `auth.users`

Rekomendowana droga:

```bash
pnpm seed:baseline-users
```

Skrypt:

- tworzy brakujace konta
- aktualizuje istniejace konta do wspolnego, znanego hasla lokalnego
- potwierdza email lokalnie
- nie odpala jeszcze samego SQL seedu

Domyslne haslo lokalne:

- `Orchard123!`

Jesli chcesz je nadpisac tylko na jedno uruchomienie:

```bash
BASELINE_SEED_USER_PASSWORD=TwojeHaslo123! pnpm seed:baseline-users
```

Fallback reczny:

- wejdz na `http://localhost:3000/register`
- zaloz po kolei wszystkie konta seedowe
- po rejestracji kolejnego konta po prostu sie wyloguj i zarejestruj nastepne

Wymagane emaile:

- `admin@orchardlog.local`
- `jan.owner@orchardlog.local`
- `maria.owner@orchardlog.local`
- `pawel.worker@orchardlog.local`
- `ewa.worker@orchardlog.local`
- `outsider@orchardlog.local`

Wazne:

- po `supabase db reset` te konta trzeba przygotowac od nowa przed ponownym uruchomieniem seedu
- trigger profili utworzy bazowe `profiles`, a seed uzupelni je docelowymi danymi referencyjnymi

### Krok 4. Uruchom seed referencyjny

Plik seedu:

- `supabase/seeds/001_baseline_reference_seed.sql`

Najprostsza droga:

1. Otworz Supabase Studio pod `http://127.0.0.1:54323`
2. Wejdz do SQL Editor
3. Wklej zawartosc `supabase/seeds/001_baseline_reference_seed.sql`
4. Uruchom caly skrypt

Alternatywnie mozesz odpalic seed przez `psql` jako owner lokalnej bazy.

### Krok 5. Potwierdz gotowosc baseline do manual QA

Po uruchomieniu SQL seedu sprawdz, czy caly referencyjny baseline jest kompletny:

```bash
pnpm qa:baseline-status
```

Ta komenda:

- weryfikuje `auth.users`, profile, orchardy i membership matrix
- sprawdza referencyjne liczby rekordow w `plots`, `varieties`, `trees`, `activities`, `activity_scopes`, `activity_materials` i `harvest_records`
- potwierdza, ze rekord harvest zapisany w tonach ma poprawne `quantity_kg`
- podaje kolejne kroki, jesli baseline nie jest jeszcze gotowy

Jesli wynik to `READY`, mozna przejsc do smoke passa.
Jesli wynik to `NOT READY`, popraw baseline zgodnie z komunikatem i uruchom komende ponownie.

Wazny niuans:

- jesli w raporcie widzisz liczby wieksze od referencyjnych, lokalna baza jest najpewniej zabrudzona po testach albo recznych eksperymentach
- w takim przypadku nie wystarczy ponownie odpalic samego SQL seedu
- trzeba wrocic do pelnej sekwencji: `supabase db reset -> pnpm seed:baseline-users -> 001_baseline_reference_seed.sql -> pnpm qa:baseline-status`

### Krok 6. Zaloguj sie na gotowe konta i testuj role

Po uruchomieniu seedu dostajesz stabilny zestaw danych referencyjnych.

Najwazniejsze konta:

- `jan.owner@orchardlog.local`
  - `owner` w `Sad Glowny`
  - `worker` w `Sad Poludniowy`
  - najlepsze konto do sprawdzania orchard switchera i owner-only settings
- `maria.owner@orchardlog.local`
  - `owner` w `Sad Poludniowy`
  - dobre konto do izolacji drugiego orchard
- `pawel.worker@orchardlog.local`
  - `worker` w `Sad Glowny`
  - `invited` w `Sad Poludniowy`
  - dobre konto do sprawdzania ograniczen worker / invited
- `ewa.worker@orchardlog.local`
  - `revoked` w `Sad Glowny`
  - `worker` w `Sad Poludniowy`
  - dobre konto do sprawdzania revoked vs active membership
- `outsider@orchardlog.local`
  - brak membership
  - dobre konto do onboardingu i braku dostepu do danych orchard
- `admin@orchardlog.local`
  - `super_admin`
  - przydatne glownie do technicznych spot-checkow; nie ma jeszcze osobnego admin shell

## Co zawiera aktualny seed

Seed pokrywa:

- 2 orchardy:
  - `Sad Glowny`
  - `Sad Poludniowy`
- membership cases:
  - `active`
  - `invited`
  - `revoked`
- 4 plots
- 5 varieties
- trees z lokalizacja i bez lokalizacji
- aktywnosci:
  - `winter_pruning`
  - `summer_pruning`
  - `mowing`
  - `spraying`
  - `harvest`
  - `inspection`
- `activity_scopes`
- `activity_materials`
- `harvest_records` w `kg` i `t`

Seed szczegolnie dobrze nadaje sie do testowania:

- izolacji danych miedzy orchard
- owner-only settings
- worker permissions
- outsider / onboarding state
- `spraying` z materialami
- `activities` z sezonowym `summary + coverage`
- rekordow zbioru dla zakresow:
  - `orchard`
  - `plot`
  - `variety`
  - `location_range`
  - `tree`

## Co testowac kiedy

### Po zmianach w auth / onboarding / orchard context

Sprawdz:

- `register`
- `login`
- `logout`
- `create orchard`
- auto wybor albo zmiane `active_orchard`
- orchard switcher
- owner-only wejscie do `/settings/orchard`
- owner-only wejscie do `/settings/members`

### Po zmianach w `plots`, `varieties` albo `trees`

Sprawdz:

- create
- edit
- filtry i search tam, gdzie istnieja
- czy `worker` nadal moze robic operacje operacyjne
- czy outsider nadal nie widzi danych orchard

### Po zmianach w `activities`

Sprawdz:

- create wpisu
- edit wpisu
- detail page
- status change
- delete
- filtry listy
- `summary + coverage` na `/activities`
- dla `spraying`:
  - materials
- dla `pruning`, `mowing`, `spraying`:
  - scopes

### Po zmianach w `harvests`

Sprawdz:

- create wpisu
- edit wpisu
- detail page
- delete
- filtry listy po sezonie, dacie, dzialce i odmianie
- powiazanie z aktywnoscia typu `harvest`, jesli bylo ruszane
- `quantity_kg` oraz zachowanie jednostek `kg` / `t`
- `/reports/season-summary` z filtrem po sezonie, dzialce i odmianie
- linki z raportu z powrotem do filtrowanej listy `harvests`

### Po zmianach w migracjach, RLS albo politykach dostepu

Sprawdz:

- `supabase db reset`
- odtworzenie kont seedowych
- ponowne uruchomienie seedu
- `owner` ma dostep do swojego orchard
- `worker` ma dostep operacyjny, ale nie owner-only settings
- outsider nie dostaje dostepu do danych domenowych

### Przed merge albo przed releasem

Minimalny pass:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- szybki manual smoke jako `owner`
- szybki manual smoke jako `worker`
- szybki check outsidera albo onboardingu

## Minimalny seeded smoke pass przed merge

Jesli chcesz zrobic bardzo krotki, ale sensowny pass:

1. Uruchom `pnpm qa:baseline-status` i upewnij sie, ze wynik to `READY`.
2. Zaloguj sie jako `jan.owner@orchardlog.local`.
3. Sprawdz orchard switcher, `/dashboard`, `/settings/orchard`, `/settings/members`, a potem glowny flow w module, ktory byl ruszany.
4. Zaloguj sie jako `pawel.worker@orchardlog.local` albo `ewa.worker@orchardlog.local`.
5. Potwierdz, ze worker nadal moze pracowac operacyjnie, ale nie ma dostepu do owner-only settings.
6. Zaloguj sie jako `outsider@orchardlog.local`.
7. Potwierdz brak danych orchard albo poprawny onboarding state.

## Przydatne pliki obok tego dokumentu

- `README.md`
- `documents/00_overview_and_checklists/local_dev_tools_quickstart.md`
- `documents/00_overview_and_checklists/session_handoff.md`
- `documents/04_ux_and_screen_design/screens_and_views.md`
- `documents/04_ux_and_screen_design/navigation_map.md`
- `documents/07_security_and_quality/test_plan.md`
- `supabase/seeds/001_baseline_reference_seed.sql`

## Najwazniejsze ostrzezenie operacyjne

W tym repo `supabase db reset` i seed referencyjny nie sa jeszcze domkniete jako jedno-bezklikowe doswiadczenie dla testera.

Praktycznie oznacza to:

- najpierw stawiasz schema przez `supabase db reset`
- potem bootstrapujesz wymagane konta `auth.users` przez `pnpm seed:baseline-users`
- dopiero potem uruchamiasz `001_baseline_reference_seed.sql`
- na koncu sprawdzasz gotowosc baseline przez `pnpm qa:baseline-status`

Najbardziej uciazliwy fragment, czyli tworzenie seedowych kont i walidacja gotowosci baseline, jest juz zautomatyzowany.
Jesli kiedys domkniemy tez automatyczne odpalanie samego SQL seedu, ten plik trzeba bedzie jeszcze uproscic.

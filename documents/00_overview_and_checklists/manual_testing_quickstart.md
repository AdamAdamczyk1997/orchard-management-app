# OrchardLog / Sadownik+ - manual testing quickstart

## Cel

Ten plik ma dawac testerowi i developerowi jeden praktyczny punkt wejscia do recznych testow.

Ma odpowiadac na cztery pytania:

- co jest aktualnie wdrozone i warto testowac
- kiedy robic szybki smoke test, a kiedy pelniejszy seeded QA pass
- jak przygotowac lokalne srodowisko
- jak korzystac z referencyjnych danych seed

## Trzy tryby pracy

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

### 3. Browser automation na baseline

Uzyj tego trybu, gdy:

- chcesz sprawdzic caly krytyczny flow bez recznego klikania
- ruszales auth, orchard context, `activities`, `harvests`, batch flow albo export
- chcesz potwierdzic brak przeciekow miedzy orchard i ograniczenia `worker` / outsidera

Rekomendowany workflow:

1. Uruchom `pnpm seed:baseline-reset`.
2. Uruchom `pnpm qa:baseline-status` i upewnij sie, ze wynik to `READY`.
3. Uruchom `pnpm test:e2e`.
4. Jesli po automatyce chcesz od razu wejsc w reczny smoke, wykonaj ponownie `pnpm seed:baseline-reset` i jeszcze raz sprawdz `pnpm qa:baseline-status`, bo suite'y dopisuja dane scenariuszy do baseline.

Aktualny pakiet `Playwright` pokrywa onboarding, orchard switcher, ograniczenia `worker`, outsider onboarding, glowne flow `plot -> variety -> tree`, aktywnosci sezonowe, raport zbiorow oraz batch create / bulk deactivate.

Referencyjny baseline seed zawiera tez przykladowe dzialki z ukladami:

- `rows`
- `mixed`
- `irregular`

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
  - plot card stats: active tree count, removed/inactive tree count i dominant varieties z aktywnych drzew
  - create
  - edit
  - archive / restore
  - ustawienia ukladu dzialki: `layout_type`, numeracja, punkt odniesienia i notatki
  - visual detail `/plots/[plotId]` z grid/fallback, filters, Browse panel, Select mode i prefill do `/activities/new`
- `varieties`:
  - list
  - create
  - edit
  - search
  - raport lokalizacji odmiany na `/reports/variety-locations`
- `trees`:
  - list
  - create
  - edit
  - filters
  - plot-aware guidance i walidacje zalezne od `layout_type`
  - batch create na `/trees/batch/new`
  - bulk deactivate na `/trees/batch/deactivate`
- `settings`:
  - `profile`
  - export konta dla usera z aktywnym membership `owner`
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
  - plot-aware guidance i ograniczenia zakresow dla dzialek `irregular`
  - seasonal `summary + coverage` na `/activities`
- `harvests`:
  - list
  - filters
  - create
  - edit
  - detail
  - delete
  - plot-aware guidance i blokada `location_range` dla dzialek `irregular`
  - optional link do aktywnosci typu `harvest`
  - `Season Summary` i timeline na `/reports/season-summary`
  - raport lokalizacji na `/reports/harvest-locations`

## Swiadomie jeszcze nie traktowac jako bug

Te obszary sa nadal odlozone albo nie sa jeszcze domkniete:

- przyszle harvest entry pointy z mapy sa nadal odlozone; `/plots` plot card stats, `/plots/[plotId]`, Select mode, Add Activity prefill, bulk deactivate prefill i Plant New / batch create prefill sa juz wdrozone
- detail pages dla `varieties` i `trees`
- delete UI dla `varieties` i `trees`
- zmiana roli membership orchard
- restore workflow dla account export
- tryby importu poza `tree_inventory_v1` MVP: stable 5k, multi-plot XLSX, full
  snapshot, `update_existing`, `deactivate_and_create`
- storage / attachments
- szerszy planning block wykraczajacy poza prosty feed `upcoming_activities`
- osobny globalny panel admina poza obecnym account shell dla `super_admin`

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
- po zmianach w ukladzie dzialki: create / edit -> sprawdzenie zapisu `layout_type`, numeracji i planowanej siatki na liscie
- po zmianach w `varieties`: create -> edit -> search
- po zmianach w `trees`: create -> edit -> filter
  - sprawdzenie `rows -> wymagane row_number + position_in_row`
  - sprawdzenie `mixed / irregular -> wymagana co najmniej jedna wskazowka lokalizacyjna`
  - albo `batch create -> conflict preview -> successful create`
  - albo `bulk deactivate -> preview -> confirm`
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

Jesli chcesz przejsc cala sekwencje jednym ruchem, uzyj:

```bash
pnpm seed:baseline-reset
```

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
- `empty.owner@orchardlog.local`

Wazne:

- po `supabase db reset` te konta trzeba przygotowac od nowa przed ponownym uruchomieniem seedu
- trigger profili utworzy bazowe `profiles`, a seed uzupelni je docelowymi danymi referencyjnymi

### Krok 4. Uruchom seed referencyjny

Plik seedu:

- `supabase/seeds/001_baseline_reference_seed.sql`

Najprostsza droga:

```bash
pnpm seed:baseline-sql
```

Wazne:

- nie uruchamiaj tego seedu przez Supabase Studio SQL Editor jako standardowego fallbacku
- seed aktualizuje `public.profiles`, w tym `system_role`
- SQL Editor potrafi uruchomic skrypt w kontekście, ktory wpada w trigger `guard_profile_self_service_update()`
- objawia sie to bledem `Profile system_role cannot be changed by the current user`
- rekomendowana i wspierana droga to `pnpm seed:baseline-sql` albo pelne `pnpm seed:baseline-reset`
- jesli taki blad pojawil sie po nieudanej probie recznej, po prostu wroc do wspieranej sciezki i uruchom `pnpm seed:baseline-sql`; seed dziala transakcyjnie i nie powinien zostawic czesciowo zaladowanych danych

### Krok 5. Potwierdz gotowosc baseline do manual QA

Po uruchomieniu SQL seedu sprawdz, czy caly referencyjny baseline jest kompletny:

```bash
pnpm qa:baseline-status
```

Ta komenda:

- weryfikuje `auth.users`, profile, orchardy i membership matrix
- sprawdza referencyjne liczby rekordow w `plots`, `varieties`, `trees`, `activities`, `activity_scopes`, `activity_materials` i `harvest_records`
- ignoruje lokalny performance orchard `PERF`, jesli zostal dodany przez `pnpm seed:large-plot-fixture`
- potwierdza, ze rekord harvest zapisany w tonach ma poprawne `quantity_kg`
- podaje kolejne kroki, jesli baseline nie jest jeszcze gotowy

Jesli wynik to `READY`, mozna przejsc do smoke passa.
Jesli wynik to `NOT READY`, popraw baseline zgodnie z komunikatem i uruchom komende ponownie.

Wazny niuans:

- jesli w raporcie widzisz liczby wieksze od referencyjnych, lokalna baza jest najpewniej zabrudzona po testach albo recznych eksperymentach
- w takim przypadku nie wystarczy ponownie odpalic samego SQL seedu
- trzeba wrocic do pelnej sekwencji: `pnpm seed:baseline-reset -> pnpm qa:baseline-status`

### Opcjonalnie: fixture do pomiarow large plots

Po czystym baseline mozna dodac lokalny orchard performance:

```bash
pnpm seed:large-plot-fixture
pnpm qa:baseline-status
```

Fixture tworzy orchard `PERF` z:

- `PERF-500` - rows plot z 500 drzewami
- `PERF-1500` - rows plot z 1 500 drzewami
- `PERF-MIX` - mixed plot z czesciowo pustymi pozycjami
- `PERF-LONG-ROW` - rows plot z jednym rzedem 350 drzew do fallbacku focused row
- 183 rekordy harvest dla sezonu 2026, glownie na `PERF-1500`

To nie jest canonical baseline. Sluzy do pomiarow `/trees`, `/activities/new`,
`/harvests/new`, `/harvests`, `/plots/[plotId]` i raportow lokalizacyjnych.
`qa:baseline-status` ignoruje `PERF`, a cleanup wykonasz przez:

Aktualnie `/plots/92000000-0000-4000-8000-000000000002` (`PERF-1500`) powinien
pokazac `PlotTreeScaleOverview` z podsumowaniem sekcji i rzedow, bez pelnej mapy
markerow. Focused row dla tej samej dzialki jest dostepny pod
`/plots/92000000-0000-4000-8000-000000000002?section=A&row=1` i powinien
pokazac `PlotVisualFocusedRow` z markerami tylko jednego rzedu. Male baseline PVO
nadal powinno renderowac klasyczny `PlotVisualOverview`.
`/plots/92000000-0000-4000-8000-000000000004?section=A&row=1`
(`PERF-LONG-ROW`) powinien pokazac fallback tabelaryczny i
`plot-visual-row-range-actions`, bez markerow.
`/reports/harvest-locations?season_year=2026&plot_id=92000000-0000-4000-8000-000000000002`
powinien pokazac grouped harvest location report z danymi `PERF-1500`.
`/harvests?season_year=2026&plot_id=92000000-0000-4000-8000-000000000002&page_size=50`
powinien pokazac paginated list z zakresem `1-50 z 182` i linkiem do kolejnej
strony.

```bash
pnpm seed:baseline-reset
```

### Krok 6. Zaloguj sie na gotowe konta i testuj role

Po uruchomieniu seedu dostajesz stabilny zestaw danych referencyjnych.

Traktuj baseline seed jako w wiekszosci immutable reference data. Mutation-heavy E2E,
czyli create / edit / delete / invite / remove / batch create / bulk deactivate,
powinny tworzyc per-test unique records zamiast zmieniac kanoniczne rekordy baseline.

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
- `empty.owner@orchardlog.local`
  - `owner` w `Sad Pusty`
  - konto do empty-state tests; `Sad Pusty` nie ma danych domenowych
- `admin@orchardlog.local`
  - `super_admin`
  - przydatne glownie do technicznych spot-checkow; nie ma jeszcze osobnego admin shell

Szybki dodatkowy check po zalogowaniu jako `jan.owner@orchardlog.local`:

- wejdz w `/settings/profile`
- uruchom `Pobierz eksport konta`
- potwierdz, ze plik JSON pobiera sie poprawnie i obejmuje tylko owned orchard

## Co zawiera aktualny seed

Seed pokrywa:

- 3 orchardy:
  - `Sad Glowny`
  - `Sad Poludniowy`
  - `Sad Pusty` jako true empty-state orchard
- membership cases:
  - `active`
  - `invited`
  - `revoked`
- 5 plots, w tym read-only PVO gap fixture `Kwatera Luki PVO`
- 12 varieties
- 45 trees z lokalizacja i bez lokalizacji
- aktywnosci:
  - `winter_pruning`
  - `summer_pruning`
  - `mowing`
  - `spraying`
  - `harvest`
  - `inspection`
  - lifecycle statuses: `planned`, `done`, `skipped`, `cancelled`
- `activity_scopes`
- `activity_materials`
- `harvest_records` w `kg` i `t`, z danymi dla sezonow 2025 i 2026

Seed szczegolnie dobrze nadaje sie do testowania:

- `MAIN` / `Sad Glowny` jako full demo/reference orchard
- `EMPTY` / `Sad Pusty` jako pusty orchard do empty-state tests
- izolacji danych miedzy orchard
- owner-only settings
- worker permissions
- outsider / onboarding state
- plot-aware flow `rows / mixed / irregular` w module `trees`
- `spraying` z materialami
- `activities` z sezonowym `summary + coverage`
- raportu lokalizacji odmiany dla drzew z pelna i niepelna lokalizacja
- visual plot detail dla `rows`, `mixed` i `irregular`
- read-only PVO gap plot `Kwatera Luki PVO`: row 1 positions 1 i 3 sa zajete, position 2 jest pusta
- selection z mapy dzialki do `/activities/new` z single tree i range prefill
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
- dla `trees`:
  - `rows` wymaga `row_number + position_in_row`
  - `mixed` i `irregular` wymagaja przynajmniej jednej wskazowki lokalizacyjnej
- `batch create`, jesli byl ruszany
- `bulk deactivate`, jesli byl ruszany
- dla flow batchowych:
  - dzialka `rows` albo `mixed` pozwala przejsc do preview
  - dzialka `irregular` pokazuje stan `unsupported`
- `/reports/variety-locations`, jesli byly ruszane lokalizacje drzew albo biblioteka odmian
- czy `worker` nadal moze robic operacje operacyjne
- czy outsider nadal nie widzi danych orchard

### Po zmianach w `Plot Visual Operations`

Sprawdz:

- `/plots` pokazuje na kartach `name`, `code`, `status`, `layout_type`, active tree count, removed/inactive tree count i dominant varieties
- `/plots -> Otworz dzialke` dla dzialek `rows`, `mixed` i `irregular`
- Browse mode:
  - klikniecie active tree otwiera panel metadata
  - link `Edytuj drzewo` prowadzi do `/trees/[treeId]/edit`
  - active tree ma link `Dodaj aktywnosc` do `/activities/new` z uzupelnionym `plot_id`, `tree_id` i scope `tree`
  - removed / inactive tree ma disabled `Dodaj aktywnosc`
- Select mode:
  - single active tree selection pokazuje selected count i prowadzi do `/activities/new` z tree prefill
  - zakres start/end w tym samym rzedzie kompresuje sie do jednego `location_range`
  - empty, invalid albo over-limit selection blokuje `Dodaj aktywnosc`
  - jeden `location_range` pokazuje `Wycofaj drzewa` i prowadzi do `/trees/batch/deactivate` z uzupelnionym `plot_id`, `row_number`, `from_position`, `to_position`
  - multi-range, tree-scope i `irregular` blokuje `Wycofaj drzewa`
  - klikniecie jednego albo dwoch pustych inferowanych miejsc w tym samym rzedzie pokazuje `Dosadz drzewa`
  - `Dosadz drzewa` prowadzi do `/trees/batch/new` z uzupelnionym `plot_id`, opcjonalnym `section_name`, `row_number`, `from_position`, `to_position`
  - przy aktywnych filtrach `Dosadz drzewa` jest zablokowane, zeby ukryte drzewa nie tworzyly falszywych pustych miejsc
- na `/activities/new` po prefill:
  - widoczny jest komunikat `Zakres zostal uzupelniony`
  - formularz nadal zapisuje przez zwykly `ActivityForm`
  - query nie zawiera zaufanego `orchard_id`
- na `/trees/batch/deactivate` po prefill:
  - widoczny jest komunikat `Zakres zostal uzupelniony`
  - preview nadal jest wymagany przed confirm
- na `/trees/batch/new` po prefill:
  - widoczny jest komunikat `Zakres zostal uzupelniony`
  - preview nadal jest wymagany przed confirm
  - najpierw generujesz preview
  - confirmation jest osobnym kliknieciem i nie wykonuje physical delete
  - query nie zawiera zaufanego `orchard_id`

### Po zmianach w `activities`

Sprawdz:

- create wpisu
- edit wpisu
- detail page
- status change
- delete
- filtry listy
- dla dzialki `irregular`:
  - brak mozliwosci zapisania scope `row`
  - brak mozliwosci zapisania scope `location_range`
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
- dla dzialki `irregular`:
  - brak mozliwosci zapisania `scope_level = location_range`
- powiazanie z aktywnoscia typu `harvest`, jesli bylo ruszane
- `quantity_kg` oraz zachowanie jednostek `kg` / `t`
- `/reports/season-summary` z filtrem po sezonie, dzialce i odmianie
- `/reports/harvest-locations` z filtrem po sezonie, dzialce i odmianie
- linki z raportu z powrotem do filtrowanej listy `harvests`
- rozdzielenie wpisow z precyzyjna lokalizacja od wpisow tylko na poziomie sadu lub dzialki

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
- `pnpm test:e2e`
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
- `documents/00_overview_and_checklists/project_context_for_new_chat.md`
- `documents/04_ux_and_screen_design/screens_and_views.md`
- `documents/04_ux_and_screen_design/navigation_map.md`
- `documents/07_security_and_quality/test_plan.md`
- `supabase/seeds/001_baseline_reference_seed.sql`

## Najwazniejsze ostrzezenie operacyjne

W tym repo referencyjny baseline jest juz domkniety jako lokalny workflow bez recznego klikania w SQL Editor.

Praktycznie masz teraz dwie drogi:

- pelny rebuild baseline: `pnpm seed:baseline-reset`
- wariant rozdzielony: `pnpm seed:baseline-users -> pnpm seed:baseline-sql -> pnpm qa:baseline-status`

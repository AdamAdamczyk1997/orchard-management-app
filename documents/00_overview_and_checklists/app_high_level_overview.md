# OrchardLog / Sadownik+ - high-level app overview

## Cel

Ten plik jest szybkim, wysokopoziomowym wprowadzeniem do projektu.
Ma pomagac nowemu AI albo nowemu wspolpracownikowi zrozumiec:

- czym jest aplikacja,
- po co istnieje,
- co jest juz wdrozone,
- co uzytkownik moze realnie zrobic dzisiaj.

To nie jest glowny source of truth dla SQL, RLS ani kontraktow.
Po ogolnym zrozumieniu projektu przejdz do `documents/README.md`,
`documentation_map.md` i `session_handoff.md`.

## Czym jest ta aplikacja

`OrchardLog / Sadownik+` to aplikacja do prowadzenia operacyjnego dziennika sadu.
Pomaga wlascicielowi albo pracownikowi organizowac dane terenowe, zapisywac wykonane prace,
ewidencjonowac zbiory i korzystac z raportow opartych o realne dane z sadu.

Model produktu jest `orchard`-scoped:

- najwazniejsza jednostka pracy to `orchard`,
- user moze miec dostep do jednego albo wielu orchard,
- wszystkie glowne dane operacyjne sa przypisane do aktywnego orchard.

## Po co to jest

Aplikacja rozwiazuje kilka praktycznych problemow:

- porzadkuje dane, ktore w realnym gospodarstwie czesto sa rozproszone miedzy notatkami, Excelem i pamiecia ludzi,
- laczy strukture sadu z codzienna praca operacyjna,
- pozwala raportowac zbiory i aktywnosci na podstawie spojnego modelu danych,
- daje kontrolowany dostep ownerom, workerom i administratorowi.

W skrocie:
to ma byc narzedzie do codziennej pracy i do pozniejszego odczytu historii operacyjnej sadu.

## Jak dziala aplikacja dzisiaj

Typowy przebieg pracy wyglada tak:

1. user loguje sie i przechodzi onboarding,
2. tworzy orchard albo wybiera aktywny orchard, do ktorego ma membership,
3. pracuje w chronionym app shellu w kontekscie aktywnego orchard,
4. zarzadza struktura sadu, aktywnosciami, zbiorami, raportami i ustawieniami.

Aktywny kontekst orchard jest rozwiazywany po stronie serwera i trzymany w `httpOnly` cookie `ol_active_orchard`.

## Co mozemy robic juz teraz

### 1. Konto i dostep

- logowanie i onboarding sa wdrozone,
- user moze utworzyc pierwszy orchard,
- owner moze zapraszac istniejace konto do orchard jako `worker`,
- owner moze odebrac membership,
- `super_admin` ma osobny account shell, ktory nie wymaga aktywnego orchard.

### 2. Struktura sadu

- mozemy tworzyc, edytowac i przegladac `plots`,
- mozemy tworzyc, edytowac, wyszukiwac i przegladac `varieties`,
- mozemy tworzyc, edytowac, filtrowac i przegladac `trees`,
- `plots` maja ustawienia ukladu, np. `layout_type`, numeracje rzedow i drzew oraz wskazowki terenowe,
- `trees` korzystaja z ustawien wybranej dzialki i pilnuja zgodnosci lokalizacji.

### 3. Aktywnosci sezonowe

- mozemy tworzyc, edytowac, usuwac i przegladac `activities`,
- aktywnosci wspieraja statusy, filtry i detail page,
- aktywnosc moze miec zapisany zakres pracy przez `activity_scopes`,
- aktywnosc moze miec zapisane materialy przez `activity_materials`,
- dashboard pokazuje ostatnie aktywnosci i blok `upcoming_activities` dla wpisow `planned`.

### 4. Zbiory

- mozemy tworzyc, edytowac, usuwac i przegladac `harvest_records`,
- wpis zbioru moze byc na poziomie `orchard`, `plot`, `variety`, `location_range` albo `tree`,
- wpis zbioru moze byc powiazany z aktywnoscia typu `harvest`,
- aplikacja wspiera harvestowe raporty sezonowe i raporty lokalizacyjne.

### 5. Raporty

- `season-summary` pokazuje zbiorcze wyniki zbiorow dla sezonu,
- `variety-locations` pokazuje, gdzie fizycznie znajduja sie drzewa danej odmiany,
- `harvest-locations` pokazuje, skad terenowo pochodza zapisane zbiory,
- aktywnosci maja tez seasonal summary i coverage dla wybranego typu prac.

### 6. Operacje masowe i eksport

- mozemy robic batch create drzew dla zakresu pozycji w rzedzie,
- mozemy masowo oznaczac drzewa jako `removed`,
- owner moze eksportowac dane konta i swoich orchard,
- `super_admin` moze administracyjnie eksportowac szerszy zestaw orchard.

## Role i ograniczenia

Najwazniejsze role produktowe:

- `owner`
- `worker`
- `super_admin`
- outsider bez membership

W praktyce:

- `owner` zarzadza orchard i membership,
- `worker` moze wykonywac prace operacyjne, ale nie zarzadza membership ani eksportem owner-only,
- outsider nie powinien widziec danych operacyjnych obcego orchard,
- `super_admin` ma specjalne mozliwosci administracyjne.

## Stan techniczny projektu

To nie jest juz tylko prototyp UI.
Projekt ma wdrozone:

- baseline schema i migracje `Supabase`,
- `RLS` i helper functions dla kontroli dostepu,
- server-side orchard context,
- seed danych i workflow QA,
- testy unit, integration i `Playwright E2E`.

## Czego jeszcze swiadomie nie ma

Na teraz nadal odlozone sa miedzy innymi:

- `/plots/[plotId]` jako operacyjny detail page dzialki jest planowany w `Plot Visual Operations MVP`; do czasu implementacji PVO jego brak w kodzie jest oczekiwany,
- detail pages dla `varieties` i `trees`,
- delete UI dla `varieties` i `trees`,
- zmiana roli membership orchard,
- import UI i restore workflow,
- storage / attachments,
- szerszy planning block wykraczajacy poza prosty feed `upcoming_activities`.

## Co czytac dalej

Jesli potrzebujesz wejsc glebiej, czytaj w tej kolejnosci:

1. `documents/README.md`
2. `documents/00_overview_and_checklists/documentation_map.md`
3. `documents/00_overview_and_checklists/session_handoff.md`
4. `documents/01_implementation_materials/README.md`

Jesli potrzebujesz source of truth dla domeny i kontraktow, przejdz dalej do:

- `03_domain_and_business_rules/orchardlog_database_model.md`
- `05_technical/authorization_and_rls_strategy.md`
- `06_backend_and_contracts/data_contracts.md`

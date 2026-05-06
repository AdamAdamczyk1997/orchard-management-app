# OrchardLog / Sadownik+ - MVP scope i priorytety

## Cel dokumentu

Ten dokument zamienia ogolny opis produktu na roboczy plan wdrozenia.
Ma pomoc odpowiedziec na pytanie:
co musi znalezc sie w pierwszej uzywalnej wersji aplikacji, a co mozna swiadomie przesunac na kolejny etap.

Wazne:
to jest dokument priorytetyzacji produktu, a nie live status implementacji repo.
Aktualny stan wdrozenia jest utrzymywany w `session_handoff.md`,
`implementation_master_plan.md` i `documentation_map.md`.

## Zalozenia robocze

- Pierwsza wersja jest `web-first`, dostepna z przegladarki na telefonie i komputerze.
- W MVP aplikacja obsluguje podstawowy model `orchard` z rolami `owner` i `worker`.
- Dane domenowe sa prywatne per `orchard`.
- Interfejs MVP jest domyslnie po polsku; przelacznik PL / EN pozostaje poza zakresem obecnego wydania.
- UI MVP pracuje zawsze w jednym `active_orchard`.
- Model danych ma byc od razu gotowy na rozwoj o lokalizacje drzew, masowe zakladanie rekordow i raportowanie zbiorow, nawet jesli nie wszystkie ekrany wejda do pierwszego wydania.

## Glowny cel pierwszego wydania

Umozliwic sadownikowi szybkie i bezpieczne prowadzenie cyfrowej ewidencji:

- dzialek,
- drzew,
- odmian,
- prac i obserwacji,
- podstawowej historii sezonu,
- zapisow zbioru i podsumowan sezonowych.

Pierwsze wydanie ma byc przydatne w codziennej pracy, nawet bez map, zdjec, przypomnien i zaawansowanych analiz.

## Zakres wersji 0.1 - `must have`

### 1. Dostep do aplikacji

- rejestracja i logowanie uzytkownika
- utrzymanie sesji
- reset hasla
- onboarding `Create orchard` przy pierwszym wejsciu bez membership
- aktywny kontekst `orchard`
- izolacja danych per `orchard`

### 2. Dzialki

- lista dzialek
- dodawanie dzialki
- edycja dzialki
- oznaczanie dzialki jako aktywna lub zarchiwizowana
- przechowywanie podstawowych danych:
  - nazwa
  - kod opcjonalny
  - lokalizacja opisowa
  - powierzchnia
  - typ gleby
  - typ nawodnienia
  - status

### 3. Drzewa

- lista drzew
- dodawanie pojedynczego drzewa
- edycja drzewa
- przypisanie drzewa do dzialki
- opcjonalne przypisanie odmiany
- podstawowa lokalizacja drzewa:
  - dzialka
  - rzad opcjonalny
  - pozycja w rzedzie opcjonalna
- podstawowe dane stanu drzewa:
  - gatunek
  - data posadzenia opcjonalna
  - kondycja
  - notatki

### 4. Odmiany

- lista odmian
- dodawanie odmiany
- edycja odmiany
- wyszukiwanie po nazwie i gatunku
- przechowywanie wiedzy:
  - opis
  - cechy
  - zalecenia pielegnacyjne
  - notatki

### 5. Dziennik prac i obserwacji

- lista wpisow
- dodawanie wpisu
- edycja wpisu
- filtrowanie po dzialce, drzewie, typie i dacie
- obsluga statusow wpisu:
  - `planned`
  - `done`
  - `skipped`
  - `cancelled`
- podstawowa historia sezonu

### 5a. Rozszerzone aktywnosci sezonowe

- wielokrotne zapisywanie prac:
  - `pruning`
  - `mowing`
  - `spraying`
- rozroznienie `pruning` na:
  - `winter_pruning`
  - `summer_pruning`
- zapis zakresu wykonania przez `activity_scopes`
- wsparcie zakresow:
  - cala dzialka
  - sekcja
  - rzad
  - zakres drzew w rzedzie
  - pojedyncze drzewo
- mozliwosc zapisania kilku zakresow w ramach jednej aktywnosci
- zapis wykonawcy przez `performed_by_profile_id`
- zapis srodkow uzytych przy `spraying`
- proste raporty historii i postepu prac po typie, dacie i dzialce

### 5b. Zbiory i podsumowania sezonowe

- zapis rekordu zbioru z data i iloscia
- wsparcie jednostek:
  - `kg`
  - `t`
- przeliczanie do wspolnej jednostki raportowej `kg`
- mozliwosc zapisania zbioru:
  - dla orchard
  - dla dzialki
  - dla odmiany
  - dla zakresu lokalizacji
- podstawowe raporty:
  - suma per odmiana
  - suma per dzialka
  - suma per sezon
  - historia zbiorow w czasie

### 6. Materialy uzyte w aktywnosci

- mozliwosc dopisania wielu materialow do jednej aktywnosci
- nazwa, kategoria, ilosc, jednostka, notatka

### 7. Widoki robocze

- dashboard z podstawowym przegladem danych
- ekran `Create orchard`
- lista dzialek + create / edit
- lista drzew + create / edit
- lista odmian + create / edit
- dziennik prac
- lista zbiorow
- `season summary`
- ekran `Orchard members`
- ekran `Orchard settings`

Uwaga implementacyjna:

- dedykowane detail pages dla `plots`, `varieties` i `trees` moga pozostac odlozone poza bazowy zakres obecnego MVP, o ile listy i formularze create / edit daja sprawny flow operacyjny

## Zakres wersji 0.2 - `should have`

### 1. Lokalizacja drzew w modelu rozszerzonym

- `layout_type` dla dzialki
- schemat numeracji rzedow
- schemat numeracji drzew
- `section_name`
- `location_verified`

### 2. Masowe zakladanie drzew

- formularz batchowego tworzenia drzew w zakresie
- walidacja konfliktow lokalizacji przed zapisem
- zapis operacji do `bulk_tree_import_batches`

### 3. Raport lokalizacji odmiany

- odpowiedz na pytanie: gdzie znajduje sie dana odmiana
- grupowanie drzew po dzialce, sekcji i rzedzie
- prezentacja kolejnych pozycji jako zakresow

### 4. Dokladniejsze raporty zbiorow

- bardziej szczegolowe agregacje po lokalizacji
- widoki porownawcze sezonow
- rozszerzenie pod jakość, partie i magazyn

### 5. Import / export z poziomu aplikacji

- export danych konta do pliku dla `owner`, a administracyjnie takze dla `super_admin`
- import wybranych danych z kontrola walidacji

## Zakres `later`

- przypomnienia o pracach
- zdjecia drzew i chorob
- mapa dzialek
- integracja z pogoda
- analiza historii i rozbudowane raporty plonow
- odmiany globalne lub wspoldzielone
- rozbudowane role i wspolpraca wielu uzytkownikow

## Swiadomie poza pierwszym wydaniem

- aplikacja natywna na Android / iOS
- tryb offline z synchronizacja
- publiczna baza wiedzy o odmianach
- zaawansowane raporty finansowe
- mapy GIS i dokladna geolokalizacja GPS

## Priorytety implementacyjne

1. Autoryzacja i profil uzytkownika.
2. Migracje i podstawowe tabele: `profiles`, `orchards`, `orchard_memberships`, `plots`, `varieties`, `trees`, `activities`, `activity_scopes`, `activity_materials`, `harvest_records`.
3. CRUD dla dzialek i odmian.
4. CRUD dla drzew.
5. CRUD dla aktywnosci, materialow i zbiorow.
6. Listy, filtrowanie, szczegoly widokow i podstawowe podsumowania sezonowe.
7. Rozszerzenia lokalizacyjne i batch create.
8. Raport odmianowy, bardziej szczegolowe raporty zbiorow i import / export.

## Robocze decyzje przyjete w tym dokumencie

- `activity_materials` wchodzi do MVP 0.1, bo wynika z potrzeby zapisywania srodkow uzytych w zabiegach.
- `activity_scopes` wchodzi do MVP 0.1, bo bez tej tabeli nie opiszemy wiarygodnie prac czesciowych, wielokrotnych i terenowych.
- `harvest_records` wchodzi do MVP 0.1, bo daje sadownikowi realna wartosc sezonowa bez duzej komplikacji modelu.
- onboarding orchard i `active_orchard` wchodza do MVP 0.1, bo sa rdzeniem modelu dostepu.
- Masowe dodawanie drzew jest bardzo wazne, ale trafia do 0.2, aby nie blokowac startu rdzenia aplikacji.
- Raport lokalizacji odmiany trafia do 0.2 razem z dopracowanym modelem lokalizacji.
- Interfejs MVP jest projektowany pod jezyk polski, a pelne PL / EN i18n jest odlozone.

## Tematy do potwierdzenia pozniej - nie blokuja startu implementacji

- Czy batch create drzew powinien zostac przesuniety do 0.1, jesli glownym uzytkownikiem beda duze sady.
- Czy planowane prace z przyszla data potrzebuja osobnego, bogatszego UX planowania juz w 0.1, czy pozostaja obslugiwane przez ten sam formularz `activities`.
- Czy bardziej szczegolowe rejestrowanie zbioru per drzewo ma byc widoczne w glownym UI, czy tylko wspierane przez model.

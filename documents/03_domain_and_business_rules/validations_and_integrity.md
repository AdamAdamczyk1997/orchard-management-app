# OrchardLog / Sadownik+ - walidacje i integralnosc

## Cel dokumentu

Ten dokument zbiera reguly spojnosci danych i dzieli je wedlug warstwy odpowiedzialnosci.
Ma pomagac ustalic, co sprawdzamy w UI, co w warstwie serwerowej, a co bezposrednio w bazie.

## Zasada ogolna

- UI pomaga uzytkownikowi i daje szybki feedback.
- Server actions i backend pilnuja logiki domenowej oraz kontekstu `active_orchard`.
- Baza pilnuje twardych constraints, ktorych nie wolno obejsc.
- RLS chroni dostep, ale nie zastepuje walidacji relacji biznesowych.

Wazne:
finalny ownership model, lista encji core i rekomendowane `ON DELETE` sa normatywnie domkniete
w `orchardlog_database_model.md`, w sekcji
`Final Core Domain and Data Model - Final Consolidated Version`.
Ten dokument tlumaczy te decyzje na warstwy walidacji i integralnosci, ale nie tworzy konkurencyjnego source of truth.

## 1. Walidacje po stronie UI

### Formularz orchard i membership

- wymagane `name` dla `orchards`
- w formularzu zaproszenia wymagane `email` i `role`
- UI nie pozwala `worker` wejsc do akcji eksportu ani zarzadzania membership

### Formularz dzialki

- wymagane `name`
- liczby dodatnie dla `area_m2`
- wymagane `layout_type`
- liczby dodatnie calkowite dla `default_row_count` i `default_trees_per_row`, jesli sa podane
- czytelny komunikat dla duplikatu nazwy w obrebie aktywnego `orchard`

### Formularz drzewa

- wymagane `plot_id` i `species`
- dla `plots.layout_type = rows` wymagane sa `row_number` i `position_in_row`
- dla `plots.layout_type = mixed` i `plots.layout_type = irregular` wymagane jest co najmniej jedno praktyczne oznaczenie lokalizacji
- UI pokazuje guidance z ustawien dzialki po wyborze `plot_id`
- podpowiedz, gdy brak odmiany jest dopuszczalny
- blokada pustych wartosci dla wymaganych pol

### Formularz odmiany

- wymagane `species` i `name`
- informacja o potencjalnym duplikacie `species + name` w obrebie aktywnego `orchard`

### Formularz aktywnosci

- wymagane `plot_id`, `activity_type`, `activity_date`, `title`, `status`
- walidacja liczb nieujemnych dla czasu i kosztu
- dla `pruning` wymagane `activity_subtype`
- dla `location_range` wymagane `row_number`, `from_position`, `to_position`
- dla dzialki `irregular` zakresy `row` i `location_range` sa niedostepne; uzywamy `plot`, `section` albo `tree`

### Formularz zbioru

- wymagane `harvest_date`, `scope_level`, `quantity_value`, `quantity_unit`
- dla `scope_level = location_range` wymagane `plot_id`, `row_number`, `from_position`, `to_position`
- dla `scope_level = tree` wymagane `tree_id`
- walidacja `quantity_value > 0`
- dla dzialki `irregular` `scope_level = location_range` jest blokowane; user powinien wybrac inny poziom szczegolowosci

### Formularz batch create

- wymagane `plot_id`, `species`, `row_number`, `from_position`, `to_position`
- walidacja `to_position >= from_position`
- flow jest dostepny tylko dla dzialek `rows` i `mixed`

## 2. Walidacje w warstwie serwerowej / operacjach

### Kontekst orchard

- kazda mutacja domenowa musi pracowac w kontekscie `active_orchard`
- brak aktywnego orchard powinien zwracac `NO_ACTIVE_ORCHARD`
- jesli resolver nie moze zbudowac working contextu i user nie ma dostepnego orchard do pracy, flow onboardingowy korzysta z `ORCHARD_ONBOARDING_REQUIRED`
- onboarding orchard jest wymagany tylko wtedy, gdy user nie ma zadnego orchard dostepnego do pracy w aktualnym stanie membership

### Ownership i zgodnosc danych

- `plots.orchard_id` musi nalezec do orchard dostepnego dla zalogowanego usera
- `trees.orchard_id` musi byc zgodne z `plots.orchard_id`
- `varieties.orchard_id` musi nalezec do aktywnego `orchard`
- `activities.orchard_id` musi byc zgodne z `plots.orchard_id`
- `harvest_records.orchard_id` musi byc zgodne z powiazanymi rekordami

### Relacje

- `trees.plot_id` musi nalezec do aktywnego `orchard`
- `trees.variety_id`, jesli ustawione, musi nalezec do tego samego `orchard`
- `activities.plot_id` musi nalezec do aktywnego `orchard`
- `activities.tree_id`, jesli ustawione, musi nalezec do tej samej dzialki i tego samego `orchard`
- `activity_materials.activity_id` musi nalezec do aktywnosci z tego samego `orchard`
- `activity_scopes.activity_id` musi nalezec do aktywnosci z tego samego `orchard`
- `activity_scopes.tree_id`, jesli ustawione, musi nalezec do tej samej dzialki co `activities.plot_id`
- `harvest_records.plot_id`, `variety_id`, `tree_id` i `activity_id`, jesli ustawione, musza nalezec do tego samego `orchard`

### Membership i role

- `owner` zarzadza `orchard_memberships` i eksportem
- `worker` moze mutowac `plots`, `trees`, `varieties`, `activities` i `harvest_records`
- `worker` nie moze wykonywac `exportAccountData`
- w MVP jeden `orchard` ma dokladnie jednego aktywnego `owner`

### Batch create i bulk deactivate

- caly zakres pozycji musi byc sprawdzony przed zapisem
- konflikt jednej pozycji blokuje cala operacje
- batch powinien byc wykonywany transakcyjnie
- bulk deactivate dziala tylko dla jednego `plot_id` i jednego zakresu w ramach tego samego `orchard`
- operacje zakresowe po `row_number + from_position + to_position` sa blokowane dla dzialek `irregular`

### Eksport account-wide

- `exportAccountData` agreguje orchards, dla ktorych user ma aktywne membership `owner`
- orchard, w ktorym user jest tylko `worker`, nie wchodzi do eksportu
- `super_admin` moze wykonac eksport administracyjny zgodnie z polityka systemowa

## 3. Ograniczenia w bazie danych

### Twarde constraints

- unikalna nazwa dzialki w obrebie `orchard`
- unikalne `species + name` odmiany w obrebie `orchard`
- partial unique: jeden aktywny `owner` per `orchard`
- partial unique: jedno aktywne drzewo w lokalizacji logicznej `plot + row + position`
- `check` dla statusow i ról
- `check` dla zakresow `from_position <= to_position`
- `check` dla jednostek zbioru i dodatnich ilosci

### Klucze obce

- `orchards.created_by_profile_id -> profiles.id`
- `orchard_memberships.orchard_id -> orchards.id`
- `orchard_memberships.profile_id -> profiles.id`
- `plots.orchard_id -> orchards.id`
- `varieties.orchard_id -> orchards.id`
- `trees.orchard_id -> orchards.id`
- `trees.plot_id -> plots.id`
- `trees.variety_id -> varieties.id`
- `activities.orchard_id -> orchards.id`
- `activities.plot_id -> plots.id`
- `activities.tree_id -> trees.id`
- `activities.created_by_profile_id -> profiles.id`
- `activities.performed_by_profile_id -> profiles.id`
- `activity_scopes.activity_id -> activities.id`
- `activity_scopes.tree_id -> trees.id`
- `activity_materials.activity_id -> activities.id`
- `harvest_records.orchard_id -> orchards.id`
- `harvest_records.plot_id -> plots.id`
- `harvest_records.variety_id -> varieties.id`
- `harvest_records.tree_id -> trees.id`
- `harvest_records.activity_id -> activities.id`
- `harvest_records.created_by_profile_id -> profiles.id`

Powiazania odroczone do etapu `0.2`:

- `bulk_tree_import_batches.orchard_id -> orchards.id`
- `bulk_tree_import_batches.plot_id -> plots.id`
- `bulk_tree_import_batches.variety_id -> varieties.id`
- `trees.planted_batch_id -> bulk_tree_import_batches.id`

### Indeksy i filtrowanie

- indeksy pod `orchard_id` na wszystkich tabelach domenowych
- indeksy pod `plot_id`, `variety_id`, datach i statusach
- indeksy pod `season_year` dla raportow aktywnosci i zbiorow

## 4. Reguly, ktore musza byc pokryte testami

- brak mozliwosci utworzenia drzewa na dzialce z innego `orchard`
- brak mozliwosci przypisania odmiany z innego `orchard`
- brak mozliwosci zapisania drzewa typu `rows` bez `row_number + position_in_row`
- brak mozliwosci zapisania drzewa na `mixed` albo `irregular` bez zadnej czytelnej wskazowki lokalizacyjnej
- brak mozliwosci przypisania aktywnosci do drzewa z innej dzialki
- brak mozliwosci duplikacji lokalizacji aktywnego drzewa
- brak czesciowego zapisu batcha przy konflikcie
- brak mozliwosci uruchomienia batch create albo bulk deactivate dla dzialki `irregular`
- brak eksportu dla `worker`
- poprawne ograniczenie eksportu do orchard, gdzie user ma role `owner`

## 5. Rekomendacje implementacyjne

- proste CRUD obslugiwac przez server actions
- krytyczne operacje wieloetapowe obslugiwac transakcyjnie
- nie polegac tylko na walidacji klienta
- traktowac RLS jako warstwe ochronna, ale nie jedyna logike spojnosci
- w nazwach helperow i walidacji uzywac `orchard_id`, nie historycznego `user_id`

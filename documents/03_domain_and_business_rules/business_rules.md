# OrchardLog / Sadownik+ - zasady biznesowe

## Cel dokumentu

Ten dokument zbiera w jednym miejscu reguly biznesowe rozproszone dotad po planie produktu i modelu danych.
Traktujemy go jako robocza baze decyzji potrzebnych do implementacji.

Wazne:
finalny ownership model, lista encji core, relacje bazowe i readiness do `baseline SQL migrations v1`
sa normatywnie zamkniete w `orchardlog_database_model.md`, w sekcji
`Final Core Domain and Data Model - Final Consolidated Version`.
Ten dokument rozwija logike biznesowa i zachowanie encji, ale nie nadpisuje skonsolidowanego rdzenia modelu danych.

## 1. Zasady globalne

- Konto uzytkownika i zakres danych domenowych sa rozdzielone.
- Dane domenowe sa przypisane do `orchard`, a nie bezposrednio do pojedynczego `profile`.
- Jeden `profile` moze nalezec do wielu `orchards`.
- Dostep do konkretnego `orchard` jest nadawany przez `orchard_memberships`.
- W MVP wdrazamy wspolprace w obrebie jednego `orchard` dla rol `owner` i `worker`.
- UI MVP pracuje zawsze w kontekscie jednego `active_orchard`.
- `active_orchard` jest stanem sesji/UI, a nie osobna encja domenowa.
- Jesli user nie ma aktywnego membership, system wymusza onboarding i utworzenie pierwszego orchard.
- Domyslny jezyk produktu to polski.
- Domyslna strefa czasowa to `Europe/Warsaw`, ale profil powinien pozwolic na jej zmiane.

## 1a. Role i zakres odpowiedzialnosci

- `super_admin` jest rola globalna systemu.
- `owner` i `worker` sa rolami lokalnymi w konkretnym `orchard`.
- Model danych ma byc od poczatku gotowy na:
  - `manager`
  - `viewer`
- `owner`
  - zarzadza danymi i membership orchard
- `worker`
  - pracuje na danych operacyjnych orchard
  - nie zarzadza membership
  - moze mutowac `plots`, `trees`, `varieties`, `activities` i `harvest_records`
- `manager`
  - rola przyszlosciowa, docelowo operacyjno-nadzorcza
- `viewer`
  - rola przyszlosciowa, docelowo tylko do odczytu

## 1b. Eksport i odpowiedzialnosc za dane

- Eksport danych konta jest operacja account-wide.
- `owner` moze eksportowac dane tych orchard, w ktorych ma aktywne membership `owner`.
- `worker` nie moze eksportowac danych wspoldzielonego orchard.
- `super_admin` moze wykonywac eksport administracyjny zgodnie z polityka systemu.

## 2. Dzialki

- Dzialka jest podstawowym kontenerem fizycznym.
- Dzialka nalezy do jednego `orchard`.
- Nazwa dzialki musi byc unikalna w obrebie jednego `orchard`.
- Dzialka moze miec status:
  - `planned`
  - `active`
  - `archived`
- Dzialka z drzewami lub historia aktywnosci nie powinna byc usuwana z UI jako standardowa operacja.
- Zamiast usuniecia preferowane jest archiwizowanie dzialki.

## 3. Drzewa

- Jedno drzewo reprezentuje jeden fizyczny obiekt.
- Drzewo nalezy do jednego `orchard` i jednej dzialki.
- Drzewo moze, ale nie musi miec przypisana odmiane.
- Jesli odmiana jest przypisana, musi nalezec do tego samego `orchard` co drzewo.
- Drzewo moze miec status kondycji:
  - `new`
  - `good`
  - `warning`
  - `critical`
  - `removed`
- Przyjecie statusu `removed` powinno oznaczac, ze drzewo nie jest juz aktywnym elementem sadu.
- W praktyce:
  - `condition_status = removed`
  - `is_active = false`
- W uporzadkowanym sadzie nie moga istniec dwa aktywne drzewa w tej samej lokalizacji logicznej:
  - `plot_id`
  - `row_number`
  - `position_in_row`

## 4. Lokalizacja drzew

- W MVP model rzedowy moze byc wyrazony bez osobnego `plots.layout_type`, jesli user podaje `row_number` i `position_in_row`.
- Po wprowadzeniu rozszerzonego modelu ukladu dzialki w etapie 0.2 dla dzialki typu `rows` lokalizacja drzewa powinna byc opisana przez:
  - `row_number`
  - `position_in_row`
- Dla dzialki typu `mixed` lub `irregular` dopuszczamy niepelna lokalizacje.
- W takich przypadkach zalecane jest uzupelnienie przynajmniej jednego z pol:
  - `section_name`
  - `row_label`
  - `position_label`
  - `tree_code`
- `location_verified` oznacza, ze lokalizacja drzewa zostala sprawdzona w terenie albo swiadomie potwierdzona przez uzytkownika.
- Raporty lokalizacyjne powinny opierac sie tylko na drzewach aktywnych, z przypisana odmiana i z wystarczajacymi danymi lokalizacyjnymi.

## 5. Odmiany

- W MVP odmiany sa prywatne per `orchard`.
- Jedna odmiana moze byc przypisana do wielu drzew tego samego `orchard`.
- Kombinacja `species + name` powinna byc unikalna w obrebie jednego `orchard`.
- Odmiana moze istniec w systemie nawet bez przypisanych drzew.
- W MVP nie wprowadzamy jeszcze odmian globalnych ani wspoldzielonych.

## 6. Aktywnosci i dziennik prac

- `activities` pozostaje glowna encja dziennika prac.
- Jeden rekord `activities` opisuje jedno zdarzenie robocze, obserwacje albo planowana prace w jednym dniu i dla jednej dzialki.
- Aktywnosc zawsze musi byc przypisana do jednego `orchard` i jednej dzialki.
- Aktywnosc moze opcjonalnie byc przypisana do jednego konkretnego drzewa przez `tree_id`, ale dla prac zakresowych glownym zrodlem zakresu powinny byc rekordy `activity_scopes`.
- Jesli aktywnosc ma przypisane drzewo, to drzewo musi nalezec do tej samej dzialki i tego samego `orchard`.
- W modelu wielouzytkownikowym rekomendowane jest zapisanie:
  - autora rekordu przez `created_by_profile_id`,
  - wykonawcy przez `performed_by_profile_id`,
  - opcjonalnego opisu tekstowego przez `performed_by`, jesli prace wykonal ktos spoza systemu albo trzeba dopisac bardziej opisowa etykiete.
- Typ aktywnosci musi nalezec do kontrolowanej listy:
  - `watering`
  - `fertilizing`
  - `spraying`
  - `pruning`
  - `inspection`
  - `planting`
  - `harvest`
  - `mowing`
  - `weeding`
  - `disease_observation`
  - `pest_observation`
  - `other`
- Dla prac sezonowych doprecyzowanie typu powinno byc zapisywane w `activity_subtype`.
- W MVP aktywnie wspierane `activity_subtype` to:
  - `winter_pruning`
  - `summer_pruning`
- Status aktywnosci musi nalezec do listy:
  - `planned`
  - `done`
  - `skipped`
  - `cancelled`
- W MVP aktywnosc `planned` nadal wymaga daty.
  Jest to data planowana, a nie data wykonania.
- W MVP aktywnosci planowane i wykonane sa obslugiwane przez te sama tabele i ten sam formularz.
- Wielokrotne wykonanie tej samej pracy w sezonie nie powinno nadpisywac poprzedniego wpisu.
  Kazde wykonanie powinno tworzyc osobny rekord `activities`.

## 6a. Zakres wykonania aktywnosci sezonowych

- Zakres wykonania powinien byc modelowany przez osobna tabele podrzedna `activity_scopes`.
- Jeden rekord `activity_scopes` opisuje jeden fizyczny zakres wykonania dla jednej aktywnosci.
- Jedna aktywnosc moze miec wiele rekordow `activity_scopes`.
  To pozwala zapisac mieszany zakres w ramach jednej operacji, np. kilka rzedow albo kilka rozlacznych zakresow drzew.
- Rekomendowane wartosci `scope_level`:
  - `plot`
  - `section`
  - `row`
  - `location_range`
  - `tree`
- Dla `scope_level = plot` aktywnosc obejmuje cala dzialke.
- Dla `scope_level = section` wymagane jest `section_name`.
- Dla `scope_level = row` wymagane jest `row_number`.
- Dla `scope_level = location_range` wymagane sa:
  - `row_number`
  - `from_position`
  - `to_position`
- Dla `scope_level = tree` wymagane jest `tree_id`.
- `activity_scopes` powinno opisywac faktycznie wykonany albo zaplanowany zakres pracy.
  Nie nalezy oznaczac wykonania przez mutowanie rekordow `trees`, `plots` albo lokalizacji.
- Odpowiedz na pytanie "co juz zrobiono" powinna wynikac z historii `activities` + `activity_scopes`.
- Odpowiedz na pytanie "co jeszcze zostalo" w MVP powinna byc liczona przez porownanie oczekiwanego zakresu w UI z juz zapisanymi rekordami wykonania, a nie przez osobne flagi na drzewach.

## 6b. Prace sezonowe wspierane w MVP

- `pruning`
  - musi rozrozniac:
    - `winter_pruning`
    - `summer_pruning`
  - moze byc wykonywane wiele razy w jednym `season_year`
  - moze dotyczyc calej dzialki, sekcji, rzedu, zakresu drzew albo pojedynczych drzew
- `mowing`
  - moze dotyczyc calej dzialki albo wybranych rzedow / zakresow
  - moze byc wykonywane wiele razy w sezonie
- `spraying`
  - moze byc wykonywane wiele razy w sezonie
  - musi miec zapisany zakres wykonania przez `activity_scopes`
  - powinno miec zapisane uzyte srodki przez `activity_materials`
  - powinno wspierac notatki pogodowe, efekt zabiegu i uwagi

## 7. Sezony

- `season_year` jest wyliczany na podstawie roku z `activity_date`.
- W MVP sezon liczony jest wedlug roku kalendarzowego.
- `season_phase` moze byc uzupelniane automatycznie na podstawie miesiaca, ale uzytkownik moze je zmienic.
- Roboczy podzial faz sezonu:
  - marzec-maj: `wiosna`
  - czerwiec-sierpien: `lato`
  - wrzesien-listopad: `jesien`
  - grudzien-luty: `zima`

## 7a. Zbiory i podsumowania sezonowe

- Zapis ilosci zebranych owocow powinien byc modelowany przez osobna encje `harvest_records`, a nie wylacznie przez `activities`.
- `activities.activity_type = 'harvest'` pozostaje przydatne do opisu pracy, ale nie powinno byc jedynym miejscem przechowywania ilosci.
- Jeden rekord `harvest_records` opisuje jedna pozycje ilosciowa:
  - w jednym dniu,
  - dla jednego orchard,
  - na jednym poziomie szczegolowosci.
- `harvest_records` nalezy do jednego `orchard`.
- Rekord zbioru moze byc opcjonalnie powiazany z:
  - `plot_id`
  - `variety_id`
  - `tree_id`
  - `activity_id`
- Dla zakresu lokalizacji rekomendowane jest przechowywanie:
  - `section_name`
  - `row_number`
  - `from_position`
  - `to_position`
- Poziom szczegolowosci powinien byc zapisany explicite w polu `scope_level`.
- Rekomendowane wartosci `scope_level`:
  - `orchard`
  - `plot`
  - `variety`
  - `location_range`
  - `tree`
- Zbiory per drzewo sa dopuszczalne, ale nie powinny komplikowac glownego flow MVP.
- Dla raportow i sum sezonowych ilosc powinna byc liczona po znormalizowanym polu `quantity_kg`.
- Jednostka wprowadzona przez uzytkownika powinna zostac zachowana w rekordzie zrodlowym, ale raporty agregacyjne powinny byc liczone po wartosci przeliczonej do `kg`.
- W MVP rekomendowane jednostki wejściowe to:
  - `kg`
  - `t`
- W MVP nie modelujemy jeszcze:
  - jakosci owocu
  - partii magazynowych
  - miejsca skladowania
  - sprzedazy
  - kontrahenta
- Model powinien jednak zostawic miejsce na przyszle rozszerzenia przez:
  - `notes`
  - `metadata` lub dodatkowe nullable columns w przyszlych migracjach

## 8. Materialy uzyte w aktywnosci

- Jedna aktywnosc moze miec wiele materialow.
- Material nie istnieje samodzielnie bez aktywnosci.
- Material moze reprezentowac:
  - srodek ochrony roslin
  - nawoz
  - paliwo
  - wode
  - inny zasob zuzyty podczas pracy
- Dla `spraying` `activity_materials` pozostaje rekomendowanym miejscem zapisu:
  - nazwy srodka
  - ilosci
  - jednostki
  - notatek
- W MVP nie wprowadzamy osobnej tabeli katalogowej srodkow ochrony roslin.
  `activity_materials` ma pozostac lekki i praktyczny do szybkiego wpisu terenowego.

## 9. Edycja, usuwanie i historia

- Preferujemy zachowanie historii nad agresywnym usuwaniem rekordow.
- Dzialki powinny byc archiwizowane zamiast usuwane.
- Drzewa usuniete fizycznie z sadu powinny pozostawac w historii jako `removed`.
- Dla aktywnosci planowanych, zaniechanych lub blednych preferujemy zmiane statusu zamiast trwawego usuniecia.
- Trwale usuwanie rekordow powinno byc ograniczone do oczywistych pomylek i operacji administracyjnych.
- Jesli uzytkownik usuwa wiele drzew jednoczesnie, preferowana operacja to masowe oznaczenie drzew jako `removed`, a nie fizyczny `delete`.
- Operacja masowa dla drzew powinna wspierac wybor po lokalizacji, w szczegolnosci:
  - `plot_id`
  - `row_number`
  - `from_position`
  - `to_position`
- Masowa operacja powinna dzialac tylko na drzewach nalezacych do jednego `orchard` i jednej dzialki.
- Masowa operacja powinna byc transakcyjna, zeby uniknac polowicznego oznaczenia zakresu.
- Dla kazdego drzewa objete operacja wynik powinien byc rownoznaczny z:
  - `condition_status = removed`
  - `is_active = false`
- Operacja nie powinna nadpisywac po cichu rekordow juz nieaktywnych; system powinien zwrocic podsumowanie, ile rekordow bylo aktywnych, ile juz bylo `removed`, a ile nie zostalo znalezionych w zakresie.

## 10. Batchowe tworzenie drzew

- Batch tworzy wiele rekordow `trees` na podstawie jednego zestawu parametrow.
- Przed zapisem system musi zwalidowac caly zakres pozycji.
- W MVP preferowana polityka to `all or nothing`.
  Jesli zakres zawiera konflikt lokalizacji, caly batch powinien zostac odrzucony.
- Batch nie moze utworzyc drzewa na pozycji, na ktorej istnieje juz aktywne drzewo.
- Dzialka i odmiana uzyte w batchu musza nalezec do tego samego `orchard` co operacja.
- Wygenerowane drzewa powinny zachowac powiazanie z rekordem `bulk_tree_import_batches`.

## 10a. Masowe oznaczanie drzew jako `removed`

- Operacja sluzy do szybkiego wycofania z aktywnego sadu wielu drzew z jednego zakresu lokalizacji.
- Podstawowym przypadkiem jest rzad i zakres pozycji, np. rzad 3, pozycje 50-120.
- Operacja powinna obejmowac tylko aktywne drzewa.
- Jesli w zadanym zakresie nie ma zadnego aktywnego drzewa, system powinien zwrocic czytelny wynik bez zmiany danych.
- W MVP preferowana polityka to `all or nothing`, jesli operacja ma dodatkowe warunki blokujace.
- W przyszlosci mozna rozważyć tryb z podgladem i lista rekordow do potwierdzenia, ale pierwsza wersja powinna pozostac prosta i bezpieczna.

## 11. Raport "gdzie znajduje sie odmiana"

- Raport nie jest osobna tabela z danymi zrodlowymi.
- Raport jest wynikiem zapytania opartego na tabeli `trees`.
- W raporcie uwzgledniamy tylko drzewa:
  - aktywne
  - z przypisana odmiana
  - z lokalizacja wystarczajaca do odnalezienia
- Wynik raportu powinien grupowac dane po:
  - dzialce
  - sekcji
  - rzedzie
- Kolejne pozycje powinny byc prezentowane jako zakresy.

## 11a. Raporty zbiorow

- Raporty zbiorow powinny byc liczone na podstawie `harvest_records`.
- Raporty musza wspierac co najmniej:
  - sume zbiorow per odmiana
  - sume zbiorow per dzialka
  - sume zbiorow per sezon
  - historie zbiorow w czasie
- Raport per odmiana powinien wykorzystywac `variety_id`, a nie parsowanie tytulow aktywnosci.
- Raport per dzialka powinien wykorzystywac `plot_id`.
- Raport sezonowy powinien byc oparty o `season_year`.
- Jesli rekord zbioru nie ma przypisanej odmiany, powinien wejsc do sum orchard / plot / season, ale nie do sumy per konkretna odmiana.
- Jesli rekord zbioru nie ma przypisanej dzialki, powinien wejsc do sum orchard / season, ale nie do raportu per plot.

## 11b. Raporty aktywnosci sezonowych

- Raporty postepu prac sezonowych powinny byc liczone na podstawie `activities` polaczonych z `activity_scopes`.
- Raport powinien umiec odpowiedziec co najmniej na pytania:
  - ile razy wykonano `winter_pruning` albo `summer_pruning` w danym sezonie
  - kiedy ostatnio wykonano `mowing` na danej dzialce
  - jakie zakresy byly juz objete `spraying`
  - kto wykonywal dana prace
- Raporty nie powinny polegac wylacznie na polu `title`.
  Filtrowanie powinno opierac sie o:
  - `activity_type`
  - `activity_subtype`
  - `status`
  - `activity_date`
  - `performed_by_profile_id`
- Dla raportow terenowych wynik powinien umiec zejsc do:
  - dzialki
  - sekcji
  - rzedu
  - zakresu drzew

## 12. Robocze decyzje przyjete teraz

- Odmiany w MVP sa prywatne per `orchard`.
- Aktywnosci planowane i wykonane sa w jednej tabeli.
- Drzewo bez znanej odmiany moze byc zapisane.
- `orchard` jest finalna jednostka ownership dla danych domenowych.
- `plot_sections` nie jest osobna tabela w baseline SQL v1.
- `plots.layout_type`, `row_numbering_scheme` i `tree_numbering_scheme` nie wchodza do baseline SQL v1 i pozostaja zakresem `0.2`.
- W MVP UI blokuje standardowe usuniecie odmiany, jesli jest przypisana do drzew; techniczne usuniecie pozostaje tylko dla sytuacji administracyjnych albo oczywistych pomylek.
- Batch create i raport odmianowy sa funkcjami etapu 0.2, ale model danych powinien je uwzgledniac od poczatku.
- Rejestrowanie zbiorow i proste podsumowania sezonowe powinny wejsc jako praktyczny modul MVP.
- Rozszerzony model aktywnosci sezonowych powinien wejsc do MVP, bo odpowiada na codzienne prace sadownika i pracownikow.
- Zdjecia i zalaczniki nie sa wymagane w pierwszym wydaniu.
- Role wdrazane teraz:
  - `super_admin`
  - `owner`
  - `worker`
- Role przygotowane na przyszlosc:
  - `manager`
  - `viewer`

## 13. Tematy do potwierdzenia pozniej - nie blokuja MVP

- Czy `plot_sections` pozostaje zwyklym polem tekstowym, czy przechodzi do osobnej tabeli.
- Czy w przyszlosci jeden zbior bedzie mogl byc rozbity na wiele klas jakosci.

# OrchardLog / Sadownik+ - statusy i cykle zycia

## Cel dokumentu

Ten dokument porzadkuje statusy glownych obiektow oraz dozwolone przejscia miedzy nimi.
Ma pomagac przy walidacji, UI i regulach biznesowych.

## 1. Dzialki

### Dostepne statusy

- `planned`
- `active`
- `archived`

### Znaczenie

- `planned` - dzialka jest zdefiniowana, ale nie musi byc jeszcze aktywnie uzywana
- `active` - dzialka bierze udzial w biezacej pracy
- `archived` - dzialka pozostaje w historii, ale nie jest juz aktywnym obszarem pracy

### Dozwolone przejscia

- `planned -> active`
- `active -> archived`
- `archived -> active`
- `planned -> archived`

### Uwagi

- Preferowanym sposobem "usuniecia" dzialki jest archiwizacja.
- Dzialka z historia nie powinna byc usuwana standardowo z UI.

## 2. Drzewa

### Status kondycji

- `new`
- `good`
- `warning`
- `critical`
- `removed`

### Znaczenie

- `new` - nowo dodane lub nowo posadzone drzewo
- `good` - drzewo w dobrym stanie roboczym
- `warning` - drzewo wymaga uwagi
- `critical` - drzewo w zlym stanie
- `removed` - drzewo usuniete z aktywnego sadu, ale pozostawione w historii

### Typowe przejscia

- `new -> good`
- `good -> warning`
- `warning -> good`
- `warning -> critical`
- `critical -> warning`
- `critical -> removed`
- `good -> removed`

### Powiazanie z `is_active`

- dla `removed` rekomendowane jest `is_active = false`
- dla pozostalych statusow domyslnie `is_active = true`

## 3. Aktywnosci

### Dostepne statusy

- `planned`
- `done`
- `skipped`
- `cancelled`

### Znaczenie

- `planned` - praca zaplanowana na konkretny termin
- `done` - praca wykonana
- `skipped` - praca pominieta
- `cancelled` - praca anulowana

### Dozwolone przejscia

- `planned -> done`
- `planned -> skipped`
- `planned -> cancelled`
- `done -> cancelled` tylko administracyjnie lub przy korekcie
- `done -> planned` niezalecane

### Uwagi

- Aktywnosc zawsze ma date.
- W MVP `planned` i `done` korzystaja z tej samej tabeli i tego samego formularza.
- Dla aktywnosci typu `harvest` ilosci owocow powinny byc przechowywane w `harvest_records`, a nie tylko w opisie aktywnosci.
- `activity_type` pozostaje typem glownym, a `activity_subtype` doprecyzowuje wariant sezonowy.
- W MVP `pruning` powinno korzystac z `activity_subtype`:
  - `winter_pruning`
  - `summer_pruning`
- Wielokrotne wykonanie tej samej pracy w sezonie tworzy kolejne rekordy `activities`.
  Nie nadpisujemy poprzedniego wykonania.
- Zakres wykonania aktywnosci nie powinien byc modelowany przez zmiane statusow drzew ani dzialek.
  Do tego sluzy osobna tabela `activity_scopes`.

## 3a. Activity scopes

### Status w MVP

- `activity_scopes` nie maja osobnego workflow statusow w MVP.
- Rekord `activity_scopes` jest podrzedny wobec `activities` i dziedziczy biznesowy kontekst z aktywnosci glownej.

### Zasady zycia rekordu

- scope jest tworzony razem z aktywnoscia albo przy jej edycji
- scope moze byc zmieniony, jesli korygujemy faktyczny zakres pracy
- scope jest usuwany razem z aktywnoscia albo w ramach korekty tej aktywnosci

### Uwagi

- Jeden rekord `activities` moze miec wiele `activity_scopes`.
- `activity_scopes` opisuje zakres planowany albo wykonany:
  - `plot`
  - `section`
  - `row`
  - `location_range`
  - `tree`
- W przyszlosci, jesli wdrozymy planowanie i checklisty, dodatkowe statusy szczegolowe powinny wejsc na poziom scope albo osobnych tabel planistycznych, a nie przez przeciazanie obecnego `activities.status`.

## 4. Batch create drzew

### Dostepne statusy

- `draft`
- `done`
- `failed`
- `partially_done`

### Znaczenie

- `draft` - batch przygotowany, ale jeszcze nie wykonany
- `done` - batch zakonczony sukcesem
- `failed` - batch nie zakonczyl sie powodzeniem
- `partially_done` - batch wykonany czesciowo

### Rekomendacja na start

- W MVP / 0.2 preferowane jest podejscie `all or nothing`.
- To oznacza, ze oczekiwane najczestsze statusy to:
  - `draft`
  - `done`
  - `failed`

## 5. Harvest records

### Status w MVP

- `harvest_records` nie wymagaja osobnego workflow statusow w MVP.
- Rekord zbioru jest traktowany jako zapis historyczny faktu ilosciowego.

### Zasady zycia rekordu

- rekord moze byc utworzony
- rekord moze byc skorygowany edycja
- rekord moze byc usuniety tylko jako korekta pomylki

### Uwagi

- W odroznieniu od `activities`, zbiory nie potrzebuja statusow `planned` / `done` / `cancelled`.
- Planowany zbior pozostaje aktywnoscia typu `harvest` o statusie `planned`.
- Faktyczna ilosc zebranego plonu powinna pojawic sie dopiero w `harvest_records`.

## 6. Profile i role

### Role globalne

- `user`
- `super_admin`

### Znaczenie

- `user` - standardowy uzytkownik produktu
- `super_admin` - rola globalna systemu

### Role orchard

- `owner`
- `worker`
- `manager`
- `viewer`

## 7. Robocze zasady projektowe

- Status ma znaczyc cos biznesowo, a nie tylko technicznie.
- Zmiana statusu powinna byc widoczna i zrozumiala w UI.
- Dla obiektow historycznych preferujemy zmiane statusu zamiast fizycznego usuwania.
- Dla aktywnosci sezonowych historia wykonania i zakresow ma byc addytywna.
  Kolejne zabiegi i kolejne zakresy dopisujemy, zamiast nadpisywac poprzedni stan.

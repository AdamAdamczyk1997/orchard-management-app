# OrchardLog / Sadownik+ - UI copy i terminologia

## Cel dokumentu

Ten dokument ustala, jakim jezykiem mowimy do uzytkownika w interfejsie.
Ma utrzymac spojny styl miedzy ekranami, formularzami i komunikatami.

## Zasady ogolne

- Uzywamy prostego polskiego jezyka.
- Preferujemy slowa zrozumiale dla sadownika zamiast technicznego zargonu.
- W UI termin techniczny moze byc ukryty za bardziej naturalna etykieta.

## Glowna terminologia w UI

| Pojecie domenowe | Etykieta preferowana w UI | Uwagi |
|---|---|---|
| `dashboard` | `Przeglad` lub `Dashboard` | jesli zostawiamy anglicyzm, to konsekwentnie |
| `plot` | `Dzialka` | podstawowa nazwa |
| `tree` | `Drzewo` | podstawowa nazwa |
| `variety` | `Odmiana` | podstawowa nazwa |
| `activity` | `Wpis do dziennika` lub `Aktywnosc` | w nawigacji lepiej `Dziennik` |
| `activity_material` | `Uzyte materialy` | bardziej naturalne niz "material aktywnosci" |
| `season_phase` | `Faza sezonu` | nazwa pomocnicza |
| `batch` | `Zakres drzew` lub `Masowe dodawanie drzew` | unikac technicznego slowa "batch" w UI |
| `location_verified` | `Lokalizacja potwierdzona` | dobra etykieta checkboxa |

## Rekomendowane nazwy sekcji

- `Dzialki`
- `Drzewa`
- `Odmiany`
- `Dziennik`
- `Ustawienia`

## Rekomendowane etykiety akcji

- `Dodaj dzialke`
- `Dodaj drzewo`
- `Dodaj odmiane`
- `Dodaj wpis`
- `Edytuj`
- `Zapisz`
- `Anuluj`
- `Archiwizuj dzialke`
- `Oznacz jako usuniete`

## Nazwy statusow do wyswietlenia

### Dzialki

- `planned -> Planowana`
- `active -> Aktywna`
- `archived -> Zarchiwizowana`

### Drzewa

- `new -> Nowe`
- `good -> Dobre`
- `warning -> Wymaga uwagi`
- `critical -> Krytyczne`
- `removed -> Usuniete`

### Aktywnosci

- `planned -> Zaplanowane`
- `done -> Wykonane`
- `skipped -> Pominiete`
- `cancelled -> Anulowane`

## Nazwy pol formularzy

- `name -> Nazwa`
- `code -> Kod`
- `location_name -> Lokalizacja`
- `area_m2 -> Powierzchnia`
- `soil_type -> Typ gleby`
- `irrigation_type -> Typ nawodnienia`
- `species -> Gatunek`
- `variety_id -> Odmiana`
- `row_number -> Rzad`
- `position_in_row -> Pozycja w rzedzie`
- `section_name -> Sekcja`
- `condition_status -> Kondycja`
- `activity_type -> Typ wpisu`
- `activity_date -> Data`
- `title -> Tytul`
- `description -> Opis`

## Styl komunikatow

- krotko
- konkretnie
- bez obwiniania uzytkownika
- z podpowiedzia, co zrobic dalej

### Przyklady dobrych komunikatow

- `Nie udalo sie zapisac dzialki. Sprawdz nazwe i sprobuj ponownie.`
- `W tej lokalizacji istnieje juz aktywne drzewo.`
- `Nie znaleziono wynikow dla wybranych filtrow.`

### Czego unikac

- `Blad 500`
- `Validation failed`
- `Operation rejected by backend`

## Decyzja jezykowa na MVP

- Interfejs jest projektowany po polsku.
- Nazwa techniczna projektu moze pozostac `OrchardLog`.
- Nazwa widoczna dla uzytkownika moze byc `Sadownik+`.

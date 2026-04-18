# OrchardLog / Sadownik+ - polityka lokalizacji drzew

## Cel dokumentu

Ten dokument porzadkuje sposob zapisu lokalizacji drzew w zaleznosci od typu dzialki i poziomu pewnosci danych.

## 1. Zalozenie glowne

System ma obslugiwac zarowno sady uporzadkowane w rzedach, jak i bardziej nieregularne uklady.
Dlatego polityka lokalizacji musi byc elastyczna, ale na tyle scisla, aby raporty terenowe mialy sens.

Wazne doprecyzowanie etapowe:

- w MVP pola lokalizacji na `trees` sa dostepne od razu,
- explicit `plots.layout_type` i rozbudowane ustawienia ukladu dzialki wchodza dopiero w etapie 0.2,
- w MVP nazwy `rows`, `mixed` i `irregular` traktujemy jako model koncepcyjny pomocny dla walidacji i UX, a nie jako obowiazkowe pole zapisane juz na `plots`.

## 2. Typy ukladu dzialki

### `rows`

Typowy sad rzadowy.
To podstawowy przypadek dla lokalizacji precyzyjnej.

### `mixed`

Czesciowo uporzadkowany uklad.
Nie wszystkie drzewa musza miec pelne pozycjonowanie.

### `irregular`

Uklad nieregularny.
Lokalizacja opiera sie bardziej na sekcji, etykietach i kodach terenowych.

## 3. Kiedy pola lokalizacyjne sa wymagane

### Dla `layout_type = rows`

Wymagane:

- `row_number`
- `position_in_row`

Opcjonalne:

- `section_name`
- `row_label`
- `position_label`
- `tree_code`

### Dla `layout_type = mixed`

Wymagane:

- co najmniej jedna czytelna informacja lokalizacyjna

Rekomendowane pola:

- `section_name`
- `row_number`
- `position_in_row`
- `tree_code`

### Dla `layout_type = irregular`

Wymagane:

- co najmniej jedno praktyczne oznaczenie lokalizacji

Rekomendowane pola:

- `section_name`
- `row_label`
- `position_label`
- `tree_code`

## 4. Znaczenie poszczegolnych pol

- `section_name` - elastyczna nazwa sekcji lub kwatery
- `row_number` - logiczny numer rzedu
- `position_in_row` - pozycja drzewa w rzedzie
- `row_label` - tekstowa etykieta rzedu, jesli numeracja nie wystarcza
- `position_label` - tekstowa etykieta pozycji
- `tree_code` - terenowy identyfikator drzewa lub miejsca
- `location_verified` - potwierdzenie, ze lokalizacja jest wiarygodna

## 5. Zasady raportowe

- Raporty lokalizacji odmiany powinny preferowac drzewa z `location_verified = true`.
- W minimalnej wersji raport moze dopuszczac drzewa bez potwierdzenia, jesli lokalizacja jest wystarczajaco konkretna.
- Drzewa bez sensownej lokalizacji nie powinny trafic do raportu terenowego.

## 6. Zasady integralnosci

- Dla dzialki `rows` aktywne drzewo nie moze duplikowac lokalizacji `plot + row + position`.
- `row_number` i `position_in_row` powinny byc dodatnie.
- Jesli drzewo jest kluczowe dla raportow odmianowych, warto oznaczyc `location_verified = true`.

## 7. Rekomendacja MVP

- Juz w MVP przechowywac pola potrzebne do rozwoju lokalizacji.
- W pierwszym wydaniu pozwolic na bardziej elastyczne uzupelnianie danych.
- W MVP lokalizacja rzedowa moze byc wnioskowana z obecnosci `row_number` i `position_in_row`, nawet bez osobnego `layout_type` na dzialce.
- W etapie 0.2 dopracowac formularze i reguly dla batch create i raportow terenowych.

## 8. Decyzja na obecnym etapie

- `plot_sections` nie jest jeszcze osobna tabela.
- Na start wystarcza `section_name`.

# OrchardLog / Sadownik+ - formularze i pola

## Cel dokumentu

Ten dokument zbiera minimalny zestaw formularzy potrzebnych do MVP oraz podstawowe wymagania dla ich pol.
Ma pomoc przy projektowaniu UI, walidacji i kontraktow operacji.

## Zasady ogolne formularzy

- Formularze maja byc krotkie i mobilne.
- Pola wymagane musza byc jasno oznaczone.
- Pola opcjonalne powinny byc schowane w sekcji `rozszerzone`, jesli nie sa potrzebne na co dzien.
- Bledy walidacji musza byc zrozumiale i odnosic sie do konkretnego pola.
- Wartosci domyslne powinny ograniczac liczbe klikniec.
- Standardowe formularze domenowe nie przesylaja recznie `orchard_id`; pracuja w kontekscie `active_orchard`.
- Jesli create/edit flow konczy sie redirectem na liste albo detail, ekran docelowy powinien pokazac czytelne potwierdzenie sukcesu.

## 1. Formularz rejestracji

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `email` | tak | brak | poprawny format email |
| `password` | tak | brak | minimalna dlugosc zgodna z polityka auth |
| `display_name` | nie | brak | nazwa wyswietlana usera |

## 2. Formularz `Create orchard`

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `name` | tak | brak | nazwa orchard |
| `code` | nie | brak | opcjonalny skrot |
| `description` | nie | brak | opis organizacyjny |
| `dismiss_intro` | nie | `false` | pole pomocnicze UI; nie nalezy do `OrchardFormInput`, zapisuje `orchard_onboarding_dismissed_at` tylko dla warstwy informacyjnej |

## 3. Formularz zaproszenia czlonka orchard

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `email` | tak | brak | poprawny format email; konto musi juz istniec |
| `role` | tak | `worker` | aktualny UI wysyla ukryte `worker`; model i kontrakty pozostaja future-ready na `manager`, `viewer` |

## 4. Formularz dzialki

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `name` | tak | brak | unikalna nazwa w obrebie aktywnego `orchard` |
| `code` | nie | bezpieczna sugestia lub brak | opcjonalny skrot, najlepiej unikalny jesli uzywany; create flow moze zaproponowac kolejny kod, ale nie nadpisuje wartosci wpisanej recznie |
| `description` | nie | brak | dluzszy opis dzialki |
| `location_name` | nie | brak | opis lokalizacji |
| `area_m2` | nie | brak | liczba dodatnia |
| `soil_type` | nie | brak | tekst |
| `irrigation_type` | nie | brak | tekst |
| `status` | tak | `active` | `planned`, `active`, `archived` |
| `is_active` | techniczne | `true` | sterowane przez status, nie jako osobne pole UI w Phase 2 |

### Pola ukladu dzialki

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `layout_type` | tak | `rows` | `rows`, `mixed`, `irregular` |
| `row_numbering_scheme` | nie | brak | np. `left_to_right_from_entrance`, `north_to_south`, `custom` |
| `tree_numbering_scheme` | nie | brak | np. `from_row_start`, `from_row_end`, `custom` |
| `entrance_description` | nie | brak | opis punktu odniesienia |
| `layout_notes` | nie | brak | dodatkowe informacje o ukladzie |
| `default_row_count` | nie | brak | liczba dodatnia |
| `default_trees_per_row` | nie | brak | liczba dodatnia |

## 5. Formularz drzewa

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `plot_id` | tak | ostatnio uzyta dzialka lub brak | musi nalezec do aktywnego `orchard` |
| `species` | tak | `apple` lub brak | preset `apple`, `pear`, `plum`, `cherry` albo wlasna wartosc |
| `variety_id` | nie | brak | jesli ustawione, odmiana tego samego `orchard` |
| `tree_code` | nie | brak | opcjonalny identyfikator terenowy |
| `display_name` | nie | brak | przyjazna nazwa |
| `row_number` | warunkowo | brak | wymagane dla dzialek typu `rows` |
| `position_in_row` | warunkowo | brak | wymagane dla dzialek typu `rows` |
| `section_name` | nie | brak | szczegolnie przy `mixed` i `irregular` |
| `row_label` | nie | brak | opcjonalna etykieta alternatywna |
| `position_label` | nie | brak | opcjonalna etykieta alternatywna |
| `planted_at` | nie | brak | data |
| `acquired_at` | nie | brak | data |
| `rootstock` | nie | brak | tekst |
| `pollinator_info` | nie | brak | tekst |
| `condition_status` | tak | `good` | `new`, `good`, `warning`, `critical`, `removed` |
| `health_status` | nie | brak | tekst |
| `development_stage` | nie | brak | tekst |
| `last_harvest_at` | nie | brak | data |
| `notes` | nie | brak | dluzsze notatki |
| `location_verified` | nie | `false` | mozna zaznaczyc przy pewnej lokalizacji |
| `is_active` | techniczne | `true` | kontrolowane przez logike systemu; przy `removed` powinno byc `false` |

### Walidacje specjalne dla drzewa

- `layout_type` jest juz pelnym polem formularza dzialki i pozwala zapisac orientacje oraz numeracje terenu.
- Formularz drzewa nie powinien pozwalac zapisac drzewa do dzialki `archived`; user musi wybrac dzialke aktywna albo planowana.
- Po wyborze dzialki formularz powinien pokazywac guidance z `layout_type`, numeracja, planowana siatka, punktem odniesienia i notatkami ukladu.
- Dla `layout_type = rows` wymagane sa `row_number` i `position_in_row`.
- Dla `layout_type = mixed` i `layout_type = irregular` wymagane jest co najmniej jedno praktyczne oznaczenie lokalizacji, np. `section_name`, `row_label`, `position_label`, `tree_code` albo komplet `row_number + position_in_row`.
- Aktywne drzewo nie moze duplikowac lokalizacji `plot + row + position`.
- Jesli ustawiono `variety_id`, system powinien pilnowac zgodnosci orchard.

## 6. Formularz odmiany

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `species` | tak | `apple` lub brak | preset `apple`, `pear`, `plum`, `cherry` albo wlasna wartosc |
| `name` | tak | brak | unikalne razem z `species` w obrebie aktywnego `orchard` |
| `description` | nie | brak | opis ogolny |
| `care_notes` | nie | brak | zalecenia pielegnacyjne |
| `characteristics` | nie | brak | cechy odmiany |
| `ripening_period` | nie | brak | np. wrzesien-pazdziernik |
| `resistance_notes` | nie | brak | odpornosc / podatnosc |
| `origin_country` | nie | brak | kraj pochodzenia |
| `is_favorite` | tak | `false` | przechowywane jako boolean |

### Filtr raportu lokalizacji odmiany - etap 0.2

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `variety_id` | tak | brak | musi wskazywac odmiane z aktywnego `orchard`; raport uruchamia sie po wyborze jednej odmiany |

### Zachowanie raportu lokalizacji odmiany

- Raport pokazuje tylko aktywne drzewa wybranej odmiany.
- Do grup terenowych trafiaja tylko rekordy z kompletnym `row_number` i `position_in_row`.
- UI powinno osobno pokazywac liczbe drzew poza raportem, jesli odmiana ma aktywne rekordy bez precyzyjnej lokalizacji.
- W grupach i zakresach trzeba zachowac informacje o `location_verified`, aby odroznic lokalizacje potwierdzone od niepotwierdzonych.

## 7. Formularz aktywnosci

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `plot_id` | tak | ostatnio uzyta dzialka lub brak | musi nalezec do aktywnego `orchard` |
| `tree_id` | nie | brak | jesli ustawione, musi nalezec do tej samej dzialki |
| `activity_type` | tak | `other` lub ostatni wybor | wartosc z kontrolowanej listy |
| `activity_subtype` | warunkowo | brak | wymagane dla `pruning`; MVP: `winter_pruning`, `summer_pruning` |
| `activity_date` | tak | dzisiaj | dla `planned` oznacza date planowana |
| `title` | tak | brak | krotki, czytelny opis |
| `description` | nie | brak | szczegoly zdarzenia |
| `status` | tak | `done` | `planned`, `done`, `skipped`, `cancelled` |
| `work_duration_minutes` | nie | brak | liczba nieujemna |
| `cost_amount` | nie | brak | liczba nieujemna |
| `weather_notes` | nie | brak | tekst |
| `result_notes` | nie | brak | tekst |
| `performed_by_profile_id` | nie | aktualny user lub brak | wykonawca z aktywnego `orchard` |
| `performed_by` | nie | nazwa usera | tekst |
| `season_year` | tak | wyliczane z daty | pole techniczno-biznesowe |
| `season_phase` | nie | sugestia z daty | mozliwa korekta przez usera |

### Podformularz `activity_scopes`

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `scope_level` | tak | `plot` | `plot`, `section`, `row`, `location_range`, `tree` |
| `section_name` | warunkowo | brak | wymagane dla `section`; opcjonalne doprecyzowanie dla innych zakresow |
| `row_number` | warunkowo | brak | wymagane dla `row` i `location_range` |
| `from_position` | warunkowo | brak | wymagane dla `location_range` |
| `to_position` | warunkowo | brak | wymagane dla `location_range`, musi byc `>= from_position` |
| `tree_id` | warunkowo | brak | wymagane dla `scope_level = tree`; drzewo z tej samej dzialki |
| `notes` | nie | brak | komentarz tylko dla tego zakresu |

### Walidacje specjalne dla aktywnosci sezonowych

- Dla `pruning` `activity_subtype` jest wymagane.
- Jedna aktywnosc moze miec wiele rekordow `activity_scopes`.
- Po wyborze dzialki formularz powinien pokazywac guidance z `layout_type`, numeracja i punktem odniesienia.
- W dedykowanym flow sezonowym `pruning`, `mowing` i `spraying` powinny zapisywac
  co najmniej jeden rekord `activity_scopes`; dla calej dzialki jest to scope `plot`.
- Dla `scope_level = plot` nie wymagamy dodatkowych pol lokalizacyjnych.
- Dla `scope_level = section` wymagane jest `section_name`.
- Dla `scope_level = row` wymagane jest `row_number`.
- Dla `scope_level = location_range` wymagane sa `row_number`, `from_position`, `to_position`.
- Dla dzialki `irregular` formularz powinien blokowac `scope_level = row` i `scope_level = location_range`.
- Dla `scope_level = tree` wymagane jest `tree_id`.
- `scope_order`, jesli jest przesylane, powinno byc dodatnia liczba calkowita i sluzy tylko
  do zachowania kolejnosci zakresow w UI.
- Jesli aktywnosc ma `tree_id` na poziomie glownego formularza, system powinien dopilnowac spojnosci z `activity_scopes` albo automatycznie utworzyc scope typu `tree`.
- Dla `spraying` UI powinno mocno eksponowac sekcje materialow, pogody i efektu zabiegu.

### Podformularz `activity_materials`

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `name` | tak | brak | nazwa materialu |
| `category` | nie | brak | np. spray, fertilizer, fuel |
| `quantity` | nie | brak | liczba nieujemna |
| `unit` | nie | brak | np. `l`, `kg`, `ml` |
| `notes` | nie | brak | dodatkowy komentarz |

### Filtry podsumowania sezonowego aktywnosci na `/activities`

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `summary_season_year` | tak | biezacy rok kalendarzowy | liczba calkowita z sensownego zakresu |
| `summary_activity_type` | tak | `pruning` | tylko `pruning`, `mowing`, `spraying` |
| `summary_activity_subtype` | warunkowo | brak | obslugiwane tylko dla `summary_activity_type = pruning` |
| `summary_plot_id` | nie | brak | po wyborze wlacza panel coverage |
| `summary_performed_by_profile_id` | nie | brak | wykonawca z aktywnego `orchard` |

## 8. Formularz zbioru

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `harvest_date` | tak | dzisiaj | data zbioru |
| `scope_level` | tak | `variety` | `orchard`, `plot`, `variety`, `location_range`, `tree` |
| `plot_id` | warunkowo | ostatnio uzyta dzialka lub brak | wymagane dla `plot`, `location_range`, zwykle tez dla `tree` |
| `variety_id` | nie | brak | rekomendowane dla raportow per odmiana |
| `tree_id` | warunkowo | brak | wymagane dla `scope_level = tree` |
| `section_name` | nie | brak | opcjonalne doprecyzowanie miejsca zbioru |
| `row_number` | warunkowo | brak | wymagane dla `location_range` |
| `from_position` | warunkowo | brak | wymagane dla `location_range` |
| `to_position` | warunkowo | brak | wymagane dla `location_range`, musi byc `>= from_position` |
| `quantity_value` | tak | brak | liczba dodatnia |
| `quantity_unit` | tak | `kg` | `kg`, `t` |
| `notes` | nie | brak | komentarz biznesowy |
| `activity_id` | nie | brak | opcjonalne powiazanie z aktywnoscia typu `harvest` |

### Walidacje specjalne dla zbioru

- `quantity_value` musi byc dodatnie.
- `season_year` powinno byc wyliczane z `harvest_date`.
- Po wyborze dzialki formularz powinien pokazywac guidance z `layout_type`, numeracja i punktem odniesienia.
- Dla `scope_level = location_range` wymagane sa `plot_id`, `row_number`, `from_position`, `to_position`.
- Dla dzialki `irregular` formularz powinien blokowac `scope_level = location_range`.
- Dla `scope_level = tree` wymagane jest `tree_id`.
- Jesli ustawiono `tree_id`, system powinien uzupelnic albo zweryfikowac zgodnosc `plot_id` i `variety_id`.
- Jednostka raportowa systemu powinna byc liczona po `quantity_kg`, niezaleznie od jednostki wpisanej przez usera.

### Filtry raportu lokalizacji zbiorow - etap 0.2

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `season_year` | tak | biezacy rok kalendarzowy | liczba calkowita z sensownego zakresu |
| `plot_id` | nie | brak | jesli ustawione, raport ogranicza sie do jednej dzialki |
| `variety_id` | nie | brak | jesli ustawione, raport ogranicza sie do rekordow z przypisana odmiana |

### Zachowanie raportu lokalizacji zbiorow

- Raport pracuje na `harvest_records`, ale dla scope `tree` moze odziedziczyc lokalizacje z drzewa.
- Wpis jest uznany za precyzyjnie zlokalizowany, gdy finalnie ma `plot_id`, `row_number`, `from_position` i `to_position`.
- Wpisy `orchard`, `plot` i `variety` bez konkretnego rzedu nie znikaja z raportu; trafiaja do licznika `bez precyzyjnej lokalizacji`.

## 9. Formularz batchowego dodawania drzew - etap 0.2

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `plot_id` | tak | brak | dzialka aktywnego orchard |
| `species` | tak | brak | tekst |
| `variety_id` | nie | brak | odmiana aktywnego orchard |
| `section_name` | nie | brak | sekcja / kwatera |
| `row_number` | tak | brak | liczba dodatnia |
| `from_position` | tak | brak | liczba dodatnia |
| `to_position` | tak | brak | musi byc `>= from_position` |
| `generated_tree_code_pattern` | nie | brak | np. `DZ1-R3-T{{n}}` |
| `default_condition_status` | tak | `new` | status nowych drzew |
| `default_planted_at` | nie | brak | data |
| `default_rootstock` | nie | brak | tekst |
| `default_notes` | nie | brak | wspolne notatki |

### Walidacje specjalne dla batcha

- Caly zakres musi byc sprawdzony przed utworzeniem rekordow.
- Konflikt w jednej pozycji powinien zatrzymac caly batch.
- Dzialka i odmiana musza nalezec do tego samego `orchard`.
- Formularz powinien pokazywac guidance z wybranej dzialki i blokowac create / preview dla `layout_type = irregular`.
- `generated_tree_code_pattern`, jesli jest podany, musi zawierac placeholder `{{n}}`.
- `default_condition_status` wspiera tylko statusy aktywnych drzew: `new`, `good`, `warning`, `critical`.
- Create step jest dostepny dopiero po udanym preview bez konfliktow.

## 9A. Formularz masowego wycofania drzew - etap 0.2

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `plot_id` | tak | brak | dzialka aktywnego orchard |
| `row_number` | tak | brak | liczba dodatnia |
| `from_position` | tak | brak | liczba dodatnia |
| `to_position` | tak | brak | musi byc `>= from_position` |
| `reason` | nie | brak | opcjonalny powod, dopisywany do `trees.notes` dla zmienionych rekordow |

### Walidacje specjalne dla masowego wycofania

- Formularz powinien pokazywac guidance z wybranej dzialki i blokowac preview / write dla `layout_type = irregular`.
- Preview pokazuje tylko aktywne drzewa z wybranego zakresu.
- Puste pozycje albo drzewa juz nieaktywne nie blokuja preview, ale sa zwracane jako ostrzezenia.
- Write step jest dostepny dopiero po preview z co najmniej jednym matching aktywnym drzewem.
- Finalny zapis ustawia `condition_status = removed` oraz `is_active = false` bez fizycznego kasowania rekordu.

## 10. Formularz profilu

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `display_name` | nie | brak | nazwa wyswietlana |
| `locale` | nie | `pl` | w MVP mozna ograniczyc do `pl` |
| `timezone` | nie | `Europe/Warsaw` | lista stref czasowych |

### Karta `Eksport konta`

To nie jest klasyczny formularz zapisu, tylko akcja pobrania pliku JSON z danymi konta.

| Element | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `Pobierz eksport konta` | tak | aktywny dla eligible ownera albo `super_admin` | dla zwyklego usera wymaga co najmniej jednego aktywnego membership `owner`; dla `super_admin` pozostaje dostepne takze bez aktywnego orchard |
| `pending state` | techniczne | ukryty | podczas pobierania blokuje ponowne klikniecie i pokazuje stan przygotowywania eksportu |
| `success message` | techniczne | ukryty | potwierdza pobranie i zakres liczby orchard zgodny z aktualnym `scope` eksportu |
| `error message` | techniczne | ukryty | pokazuje blad route `/settings/profile/export` lub brak uprawnien |

Uwagi:

- Eksport jest account-wide.
- Dla zwyklego usera obejmuje tylko orchards, dla ktorych ma aktywne membership `owner`.
- Dla `super_admin` obejmuje wszystkie orchard dostepne administracyjnie.
- User pracujacy wylacznie jako `worker` widzi zablokowany stan informacyjny, bez CTA do pobrania.
- `/settings/profile` jest authenticated account screen i pozostaje dostepne dla `super_admin` takze bez aktywnego orchard.
- Plik pobiera sie jako JSON z route `GET /settings/profile/export`.

## 11. Formularz ustawien orchard

| Pole | Wymagane | Domyslna wartosc | Walidacja / uwagi |
|---|---:|---|---|
| `name` | tak | obecna wartosc | nazwa orchard |
| `code` | nie | obecna wartosc | skrot |
| `description` | nie | obecna wartosc | opis |

Uwagi:

- aktualny formularz settings jest owner-only
- w obecnym release nie edytujemy z tego poziomu `status`

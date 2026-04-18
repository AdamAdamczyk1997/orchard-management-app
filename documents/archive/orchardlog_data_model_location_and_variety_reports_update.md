# 🌳 OrchardLog / Sadownik+ — Aktualizacja modelu bazy danych pod lokalizację i zbiory odmianowe

## Cel aktualizacji

Ta aktualizacja rozszerza wcześniejszy model bazy danych o obsługę:

- **precyzyjnej lokalizacji drzew w sadzie**,
- **wyszukiwania i listowania miejsc występowania danej odmiany**,
- **raportów zbiorczych dla odmiany rozrzuconej po wielu działkach i rzędach**,
- **masowego tworzenia drzew w zakresie pozycji**, np.:
  - działka 1,
  - rząd 3,
  - od drzewa 50 do drzewa 150,
  - odmiana `Ligol`.

Ten dokument nie zastępuje poprzedniego modelu — jest jego **aktualizacją i uszczegółowieniem**.

---

# 1. Problem biznesowy, który zabezpieczamy już teraz

Sadownik może mieć jedną odmianę rozrzuconą po wielu miejscach, np.:

- działka 1, rząd 3, drzewa 50–150,
- działka 1, rząd 4, drzewa 1–40,
- działka 2, rząd 1, drzewa 10–35.

System ma umożliwiać odpowiedź na pytania:

- **Gdzie w sadzie znajduje się odmiana Ligol?**
- **Jakie lokalizacje trzeba odwiedzić podczas zbioru danej odmiany?**
- **Jak szybko założyć w systemie cały zakres drzew tej samej odmiany?**
- **Ile zebrano tej odmiany w danym sezonie i z jakich miejsc?**

Aby to było możliwe, model danych musi opisywać:
- położenie drzewa,
- zasady numeracji w obrębie działki,
- możliwość grupowania drzew w zakresy,
- możliwość hurtowego utworzenia wielu drzew,
- oraz możliwość przypisania zbioru do odmiany, dzialki i zakresu lokalizacji.

## Decyzja 5

Raport lokalizacji odmiany i raport zbiorow nie powinny byc mylone.

- raport lokalizacji odmiany liczymy z `trees`
- raport zbiorow liczymy z `harvest_records`
- oba raporty korzystaja z tych samych danych lokalizacyjnych: `plot_id`, `section_name`, `row_number`, `from_position`, `to_position`

---

# 2. Najważniejsze decyzje projektowe

## Decyzja 1
Każde drzewo nadal reprezentuje **jeden fizyczny obiekt**.

To oznacza, że:
- jedno drzewo = jeden rekord w tabeli `trees`.

Dzięki temu:
- można prowadzić indywidualną historię,
- można zapisywać stan każdego drzewa,
- można notować choroby, obserwacje i zabiegi per drzewo.

## Decyzja 2
Jednocześnie system ma wspierać **masowe zakładanie drzew**.

Czyli użytkownik nie dodaje ręcznie 101 rekordów, tylko podaje:
- działkę,
- rząd,
- zakres pozycji,
- odmianę,
- opcjonalnie wspólne cechy,

a system tworzy wiele rekordów `trees` automatycznie.

## Decyzja 3
Raporty odmianowe nie będą trzymane jako osobna trwała tabela w MVP.

Będą liczone na podstawie danych z `trees`, grupując:
- po działce,
- po sekcji,
- po rzędzie,
- po kolejnych pozycjach w rzędzie.

To daje elastyczność i nie duplikuje danych.

## Decyzja 4
Dla każdej działki trzeba zdefiniować **zasady orientacji i numeracji**.

Bez tego numeracja rzędów i drzew może być niejednoznaczna.

---

# 3. Zmiany w modelu danych

## Tabele objęte zmianami

- `plots` — rozszerzenie o schemat układu i numeracji
- `trees` — rozszerzenie o dokładniejszą lokalizację i ograniczenia integralności
- nowa tabela `bulk_tree_import_batches` — rejestr operacji masowego tworzenia drzew *(opcjonalna, ale bardzo zalecana)*
- opcjonalnie nowa tabela `plot_sections` — jeśli chcesz formalnie wspierać sekcje / kwatery

---

# 4. Rozszerzenie tabeli `plots`

## Cel
Działka musi przechowywać informacje, jak interpretować rzędy i pozycje drzew.

Bez tego komunikat:
> „rząd 3, drzewa 50–150”
może być niejednoznaczny.

## Nowe pola w `plots`

| Pole | Typ | Wymagane | Opis |
|---|---|---:|---|
| `layout_type` | `text` | tak | Typ układu działki |
| `row_numbering_scheme` | `text` | nie | Zasada numeracji rzędów |
| `tree_numbering_scheme` | `text` | nie | Zasada numeracji drzew w rzędzie |
| `entrance_description` | `text` | nie | Opis punktu odniesienia, np. od strony wjazdu |
| `layout_notes` | `text` | nie | Dodatkowe notatki o orientacji działki |
| `default_row_count` | `integer` | nie | Przybliżona liczba rzędów |
| `default_trees_per_row` | `integer` | nie | Typowa liczba drzew w rzędzie |

## Proponowane wartości `layout_type`
- `rows`
- `mixed`
- `irregular`

### Interpretacja
- `rows` — typowy sad z rzędami
- `mixed` — częściowo uporządkowany układ
- `irregular` — nieregularne rozmieszczenie

## Proponowane wartości `row_numbering_scheme`
- `left_to_right_from_entrance`
- `right_to_left_from_entrance`
- `north_to_south`
- `south_to_north`
- `custom`

## Proponowane wartości `tree_numbering_scheme`
- `from_row_start`
- `from_row_end`
- `custom`

## SQL — rozszerzenie `plots`

```sql
alter table plots
  add column layout_type text not null default 'rows'
    check (layout_type in ('rows', 'mixed', 'irregular')),
  add column row_numbering_scheme text
    check (
      row_numbering_scheme in (
        'left_to_right_from_entrance',
        'right_to_left_from_entrance',
        'north_to_south',
        'south_to_north',
        'custom'
      )
    ),
  add column tree_numbering_scheme text
    check (
      tree_numbering_scheme in (
        'from_row_start',
        'from_row_end',
        'custom'
      )
    ),
  add column entrance_description text,
  add column layout_notes text,
  add column default_row_count integer,
  add column default_trees_per_row integer;
```

## Przykładowy rekord po rozszerzeniu

```json
{
  "id": "81cb55aa-24cb-4e65-a620-1d1a9d5b0901",
  "user_id": "3d1dd3f1-3e4a-4c56-a3ad-cf24e4839d01",
  "name": "Działka 1",
  "code": "DZ-1",
  "layout_type": "rows",
  "row_numbering_scheme": "left_to_right_from_entrance",
  "tree_numbering_scheme": "from_row_start",
  "entrance_description": "Wjazd od strony zachodniej",
  "layout_notes": "Rzędy numerowane od lewej do prawej patrząc od wjazdu.",
  "default_row_count": 8,
  "default_trees_per_row": 180
}
```

---

# 5. Rozszerzenie tabeli `trees`

## Cel
Drzewo musi mieć lokalizację wystarczająco dokładną, aby:
- znaleźć je fizycznie,
- zbudować raport zbioru odmiany,
- grupować drzewa w zakresy.

## Pola już istniejące i kluczowe
- `plot_id`
- `variety_id`
- `row_number`
- `position_in_row`
- `tree_code`

To był bardzo dobry fundament. Teraz go doprecyzowujemy.

## Nowe lub doprecyzowane pola w `trees`

| Pole | Typ | Wymagane | Opis |
|---|---|---:|---|
| `section_name` | `text` | nie | Sekcja/kwatera w działce |
| `row_label` | `text` | nie | Etykieta rzędu, jeśli używane są oznaczenia |
| `position_label` | `text` | nie | Etykieta pozycji, jeśli potrzebna |
| `location_verified` | `boolean` | tak | Czy lokalizacja została potwierdzona |
| `planted_batch_id` | `uuid` | nie | Id operacji masowego utworzenia |

## Dlaczego `section_name`
Nie każda działka będzie idealnie prostokątna i w pełni rzędowa.  
Pole `section_name` daje elastyczność bez komplikowania modelu.

Przykłady:
- `A`
- `kwatera północ`
- `sektor szkółka`

## Dlaczego `location_verified`
Pozwala odróżnić:
- lokalizację pewną,
od:
- lokalizacji domyślnej / importowanej / niepotwierdzonej.

To będzie ważne przy przyszłych raportach terenowych.

## SQL — rozszerzenie `trees`

```sql
alter table trees
  add column section_name text,
  add column row_label text,
  add column position_label text,
  add column location_verified boolean not null default false,
  add column planted_batch_id uuid;
```

## Bardzo ważne ograniczenie unikalności

W uporządkowanym sadzie nie powinny istnieć dwa drzewa w tej samej lokalizacji logicznej.

### Zalecane ograniczenie

```sql
create unique index uq_trees_plot_row_position
  on trees (plot_id, row_number, position_in_row)
  where row_number is not null and position_in_row is not null and is_active = true;
```

To oznacza:
- na jednej działce,
- w jednym rzędzie,
- na jednej pozycji,
- nie może istnieć więcej niż jedno aktywne drzewo.

## Dodatkowe indeksy

```sql
create index idx_trees_variety_location
  on trees (variety_id, plot_id, row_number, position_in_row);

create index idx_trees_plot_location
  on trees (plot_id, row_number, position_in_row);

create index idx_trees_plot_section_row
  on trees (plot_id, section_name, row_number, position_in_row);
```

## Przykładowe rekordy

```json
[
  {
    "id": "dd4bc20b-efb3-4265-817d-b7f9279a4701",
    "user_id": "3d1dd3f1-3e4a-4c56-a3ad-cf24e4839d01",
    "plot_id": "81cb55aa-24cb-4e65-a620-1d1a9d5b0901",
    "variety_id": "e4f1fb13-f15b-426c-a650-fcf061d64201",
    "tree_code": "DZ1-R3-T50",
    "species": "jabłoń",
    "section_name": "A",
    "row_number": 3,
    "position_in_row": 50,
    "condition_status": "good",
    "location_verified": true
  },
  {
    "id": "b847ec12-0ff0-49aa-a47d-079c9c889302",
    "user_id": "3d1dd3f1-3e4a-4c56-a3ad-cf24e4839d01",
    "plot_id": "81cb55aa-24cb-4e65-a620-1d1a9d5b0901",
    "variety_id": "e4f1fb13-f15b-426c-a650-fcf061d64201",
    "tree_code": "DZ1-R3-T51",
    "species": "jabłoń",
    "section_name": "A",
    "row_number": 3,
    "position_in_row": 51,
    "condition_status": "good",
    "location_verified": true
  }
]
```

---

# 6. Nowa tabela `bulk_tree_import_batches`

## Cel
Masowe tworzenie drzew w zakresie jest ważnym przypadkiem biznesowym i warto je śledzić.

Ta tabela nie przechowuje samych drzew — przechowuje **operację hurtowego utworzenia**.

Dzięki temu można:
- wiedzieć, skąd wzięły się rekordy,
- ewentualnie cofnąć batch,
- analizować importy i generowanie zakresów,
- pokazać użytkownikowi historię masowych operacji.

## Relacja
- 1 użytkownik → wiele batchy
- 1 działka → wiele batchy
- 1 odmiana → wiele batchy
- 1 batch → wiele drzew

## Pola

| Pole | Typ | Wymagane | Opis |
|---|---|---:|---|
| `id` | `uuid` | tak | Klucz główny |
| `user_id` | `uuid` | tak | Właściciel |
| `plot_id` | `uuid` | tak | Działka |
| `variety_id` | `uuid` | nie | Odmiana |
| `species` | `text` | tak | Gatunek |
| `section_name` | `text` | nie | Sekcja |
| `row_number` | `integer` | tak | Numer rzędu |
| `from_position` | `integer` | tak | Pozycja początkowa |
| `to_position` | `integer` | tak | Pozycja końcowa |
| `generated_tree_code_pattern` | `text` | nie | Wzorzec kodu, np. `DZ1-R3-T{{n}}` |
| `default_condition_status` | `text` | tak | Domyślny status utworzonych drzew |
| `default_planted_at` | `date` | nie | Domyślna data sadzenia |
| `default_rootstock` | `text` | nie | Domyślna podkładka |
| `default_notes` | `text` | nie | Wspólne notatki |
| `created_count` | `integer` | nie | Liczba utworzonych rekordów |
| `status` | `text` | tak | Status operacji |
| `created_at` | `timestamptz` | tak | Data utworzenia |

## Ograniczenia
- `from_position <= to_position`
- status np.:
  - `draft`
  - `done`
  - `failed`
  - `partially_done`

## SQL — definicja

```sql
create table bulk_tree_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plot_id uuid not null references plots(id) on delete cascade,
  variety_id uuid references varieties(id) on delete set null,
  species text not null,
  section_name text,
  row_number integer not null,
  from_position integer not null,
  to_position integer not null,
  generated_tree_code_pattern text,
  default_condition_status text not null default 'new'
    check (default_condition_status in ('new', 'good', 'warning', 'critical', 'removed')),
  default_planted_at date,
  default_rootstock text,
  default_notes text,
  created_count integer,
  status text not null default 'done'
    check (status in ('draft', 'done', 'failed', 'partially_done')),
  created_at timestamptz not null default now(),
  check (from_position <= to_position)
);
```

## Powiązanie z `trees`

```sql
alter table trees
  add constraint fk_trees_planted_batch
  foreign key (planted_batch_id)
  references bulk_tree_import_batches(id)
  on delete set null;
```

## Przykładowy rekord batcha

```json
{
  "id": "6a7b4e57-713a-4b62-9f6f-1e5d45b2c401",
  "user_id": "3d1dd3f1-3e4a-4c56-a3ad-cf24e4839d01",
  "plot_id": "81cb55aa-24cb-4e65-a620-1d1a9d5b0901",
  "variety_id": "e4f1fb13-f15b-426c-a650-fcf061d64201",
  "species": "jabłoń",
  "section_name": "A",
  "row_number": 3,
  "from_position": 50,
  "to_position": 150,
  "generated_tree_code_pattern": "DZ1-R3-T{{n}}",
  "default_condition_status": "new",
  "default_planted_at": "2026-03-20",
  "default_rootstock": "M26",
  "default_notes": "Nasadzenie wiosenne, partia Ligol.",
  "created_count": 101,
  "status": "done"
}
```

---

# 7. Jak działa masowe tworzenie drzew

## Scenariusz użytkownika

Użytkownik wybiera:
- działka: `Działka 1`
- sekcja: `A`
- rząd: `3`
- zakres: `50–150`
- odmiana: `Ligol`
- gatunek: `jabłoń`
- opcjonalnie:
  - data sadzenia,
  - podkładka,
  - status,
  - notatki

System:
1. tworzy rekord batcha w `bulk_tree_import_batches`,
2. tworzy rekordy `trees` dla pozycji 50..150,
3. ustawia:
   - wspólne `plot_id`,
   - wspólne `variety_id`,
   - wspólne `row_number`,
   - kolejne `position_in_row`,
   - wygenerowany `tree_code`,
   - `planted_batch_id`.

## Przykładowe wygenerowane rekordy

### Początek zakresu

```json
{
  "tree_code": "DZ1-R3-T50",
  "plot_id": "81cb55aa-24cb-4e65-a620-1d1a9d5b0901",
  "variety_id": "e4f1fb13-f15b-426c-a650-fcf061d64201",
  "section_name": "A",
  "row_number": 3,
  "position_in_row": 50,
  "planted_batch_id": "6a7b4e57-713a-4b62-9f6f-1e5d45b2c401"
}
```

### Koniec zakresu

```json
{
  "tree_code": "DZ1-R3-T150",
  "plot_id": "81cb55aa-24cb-4e65-a620-1d1a9d5b0901",
  "variety_id": "e4f1fb13-f15b-426c-a650-fcf061d64201",
  "section_name": "A",
  "row_number": 3,
  "position_in_row": 150,
  "planted_batch_id": "6a7b4e57-713a-4b62-9f6f-1e5d45b2c401"
}
```

---

# 8. Reguły integralności, które trzeba zapewnić już teraz

## Reguła 1
Na jednej działce nie może istnieć więcej niż jedno aktywne drzewo w tej samej pozycji:
- `plot_id`
- `row_number`
- `position_in_row`

## Reguła 2
Masowe tworzenie nie może nadpisać istniejących drzew.

Przed wykonaniem batcha system musi sprawdzić, czy w zadanym zakresie nie ma już rekordów.

## Reguła 3
Jeśli batch tworzy drzewa z przypisaną odmianą, odmiana musi należeć do tego samego użytkownika.

## Reguła 4
Jeśli batch tworzy drzewa na działce, działka musi należeć do tego samego użytkownika.

## Reguła 5
W raporcie odmianowym uwzględniamy tylko drzewa:
- aktywne,
- z uzupełnioną lokalizacją,
- z przypisaną odmianą.

## Reguła 6
Jeśli `layout_type = 'rows'`, to dla drzewa powinny być wymagane:
- `row_number`
- `position_in_row`

To można wymusić:
- walidacją aplikacyjną,
- triggerem,
- lub częściowo constraintem.

---

# 9. Jak budować raport „gdzie znaleźć odmianę”

## Dane wejściowe
System filtruje tabelę `trees` po:
- `user_id`
- `variety_id`
- `is_active = true`

Następnie grupuje po:
- `plot_id`
- `section_name`
- `row_number`

Potem sortuje po:
- `position_in_row`

Na końcu scala kolejne pozycje w zakresy.

## Wynik końcowy
Przykład:

- Działka 1, sekcja A, rząd 3, drzewa 50–150
- Działka 1, sekcja A, rząd 4, drzewa 1–40
- Działka 2, sekcja B, rząd 1, drzewa 10–35

## Ważne
Te zakresy nie powinny być trzymane jako podstawowe dane źródłowe.  
To powinien być **widok / raport / wynik zapytania**.

---

# 10. Przykładowa logika raportowa

## Widok użytkowy
Dla odmiany `Ligol`:

> Odmianę Ligol znajdziesz:
> - na działce 1, sekcja A, rząd 3, drzewa 50–150
> - na działce 1, sekcja A, rząd 4, drzewa 1–40
> - na działce 2, sekcja B, rząd 1, drzewa 10–35

## Zastosowania
- planowanie zbiorów,
- planowanie oprysków odmianowych,
- planowanie przeglądów,
- logistyka prac sezonowych.

---

# 11. Czy potrzebujemy tabeli `plot_sections`?

## Wersja prosta
Na start wystarczy:
- `trees.section_name text`

To jest najprostsze i elastyczne.

## Wersja bardziej formalna
Jeśli chcesz w przyszłości zarządzać sekcjami/kwaterami jako osobnymi bytami, można dodać:

### `plot_sections`
- `id`
- `plot_id`
- `name`
- `code`
- `description`
- `sort_order`

### Kiedy warto
- gdy działki są duże,
- gdy sekcje mają własną logikę,
- gdy chcesz filtrować i raportować po sekcjach.

## Rekomendacja
Na obecnym etapie:
- **nie dodawać jeszcze osobnej tabeli `plot_sections`**,
- zacząć od `section_name`.

---

# 12. Zmiany rekomendowane w modelu końcowym MVP

## `plots`
Dodać:
- `layout_type`
- `row_numbering_scheme`
- `tree_numbering_scheme`
- `entrance_description`
- `layout_notes`
- `default_row_count`
- `default_trees_per_row`

## `trees`
Dodać:
- `section_name`
- `row_label`
- `position_label`
- `location_verified`
- `planted_batch_id`

Dodać ograniczenie:
- unique `(plot_id, row_number, position_in_row)` dla aktywnych drzew

## Nowa tabela
Dodać:
- `bulk_tree_import_batches`

---

# 13. Zmiany w API i logice aplikacji, które trzeba przewidzieć

## Endpoint / akcja: masowe tworzenie drzew
Wejście:
- `plot_id`
- `section_name`
- `row_number`
- `from_position`
- `to_position`
- `variety_id`
- `species`
- opcjonalne dane wspólne

Wyjście:
- batch
- liczba utworzonych drzew
- lista konfliktów, jeśli jakieś pozycje były zajęte

## Endpoint / akcja: raport odmiany
Wejście:
- `variety_id`

Wyjście:
- lista lokalizacji pogrupowanych do zakresów

---

# 14. Przykładowy scenariusz biznesowy

## Dane
Użytkownik ma odmianę `Ligol` w lokalizacjach:
- działka 1, rząd 3, pozycje 50–150
- działka 1, rząd 4, pozycje 1–40
- działka 2, rząd 1, pozycje 10–35

## Oczekiwany efekt w systemie
Wyszukiwanie odmiany `Ligol` daje czytelny wynik:

```text
Działka 1 — sekcja A — rząd 3 — drzewa 50–150
Działka 1 — sekcja A — rząd 4 — drzewa 1–40
Działka 2 — sekcja B — rząd 1 — drzewa 10–35
```

## Korzyść
Sadownik nie musi przeglądać pojedynczych drzew, tylko od razu wie:
- gdzie pojechać,
- który rząd przejść,
- od którego do którego drzewa pracować.

---

# 15. Ostateczna rekomendacja

Aby zabezpieczyć przyszłość systemu już teraz, trzeba zapewnić:

## Obowiązkowo
- jednoznaczną numerację rzędów i pozycji na działce,
- dokładną lokalizację drzewa w tabeli `trees`,
- unikalność pozycji drzewa,
- możliwość filtrowania po odmianie i lokalizacji,
- możliwość masowego tworzenia drzew w zakresie.

## Bardzo zalecane
- rejestrowanie batchy masowego tworzenia,
- oznaczanie, czy lokalizacja została potwierdzona,
- możliwość sekcji/kwater przez `section_name`.

## Nie trzeba jeszcze teraz
- przechowywać gotowych zakresów jako osobnych rekordów,
- formalizować sekcji jako osobnej tabeli,
- robić geolokalizacji GPS dla każdego drzewa.

---

# 16. Finalny zakres zmian do wdrożenia

## W bazie danych
- rozszerzyć `plots`
- rozszerzyć `trees`
- dodać `bulk_tree_import_batches`
- dodać indeksy lokalizacyjne i odmianowe

## W aplikacji
- formularz masowego tworzenia drzew
- walidację konfliktów pozycji
- raport lokalizacji odmiany
- czytelny widok zakresów drzew

---

# 17. Następny krok

Po tej aktualizacji najlepiej przygotować:

1. **konkretne migracje SQL do PostgreSQL/Supabase**
2. **algorytm grupowania drzew do zakresów**
3. **projekt UI formularza masowego dodawania drzew**
4. **projekt widoku „Gdzie znajdę odmianę?”**

# Tree inventory import - recommended import contract

## Status dokumentu

To jest rekomendacja projektowa, nie implementacja. Nie tworzy nowych endpointow, migracji ani bibliotek. Kontrakt jest dopasowany do aktualnego modelu `orchards`, `plots`, `varieties`, `trees`, RLS i obecnych bulk workflows.

## Rekomendowany zakres MVP

MVP importu powinien byc waski:

- jeden plik XLSX dotyczy jednego `active_orchard`;
- jeden plik dotyczy jednego `plot`;
- `plot.layout_type` musi byc `rows`; `mixed` dopuscic dopiero po dodatkowych zasadach;
- input pracownika opisuje ciagle segmenty rzedow;
- confirm materializuje pojedyncze rekordy `trees`;
- konflikty z aktywnymi drzewami blokuja confirm;
- preview jest obowiazkowy;
- confirm ponownie uruchamia walidacje;
- confirm jest all-or-nothing;
- importer nie tworzy automatycznie nowych odmian bez jawnej decyzji w preview;
- missing positions nie sa zapisywane jako `trees`;
- brak rekordu w pliku nie zmienia istniejacego drzewa;
- brak dependency XLSX w repo oznacza, ze wybor biblioteki jest osobnym krokiem.

## Proponowane arkusze XLSX

| Arkusz | MVP | Cel | Dane juz obslugiwane przez DB | Dane wymagajace rozbudowy | Uwagi |
|---|---:|---|---|---|---|
| `INSTRUKCJA` | tak | Instrukcje dla pracownika, przyklady segmentow, znaczenie brakow i wyjatkow | Brak, arkusz informacyjny | Brak | Powinien byc generowany i zablokowany |
| `METADANE` | tak | Kontekst pliku i kontraktu | `orchard_id`, `plot_id`, nazwy/kody jako lookup | `file_hash`, `import_id` jesli persisted staging | Techniczne pola powinny byc ukryte/zablokowane |
| `RZEDY` | opcjonalnie w MVP | Deklaracja spodziewanych zakresow pozycji per row | Plot-level defaults istnieja, ale row entity nie | Per-row length, direction, spacing, GPS | Na MVP moze sluzyc tylko do walidacji i warningow |
| `NASADZENIA` | tak | Ciagle jednorodne segmenty | `trees` po materializacji, `varieties`, `plots` | Przyblizony rok/range jako struktura | Gowny arkusz importu |
| `WYJATKI` | tak | Braki, pojedyncze odstepstwa, stan/variety override | Czesciowo przez brak rekordu, `condition_status`, `notes` | Permanent station, explicit missing status | MVP: pojedyncze pozycje |
| `SLOWNIKI` | tak | Plot/variety/status/layout lists | Aktualna baza aktywnego orchard | Aliasy/canonical species jesli potrzebne | Powinien byc generowany z bazy |

## `METADANE` - proponowane kolumny

| Kolumna | Wymagane | Edycja usera | Zrodlo | Mapowanie | Uwagi |
|---|---:|---|---|---|---|
| `contract_version` | tak | locked | aplikacja | import contract | np. `tree_inventory_v1` |
| `generated_at` | tak | locked | aplikacja | audit/report | ISO timestamp |
| `generated_by_profile_id` | tak | hidden locked | aplikacja | audit | nie source of auth |
| `orchard_id` | tak | hidden locked | aplikacja | active orchard check | confirm porownuje z resolverem |
| `orchard_name` | tak | locked | baza | display only | dla czlowieka |
| `plot_id` | tak | hidden locked | baza | `trees.plot_id` | preferowany technical key |
| `plot_code` | tak, jesli istnieje | locked/list | baza | lookup | fallback `plot_name` |
| `plot_name` | tak | locked | baza | display only | dla instrukcji |
| `plot_layout_type` | tak | locked | baza | validation | MVP: `rows` |
| `import_mode` | tak | user/list | produkt | import behavior | `incremental_create`, pozniej `full_snapshot` |
| `allow_new_varieties` | tak | user/list lub locked | produkt | behavior | wymaga decyzji |
| `conflict_strategy` | tak | user/list lub locked | produkt | behavior | MVP `reject` |

## `RZEDY` - proponowane kolumny

| Kolumna | Wymagane | Mapowanie | Obecny support | Uwagi |
|---|---:|---|---|---|
| `row_key` | nie | import-only | nie | Stabilny identyfikator w pliku |
| `section_name` | nie | `trees.section_name` | tak | Nie wchodzi do unique location |
| `row_number` | tak | `trees.row_number` | tak | Musi byc positive int |
| `expected_from_position` | nie | import validation | nie jako DB field | Domyslnie 1 |
| `expected_to_position` | nie | import validation | nie jako DB field | Pomaga wykrywac luki |
| `row_notes` | nie | import-only albo notes | czesciowo | Nie ma row table |

Na MVP arkusz `RZEDY` nie powinien byc wymagany, jesli `NASADZENIA` zawiera komplet zakresow. Moze jednak poprawic walidacje brakow.

## `NASADZENIA` - proponowane kolumny

| Kolumna | Wymagane | Typ | Mapowanie | Uwagi |
|---|---:|---|---|---|
| `segment_key` | tak | text | import-only | Stable key do wyjatkow i raportu |
| `plot_code` | tak | text/list | lookup `plots` | Dla one-plot MVP moze byc locked |
| `section_name` | nie | text | `trees.section_name` | Etykieta, nie unique axis |
| `row_number` | tak | integer | `trees.row_number` | Positive int |
| `from_position` | tak | integer | expand to `trees.position_in_row` | Positive int |
| `to_position` | tak | integer | expand to `trees.position_in_row` | `to >= from` |
| `species` | tak | list/text | `trees.species`, `varieties.species` check | Preferowac slownik |
| `variety_id` | tak dla known | hidden | `trees.variety_id` | Najbezpieczniejszy key |
| `variety_name` | tak dla known | list/display | display + validation | Nie jako authority |
| `variety_status` | tak | enum | import behavior | `known`, `unknown`, `uncertain`, `new_candidate` |
| `condition_status` | tak | enum | `trees.condition_status` | MVP: `new`, `good`, `warning`, `critical`; `removed` tylko wyjatki/deactivate |
| `planted_at` | nie | date | `trees.planted_at` | Tylko dokladna data |
| `planted_year` | nie | integer | notes/import-only | Nie ma natywnego field |
| `planted_year_from` | nie | integer | notes/import-only | Dla "okolo 2015-2017" |
| `planted_year_to` | nie | integer | notes/import-only | Dla zakresu |
| `rootstock` | nie | text/list | `trees.rootstock` | Free text |
| `pollinator_info` | nie | text | `trees.pollinator_info` | Free text |
| `location_verified` | nie | boolean | `trees.location_verified` | Default `false` albo decyzja |
| `notes` | nie | text | `trees.notes` | Takze raw uncertain data |

## `WYJATKI` - proponowany model

MVP powinien zaczac od pojedynczych pozycji. Zakresowe wyjatki mozna dodac pozniej, po ustaleniu zasad overlap.

| Kolumna | Wymagane | Typ | Mapowanie | Uwagi |
|---|---:|---|---|---|
| `exception_key` | tak | text | import-only | Stable row id |
| `segment_key` | nie | text | import validation | Link do segmentu |
| `plot_code` | tak | text/list | lookup `plots` | Locked dla one-plot |
| `section_name` | nie | text | `trees.section_name` albo validation | Musi byc zgodne z segmentem, jesli wymagane |
| `row_number` | tak | integer | location | Positive int |
| `position_in_row` | tak | integer | location | MVP single position |
| `exception_type` | tak | enum | behavior | Patrz slownik ponizej |
| `species` | warunkowo | text/list | `trees.species` | Wymagane dla replacement/different_variety |
| `variety_id` | warunkowo | hidden | `trees.variety_id` | Jak w nasadzeniach |
| `variety_name` | warunkowo | list/display | display | Jak w nasadzeniach |
| `condition_status` | warunkowo | enum | `trees.condition_status` | Dla condition override |
| `planted_at` | nie | date | `trees.planted_at` | Dla replacement |
| `rootstock` | nie | text | `trees.rootstock` | Dla replacement |
| `notes` | nie | text | `trees.notes` albo final report | Opis decyzji |

Proponowany `exception_type`:

- `missing_tree` - w segmencie nie ma drzewa; MVP nie tworzy rekordu `tree`.
- `different_variety` - jedna pozycja ma inna variety/species niz segment.
- `condition_override` - jedna pozycja ma inny stan niz segment.
- `dead_tree` - wymaga decyzji mapowania na `critical`/`removed`.
- `replacement` - dosadzenie/inne drzewo na pozycji; wymaga konflikt strategy.
- `notes_only` - tylko informacja terenowa.

## `SLOWNIKI` - proponowane listy

Arkusz powinien byc generowany z aktualnej bazy i ustawien aplikacji:

- `plots`: `plot_id`, `plot_code`, `plot_name`, `layout_type`, `status`.
- `varieties`: `variety_id`, `species`, `name`.
- `species_presets`: `apple`, `pear`, `plum`, `cherry`, plus orchard-local species z odmian.
- `condition_statuses`: `new`, `good`, `warning`, `critical`, `removed`.
- `variety_statuses`: `known`, `unknown`, `uncertain`, `new_candidate`.
- `exception_types`: jak wyzej.
- `conflict_strategies`: MVP `reject`.

Listy dzialek i odmian moga bezpiecznie znalezc sie w pliku generowanym dla aktywnego orchard, ale IDs powinny byc w ukrytych/zablokowanych kolumnach. Trzeba traktowac plik jako dane potencjalnie nieaktualne i rewalidowac przy preview/confirm.

## Kanoniczny JSON po normalizacji

Proponowany ksztalt wewnetrzny:

```json
{
  "contract_version": "tree_inventory_v1",
  "import_id": "uuid-generated-by-server",
  "file_hash": "sha256:...",
  "generated_context": {
    "orchard_id": "uuid",
    "plot_id": "uuid",
    "plot_code": "SAD-01",
    "plot_layout_type": "rows"
  },
  "requested_behavior": {
    "import_mode": "incremental_create",
    "conflict_strategy": "reject",
    "allow_new_varieties": false
  },
  "segments": [
    {
      "source": {
        "sheet": "NASADZENIA",
        "row_number": 12,
        "segment_key": "S1"
      },
      "location": {
        "plot_id": "uuid",
        "section_name": null,
        "row_number": 3,
        "from_position": 1,
        "to_position": 10
      },
      "tree_defaults": {
        "species": "Apple",
        "variety_id": "uuid",
        "variety_name": "Szampion",
        "condition_status": "good",
        "planted_at": null,
        "rootstock": null,
        "location_verified": false,
        "notes": null
      },
      "import_only": {
        "variety_status": "known",
        "planted_year": null,
        "planted_year_from": 2015,
        "planted_year_to": 2017,
        "raw_values": {}
      }
    }
  ],
  "exceptions": [
    {
      "source": {
        "sheet": "WYJATKI",
        "row_number": 4,
        "exception_key": "E1"
      },
      "segment_key": "S1",
      "location": {
        "plot_id": "uuid",
        "section_name": null,
        "row_number": 3,
        "position_in_row": 6
      },
      "exception_type": "missing_tree",
      "override": {}
    }
  ]
}
```

## Mapowanie na obecne tabele

| JSON field | Obecna tabela/kolumna | Uwagi |
|---|---|---|
| `generated_context.orchard_id` | `orchards.id` | Sprawdzane z active orchard, nie przesylane do insert jako zaufane |
| `location.plot_id` | `trees.plot_id` | Musi nalezec do active orchard |
| `tree_defaults.species` | `trees.species` | Required |
| `tree_defaults.variety_id` | `trees.variety_id` | Optional; same orchard |
| `location.section_name` | `trees.section_name` | Optional text |
| `location.row_number` | `trees.row_number` | Required dla `rows` |
| expanded position | `trees.position_in_row` | Jeden rekord per position |
| `condition_status` | `trees.condition_status` | `removed` wymaga `is_active=false` |
| `planted_at` | `trees.planted_at` | Dokladna data |
| `rootstock` | `trees.rootstock` | Text |
| `pollinator_info` | `trees.pollinator_info` | Text |
| `location_verified` | `trees.location_verified` | Boolean |
| `notes` | `trees.notes` | Miejsce na import-only explanation w MVP |
| `import_id` | brak | Wymaga staging/audit modelu |
| `source.row_number` | brak | Wymaga row provenance modelu |
| `file_hash` | brak | Wymaga staging/audit modelu |
| `planted_year_from/to` | brak | Notes albo migracja |
| `missing_tree` | brak | Import-only albo future station model |

## Dane, ktorych obecny model nie potrafi przechowac strukturalnie

- Puste stanowisko jako osobny byt.
- Formalna dzialka ewidencyjna.
- Rzad jako encja z wlasnymi metadanymi.
- Per-row direction, spacing, training system, GPS endpoints.
- Variety aliases i canonical names.
- Przyblizony rok/przedzial posadzenia z confidence.
- Raw unknown variety poza `notes`.
- Oryginalny XLSX i normalized import JSON.
- Row-level provenance.
- Idempotency key i file hash.
- Bezpieczne undo po pozniejszych manual edits.

## Walidacja - rekomendowany podzial warstw

### Parser XLSX

Odpowiedzialnosc:

- odczyt arkuszy i komorek;
- wykrycie brakujacych arkuszy/kolumn;
- zachowanie source location: sheet, row, column, raw value;
- odrzucenie plikow z nieoczekiwanym contract version.

Nie powinien:

- laczyc z baza;
- zgadywac odmian;
- wykonywac insertow.

### Normalizator

Odpowiedzialnosc:

- trim tekstow;
- parse integer/date/boolean;
- ekspansja segmentow do pozycji logicznych;
- polaczenie `WYJATKI` z `NASADZENIA`;
- wykrycie overlap w pliku;
- wykrycie exception poza segmentem;
- wygenerowanie canonical JSON.

### Schema walidacyjne

Odpowiedzialnosc:

- wymagane pola;
- dodatnie liczby;
- `to_position >= from_position`;
- enumy;
- future date rules;
- limity rozmiaru importu.

### Warstwa domenowa

Odpowiedzialnosc:

- active orchard;
- plot layout support;
- variety ownership i species consistency;
- conflict strategy;
- missing/dead/replacement semantics;
- row/range rules.

### RPC / transakcja

Odpowiedzialnosc:

- final revalidation przy confirm;
- `can_write_orchard_operational_data`;
- conflict check against current DB;
- atomic insert/update/deactivate;
- final report rows.

### Constraints DB

Odpowiedzialnosc:

- FK orchard/plot/variety;
- check statusow;
- row/position pair;
- unique active location;
- RLS defense in depth.

## Preview i confirm

Rekomendowany proces:

```text
generate template
-> user fills XLSX
-> upload
-> parse
-> normalize
-> validate against current DB
-> preview report
-> user fixes file or confirms
-> confirm revalidates
-> DB transaction
-> final report
```

Preview powinien pokazac:

- liczbe segmentow;
- liczbe pozycji po ekspansji;
- liczbe drzew do utworzenia;
- liczbe pozycji missing;
- konflikty z aktywnymi drzewami;
- nierozpoznane odmiany;
- podejrzane aliasy/case/diacritics;
- luki i overlap per row;
- dane, ktore trafia tylko do `notes`;
- projected counts per variety/species/condition.

Confirm powinien:

- wymagac aktualnej sesji;
- ponownie rozwiazac active orchard;
- ponownie sprawdzic `plot_id`;
- ponownie sprawdzic odmiany i konflikty;
- wykonac all-or-nothing transaction;
- zapisac finalny raport albo zwrocic go do UI.

## Strategia konfliktow

MVP:

- `reject` jako jedyna strategia confirm.
- Konflikt to aktywne drzewo w `(plot_id,row_number,position_in_row)`.
- Konflikt blokuje caly import.
- Existing inactive/removed tree nie blokuje nowego drzewa, ale powinno pojawic sie w preview jako history context.

Pozniejsze strategie:

- `skip_conflicts`;
- `update_existing`;
- `deactivate_and_create`;
- `fill_empty_fields_only`.

Kazda pozniejsza strategia wymaga osobnych testow, raportu i jasnej semantyki historii.

## Strategia idempotencji

Rekomendowany docelowy model:

- `import_id` generowany przy upload;
- `file_hash` liczony z oryginalnego pliku;
- `normalized_hash` liczony z canonical JSON;
- `confirm_token` albo version, ktory invaliduje preview po zmianie stagingu;
- unique guard na zatwierdzony `import_id`;
- final mapping: `import_id + source_row_key + source_position -> tree_id`.

Dla MVP bez migracji staging:

- confirm powinien byc jednorazowy w ramach requestu/session state;
- retry tego samego pliku bedzie wykrywal konflikty przez DB, ale nie bedzie prawdziwie idempotentny;
- dlatego powazny import powinien dostac staging zanim trafi do produkcji.

## Opcje biblioteki XLSX do osobnego spike

Nie instalowano zaleznosci. Opcje do oceny:

- `exceljs` - dobre wsparcie generowania arkuszy, stylow, walidacji danych i ukrytych arkuszy; trzeba sprawdzic rozmiar, memory use i runtime server-only.
- `xlsx` / SheetJS - popularny parser/generator; trzeba sprawdzic licencje, typowanie, obsluge walidacji danych i bezpieczne uzycie server-side.
- `read-excel-file` - lzejszy read-only parser; moze nie wystarczyc do generowania szablonu z listami rozwijanymi.

Kryteria wyboru:

- dziala w Node/server action albo route handler;
- nie trafia do client bundle;
- deterministic output dla testow;
- obsluga list rozwijanych i ukrytych arkuszy;
- kontrola memory dla duzych plikow;
- bezpieczne parsowanie wartosci i dat;
- aktywne utrzymanie i akceptowalna licencja.

## Minimalny kontrakt bledow

Kazdy blad/warning powinien miec:

```json
{
  "severity": "error",
  "code": "TREE_LOCATION_CONFLICT",
  "message": "Position is already occupied by an active tree.",
  "sheet": "NASADZENIA",
  "row_number": 12,
  "column": "from_position",
  "raw_value": "1",
  "normalized_value": 1,
  "entity_ref": {
    "plot_id": "uuid",
    "row_number": 3,
    "position_in_row": 6
  }
}
```

Severity:

- `error` blocks confirm.
- `warning` allows confirm but must be visible.
- `info` explains normalization or import-only data.

## Najwazniejsze decyzje przed finalnym kontraktem

- Czy MVP jest single-plot.
- Czy plik jest incremental czy snapshot.
- Czy worker moze confirm.
- Jak traktowac unknown/new/uncertain varieties.
- Jak mapowac dead/missing/replacement.
- Czy staging DB wchodzi do pierwszej implementacji.
- Czy original XLSX ma byc przechowywany.

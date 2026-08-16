# OrchardLog / Sadownik+ - import / export spec

## Cel dokumentu

Ten dokument porzadkuje formaty plikow i zakres danych dla importu i eksportu.

## 1. Decyzja etapowa

- Eksport danych konta jest juz dostepny z poziomu aplikacji dla `owner`.
- `tree_inventory_v1` import drzew jest dostepny na `/trees/import` dla
  jednego aktywnego orchard, jednej dzialki `rows`, `incremental_create` i
  limitu 1k expanded positions.
- Account-level restore z eksportu oraz szersze tryby importu pozostaja
  future scope.

## 2. Format eksportu pelnego

### Rekomendacja

- JSON jako podstawowy format pelnego eksportu danych konta

### Zasady eksportu

- eksport jest `account-wide` w sensie konta usera
- eksport moze wykonac tylko `owner` albo `super_admin`
- dla zwyklego usera eksport obejmuje wszystkie orchard, dla ktorych ma aktywne membership `owner`
- dla `super_admin` eksport obejmuje wszystkie orchard dostepne administracyjnie
- orchard, w ktorym user jest tylko `worker`, nie trafia do eksportu
- entry point UI pozostaje na `/settings/profile`, ktore nie wymaga aktywnego orchard dla `super_admin`

### Przykladowa nazwa pliku

```text
orchardlog-account-export-2026-04-14.json
```

### Struktura glowna

```json
{
  "version": "1",
  "exported_at": "2026-04-14T10:00:00Z",
  "profile": {},
  "orchards": [
    {
      "orchard": {},
      "orchard_memberships": [],
      "plots": [],
      "varieties": [],
      "trees": [],
      "activities": [],
      "activity_scopes": [],
      "activity_materials": [],
      "harvest_records": []
    }
  ]
}
```

## 3. Format importu / eksportu odmian

### Markdown + YAML front matter

Rekomendowane dla wiedzy i notatek o odmianach.

```md
---
type: variety
species: jablon
name: ligol
---

# Ligol

Odmiana deserowa.
```

### Minimalne pola

- `type`
- `species`
- `name`

## 4. CSV - raporty i prosty import tabelaryczny

### Potencjalne zastosowania

- eksport list drzew
- eksport dziennika prac
- eksport listy zbiorow
- prosty import drzew lub odmian

### Przyklad CSV dla drzew

```text
plot_name,species,variety_name,row_number,position_in_row,condition_status
Dzialka 1,jablon,Ligol,3,50,good
```

## 5. Import drzew - zasady

- aktualny wspierany import drzew to `tree_inventory_v1`
- entry point UI: `/trees/import`
- szablon XLSX: `GET /trees/import/template?plot_id=...`
- import jest walidowany przed zapisem przez parser, normalizer i staging
  preview
- brak zgodnosci active orchard, dzialki lub odmiany blokuje preview albo
  confirm
- konflikty z aktywnymi drzewami sa raportowane jawnie i blokuja confirm
- confirm jest `all-or-nothing`
- confirm jest owner/`super_admin` only
- worker moze pobrac szablon, uploadowac plik i obejrzec preview, ale nie moze
  resolve candidate groups ani confirm
- nowe odmiany nie powstaja automatycznie z raw XLSX; wymagaja jawnej decyzji
  ownera/`super_admin` w variety resolution
- limit MVP to 1k expanded positions na import
- wieksze kwatery nalezy dzielic na mniejsze importy albo wrocic do
  [future_5k_import_hardening_plan.md](../01_implementation_materials/tree_inventory_import/future_5k_import_hardening_plan.md)
  jako osobnego future work
- aktywne szczegoly kontraktu:
  [tree_inventory_import/README.md](../01_implementation_materials/tree_inventory_import/README.md)

## 6. Import odmian - zasady

- standalone import odmian nie jest aktualnie wdrozony
- w ramach `tree_inventory_v1` owner/`super_admin` moze jawnie oznaczyc
  candidate group jako `create_new`
- finalne `varieties` sa tworzone dopiero podczas confirm importu i atomowo z
  finalnym zapisem `trees`
- unikalnosc `species + name` per `orchard` pozostaje wymagana

Future standalone import odmian wymaga osobnego kontraktu. Na start
rekomendacja pozostaje:

- odrzuc lub pomin, bez automatycznego merge

## 7. Zakres eksportu danych konta

Eksport powinien zawierac:

- `profile`
- `orchards`
- `orchard_memberships`
- `plots`
- `trees`
- `varieties`
- `activities`
- `activity_scopes`
- `activity_materials`
- `harvest_records`

W przyszlosci:

- zalaczniki
- rozszerzone warianty importu i restore

## 8. Restore

- restore z eksportu powinien byc uruchamiany ostroznie i najlepiej do srodowiska testowego
- restore musi umiec odtworzyc strukture orchard i membership
- przy restore trzeba zachowac spojnosc `orchard_id` miedzy tabelami zaleznymi

## 9. Wersjonowanie formatu

- kazdy eksport JSON powinien miec pole `version`
- pozwoli to rozwijac strukture bez psucia zgodnosci

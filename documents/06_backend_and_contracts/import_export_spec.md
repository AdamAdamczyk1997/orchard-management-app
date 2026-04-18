# OrchardLog / Sadownik+ - import / export spec

## Cel dokumentu

Ten dokument porzadkuje formaty plikow i zakres danych dla importu i eksportu.

## 1. Decyzja etapowa

- W wersji 0.1 import / export moze pozostac glownie narzedziem technicznym.
- W etapie 0.2 funkcje eksportu i wybranych importow powinny byc dostepne z poziomu aplikacji.

## 2. Format eksportu pelnego

### Rekomendacja

- JSON jako podstawowy format pelnego eksportu danych konta

### Zasady eksportu

- eksport jest `account-wide` w sensie konta usera
- eksport moze wykonac tylko `owner` albo `super_admin`
- eksport obejmuje wszystkie orchard, dla ktorych user ma aktywne membership `owner`
- orchard, w ktorym user jest tylko `worker`, nie trafia do eksportu

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

- import powinien byc walidowany przed zapisem
- brak zgodnosci dzialki lub odmiany musi blokowac rekord
- konflikt lokalizacji powinien byc raportowany jawnie
- preferowane jest `all or nothing` dla paczki importu
- import działa w kontekscie wybranego orchard

## 6. Import odmian - zasady

- unikalnosc `species + name` per `orchard`
- przy duplikacie mozliwy tryb:
  - odrzuc
  - pomin
  - zaktualizuj

Na start rekomendacja:

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
- raporty terenowe

## 8. Restore

- restore z eksportu powinien byc uruchamiany ostroznie i najlepiej do srodowiska testowego
- restore musi umiec odtworzyc strukture orchard i membership
- przy restore trzeba zachowac spojnosc `orchard_id` miedzy tabelami zaleznymi

## 9. Wersjonowanie formatu

- kazdy eksport JSON powinien miec pole `version`
- pozwoli to rozwijac strukture bez psucia zgodnosci

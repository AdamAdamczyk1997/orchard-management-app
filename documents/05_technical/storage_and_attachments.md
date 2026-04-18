# OrchardLog / Sadownik+ - storage i zalaczniki

## Cel dokumentu

Ten dokument opisuje podejscie do plikow, zdjec i eksportow przechowywanych poza glownymi tabelami bazy danych.

## 1. Decyzja na MVP

- W wersji 0.1 zalaczniki nie sa wymagane.
- Model aplikacji ma jednak pozostac gotowy na dodanie storage pozniej.

## 2. Potencjalne typy plikow

- zdjecia drzew
- zdjecia objawow chorob
- zalaczniki do aktywnosci
- pliki eksportu danych konta

## 3. Proponowane buckety na przyszlosc

- `tree-images`
- `activity-attachments`
- `account-exports`

## 4. Polityka dostepu

- buckety powinny byc prywatne
- dostep tylko dla aktywnego membership w odpowiednim `orchard` albo `super_admin`
- eksporty konta powinny byc dostepne tylko dla `owner` i `super_admin`
- sciezki powinny zawierac `orchard_id`, aby ulatwic polityki, porzadek i przyszle RLS storage

### Przyklad sciezki

```text
orchard-id/trees/tree-id/photo-01.jpg
orchard-id/activities/activity-id/attachment-01.pdf
exports/profile-id/export-2026-04-14.json
```

## 5. Limity i typy plikow - rekomendacja

- zdjecia:
  - jpg
  - png
  - webp
- dokumenty:
  - pdf
  - csv
  - json
  - md

## 6. Powiazanie z rekordami domenowymi

Jesli zalaczniki wejda do systemu:

- zdjecia drzew powinny byc powiazane z `trees`
- zalaczniki robocze powinny byc powiazane z `activities`
- pliki eksportu nie musza miec trwalego rekordu w bazie, jesli sa generowane ad hoc

## 7. Decyzja na obecnym etapie

- Zdjecia drzew i zalaczniki do aktywnosci nie wchodza do 0.1.
- Ich dodanie planujemy po ustabilizowaniu glownego flow danych tekstowych.
- Namespacing i przyszle polityki storage projektujemy wokol `orchard_id`, nie historycznego `user_id`.

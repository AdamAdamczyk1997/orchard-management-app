# OrchardLog / Sadownik+ - batch tree creation rules

## Cel dokumentu

Ten dokument porzadkuje zasady masowego tworzenia drzew, tak aby operacja byla przewidywalna i bezpieczna.

## 1. Zalozenie glowne

Batch create sluzy do szybkiego zakladania wielu drzew tej samej partii w uporzadkowanej strukturze sadu.

## 2. Dane wejsciowe

Uzytkownik podaje:

- dzialke
- gatunek
- odmiane opcjonalnie
- sekcje opcjonalnie
- numer rzedu
- zakres pozycji
- wspolne dane dodatkowe
- wzorzec `tree_code` opcjonalnie

## 3. Polityka konfliktow

- Obowiazuje zasada `all or nothing`.
- Jesli choc jedna pozycja jest zajeta przez aktywne drzewo, cala operacja zostaje odrzucona.
- System nie nadpisuje istniejacych rekordow.
- System nie pomija po cichu konfliktowych pozycji.

## 4. Walidacje przed zapisem

- `plot_id` musi nalezec do aktywnego `orchard`
- `variety_id`, jesli ustawione, musi nalezec do aktywnego `orchard`
- `from_position <= to_position`
- `row_number` musi byc dodatni
- zakres nie moze kolidowac z istniejacymi aktywnymi drzewami

## 5. Generowanie `tree_code`

### Rekomendacja

- jesli uzytkownik poda wzorzec, system generuje `tree_code` na jego podstawie
- jesli nie poda wzorca, `tree_code` moze zostac puste albo wygenerowane pozniej

### Przyklad wzorca

```text
DZ1-R3-T{{n}}
```

### Przyklad wynikow

- `DZ1-R3-T50`
- `DZ1-R3-T51`
- `DZ1-R3-T52`

## 6. Przebieg operacji

1. Walidacja danych formularza.
2. Podglad konfliktow i zakresu.
3. Rozpoczecie transakcji.
4. Utworzenie rekordu `bulk_tree_import_batches`.
5. Utworzenie rekordow `trees`.
6. Powiazanie drzew z `planted_batch_id`.
7. Zakoncznie transakcji albo rollback przy bledzie.

## 7. Statusy batcha

- `draft`
- `done`
- `failed`
- `partially_done`

### Rekomendacja MVP / 0.2

- w praktyce preferowac `draft`, `done`, `failed`
- `partially_done` zostawic jako mozliwosc na przyszlosc

## 8. Wynik dla uzytkownika

Po poprawnym wykonaniu system powinien pokazac:

- liczbe utworzonych drzew
- zakres pozycji
- dzialke i rzad
- odmiane, jesli byla ustawiona

Po bledzie system powinien pokazac:

- czytelny komunikat o konflikcie
- informacje, ktory zakres jest problematyczny

## 9. Testy krytyczne

- poprawne utworzenie zakresu bez konfliktow
- wykrycie konfliktu jednej pozycji
- brak czesciowego zapisu przy bledzie
- poprawne zapisanie `planted_batch_id`

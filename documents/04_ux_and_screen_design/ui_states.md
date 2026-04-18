# OrchardLog / Sadownik+ - stany UI

## Cel dokumentu

Ten dokument opisuje podstawowe stany interfejsu, ktore musza byc przewidziane podczas projektowania ekranow i implementacji.

## Zasada ogolna

Kazdy glowny widok powinien miec obsluge:

- ladowania
- pustego stanu
- sukcesu
- bledu walidacji
- bledu systemowego
- braku wynikow po filtrowaniu

## 1. Logowanie i rejestracja

### Loading

- blokada przycisku
- czytelny stan `trwa logowanie` lub `tworzenie konta`

### Validation error

- niepoprawny email
- zbyt slabe haslo
- konto juz istnieje

### System error

- blad polaczenia
- tymczasowa niedostepnosc auth

## 2. Orchard onboarding i context

### `No orchard yet`

- user nie ma aktywnego membership
- CTA:
  - `Create orchard`
  - `Why do I need an orchard?`

### `No active orchard`

- membership istnieje, ale brak ustawionego kontekstu sesji
- UI proponuje orchard switcher albo automatyczny wybor

### `Switching orchard`

- krotki pending state po zmianie `active_orchard`
- blokada powtarzania klikniec

## 3. Dashboard

### Loading

- skeleton dla kart podsumowan
- placeholder dla ostatnich aktywnosci
- placeholder dla kart zbiorow

### Empty state

- brak dzialek i drzew
- onboardingowe CTA:
  - dodaj dzialke
  - dodaj drzewo
  - dodaj wpis
  - dodaj zbior

### Partial empty state

- sa dzialki, ale brak aktywnosci
- sa aktywnosci, ale brak planowanych prac
- sa dane orchard, ale brak rekordow zbioru

## 4. Listy dzialek, drzew, odmian, aktywnosci i zbiorow

### Loading

- skeleton listy

### Empty state globalny

- brak rekordow tego typu
- CTA do utworzenia pierwszego rekordu

### Empty state po filtrowaniu

- komunikat typu `brak wynikow dla wybranych filtrow`
- akcja czyszczenia filtrow

### Error state

- blad pobrania danych
- mozliwosc ponowienia

## 5. Formularze

### Idle

- formularz gotowy do wpisania danych

### Submitting

- przycisk w stanie pending
- ochrona przed wielokrotnym kliknieciem

### Success

- czytelny komunikat o zapisaniu
- przekierowanie albo pozostanie na widoku szczegolow

### Validation error

- komunikat przy konkretnym polu
- komunikat ogolny, jesli formularz ma wiecej bledow

### Conflict error

Przyklady:

- duplikat nazwy dzialki
- duplikat odmiany
- konflikt lokalizacji drzewa
- konflikt batch create

## 6. Drzewa i lokalizacja

### Brak pelnej lokalizacji

- subtelna informacja, ze drzewo nie ma kompletnej lokalizacji
- CTA do uzupelnienia danych

### Brak potwierdzenia lokalizacji

- informacja, ze `location_verified = false`
- przydatne zwlaszcza przy raportach terenowych

## 7. Dziennik prac

### Brak wpisow

- komunikat, ze dziennik jest pusty
- przycisk `dodaj pierwszy wpis`

### Brak planowanych prac

- komunikat informacyjny bez dramatyzowania

### Aktywnosc z materialami

- sekcja materialow zwinieta, jesli pusta

## 8. Zbiory i podsumowanie sezonu

### Brak wpisow zbioru

- komunikat, ze nie ma jeszcze `harvest_records`
- przycisk `dodaj pierwszy zbior`

### Brak danych w sezonie

- komunikat, ze wybrany `season_year` nie ma wpisow
- akcja zmiany sezonu lub dodania wpisu

### Summary loading

- placeholder kart sumarycznych
- placeholder wykresu lub listy timeline

## 9. Membership i eksport

### `Export forbidden for worker`

- komunikat, ze tylko `owner` albo `super_admin` moze eksportowac dane konta
- brak aktywnego CTA eksportu

### `Export generating` - etap 0.2

- czytelny pending state po uruchomieniu `exportAccountData`
- blokada ponownego klikniecia podczas generowania

### `Export success` - etap 0.2

- informacja, ze plik eksportu jest gotowy do pobrania
- jasne wskazanie zakresu: tylko orchard z aktywnym membership `owner`

### `Members loading`

- skeleton listy membership

### `No members yet`

- orchard ma tylko `owner`
- CTA `zapros pracownika`

## 10. Raport lokalizacji odmiany - etap 0.2

### Empty state

- brak drzew z przypisana odmiana
- brak drzew z wystarczajaca lokalizacja

### Loading

- prosty placeholder listy zakresow

### Error

- blad generowania raportu
- mozliwosc sprobowania ponownie

## 11. Zasady copy dla stanow bledow

- komunikaty maja byc konkretne
- unikamy surowych bledow technicznych wprost do usera
- jesli mozliwe, komunikat powinien podpowiadac kolejne dzialanie

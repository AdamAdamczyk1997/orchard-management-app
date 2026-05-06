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
- gdy user ma tylko jeden orchard, select pozostaje zablokowany i pokazuje helper text zamiast mylacej interakcji

## 3. Dashboard

### Loading

- skeleton dla kart podsumowan
- skeleton dla karty szybkich akcji
- placeholder dla `upcoming_activities`
- placeholder dla ostatnich aktywnosci
- placeholder dla kart zbiorow

### Empty state

- pelny empty state pokazuje sie tylko wtedy, gdy nie ma aktywnych dzialek, aktywnych drzew i obu feedow wpisow
- brak dzialek i drzew
- onboardingowe CTA:
  - dodaj dzialke
  - dodaj drzewo
  - dodaj wpis
  - dodaj zbior

### Partial empty state

- sa dane strukturalne, ale brak aktywnosci
- sa dane orchard, ale brak rekordow zbioru
- dashboard nadal pokazuje karty summary i szybkie akcje mimo pustych feedow
- blok `upcoming_activities` moze miec w tym stanie osobny komunikat o braku zaplanowanych prac od dzis wzwyz
- dashboard moze tez pokazac warning banner, jesli nie udalo sie przelaczyc aktywnego orchard i system wrocil do bezpiecznego recovery flow

## 4. Listy dzialek, drzew, odmian, aktywnosci i zbiorow

### Loading

- streamingowy skeleton listy dla `plots`, `varieties`, `trees`, `activities` i `harvests`

### Empty state globalny

- brak rekordow tego typu
- CTA do utworzenia pierwszego rekordu

### Empty state po filtrowaniu

- komunikat typu `brak wynikow dla wybranych filtrow`
- priorytetowa akcja `wyczysc filtry`
- opcjonalne drugie CTA do utworzenia rekordu pozostaje dostepne, ale akcja czyszczenia filtrow jest priorytetowa

### Error state

- blad pobrania danych
- mozliwosc ponowienia

### Record not found na detail/edit route

- jesli rekord nie istnieje w aktywnym `orchard` albo zostal usuniety, ekran nie robi cichego redirectu
- user widzi czytelny komunikat i jednoznaczne CTA powrotu do listy modulu
- ten wzorzec dotyczy krytycznych tras `activities`, `harvests`, `plots`, `trees`, `varieties` oraz wybranych ekranow `settings`
- shared recovery cards oraz empty states ukladaja CTA pionowo na mobile i wracaja do ukladu inline od `sm`
- `settings/members` pokazuje success albo warning banner po revoke membership, zamiast cichego redirectu bez wyjasnienia

## 5. Formularze

### Idle

- formularz gotowy do wpisania danych

### Submitting

- przycisk w stanie pending
- ochrona przed wielokrotnym kliknieciem

### Success

- czytelny komunikat o zapisaniu
- przekierowanie albo pozostanie na widoku szczegolow

### Redirect success feedback

- jesli zapis, usuniecie, archiwizacja albo zmiana statusu konczy sie redirectem, ekran docelowy pokazuje zielony banner sukcesu
- banner ma byc widoczny od razu po przejsciu na liste albo detail
- user moze ukryc banner bez utraty biezacych filtrow
- formularz dzialki po create / edit powinien po redirectcie potwierdzac tez zapis ustawien ukladu i numeracji

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

### Brak prerekwizytu do zapisu

- jesli create/edit flow wymaga istnienia dzialki albo aktywnej dzialki, user widzi wspolny card z wyjasnieniem
- card prowadzi do utworzenia brakujacej dzialki albo do powrotu do listy modulu
- ten stan nie jest traktowany jako blad systemowy

### Brak potwierdzenia lokalizacji

- informacja, ze `location_verified = false`
- przydatne zwlaszcza przy raportach terenowych

### Guidance po wyborze dzialki

- formularz drzewa, formularze `activities` / `harvests` i flow batchowe pokazuja skrot `layout_type`, numeracje, planowana siatke i punkt odniesienia wybranej dzialki
- ten stan ma wspierac usera operacyjnie, a nie blokowac pracy

### Plot layout unsupported

- jesli wybrana dzialka ma `layout_type = irregular`, flow `batch create`, `bulk deactivate`, row-based scope w `activities` i harvestowy `location_range` pokazuja czytelny stan `unsupported`
- UI wyjasnia, ze ten fragment formularza obsluguje tylko zakresy rzedowe dla `rows` i `mixed`
- przyciski preview / write pozostaja zablokowane do czasu wyboru wspieranej dzialki

### Batch create preview

- po poprawnym preview user widzi liczbe planowanych pozycji i liste rekordow do utworzenia
- jesli zakres ma konflikty, UI pokazuje konfliktowe lokalizacje zamiast przycisku zapisu
- krok zapisu jest dostepny dopiero po preview bez konfliktow

### Bulk deactivate preview

- po preview user widzi liczbe aktywnych drzew do wycofania
- zakres moze zwrocic ostrzezenia o pustych pozycjach albo drzewach juz nieaktywnych
- jesli preview nie znajdzie zadnego aktywnego drzewa, ekran pokazuje czytelny empty/error state bez potwierdzenia write

## 7. Dziennik prac

### Brak wpisow

- komunikat, ze dziennik jest pusty
- przycisk `dodaj pierwszy wpis`

### Brak planowanych prac

- komunikat informacyjny bez dramatyzowania

### Aktywnosc z materialami

- sekcja materialow zwinieta, jesli pusta

### Szczegoly aktywnosci

- jesli `description`, `weather_notes` albo `result_notes` sa puste, sekcja moze sie nie renderowac
- jesli brak `activity_scopes`, widok pokazuje czytelny komunikat zamiast pustej listy
- jesli brak `activity_materials`, widok pokazuje czytelny komunikat zamiast pustej listy

### Podsumowanie sezonowych prac na `/activities`

- gdy brak rekordow `done` dla aktywnych filtrow, summary pokazuje pusty stan bez coverage
- gdy nie wybrano `summary_plot_id`, coverage pokazuje instrukcje wyboru dzialki
- gdy dzialka jest wybrana, ale brak matching `activity_scopes`, coverage pokazuje pusty stan dla tej kombinacji filtrow

## 8. Zbiory i podsumowanie sezonu

### Brak wpisow zbioru

- komunikat, ze nie ma jeszcze `harvest_records`
- przycisk `dodaj pierwszy zbior`

### Brak danych w sezonie

- komunikat, ze wybrany `season_year` nie ma wpisow
- akcja zmiany sezonu lub dodania wpisu

### Breakdown bez przypisan

- zestawienie per odmiana moze byc puste, jesli rekordy nie maja `variety_id`
- zestawienie per dzialka moze byc puste, jesli rekordy nie maja `plot_id`
- UI powinno to komunikowac jako brak przypisanych danych, a nie blad systemowy

### Summary loading

- placeholder kart sumarycznych
- placeholder wykresu lub listy timeline
- `season summary` ma route-level loading na poziomie calego raportu

### Raport lokalizacji zbiorow

- gdy brak rekordow po aktywnych filtrach, ekran pokazuje pusty stan z CTA do dodania wpisu zbioru
- gdy sa wpisy, ale zaden nie ma precyzyjnej lokalizacji, ekran nadal pokazuje sume i breakdown dzialek, ale komunikuje brak grup terenowych
- gdy sa wpisy `orchard` bez dzialki, ekran pokazuje osobny komunikat o rekordach tylko na poziomie sadu
- loading dla raportu powinien miec placeholder kart i list breakdownu

## 9. Membership i eksport

### `Export forbidden for worker`

- komunikat, ze eksport danych konta wymaga aktywnego `owner` albo roli `super_admin`
- brak aktywnego CTA eksportu

### `Export generating`

- czytelny pending state po uruchomieniu `exportAccountData`
- blokada ponownego klikniecia podczas generowania

### `Export success`

- informacja, ze plik eksportu jest gotowy do pobrania
- jasne wskazanie zakresu: `owned_orchards` dla ownera albo `all_orchards_admin` dla `super_admin`

### `Members loading`

- skeleton listy membership

### `No members yet`

- orchard ma tylko `owner`
- CTA `zapros pracownika`

## 10. Raport lokalizacji odmiany

### Prerequisite state

- brak odmian w aktywnym sadzie
- CTA do `utworz odmiane`

### Empty state

- brak drzew z przypisana odmiana
- brak drzew z wystarczajaca lokalizacja
- brak wyboru odmiany powinien prowadzic do instrukcji, a nie do pustej listy

### Loading

- prosty placeholder listy zakresow

### Record not found

- jesli `variety_id` z URL nie nalezy do aktywnego `orchard` albo rekord nie istnieje, user widzi lagodny recovery state z powrotem do wyboru odmiany

### Partial information state

- jesli odmiana ma aktywne drzewa poza raportem, UI pokazuje licznik rekordow bez kompletnego `row_number + position_in_row`
- jesli czesc lokalizacji nie jest potwierdzona, UI pokazuje liczbe rekordow `location_verified = false`, zamiast ukrywac ten fakt

### Error

- blad generowania raportu
- mozliwosc sprobowania ponownie

## 11. Zasady copy dla stanow bledow

- komunikaty maja byc konkretne
- unikamy surowych bledow technicznych wprost do usera
- jesli mozliwe, komunikat powinien podpowiadac kolejne dzialanie
- dla `record not found` i brakujacych prerekwizytow preferujemy recovery cards zamiast surowego `throw` albo cichego redirectu
- dla udanych akcji z redirectem preferujemy czytelny success banner zamiast milczacego powrotu na liste

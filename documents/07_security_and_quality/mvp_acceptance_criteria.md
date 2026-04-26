# OrchardLog / Sadownik+ - kryteria akceptacji MVP

## Cel dokumentu

Ten dokument zbiera minimalne kryteria, po ktorych uznamy, ze pierwsza wersja aplikacji jest gotowa do sensownego uzytku.

## 1. Autoryzacja, konto i orchard context

- Uzytkownik moze zalozyc konto, zalogowac sie i wylogowac.
- Uzytkownik moze zresetowac haslo.
- Po zalogowaniu bez membership widzi onboarding `Create orchard`.
- Utworzenie pierwszego orchard automatycznie tworzy membership `owner`.
- Po zalogowaniu user widzi tylko dane orchard, do ktorych ma aktywne membership, chyba ze jest `super_admin`.
- Brak mozliwosci odczytu cudzych rekordow przez UI i standardowe operacje aplikacji.
- User moze zmienic `active_orchard`, jesli ma dostep do wiecej niz jednego orchard.

## 2. Membership i role

- `owner` moze zobaczyc liste czlonkow orchard.
- `owner` moze dodac istniejace konto jako `worker`.
- `owner` moze dezaktywowac membership.
- system blokuje duplikat aktywnego membership i reaktywuje `revoked` membership zamiast tworzyc drugi rekord.
- Jesli UI wlacza dodatkowe role w danym releasie, `owner` moze tez zmienic role membership zgodnie z aktywnym modelem uprawnien.
- `worker` nie widzi ani nie wykonuje operacji zarzadzania membership.
- `worker` moze edytowac `plots`, `trees`, `varieties`, `activities` i `harvest_records` w aktywnym orchard.

## 3. Dzialki

- User moze dodac dzialke z podstawowymi danymi.
- User moze edytowac dane dzialki.
- User moze zobaczyc liste dzialek i przejsc do create / edit flow; dedykowany detail page moze pozostac odlozony.
- Dwie dzialki tego samego orchard nie moga miec tej samej nazwy.
- Dzialke da sie zarchiwizowac bez utraty historii.

## 4. Drzewa

- User moze dodac pojedyncze drzewo do wybranej dzialki.
- Drzewo moze byc zapisane bez przypisanej odmiany.
- User moze edytowac dane drzewa.
- User moze zobaczyc liste drzew i przejsc do create / edit flow; dedykowany detail page moze pozostac odlozony.
- Drzewa mozna filtrowac po dzialce, gatunku, odmianie i kondycji.
- System nie pozwala zapisac aktywnego drzewa w zajetej lokalizacji logicznej `plot + row + position`.

## 5. Odmiany

- User moze dodac, edytowac i przegladac odmiany.
- Odmiana jest prywatna per `orchard`.
- System nie pozwala na duplikat `species + name` w obrebie jednego orchard.
- Lista i formularz create / edit sa obowiazkowe; dedykowany detail page odmiany moze pozostac odlozony.

## 6. Aktywnosci i dziennik prac

- User moze dodac aktywnosc przypisana do dzialki.
- User moze opcjonalnie przypisac aktywnosc do konkretnego drzewa.
- User moze edytowac aktywnosc.
- User moze przegladac dziennik prac i filtrowac wpisy.
- User moze wejsc w detail page aktywnosci z poziomu listy.
- Aktywnosc moze miec status `planned`, `done`, `skipped` lub `cancelled`.
- Aktywnosc zawsze ma date.
- Aktywnosc moze zawierac wiele materialow.

## 6a. Rozszerzone aktywnosci sezonowe

- User moze zapisac `pruning`, `mowing` i `spraying` wiele razy w jednym sezonie.
- Dla `pruning` system rozroznia co najmniej:
  - `winter_pruning`
  - `summer_pruning`
- Aktywnosc sezonowa moze miec jeden albo wiele rekordow `activity_scopes`.
- System wspiera zapis zakresu pracy dla:
  - calej dzialki
  - sekcji
  - rzedu
  - zakresu drzew w rzedzie
  - pojedynczego drzewa
- User moze zapisac jedna aktywnosc z kilkoma rozlacznymi zakresami wykonania.
- Przy `spraying` user moze zapisac uzyte srodki wraz z iloscia i jednostka.
- System pozwala odczytac, kto wykonal prace, przez `performed_by_profile_id` albo pole opisowe `performed_by`.
- Historia aktywnosci pozwala odroznic, co zostalo wykonane, bez nadpisywania poprzednich wpisow sezonowych.
- User moze zobaczyc na `/activities` sezonowe `summary + coverage` dla `pruning`, `mowing` i `spraying`.
- Coverage pokazuje tylko zapisane `activity_scopes` dla rekordow `done` i aktywuje sie po wyborze konkretnej dzialki.

## 6b. Zbiory i podsumowania sezonowe

- User moze zapisac rekord zbioru z iloscia owocow dla wybranego dnia.
- User moze przegladac liste wpisow zbioru, wejsc w detail page i skorygowac rekord edycja.
- Rekord zbioru moze byc zapisany:
  - dla calego orchard
  - dla dzialki
  - dla odmiany
  - dla zakresu lokalizacji
  - dla pojedynczego drzewa
- System wspiera co najmniej jednostki `kg` i `t`.
- System przelicza ilosc do `quantity_kg`, aby poprawnie liczyc sumy.
- User moze otworzyc `/reports/season-summary` i zobaczyc raport dla wybranego `season_year`.
- User moze zobaczyc sume zbiorow:
  - per odmiana
  - per dzialka
  - per sezon
- Historia zbiorow moze byc przegladana po dacie.

## 7. Dashboard i nawigacja

- Po zalogowaniu user trafia na onboarding orchard albo dashboard.
- Dashboard pokazuje liczniki aktywnych dzialek i aktywnych drzew, ostatnie aktywnosci oraz ostatnie zbiory.
- Z glownej nawigacji da sie przejsc do dzialek, drzew, odmian, dziennika i zbiorow.
- Glówne listy odrozniaja brak danych od braku wynikow po filtrowaniu i proponuja sensowne CTA.
- Krytyczne trasy detail/edit nie koncza sie surowym bledem ani cichym redirectem, gdy rekord nie istnieje w aktywnym sadzie.
- Flow zablokowany przez brak wymaganej dzialki pokazuje jasny kolejny krok zamiast bledu systemowego.
- Kluczowe widoki dzialaja na telefonie i desktopie.

## 8. Bezpieczenstwo i spojnosci danych

- RLS jest wlaczone dla tabel domenowych.
- Standardowe operacje aplikacji nie omijaja kontroli membership i ownership.
- System pilnuje zgodnosci powiazan:
  - drzewo nalezy do dzialki z tego samego `orchard`
  - odmiana przypisana do drzewa nalezy do tego samego `orchard`
  - aktywnosc przypisana do drzewa nalezy do tej samej dzialki
  - `activity_scopes` nalezy do aktywnosci z tego samego `orchard`
  - `tree_id` w `activity_scopes` nalezy do tej samej dzialki co aktywnosc

## 9. Export konta - etap 0.2

- `owner` moze wykonac `exportAccountData`.
- `worker` nie moze eksportowac danych konta.
- Eksport obejmuje tylko orchard, gdzie user ma aktywne membership `owner`.

## 10. Batch create drzew - etap 0.2

- User moze podac zakres pozycji i utworzyc wiele drzew jedna operacja.
- System waliduje konflikt lokalizacji przed zapisem.
- Nie powstaja czesciowo zapisane rekordy przy bledzie walidacji.
- Historia batcha jest zapisana w `bulk_tree_import_batches`.

## 10a. Masowe oznaczanie drzew jako `removed` - etap 0.2

- User moze wskazac dzialke, rzad i zakres pozycji, aby jedna operacja wycofac wiele drzew z aktywnego sadu.
- Operacja nie usuwa rekordow fizycznie z bazy.
- Dla wszystkich objetych drzew system ustawia `condition_status = removed` oraz `is_active = false`.
- System zwraca podsumowanie liczby rekordow zmienionych, juz nieaktywnych i brakujacych w zakresie.
- Operacja dziala tylko na drzewach nalezacych do jednego `orchard`.

## 11. Raport lokalizacji odmiany - etap 0.2

- User moze wybrac odmiane i zobaczyc, gdzie wystepuje.
- Wynik jest grupowany po dzialce, sekcji i rzedzie.
- Kolejne pozycje sa prezentowane jako zakresy.
- Raport nie uwzglednia drzew nieaktywnych ani bez lokalizacji.

## 12. Definicja `gotowe` dla pierwszego wdrozenia

Funkcjonalnosc uznajemy za gotowa, gdy:

- ma dzialajacy widok i formularz
- ma walidacje klienta i serwera
- zapisuje poprawne dane
- nie przecieka danych miedzy kontami ani orchard
- ma co najmniej podstawowy zestaw testow dla krytycznej logiki

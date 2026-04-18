# OrchardLog / Sadownik+ - ekrany i widoki

## Cel dokumentu

Ten dokument porzadkuje zestaw ekranow potrzebnych do pierwszego wydania aplikacji i kolejnego etapu rozwoju.
Kazdy ekran ma odpowiadac konkretnemu zadaniu uzytkownika w sadzie lub przy planowaniu pracy.

## Zasady ogolne

- Interfejs ma byc prosty, czytelny i szybki w obsludze na telefonie.
- Najczestsze akcje powinny byc dostepne w maksymalnie kilku kliknieciach.
- Widoki list i formularzy musza dzialac dobrze na urzadzeniach mobilnych.
- Formularze powinny byc krotkie i miec sensowne wartosci domyslne.
- UI MVP pracuje zawsze w kontekscie jednego `active_orchard`.

## Ekrany wersji 0.1

### Aktualizacja Phase 1

W aktualnym vertical slice zostaly wdrozone lub domkniete projektowo przede wszystkim:

- `login`
- `register`
- `reset-password` jako request-reset flow
- `create orchard / onboarding`
- `dashboard` jako minimalny protected shell
- `profile settings`
- orchard switcher w naglowku shell

### Aktualizacja Phase 2

W aktualnym vertical slice zostaly wdrozone:

- `plots`:
  - lista
  - create
  - edit
  - archive / restore
- `varieties`:
  - lista
  - create
  - edit
  - search
- `trees`:
  - lista
  - create
  - edit
  - filtry po `plot`, `variety`, `species`, `condition_status`, `is_active`

Swiadomie odlozone:

- dedykowane detail pages dla `plots`
- dedykowane detail pages dla `varieties`
- dedykowane detail pages dla `trees`

### 1. Logowanie / rejestracja / reset hasla

Cel:
umozliwic wejscie do aplikacji i odzyskanie dostepu.

Najwazniejsze elementy:

- pole email
- pole haslo
- przycisk logowania
- formularz rejestracji
- link do resetu hasla

### 2. Create orchard / onboarding

Cel:
utworzyc pierwszy orchard i ustawic podstawowy kontekst pracy.

Najwazniejsze elementy:

- krotkie wyjasnienie modelu orchard
- pola `name`, `code`, `description`
- akcja `Create orchard`
- checkbox / akcja `Never show again` dla warstwy informacyjnej

### 3. Dashboard

Cel:
pokazac szybki przeglad aktywnego orchard po zalogowaniu.

Najwazniejsze elementy:

- nazwa aktywnego orchard
- orchard switcher
- rola usera w aktywnym orchard
- liczba aktywnych dzialek
- liczba aktywnych drzew
- ostatnie aktywnosci
- ostatnie zbiory lub podsumowanie sezonu
- szybkie akcje:
  - dodaj dzialke
  - dodaj drzewo
  - dodaj aktywnosc
  - dodaj zbior

Uwaga Phase 1:

- w pierwszym slice dashboard jest jeszcze swiadomie uproszczony i pelni role protected shell / landing page po onboardingu

### 3a. Profile settings

Cel:
pozwolic userowi zaktualizowac dane konta bez mieszania warstwy konta z warstwa orchard.

Najwazniejsze elementy:

- `display_name`
- `locale`
- `timezone`
- email widoczny jako pole tylko do odczytu

### 4. Lista dzialek

Cel:
przeglad wszystkich dzialek aktywnego orchard.

Najwazniejsze elementy:

- nazwa dzialki
- status
- powierzchnia
- lokalizacja opisowa
- liczba drzew na dzialce
- filtrowanie po statusie
- przycisk dodania nowej dzialki

### 5. Szczegoly dzialki

Cel:
pokazac jedna dzialke jako glowny kontener pracy.

Najwazniejsze elementy:

- dane podstawowe dzialki
- liczba drzew
- lista drzew przypisanych do dzialki
- ostatnie aktywnosci na dzialce
- ostatnie zbiory na dzialce
- akcje:
  - edytuj dzialke
  - dodaj drzewo
  - dodaj aktywnosc
  - dodaj zbior

Uwaga implementacyjna:

- ekran pozostaje odlozony po Phase 2

### 6. Formularz dzialki

Cel:
tworzenie i edycja dzialki.

Najwazniejsze elementy:

- dane podstawowe
- status
- pola opcjonalne lokalizacji i gleby
- w kolejnej iteracji sekcja ustawien ukladu dzialki

### 7. Lista drzew

Cel:
przeglad wszystkich drzew z filtrowaniem.

Najwazniejsze elementy:

- nazwa lub kod drzewa
- gatunek
- odmiana
- dzialka
- lokalizacja
- kondycja
- filtry:
  - dzialka
  - gatunek
  - odmiana
  - status kondycji

### 8. Szczegoly drzewa

Cel:
pokazac komplet informacji o pojedynczym drzewie.

Najwazniejsze elementy:

- dane podstawowe drzewa
- lokalizacja
- przypisana odmiana
- historia aktywnosci dla drzewa
- historia zbiorow dla drzewa, jesli istnieje
- notatki
- akcje:
  - edytuj drzewo
  - dodaj aktywnosc

Uwaga implementacyjna:

- ekran pozostaje odlozony po Phase 2

### 9. Formularz drzewa

Cel:
dodanie lub edycja pojedynczego drzewa.

Najwazniejsze elementy:

- wybor dzialki
- gatunek
- odmiana opcjonalna
- pola lokalizacji
- pola stanu drzewa
- notatki

### 10. Lista odmian

Cel:
przeglad bazy wiedzy o odmianach aktywnego orchard.

Najwazniejsze elementy:

- nazwa odmiany
- gatunek
- oznaczenie ulubionych
- wyszukiwanie po nazwie
- przycisk dodania odmiany

### 11. Szczegoly odmiany

Cel:
pokazac wiedze o odmianie i powiazania z drzewami.

Najwazniejsze elementy:

- opis
- cechy charakterystyczne
- zalecenia pielegnacyjne
- odpornosc
- lista drzew przypisanych do odmiany

Uwaga implementacyjna:

- ekran pozostaje odlozony po Phase 2

### 12. Formularz odmiany

Cel:
tworzenie i edycja wpisu w bazie odmian.

Najwazniejsze elementy:

- gatunek
- nazwa
- opis
- pielegnacja
- cechy
- notatki

### 13. Dziennik prac

Cel:
pokazac historie zdarzen i prac w czasie.

Najwazniejsze elementy:

- lista aktywnosci w kolejnosci od najnowszych
- filtry:
  - data
  - dzialka
  - drzewo
  - typ aktywnosci
  - status
  - wykonawca
- szybkie dodanie wpisu

### 14. Formularz aktywnosci

Cel:
dodawanie i edycja pracy, obserwacji lub planu.

Najwazniejsze elementy:

- dzialka
- drzewo opcjonalne
- typ aktywnosci
- subtype dla `pruning`
- data
- status
- opis
- wykonawca
- `activity_scopes`
- `activity_materials`

### 15. Lista zbiorow

Cel:
przeglad wpisow `harvest_records` i szybkie filtrowanie po sezonie, odmianie i dzialce.

Najwazniejsze elementy:

- data zbioru
- ilosc
- jednostka i przeliczenie do `kg`
- poziom szczegolowosci
- odmiana opcjonalnie
- dzialka opcjonalnie
- filtry po sezonie, odmianie, dzialce i dacie
- przycisk `dodaj zbior`

### 16. Formularz zbioru

Cel:
zapis ilosci zebranego plonu.

Najwazniejsze elementy:

- data zbioru
- `scope_level`
- dzialka opcjonalnie
- odmiana opcjonalnie
- zakres lokalizacji opcjonalnie
- ilosc
- jednostka
- notatki

### 17. Season summary

Cel:
pokazac podsumowanie zbiorow w sezonie.

Najwazniejsze elementy:

- wybor `season_year`
- suma globalna
- suma per odmiana
- suma per dzialka
- historia w czasie
- link do listy wpisow zbioru

### 18. Orchard members

Cel:
zarzadzanie czlonkami orchard przez `owner`.

Najwazniejsze elementy:

- lista aktywnych i zaproszonych membership
- email i rola
- status membership
- akcje:
  - zapros czlonka
  - zmien role, jesli dana rola jest aktywna w releasie
  - odwolaj / dezaktywuj membership

### 19. Profil / ustawienia konta

Cel:
zarzadzanie podstawowymi danymi konta.

Najwazniejsze elementy:

- email
- nazwa wyswietlana
- jezyk
- strefa czasowa

### 20. Ustawienia orchard

Cel:
edycja nazwy, kodu i podstawowych ustawien aktywnego orchard.

Najwazniejsze elementy:

- `name`
- `code`
- `description`
- status orchard

## Ekrany wersji 0.2

### 1. Formularz batchowego dodawania drzew

Cel:
szybkie zalozenie wielu drzew jednej odmiany w zakresie pozycji.

Najwazniejsze elementy:

- wybor dzialki
- sekcja
- numer rzedu
- zakres pozycji
- odmiana
- gatunek
- podglad konfliktow

### 2. Raport lokalizacji odmiany

Cel:
odpowiedziec na pytanie, gdzie w sadzie znajduje sie dana odmiana.

Najwazniejsze elementy:

- wybor odmiany
- lista lokalizacji zgrupowanych po dzialce, sekcji i rzedzie
- prezentacja zakresow pozycji

### 3. Rozszerzone ustawienia ukladu dzialki

Cel:
zdefiniowac orientacje i numeracje dla dzialki typu `rows`.

Najwazniejsze elementy:

- `layout_type`
- `row_numbering_scheme`
- `tree_numbering_scheme`
- opis wejscia / wjazdu
- liczba rzedow
- liczba drzew w rzedzie

### 4. Bulk deactivate trees

Cel:
masowo oznaczyc zakres drzew jako `removed`.

Najwazniejsze elementy:

- wybor dzialki
- rzad
- zakres pozycji
- podglad liczby rekordow
- potwierdzenie operacji

### 5. Account export

Cel:
umozliwic `owner` pobranie account-wide eksportu danych z poziomu UI.

Najwazniejsze elementy:

- krotkie wyjasnienie zakresu eksportu
- informacja, ze eksport obejmuje tylko orchard z aktywnym membership `owner`
- akcja `Export account data`
- status generowania i pobrania pliku
- stan zabroniony dla `worker`

## Glowna nawigacja aplikacji

Rekomendowana nawigacja dolna lub boczna:

- Dashboard
- Dzialki
- Drzewa
- Odmiany
- Dziennik
- Zbiory

Dodatkowe akcje powinny byc dostepne z poziomu szczegolow i formularzy.

## Mobilne priorytety UX

- Dodanie aktywnosci w sadzie musi byc szybkie.
- Dodanie wpisu zbioru musi byc szybkie i czytelne.
- Wybieranie dzialki i drzewa musi byc uproszczone.
- Lista drzew, dziennik i zbiory powinny miec dobre filtrowanie na telefonie.
- Orchard switcher nie powinien przeszkadzac w codziennej pracy, ale ma byc dostepny stale z layoutu.

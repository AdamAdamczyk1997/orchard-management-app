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
- `dashboard` jako pierwszy protected shell, pozniej rozbudowany w Phase 5A
- `profile settings`
- `orchard settings` jako owner-only screen
- `members` jako owner-only screen
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

- `/plots/[plotId]` nie jest juz traktowane jako ogolnie odlozony detail page; jest planowane jako operacyjny detail page dzialki w `Plot Visual Operations MVP`
- dedykowane detail pages dla `varieties`
- dedykowane detail pages dla `trees`

### Aktualizacja Phase 3

W aktualnym vertical slice zostaly wdrozone:

- `activities`:
  - lista
  - create
  - edit
  - detail
  - filtry listy
  - status / delete z detail view
  - sezonowe `summary + coverage` osadzone bezposrednio na `/activities`

Swiadomie rozdzielone od tego slice:

- `reports/season-summary` pozostaje ekranem raportowania zbiorow
- `/plots/[plotId]` jest planowane w `Plot Visual Operations MVP`; do czasu wdrozenia PVO szczegoly aktywnosci pokazuja dzialke tylko jako metadata text
- detail page dla `trees` nadal jest odlozony, wiec szczegoly aktywnosci pokazuja drzewo tylko jako metadata text

### Aktualizacja Phase 4A

W aktualnym vertical slice zostaly wdrozone:

- `harvests`:
  - lista
  - create
  - edit
  - detail
  - filtry po sezonie, dacie, dzialce i odmianie
  - delete jako korekta pomylki
  - optional link do aktywnosci typu `harvest`
  - harvestowe `Season Summary` i timeline na `/reports/season-summary`
  - location-aware raport na `/reports/harvest-locations`

### Aktualizacja Phase 5A

W aktualnym vertical slice zostaly wdrozone:

- `dashboard`:
  - realny snapshot aktywnego sadu zamiast placeholdera
  - liczniki aktywnych dzialek i aktywnych drzew
  - `upcoming_activities` jako planningowy blok najblizszych prac `planned`
  - ostatnie aktywnosci
  - ostatnie zbiory
  - szybkie akcje do tworzenia rekordow
  - wejscie do harvestowego `Season Summary`
  - route-level loading skeleton
  - onboardingowy empty state oraz partial empty state dla feedow

Swiadomie odlozone do kolejnego kroku:

- szerszy planningowy blok prac wykraczajacy poza prosty feed `upcoming_activities`
- globalny audit empty/loading/error states poza dashboardem

### Aktualizacja Phase 5B1

W aktualnym vertical slice zostaly wdrozone:

- `plots`, `varieties`, `trees`, `activities` i `harvests`:
  - loading skeleton dla strony listy
  - globalny empty state, gdy modul nie ma jeszcze rekordow
  - osobny empty state dla `brak wynikow po filtrowaniu`
  - CTA do utworzenia rekordu albo do czyszczenia filtrow

Swiadomie odlozone do kolejnego kroku:

- error states i permission-denied polish poza juz istniejącymi owner-only screenami
- reczny seeded QA pass dla calosci MVP

### Aktualizacja Phase 5B2a

W aktualnym vertical slice zostaly wdrozone:

- krytyczne detail/edit/settings routes:
  - zamiast cichego redirectu pokazuja czytelny `record not found` z CTA powrotu
- `activities/new`, `trees/new` i `trees/[treeId]/edit`:
  - korzystaja ze wspolnego widoku prerequisite, gdy przed zapisem brakuje dzialki albo aktywnej dzialki
- owner-only settings zachowuja `AccessDenied`, ale missing-data states maja juz lagodny recovery UI zamiast surowego bledu

Swiadomie odlozone do kolejnego kroku:

- seeded QA pass dla calosci MVP
- reszta permission/error polish poza ekranami objetymi tym slicem

### Aktualizacja Phase 5C1

W aktualnym vertical slice zostaly wdrozone:

- `plots`, `trees`, `varieties`, `activities` i `harvests`:
  - redirect-based success feedback po create / edit
- `plots`, `activities` i `harvests`:
  - redirect-based success feedback po archive / restore / delete / status change tam, gdzie te akcje istnieja
- `activities/[activityId]` i `harvests/[harvestRecordId]`:
  - detail view pokazuje tez feedback po szybkich akcjach wykonanych bezposrednio z widoku szczegolow

Swiadomie odlozone do kolejnego kroku:

- reczny seeded QA pass dla calosci MVP
- dalszy responsive polish dla mobilnych flow terenowych

### Aktualizacja Phase 5E

W aktualnym vertical slice zostaly wdrozone:

- `dashboard`, listy i raporty:
  - spójny reset filtrow oparty o akcje `Wyczysc filtry`
  - `reports/season-summary` ma wlasny route-level loading skeleton jak pozostale krytyczne raporty
- shared recovery UI:
  - `EmptyStateCard`, `PrerequisiteCard`, `RecordNotFoundCard`, `AccessDeniedCard` i `FeedbackBanner` ukladaja CTA pionowo na mobile i utrzymuja czytelne hit-area
- `orchard switcher`:
  - pozostaje auto-submit
  - pokazuje helper text dla jednego orchard i pending copy podczas przelaczania
  - po udanym switchu wraca na biezaca trase w nowym kontekscie orchard zamiast zrzucac usera zawsze na `/dashboard`
- mobilne flow terenowe:
  - naglowki akcji, filtry i krytyczne CTA nie lamia sie w mylace uklady na waskich viewportach

Swiadomie odlozone do kolejnego kroku:

- szerszy planningowy blok prac wykraczajacy poza prosty feed `upcoming_activities`
- `/plots/[plotId]` przechodzi do planowanego slice `Plot Visual Operations MVP`; brak tej trasy przed implementacja PVO jest oczekiwany
- detail pages dla `varieties` i `trees`

### Aktualizacja Phase 5F

W aktualnym vertical slice zostaly wdrozone:

- `dashboard`:
  - osobny blok `Nadchodzace aktywnosci`
  - lista najblizszych wpisow `planned` od dzis wzwyz
  - empty state z CTA do tworzenia planowanej pracy i przejscia do listy aktywnosci
- route-level UX:
  - loading skeleton dashboardu uwzglednia tez planningowy blok

### Aktualizacja Phase 5G

W aktualnym vertical slice zostaly wdrozone:

- `orchard switcher` i nawigacja shell:
  - przelaczanie aktywnego orchard zachowuje biezaca trase i jej query params
  - nieudane przelaczenie nie konczy sie juz surowym wyjatkiem; user trafia do bezpiecznego recovery na dashboardzie z warning bannerem
- `settings/members`:
  - revoke aktywnego dostepu pracownika konczy sie jawnym success bannerem
  - zablokowany revoke ownera albo nieaktualnego membership pokazuje warning banner zamiast cichego redirectu
- feedback contract:
  - `FeedbackBanner` obsluguje juz nie tylko success notices, ale tez warning notices dla final navigation polish i recovery flows

### Aktualizacja Phase 6A

W aktualnym vertical slice zostaly wdrozone:

- `profile settings`:
  - account-wide eksport JSON na `/settings/profile`
  - CTA do pobrania eksportu dla eligible `owner` i `super_admin`
  - jawny stan zablokowany dla usera bez aktywnego membership `owner`
  - `/settings/profile` jest osobnym authenticated account screen, wiec `super_admin` bez aktywnego orchard nie wpada w onboarding
  - pending state i komunikat sukcesu po pobraniu pliku

### Aktualizacja Phase 6B

W aktualnym vertical slice zostaly wdrozone:

- `trees`:
  - `/trees/batch/new` z preview konfliktow lokalizacji i potwierdzeniem zapisu
  - `/trees/batch/deactivate` z preview zakresu, ostrzezeniami i osobnym krokiem potwierdzenia
  - szybkie wejscia do obu flow bezposrednio z listy `/trees`
  - redirect success feedback po poprawnym batch create i bulk deactivate

### Aktualizacja Phase 6C

W aktualnym vertical slice zostaly wdrozone:

- `reports/variety-locations`:
  - wybor jednej odmiany
  - metryki aktywnych drzew, drzew z raportowalna lokalizacja i lokalizacji potwierdzonych
  - grupy po dzialce, sekcji i rzedzie
  - zakresy kolejnych pozycji w rzedzie
  - informacja o aktywnych drzewach tej odmiany, ktore nie weszly do grup terenowych
- `varieties`:
  - wejscie do raportu lokalizacji z naglowka listy
  - wejscie do raportu lokalizacji z poziomu pojedynczej karty odmiany

### Aktualizacja Phase 6D

W aktualnym vertical slice zostaly wdrozone:

- `reports/harvest-locations`:
  - filtry po `season_year`, `plot_id`, `variety_id`
  - suma globalna
  - rozdzielenie wpisow z precyzyjna lokalizacja od wpisow bez konkretnego rzedu i pozycji
  - osobny licznik wpisow tylko na poziomie sadu
  - breakdown per dzialka, sekcja, rzad i zakres pozycji
- `harvests` i `reports/season-summary`:
  - wejscia do nowego raportu lokalizacyjnego

### Aktualizacja Phase 6E

W aktualnym vertical slice zostaly wdrozone:

- `plots`:
  - create i edit zawieraja juz sekcje ustawien ukladu dzialki
  - user moze zapisac `layout_type`, schemat numeracji rzedow i drzew, punkt odniesienia oraz notatki ukladu
  - lista dzialek pokazuje teraz takze zapisany uklad, numeracje i planowana siatke rzedow / drzew

### Aktualizacja Phase 6F

W aktualnym vertical slice zostaly wdrozone:

- `trees`:
  - create i edit pokazuja guidance z ustawien wybranej dzialki
  - dla `rows` wymagaja pelnej lokalizacji rzedowej
  - dla `mixed` i `irregular` wymagaja co najmniej jednej praktycznej wskazowki lokalizacyjnej
- `trees/batch/new` i `trees/batch/deactivate`:
  - pokazuja guidance z ustawien wybranej dzialki
  - sa wspierane dla dzialek `rows` i `mixed`
  - dla dzialek `irregular` pokazuja jawny stan `unsupported` zamiast aktywnego preview

### Aktualizacja Phase 6G

W aktualnym vertical slice zostaly wdrozone:

- `activities`:
  - formularz pokazuje guidance z ustawien wybranej dzialki
  - zakresy `row` i `location_range` sa blokowane dla dzialek `irregular`
- `harvests`:
  - formularz pokazuje guidance z ustawien wybranej dzialki
  - `scope_level = location_range` jest blokowany dla dzialek `irregular`
  - formularz pokazuje jawny stan `unsupported`, jesli user probuje zapisac zakres po rzedach na dzialce nieregularnej

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
  - dla `owner`: przejscie do `Orchard settings` i `Orchard members`

Uwaga Phase 5A:

- dashboard nie jest juz placeholderem i pokazuje tez osobny blok planowanych prac `upcoming_activities`

### 3a. Profile settings

Cel:
pozwolic userowi zaktualizowac dane konta bez mieszania warstwy konta z warstwa orchard.

Najwazniejsze elementy:

- `display_name`
- `locale`
- `timezone`
- email widoczny jako pole tylko do odczytu
- account-wide eksport danych dla eligible `owner` albo `super_admin`

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
- pole `code` z bezpieczna sugestia kolejnego numeru, jesli istniejace kody maja czytelny wspolny wzorzec
- status
- pola opcjonalne lokalizacji i gleby
- sekcja ustawien ukladu dzialki:
  - `layout_type`
  - `row_numbering_scheme`
  - `tree_numbering_scheme`
  - `entrance_description`
  - `layout_notes`
  - `default_row_count`
  - `default_trees_per_row`

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
- gatunek z presetami `apple`, `pear`, `plum`, `cherry` oraz opcja wlasnej wartosci
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

- gatunek z presetami `apple`, `pear`, `plum`, `cherry` oraz opcja wlasnej wartosci
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
- link z tytulu i glownego opisu wpisu do `/activities/[activityId]`
- filtry:
  - data
  - dzialka
  - drzewo
  - typ aktywnosci
  - status
  - wykonawca
- szybkie dodanie wpisu

### 13a. Szczegoly aktywnosci

Cel:
pokazac jeden wpis operacyjny razem z zapisanym zakresem wykonania i materialami.

Najwazniejsze elementy:

- naglowek z `title`, `status`, `activity_type`, opcjonalnym `activity_subtype` i data
- metadata:
  - dzialka
  - drzewo opcjonalnie
  - wykonawca
  - `season_year`
  - `season_phase`
  - czas pracy
  - koszt
  - znaczniki utworzenia i aktualizacji
- sekcje:
  - `description`
  - `weather_notes`
  - `result_notes`
  - lista `activity_scopes`
  - lista `activity_materials`
- akcje:
  - `Powrot`
  - `Edytuj`
  - zmiana statusu bez opuszczania detail view
  - `Usun aktywnosc`

### 13b. Podsumowanie sezonowych prac

Cel:
pokazac na `/activities`, co zostalo faktycznie wykonane w sezonie dla `pruning`, `mowing` i `spraying`.

Najwazniejsze elementy:

- drugi, niezalezny od listy panel filtrow z query params `summary_*`
- domyslnie:
  - `summary_season_year = biezacy rok kalendarzowy`
  - `summary_activity_type = pruning`
- filtry:
  - `summary_season_year`
  - `summary_activity_type`
  - `summary_activity_subtype` tylko dla `pruning`
  - `summary_plot_id`
  - `summary_performed_by_profile_id`
- metryki:
  - `total_done_count`
  - liczba dzialek z wykonaniem
  - rozklad po dzialkach z `last_activity_date`
- coverage:
  - aktywuje sie dopiero po wyborze `summary_plot_id`
  - pokazuje tylko wpisy `done`
  - opiera sie wylacznie na zapisanych `activity_scopes`
  - grupuje wynik per `activity_id` i linkuje do `/activities/[activityId]`

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
- pojedyncze drzewo opcjonalnie
- powiazana aktywnosc `harvest` opcjonalnie
- ilosc
- jednostka
- notatki

### 16a. Szczegoly wpisu zbioru

Cel:
pokazac jeden wpis `harvest_records` razem z zakresem, iloscia zrodlowa i wartoscia znormalizowana.

Najwazniejsze elementy:

- naglowek z data zbioru, `scope_level` i iloscia
- metadata:
  - dzialka
  - odmiana
  - drzewo opcjonalnie
  - sekcja / rzad / pozycje dla `location_range`
  - `quantity_kg`
  - autor wpisu
  - znaczniki utworzenia i aktualizacji
- opcjonalny link do powiazanej aktywnosci typu `harvest`
- akcje:
  - `Powrot`
  - `Edytuj`
  - `Usun wpis zbioru`

### 17. Podsumowanie sezonu zbiorow

Cel:
pokazac podsumowanie zbiorow w sezonie.

Najwazniejsze elementy:

- wybor `season_year`
- filtr po dzialce opcjonalny
- filtr po odmianie opcjonalny
- suma globalna
- liczba wpisow
- suma per odmiana
- suma per dzialka
- historia w czasie
- link do listy wpisow zbioru

Zasady agregacji:

- suma globalna i timeline licza wszystkie rekordy po aktywnych filtrach
- zestawienie per odmiana pokazuje tylko rekordy z przypisana odmiana
- zestawienie per dzialka pokazuje tylko rekordy z przypisana dzialka

Uwaga implementacyjna:

- ten ekran pozostaje harvestowy; sezonowe raportowanie `activities` jest osadzone na `/activities`, a nie na `/reports/season-summary`

### 17a. Raport lokalizacji zbiorow

Cel:
pokazac, gdzie w sadzie zostal odnotowany plon i ile wpisow pozostaje bez precyzyjnego przypisania do rzedu i zakresu pozycji.

Najwazniejsze elementy:

- wybor `season_year`
- filtr po dzialce opcjonalny
- filtr po odmianie opcjonalny
- suma globalna
- suma wpisow z precyzyjna lokalizacja
- suma wpisow bez precyzyjnej lokalizacji
- licznik wpisow tylko na poziomie sadu
- breakdown per dzialka
- breakdown per sekcja, rzad i zakres pozycji
- link do listy wpisow zbioru

Zasady agregacji:

- wpis `tree` moze odziedziczyc lokalizacje z aktualnego rekordu drzewa
- wpisy `orchard`, `plot` i `variety` bez rzedu pozostaja w raporcie, ale nie wchodza do grup terenowych
- grupy terenowe agreguja po `plot`, `section_name`, `row_number`, `from_position`, `to_position`

### 18. Orchard members

Cel:
zarzadzanie czlonkami orchard przez `owner`.

Najwazniejsze elementy:

- lista aktywnych i odebranych membership
- email, `display_name`, rola, status i `joined_at`
- status membership
- akcje:
  - dodaj istniejace konto po emailu jako `worker`
  - reaktywuj `revoked` membership zamiast tworzenia duplikatu
  - dezaktywuj membership

Uwaga implementacyjna:

- aktualny UI MVP nie wystawia zmiany roli membership; model pozostaje future-ready na `manager` i `viewer`

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

Uwaga implementacyjna:

- aktualny formularz settings edytuje tylko `name`, `code` i `description`
- ekran jest owner-only; worker przy bezposrednim wejsciu powinien dostac czytelny stan `forbidden`

## Ekrany wersji 0.2

### 1. Formularz batchowego dodawania drzew

Cel:
szybkie zalozenie wielu drzew jednej odmiany w zakresie pozycji.

Najwazniejsze elementy:

- wybor dzialki
- guidance z `layout_type`, numeracji i punktu odniesienia wybranej dzialki
- sekcja
- numer rzedu
- zakres pozycji
- odmiana
- gatunek
- podglad konfliktow
- jawny stan `unsupported`, jesli wybrana dzialka ma `layout_type = irregular`

### 2. Raport lokalizacji odmiany

Cel:
odpowiedziec na pytanie, gdzie w sadzie znajduje sie dana odmiana.

Najwazniejsze elementy:

- wybor odmiany
- metryki: aktywne drzewa, drzewa w raporcie, lokalizacje potwierdzone
- lista lokalizacji zgrupowanych po dzialce, sekcji i rzedzie
- prezentacja zakresow pozycji
- informacja o drzewach tej odmiany poza raportem, jesli nie maja kompletnego `row_number` i `position_in_row`
- CTA do przejscia do filtrowanej listy `trees`

### 3. Bulk deactivate trees

Cel:
masowo oznaczyc zakres drzew jako `removed`.

Najwazniejsze elementy:

- wybor dzialki
- guidance z `layout_type`, numeracji i punktu odniesienia wybranej dzialki
- rzad
- zakres pozycji
- podglad liczby rekordow
- lista aktywnych drzew, ktore zostana zmienione
- ostrzezenia o pustych lub juz nieaktywnych pozycjach
- potwierdzenie operacji
- jawny stan `unsupported`, jesli wybrana dzialka ma `layout_type = irregular`

### 4. Account export

Cel:
umozliwic eligible `owner` albo `super_admin` pobranie account-wide eksportu danych z poziomu UI.

Najwazniejsze elementy:

- krotkie wyjasnienie zakresu eksportu
- informacja, ze zakres eksportu zalezy od `scope`: `owned_orchards` albo `all_orchards_admin`
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

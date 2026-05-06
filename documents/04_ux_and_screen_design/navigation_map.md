# OrchardLog / Sadownik+ - mapa nawigacji

## Cel dokumentu

Ten dokument opisuje, jak uzytkownik porusza sie po aplikacji i jakie przejscia miedzy ekranami sa kluczowe.

## Zasada glowna

Najwazniejsze sekcje aplikacji maja byc dostepne stale z poziomu glownej nawigacji.
Najczestsze akcje powinny byc dostepne z dashboardu i ekranow szczegolow.
UI pracuje w kontekscie jednego `active_orchard`.

## Nawigacja glowna - wersja 0.1

Rekomendowane sekcje glowne:

- `Dashboard`
- `Dzialki`
- `Drzewa`
- `Odmiany`
- `Dziennik`
- `Zbiory`

Dodatkowo:

- `Ustawienia`
- orchard switcher w layoutcie aplikacji

## Sugerowane trasy aplikacji

### Publiczne

- `/login`
- `/register`
- `/reset-password`

### Wewnatrz aplikacji

- `/orchards/new`
- `/dashboard`
- `/plots`
- `/plots/[plotId]/edit`
- `/plots/new`
- `/trees`
- `/trees/[treeId]/edit`
- `/trees/new`
- `/varieties`
- `/varieties/[varietyId]/edit`
- `/varieties/new`
- `/activities`
- `/activities/[activityId]`
- `/activities/[activityId]/edit`
- `/activities/new`
- `/harvests`
- `/harvests/[harvestRecordId]`
- `/harvests/[harvestRecordId]/edit`
- `/harvests/new`
- `/reports/season-summary`
- `/reports/harvest-locations`
- `/settings/profile`
- `/settings/orchard`
- `/settings/members`

### Swiadomie odlozone po Phase 2

- `/plots/[plotId]`
- `/trees/[treeId]`
- `/varieties/[varietyId]`

### Etap 0.2

- `/trees/batch/new`
- `/trees/batch/deactivate`
- `/reports/variety-locations`
- eksport konta pozostaje osadzony na `/settings/profile` jako authenticated account screen

## Glowne przejscia uzytkownika

### Start po zalogowaniu

- `login -> orchards/new`, jesli brak aktywnego membership
- `login -> settings/profile`, jesli user jest `super_admin` i nie ma aktywnego orchard
- `login -> dashboard`, jesli `active_orchard` jest ustawiony lub mozliwy do automatycznego wyboru

### Zarzadzanie orchard

- `dashboard -> settings/orchard`
- `dashboard -> settings/members`
- `dashboard -> settings/profile`
- `settings/profile -> eksport konta`, jesli user ma aktywne membership `owner` albo role `super_admin`
- `orchard switcher -> biezaca trasa w nowym kontekscie orchard`, a przy nieudanym przelaczeniu user wraca do dashboardu z warning bannerem

### Zarzadzanie dzialkami

- `dashboard -> plots`
- `plots -> plots/new`
- `plots -> plots/[plotId]/edit`
- `plots -> trees/new`

### Zarzadzanie drzewami

- `dashboard -> trees`
- `trees -> trees/new`
- `trees -> trees/[treeId]/edit`
- `trees -> trees/batch/new`
- `trees -> trees/batch/deactivate`
- `trees filtered -> activities w kolejnych slice'ach`

### Zarzadzanie odmianami

- `dashboard -> varieties`
- `varieties -> varieties/new`
- `varieties -> varieties/[varietyId]/edit`
- `varieties -> trees z filtrem po `variety_id``
- `varieties -> /reports/variety-locations`
- `varieties card -> /reports/variety-locations?variety_id=...`

### Dziennik prac

- `dashboard -> activities`
- `activities -> activity details`
- `activities -> sezonowe summary i coverage` na tej samej trasie, przez niezalezne filtry `summary_*`
- `activity details -> activities`
- `activity details -> activities/[activityId]/edit`
- szczegoly aktywnosci pokazuja nazwy dzialki i drzewa jako metadata, bez linkow do odlozonych detail pages

### Zbiory

- `dashboard -> harvests`
- `harvests -> harvest details`
- `harvests -> /reports/season-summary`
- `harvests -> /reports/harvest-locations`
- `season summary -> filtered harvest list`
- `season summary -> /reports/harvest-locations`
- `harvest locations -> filtered harvest list`

## Szybkie akcje

Na dashboardzie warto miec stale widoczne:

- `Dodaj dzialke`
- `Dodaj drzewo`
- `Dodaj wpis do dziennika`
- `Dodaj zbior`

W przyszlosci:

- `Dodaj zakres drzew`

## Logika nawigacji mobilnej

- na telefonie najlepsza bedzie prosta nawigacja dolna
- formularze powinny otwierac sie bezposrednio z kontekstu, np. z dzialki lub drzewa
- przycisk `wstecz` powinien wracac do logicznego kontekstu, a nie przypadkowej listy
- orchard switcher powinien byc dostepny z top bara albo drawer, bez zajmowania glownej nawigacji

## Filtry jako czesc nawigacji

Filtrowanie powinno byc utrzymywane w URL tam, gdzie to ma sens:

- `/plots?status=archived`
- `/trees?plot_id=...`
- `/trees?variety_id=...&condition_status=warning`
- `/trees?is_active=true`
- `/activities?plot_id=...&status=planned`
- `/activities?summary_season_year=2026&summary_activity_type=pruning&summary_plot_id=...`
- `/varieties?q=ligol`
- `/harvests?season_year=2026&plot_id=...`
- `/reports/season-summary?season_year=2026&plot_id=...&variety_id=...`
- `/reports/harvest-locations?season_year=2026&plot_id=...&variety_id=...`
- `/reports/variety-locations?variety_id=...`

To pomaga:

- zachowac stan po odswiezeniu
- udostepniac linki do konkretnych widokow
- poprawic prace na desktopie

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
- `/settings/profile`
- `/settings/orchard`
- `/settings/members`

### Swiadomie odlozone po Phase 2

- `/plots/[plotId]`
- `/trees/[treeId]`
- `/varieties/[varietyId]`

### Etap 0.2

- `/trees/batch/new`
- `/trees/bulk-deactivate`
- `/varieties/[varietyId]/locations`
- `/settings/export`

## Glowne przejscia uzytkownika

### Start po zalogowaniu

- `login -> orchards/new`, jesli brak aktywnego membership
- `login -> dashboard`, jesli `active_orchard` jest ustawiony lub mozliwy do automatycznego wyboru

### Zarzadzanie orchard

- `dashboard -> settings/orchard`
- `dashboard -> settings/members`
- etap 0.2:
  - `dashboard -> settings/export`
- `orchard switcher -> dashboard w nowym kontekście orchard`

### Zarzadzanie dzialkami

- `dashboard -> plots`
- `plots -> plots/new`
- `plots -> plots/[plotId]/edit`
- `plots -> trees/new`

### Zarzadzanie drzewami

- `dashboard -> trees`
- `trees -> trees/new`
- `trees -> trees/[treeId]/edit`
- `trees filtered -> activities w kolejnych slice'ach`

### Zarzadzanie odmianami

- `dashboard -> varieties`
- `varieties -> varieties/new`
- `varieties -> varieties/[varietyId]/edit`
- `varieties -> trees z filtrem po `variety_id``
- etap 0.2:
  - `varieties details -> locations report`

### Dziennik prac

- `dashboard -> activities`
- `activities -> activity details`
- `activity details -> plot details`
- `activity details -> tree details`, jesli aktywnosc dotyczy konkretnego drzewa

### Zbiory

- `dashboard -> harvests`
- `harvests -> harvest details`
- `harvests -> season summary`
- `season summary -> filtered harvest list`

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
- `/activities?plot=...&status=planned`
- `/varieties?q=ligol`
- `/harvests?season_year=2026&plot=...`
- `/reports/season-summary?season_year=2026`

To pomaga:

- zachowac stan po odswiezeniu
- udostepniac linki do konkretnych widokow
- poprawic prace na desktopie

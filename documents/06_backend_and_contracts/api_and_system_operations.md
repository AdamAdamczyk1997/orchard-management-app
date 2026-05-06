# OrchardLog / Sadownik+ - API i operacje systemowe

## Cel dokumentu

Ten dokument nie narzuca jeszcze finalnego ksztaltu REST ani RPC.
Opisuje natomiast zestaw operacji, ktore backend i warstwa serwerowa musza obslugiwac, aby aplikacja dzialala zgodnie z MVP.

## Rekomendacja implementacyjna

- Dla standardowych formularzy preferowane sa `server actions`.
- Dla bardziej zlozonych operacji mozna uzyc `route handlers` albo RPC po stronie Supabase.
- Kazda operacja musi pracowac w kontekscie zalogowanego uzytkownika.
- Dla danych domenowych operacje pracuja w kontekscie `active_orchard`, chyba ze chodzi o onboarding, membership albo eksport account-wide.

## 1. Operacje konta i sesji

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `signUp` | utworzenie konta | email, password, display_name | nowe konto + profil | 0.1 |
| `signIn` | logowanie | email, password | sesja usera | 0.1 |
| `signOut` | wylogowanie | brak | zakonczenie sesji | 0.1 |
| `resetPassword` | odzyskanie dostepu | email | wyslanie linku resetu | 0.1 |
| `getCurrentProfile` | pobranie profilu | brak | profil usera | 0.1 |
| `updateProfile` | edycja profilu | display_name, locale, timezone | zaktualizowany profil | 0.1 |

### Zalecana implementacja Phase 1

- `signUp`, `signIn`, `signOut`, `resetPassword`, `getCurrentProfile` i `updateProfile` sa realizowane przez `server actions`
- `resetPassword` w Phase 1 obsluguje tylko wyslanie requestu reset linku
- profil po auth jest oczekiwany z triggera `handle_new_user_profile()`
- jesli rekord `profiles` nie istnieje, aplikacja ma failowac bezpiecznie zamiast kontynuowac onboarding

## 2. Operacje orchard i membership

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `createOrchard` | utworzenie pierwszego lub kolejnego orchard | dane formularza orchard | nowy rekord `orchards` + membership `owner` | 0.1 |
| `listMyOrchards` | lista orchard dostepnych dla usera | brak | lista `orchards` + role i status membership | 0.1 |
| `getActiveOrchardContext` | pobranie aktywnego kontekstu | brak | `active_orchard` + membership + preferencje | 0.1 |
| `setActiveOrchard` | zmiana kontekstu pracy | `orchard_id` | nowy aktywny kontekst sesji | 0.1 |
| `updateOrchard` | edycja podstawowych danych orchard | `orchard_id` + dane formularza | zaktualizowany rekord `orchards` | 0.1 |
| `listOrchardMembers` | lista membership orchard | `orchard_id` opcjonalnie, zwykle z contextu | lista `orchard_memberships` | 0.1 |
| `inviteOrchardMember` | dodanie istniejacego czlonka do orchard | email, role | nowy lub zreaktywowany membership `active` | 0.1 |
| `updateOrchardMembershipRole` | zmiana roli czlonka | `membership_id`, `role` | zaktualizowany membership | pozniej |
| `deactivateOrchardMembership` | odwolanie lub dezaktywacja membership | `membership_id` | membership ze statusem `revoked` | 0.1 |

### Zalecana walidacja dla orchard i membership

- `createOrchard` tworzy od razu aktywny membership `owner`
- `createOrchard` powinno przechodzic przez RPC `create_orchard_with_owner_membership(...)`
- `getActiveOrchardContext` i `setActiveOrchard` korzystaja z `httpOnly` cookie `ol_active_orchard`
- `setActiveOrchard` wymaga aktywnego membership w docelowym orchard
- `worker` nie moze wykonywac mutacji na `orchard_memberships`
- w MVP jeden `orchard` ma dokladnie jednego aktywnego `owner`
- w Phase 1 i `0.2` nie ma osobnego global admin shell dla `super_admin`
  bez membership; wyjatkiem pozostaje account-level `/settings/profile` i route
  `GET /settings/profile/export`
- obecny UI MVP dla `inviteOrchardMember` wspiera tylko dodanie istniejacego konta
  jako `worker`; pelny flow `invited -> acceptance` pozostaje odlozony
- przy probie ponownego dodania tego samego usera aktywny duplikat jest blokowany, a `revoked` membership jest reaktywowany

## 3. Operacje dla dzialek

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `listPlots` | lista dzialek | filtry opcjonalne | lista rekordow `plots` | 0.1 |
| `createPlot` | dodanie dzialki | dane formularza dzialki | nowy rekord `plots` | 0.1 |
| `updatePlot` | edycja dzialki | `plot_id` + dane formularza | zaktualizowany rekord | 0.1 |
| `archivePlot` | archiwizacja | `plot_id` | zmiana statusu na `archived` | 0.1 |
| `restorePlot` | przywrocenie dzialki | `plot_id` | zmiana statusu na `active` | 0.1 |
| `getPlotDetails` | szczegoly dzialki | `plot_id` | rekord dzialki + liczba drzew + ostatnie aktywnosci + ostatnie zbiory | pozniej |

### Aktualizacja Phase 2 dla dzialek

- wdrozone sa: `listPlots`, `createPlot`, `updatePlot`, `archivePlot`, `restorePlot`
- lista domyslnie pokazuje tylko `active` i `planned`
- `archived` i `all` sa obslugiwane przez filtr w URL
- create / edit obsluguje tez ustawienia ukladu dzialki:
  - `layout_type`
  - `row_numbering_scheme`
  - `tree_numbering_scheme`
  - `entrance_description`
  - `layout_notes`
  - `default_row_count`
  - `default_trees_per_row`
- detail page jest swiadomie odlozona

## 4. Operacje dla odmian

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `listVarieties` | lista odmian | wyszukiwanie, gatunek, ulubione | lista rekordow `varieties` | 0.1 |
| `createVariety` | dodanie odmiany | dane formularza odmiany | nowy rekord `varieties` | 0.1 |
| `updateVariety` | edycja odmiany | `variety_id` + dane formularza | zaktualizowany rekord | 0.1 |
| `getVarietyDetails` | szczegoly odmiany | `variety_id` | odmiana + powiazane drzewa | pozniej |
| `deleteVariety` | usuniecie odmiany | `variety_id` | wynik operacji lub blad biznesowy | pozniej |

### Zalecana walidacja dla odmian

- `species + name` unikalne per `orchard`
- kasowanie odmiany powiazanej z drzewami powinno byc ostrozne i najlepiej ograniczone w UI

### Aktualizacja Phase 2 dla odmian

- wdrozone sa: `listVarieties`, `createVariety`, `updateVariety`
- wyszukiwanie działa przez `q` w URL po `name` i `species`
- detail page i delete UI sa swiadomie odlozone

## 5. Operacje dla drzew

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `listTrees` | lista drzew | filtry po dzialce, odmianie, gatunku, statusie | lista rekordow `trees` | 0.1 |
| `createTree` | dodanie pojedynczego drzewa | dane formularza drzewa | nowy rekord `trees` | 0.1 |
| `updateTree` | edycja drzewa | `tree_id` + dane formularza | zaktualizowany rekord | 0.1 |
| `getTreeDetails` | szczegoly drzewa | `tree_id` | rekord drzewa + historia aktywnosci + historia zbioru | pozniej |
| `deactivateTree` | oznaczenie drzewa jako nieaktywne | `tree_id`, reason opcjonalnie | `is_active = false` | pozniej |
| `previewBulkDeactivateTrees` | podglad masowego wycofania drzew | `plot_id`, `row_number`, `from_position`, `to_position` | liczba aktywnych drzew i potencjalne braki w zakresie | 0.2 |
| `bulkDeactivateTrees` | masowe oznaczenie drzew jako `removed` | zakres lokalizacji + powod opcjonalnie | liczba zmienionych rekordow + podsumowanie operacji | 0.2 |
| `previewBulkTreeBatch` | podglad i walidacja batch create | dane formularza batcha | lista planowanych pozycji i konflikty lokalizacji | 0.2 |
| `createBulkTreeBatch` | transakcyjne utworzenie zakresu drzew | dane formularza batcha | rekord `bulk_tree_import_batches` + liczba utworzonych drzew | 0.2 |

### Zalecana walidacja dla drzew

- `plot_id` musi nalezec do aktywnego `orchard`
- `variety_id`, jesli ustawione, musi nalezec do aktywnego `orchard`
- brak konfliktu lokalizacji dla aktywnego drzewa
- dla `plot.layout_type = rows` wymagane sa `row_number` i `position_in_row`
- dla `plot.layout_type = mixed` i `plot.layout_type = irregular` wymagane jest co najmniej jedno praktyczne oznaczenie lokalizacji
- przy masowej deaktywacji zakres musi byc poprawny: `from_position <= to_position`
- przy masowej deaktywacji operacja powinna oznaczac rekordy jako `removed` i `is_active = false`, bez fizycznego kasowania
- przy masowej deaktywacji system powinien zwrocic podsumowanie znalezionych i zmienionych rekordow

### Aktualizacja Phase 2 dla drzew

- wdrozone sa: `listTrees`, `createTree`, `updateTree`
- lista obsluguje filtry po:
  - `plot_id`
  - `variety_id`
  - `species`
  - `condition_status`
  - `is_active`
  - `q` po `tree_code` i `display_name`
- create/edit blokuje zapis do `plot.status = 'archived'`
- detail page i deactivate UI sa swiadomie odlozone

### Aktualizacja Phase 6B dla drzew

- wdrozone sa:
  - `/trees/batch/new`
  - `/trees/batch/deactivate`
  - preview-before-write dla obu flow
  - RPC `create_bulk_tree_batch`
  - RPC `bulk_deactivate_trees`
- batch create zapisuje historie do `bulk_tree_import_batches` i linkuje nowe rekordy przez `trees.planted_batch_id`
- bulk deactivate dziala tylko w zakresie jednej dzialki i jednego rzedu
- bulk deactivate dopisuje opcjonalny powod do `trees.notes`, jesli user go poda

### Aktualizacja Phase 6F dla drzew

- create / edit `trees` wykorzystuje teraz `plots.layout_type` oraz ustawienia numeracji do guidance i walidacji
- batch create i bulk deactivate pozostaja flow rzedowymi i sa jawnie blokowane dla dzialek `irregular`

## 6. Operacje dla aktywnosci i materialow

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `listActivities` | lista wpisow dziennika | filtry po dacie, dzialce, drzewie, typie, statusie | lista rekordow `activities` | 0.1 |
| `getActivityDetails` | szczegoly wpisu | `activity_id` | aktywnosc + `activity_scopes` + `activity_materials` | 0.1 |
| `createActivity` | dodanie wpisu | dane formularza aktywnosci + zakresy + materialy | nowy rekord `activities`, `activity_scopes` i materialy | 0.1 |
| `updateActivity` | edycja wpisu | `activity_id` + dane formularza + zakresy + materialy | zaktualizowany rekord | 0.1 |
| `changeActivityStatus` | zmiana statusu | `activity_id`, `status` | zaktualizowany rekord | 0.1 |
| `deleteActivity` | usuniecie wpisu | `activity_id` | wynik operacji lub blad biznesowy | 0.1 |
| `getSeasonalActivitySummary` | podsumowanie prac sezonowych na `/activities` | `season_year`, `activity_type`, `activity_subtype` opcjonalnie dla `pruning`, `plot_id` opcjonalnie, `performed_by_profile_id` opcjonalnie | `total_done_count` i `affected_plots` z ostatnia data pracy | 0.1 |
| `getSeasonalActivityCoverage` | raport zakresow wykonania na `/activities` | `season_year`, `plot_id`, `activity_type`, `activity_subtype` opcjonalnie dla `pruning`, `performed_by_profile_id` opcjonalnie | lista zapisanych scope dla wpisow `done` | 0.1 |

### Zalecana walidacja dla aktywnosci

- `plot_id` musi nalezec do aktywnego `orchard`
- `tree_id`, jesli ustawione, musi nalezec do tej samej dzialki
- `activity_date` jest wymagane dla kazdego statusu
- `season_year` wyliczane z daty
- dla aktywnosci typu `harvest` dane ilosciowe powinny trafic do `harvest_records`, a nie tylko do `description`
- `performed_by_profile_id`, jesli ustawione, musi nalezec do tego samego `orchard`
- dla `activity_type = 'pruning'` w MVP wymagane jest `activity_subtype`
- `activity_scopes` powinny byc zapisywane transakcyjnie razem z rekordem `activities`
- dedykowane sezonowe flow `pruning`, `mowing` i `spraying` powinny zapisywac co najmniej
  jeden rekord `activity_scopes`; dla calej dzialki powinien to byc scope `plot`
- dla `scope_level = 'tree'` `tree_id` w `activity_scopes` musi nalezec do tej samej dzialki co `plot_id`
- dla `scope_level = 'location_range'` wymagane sa `row_number`, `from_position`, `to_position`
- dla dzialki `irregular` scope `row` i `location_range` nie sa wspierane i powinny byc odrzucone juz w server actions oraz triggerze `activity_scopes`
- jedna aktywnosc moze miec wiele `activity_scopes`, ale wszystkie musza nalezec do tej samej dzialki glownej
- `getSeasonalActivitySummary` liczy tylko rekordy `status = 'done'`
- `getSeasonalActivityCoverage` korzysta wylacznie z zapisanych `activity_scopes`, bez inferencji z drzew lub dzialek

## 7. Operacje dla zbiorow i dashboardu

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `getDashboardSummary` | dane do dashboardu | brak | liczniki aktywnych dzialek i drzew oraz feedy `recent_activities`, `recent_harvests` i `upcoming_activities` | 0.1 |
| `listHarvestRecords` | lista wpisow zbioru | filtry po sezonie, odmianie, dzialce, dacie | lista rekordow `harvest_records` | 0.1 |
| `getHarvestRecordDetails` | szczegoly wpisu zbioru | `harvest_record_id` | rekord zbioru + powiazania | 0.1 |
| `createHarvestRecord` | zapis ilosci zebranego plonu | dane formularza zbioru | nowy rekord `harvest_records` | 0.1 |
| `updateHarvestRecord` | korekta wpisu zbioru | `harvest_record_id` + dane formularza | zaktualizowany rekord | 0.1 |
| `deleteHarvestRecord` | usuniecie blednego wpisu | `harvest_record_id` | wynik operacji lub blad biznesowy | 0.1 |
| `getHarvestSeasonSummary` | podsumowanie sezonu | `season_year`, `plot_id` opcjonalnie, `variety_id` opcjonalnie | suma zbiorow per odmiana, per dzialka i globalnie | 0.1 |
| `getHarvestTimeline` | historia zbiorow w czasie | `season_year`, `plot_id` opcjonalnie, `variety_id` opcjonalnie | lista dni z suma `quantity_kg` i liczba wpisow | 0.1 |

Uwaga Phase 5F:

- nie ma osobnej operacji `getUpcomingActivities`; planningowy feed pozostaje czescia `getDashboardSummary`
- `upcoming_activities` korzysta z istniejacej tabeli `activities` i nie dodaje nowego modelu planowania

### Zalecana walidacja dla zbiorow

- `quantity_value > 0`
- `quantity_unit` ograniczone do wspieranych jednostek
- `quantity_kg` musi byc wyliczone deterministycznie
- `season_year` wyliczane z `harvest_date`
- `plot_id`, `variety_id`, `tree_id` i `activity_id`, jesli ustawione, musza nalezec do tego samego `orchard`
- dla `scope_level = 'location_range'` wymagane sa `plot_id`, `row_number`, `from_position`, `to_position`
- dla dzialki `irregular` `scope_level = 'location_range'` pozostaje niewspierane i powinno byc blokowane w server actions oraz triggerze `harvest_records`
- dla `tree_id` system powinien pilnowac spojnosci `plot_id` i `variety_id`
- `getHarvestSeasonSummary` liczy sume globalna ze wszystkich matching rekordow
- breakdown `per odmiana` pokazuje tylko rekordy z przypisana `variety_id`
- breakdown `per dzialka` pokazuje tylko rekordy z przypisana `plot_id`
- `getHarvestTimeline` grupuje rekordy po `harvest_date` w porzadku chronologicznym
- `getDashboardSummary` liczy `active_plots_count` tylko z `plots.status = 'active'`
- `getDashboardSummary` liczy `active_trees_count` tylko z `trees.is_active = true`
- `getDashboardSummary` ogranicza oba feedy do 5 ostatnich rekordow po dacie malejaco, potem po `created_at`
- `getDashboardSummary` zwraca `upcoming_activities` tylko dla `status = 'planned'` i `activity_date >= today`
- `getDashboardSummary` sortuje `upcoming_activities` rosnaco po `activity_date`, potem po `created_at`, i ogranicza feed do 5 rekordow

## 8. Operacje etapu 0.2 - batch create i raport lokalizacji

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `previewBulkTreeBatch` | walidacja zakresu przed zapisem | dane formularza batcha | konflikt / podsumowanie planowanych rekordow | 0.2 |
| `createBulkTreeBatch` | utworzenie wielu drzew | dane formularza batcha | rekord batcha + liczba utworzonych drzew | 0.2 |
| `previewBulkDeactivateTrees` | podglad masowego wycofania drzew | zakres lokalizacji | liczba drzew do zmiany + ostrzezenia | 0.2 |
| `bulkDeactivateTrees` | masowe oznaczenie drzew jako `removed` | zakres lokalizacji + powod opcjonalnie | liczba zmienionych drzew + podsumowanie zakresu | 0.2 |
| `getVarietyLocationsReport` | raport lokalizacji odmiany | `variety_id` | lista lokalizacji i zakresow | 0.2 |
| `getHarvestLocationSummary` | raport zbiorow po lokalizacji | `season_year`, `variety_id` opcjonalnie | suma zbiorow po dzialce, sekcji, rzedzie i zakresie | 0.2 |

### Zalecana walidacja dla batch create

- brak konfliktow lokalizacji w zadanym zakresie
- zgodnosc orchard dla dzialki i odmiany
- `from_position <= to_position`
- flow jest wspierany tylko dla dzialek `rows` i `mixed`
- `generated_tree_code_pattern`, jesli ustawione, powinno zawierac placeholder `{{n}}`
- operacja create jest transakcyjna i dziala w formule `all-or-nothing`
- przy masowej deaktywacji operacja nie moze wychodzic poza jedna dzialke i jeden `orchard`
- bulk deactivate w tym kontrakcie jest row-range flow i rowniez pozostaje niedostepne dla dzialek `irregular`
- preferowane jest logiczne usuniecie, nie fizyczny `delete`
- aktualne entry pointy UI:
  - `/trees/batch/new`
  - `/trees/batch/deactivate`
  - `/reports/variety-locations`

### Kontrakt wykonawczy `getVarietyLocationsReport`

- raport pracuje w kontekscie jednego `active_orchard` i jednej wybranej odmiany
- grupy raportu obejmuja tylko `trees.is_active = true`
- do grup trafiaja tylko rekordy z kompletnym `row_number` oraz `position_in_row`
- wynik grupuje dane po `plot_id + section_name + row_number`
- kolejne pozycje w tym samym rzedzie sa scalane do zakresow
- kontrakt zwraca osobne liczniki dla:
  - wszystkich aktywnych drzew odmiany
  - drzew z raportowalna lokalizacja
  - drzew poza raportem
  - lokalizacji potwierdzonych i niepotwierdzonych

### Kontrakt wykonawczy `getHarvestLocationSummary`

- raport pracuje w kontekscie jednego `active_orchard`
- filtruje po `season_year` oraz opcjonalnie po `plot_id` i `variety_id`
- sumuje wszystkie `harvest_records`, ale osobno rozdziela wpisy:
  - z precyzyjna lokalizacja
  - bez precyzyjnej lokalizacji
  - tylko na poziomie sadu
- wpis `tree` moze odziedziczyc `plot_id`, `section_name`, `row_number` i pozycje z rekordu drzewa
- grupy terenowe sa agregowane po `plot + section_name + row_number + from_position + to_position`
- aktualny entry point UI:
  - `/reports/harvest-locations`

## 9. Operacje import / export

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `exportAccountData` | eksport danych konta | format eksportu | plik z danymi profilu i orchard w zakresie owner albo admin | 0.2 |
| `importVarieties` | import odmian | plik | raport walidacji + zapis | 0.2 |
| `importTrees` | import drzew | plik | raport walidacji + zapis | 0.2 |

### Zasady eksportu

- `exportAccountData` jest account-wide w sensie konta uzytkownika
- dla zwyklego usera eksport obejmuje `profile` oraz wszystkie orchard, dla ktorych ma aktywne membership `owner`
- dla `super_admin` eksport obejmuje `profile` oraz wszystkie orchard dostepne administracyjnie w biezacym systemie
- aktualny entry point UI znajduje sie na `/settings/profile`, ktore jest authenticated account screen, a nie orchard-scoped page
- po zalogowaniu `super_admin` bez aktywnego orchard `/` przekierowuje na `/settings/profile`
- aktualna odpowiedz jest plikiem JSON do pobrania
- eksport zawiera:
  - `orchards`
  - `orchard_memberships`
  - `plots`
  - `varieties`
  - `trees`
  - `activities`
  - `activity_scopes`
  - `activity_materials`
- `harvest_records`
- orchard, w ktorym zwykly user jest tylko `worker`, nie trafia do eksportu

## 10. Rekomendowane typy odpowiedzi operacji

Kazda operacja serwerowa powinna zwracac ustandaryzowany wynik:

- `success`
- `data`
- `error_code`
- `message`
- `field_errors`

Przyklad logiczny:

```ts
type ActionResult<T> = {
  success: boolean
  data?: T
  error_code?: ActionErrorCode
  message?: string
  field_errors?: Record<string, string>
}
```

Wazne doprecyzowania po `Phase 5G`:

- `error_code` jest teraz zamknietym katalogiem kodow MVP, a nie dowolnym stringiem
- server actions moga zwrocic `success = false` razem z `data`, jesli UI powinno zachowac
  przydatny preview lub kontekst naprawczy
- dotyczy to obecnie glownie batch tree flows, gdzie konflikt albo pusty wynik preview nie
  kasuje danych potrzebnych do poprawy zakresu
- redirect-based bannery UX, np. po revoke membership albo przy nieudanym switchu orchard,
  nie sa `error_code`; korzystaja z osobnego mechanizmu `notice`

## 11. Kody bledow, ktore warto z gory przewidziec

- `UNAUTHORIZED`
- `FORBIDDEN`
- `PROFILE_BOOTSTRAP_REQUIRED`
- `NO_ACTIVE_ORCHARD`
- `ORCHARD_ONBOARDING_REQUIRED`
- `EXPORT_NOT_ALLOWED_FOR_ROLE`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `AUTH_SIGN_UP_FAILED`
- `AUTH_RESET_PASSWORD_FAILED`
- `ORCHARD_LIST_FAILED`
- `ORCHARD_CREATE_FAILED`
- `ORCHARD_UPDATE_FAILED`
- `ORCHARD_MEMBER_INVITE_FAILED`
- `PROFILE_UPDATE_FAILED`
- `LOCATION_CONFLICT`
- `DUPLICATE_VARIETY`
- `DUPLICATE_PLOT_NAME`
- `PLOT_MUTATION_FAILED`
- `VARIETY_MUTATION_FAILED`
- `PLOT_ARCHIVED`
- `PLOT_LAYOUT_UNSUPPORTED`
- `NO_MATCHING_TREES`
- `PREVIEW_REQUIRED`
- `TREE_MUTATION_FAILED`
- `TREE_BATCH_MUTATION_FAILED`
- `TREE_CODE_PATTERN_INVALID`
- `TREE_NOT_IN_PLOT`
- `ACTIVITY_MUTATION_FAILED`
- `ACTIVITY_SCOPE_INVALID`
- `ACTIVITY_SCOPE_LAYOUT_UNSUPPORTED`
- `PRUNING_SUBTYPE_REQUIRED`
- `HARVEST_MUTATION_FAILED`
- `HARVEST_SCOPE_INVALID`
- `HARVEST_LOCATION_RANGE_UNSUPPORTED`
- `HARVEST_UNIT_INVALID`

Aktualnym source of truth dla opisow kodow i ich pokrycia jest
`errors_and_system_messages.md`, a zgodnosc dokumentacji z kodem jest pilnowana
testem jednostkowym.

## 12. Decyzje zamkniete

- standardowe CRUD obslugujemy przez server actions
- `deleteActivity` i `deleteVariety` moga istniec technicznie, ale UI powinno je ograniczac
- eksport / import moze korzystac z route handlers albo wyspecjalizowanych operacji serwerowych

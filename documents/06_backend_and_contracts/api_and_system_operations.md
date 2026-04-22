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
- w Phase 1 nie ma osobnego admin shell dla `super_admin` bez membership
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

### Zalecana walidacja dla drzew

- `plot_id` musi nalezec do aktywnego `orchard`
- `variety_id`, jesli ustawione, musi nalezec do aktywnego `orchard`
- brak konfliktu lokalizacji dla aktywnego drzewa
- `row_number` i `position_in_row` w MVP sa walidowane parami: oba wypelnione albo oba puste
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

## 6. Operacje dla aktywnosci i materialow

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `listActivities` | lista wpisow dziennika | filtry po dacie, dzialce, drzewie, typie, statusie | lista rekordow `activities` | 0.1 |
| `getActivityDetails` | szczegoly wpisu | `activity_id` | aktywnosc + `activity_scopes` + `activity_materials` | 0.1 |
| `createActivity` | dodanie wpisu | dane formularza aktywnosci + zakresy + materialy | nowy rekord `activities`, `activity_scopes` i materialy | 0.1 |
| `updateActivity` | edycja wpisu | `activity_id` + dane formularza + zakresy + materialy | zaktualizowany rekord | 0.1 |
| `changeActivityStatus` | zmiana statusu | `activity_id`, `status` | zaktualizowany rekord | 0.1 |
| `deleteActivity` | usuniecie wpisu | `activity_id` | wynik operacji lub blad biznesowy | 0.1 |
| `getSeasonalActivitySummary` | podsumowanie prac sezonowych | `season_year`, filtry po typie / dzialce / wykonawcy | liczba wykonan, ostatnie daty, zakresy | 0.1 |
| `getSeasonalActivityCoverage` | raport zakresow wykonania | `plot_id`, `activity_type`, `activity_subtype` opcjonalnie, zakres dat | lista wykonanych scope | 0.1 |

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
- jedna aktywnosc moze miec wiele `activity_scopes`, ale wszystkie musza nalezec do tej samej dzialki glownej

## 7. Operacje dla zbiorow i dashboardu

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `getDashboardSummary` | dane do dashboardu | brak lub zakres czasu | podsumowanie liczb i ostatnich aktywnosci | 0.1 |
| `getRecentActivities` | szybki feed ostatnich wpisow | limit, filtry opcjonalne | lista aktywnosci | 0.1 |
| `getUpcomingActivities` | planowane prace | limit, filtry opcjonalne | aktywnosci `planned` | 0.1 |
| `listHarvestRecords` | lista wpisow zbioru | filtry po sezonie, odmianie, dzialce, dacie | lista rekordow `harvest_records` | 0.1 |
| `getHarvestRecordDetails` | szczegoly wpisu zbioru | `harvest_record_id` | rekord zbioru + powiazania | 0.1 |
| `createHarvestRecord` | zapis ilosci zebranego plonu | dane formularza zbioru | nowy rekord `harvest_records` | 0.1 |
| `updateHarvestRecord` | korekta wpisu zbioru | `harvest_record_id` + dane formularza | zaktualizowany rekord | 0.1 |
| `deleteHarvestRecord` | usuniecie blednego wpisu | `harvest_record_id` | wynik operacji lub blad biznesowy | 0.1 |
| `getHarvestSeasonSummary` | podsumowanie sezonu | `season_year`, filtry opcjonalne | suma zbiorow per odmiana, per dzialka i globalnie | 0.1 |
| `getHarvestTimeline` | historia zbiorow w czasie | zakres dat, filtry opcjonalne | lista / seria rekordow zbioru | 0.1 |

### Zalecana walidacja dla zbiorow

- `quantity_value > 0`
- `quantity_unit` ograniczone do wspieranych jednostek
- `quantity_kg` musi byc wyliczone deterministycznie
- `season_year` wyliczane z `harvest_date`
- `plot_id`, `variety_id`, `tree_id` i `activity_id`, jesli ustawione, musza nalezec do tego samego `orchard`
- dla `scope_level = 'location_range'` wymagane sa `plot_id`, `row_number`, `from_position`, `to_position`
- dla `tree_id` system powinien pilnowac spojnosci `plot_id` i `variety_id`

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
- operacja najlepiej transakcyjna
- przy masowej deaktywacji operacja nie moze wychodzic poza jedna dzialke i jeden `orchard`
- preferowane jest logiczne usuniecie, nie fizyczny `delete`

## 9. Operacje import / export

| Operacja | Cel | Wejscie | Wynik | Priorytet |
|---|---|---|---|---|
| `exportAccountData` | eksport danych konta | format eksportu | plik z danymi profilu i owned orchards | 0.2 |
| `importVarieties` | import odmian | plik | raport walidacji + zapis | 0.2 |
| `importTrees` | import drzew | plik | raport walidacji + zapis | 0.2 |

### Zasady eksportu

- `exportAccountData` jest account-wide w sensie konta uzytkownika
- eksport obejmuje `profile` oraz wszystkie orchard, dla ktorych user ma aktywne membership `owner`
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
- orchard, w ktorym user jest tylko `worker`, nie trafia do eksportu

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
  error_code?: string
  message?: string
  field_errors?: Record<string, string>
}
```

## 11. Kody bledow, ktore warto z gory przewidziec

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NO_ACTIVE_ORCHARD`
- `ORCHARD_MEMBERSHIP_REQUIRED`
- `ORCHARD_ONBOARDING_REQUIRED`
- `EXPORT_NOT_ALLOWED_FOR_ROLE`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `LOCATION_CONFLICT`
- `DUPLICATE_VARIETY`
- `DUPLICATE_PLOT_NAME`
- `PLOT_ARCHIVED`
- `TREE_NOT_IN_PLOT`
- `BATCH_CONFLICT`
- `ACTIVITY_SCOPE_INVALID`
- `PRUNING_SUBTYPE_REQUIRED`
- `HARVEST_SCOPE_INVALID`
- `HARVEST_UNIT_INVALID`
- `UNKNOWN_ERROR`

## 12. Decyzje zamkniete

- standardowe CRUD obslugujemy przez server actions
- `deleteActivity` i `deleteVariety` moga istniec technicznie, ale UI powinno je ograniczac
- eksport / import moze korzystac z route handlers albo wyspecjalizowanych operacji serwerowych

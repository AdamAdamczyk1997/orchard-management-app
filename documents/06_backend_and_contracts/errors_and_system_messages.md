# OrchardLog / Sadownik+ - bledy i komunikaty systemowe

## Cel dokumentu

Ten dokument zbiera rzeczywiste kody `error_code`, ktore obecnie zwracaja
shipped MVP server actions, route-context guards i account export route.
Katalog jest teraz utrzymywany jako zamkniety zbior i ma pokrycie testem
jednostkowym zgodnosci z kodem.

## Zasady ogolne

- Komunikat dla usera ma byc prosty.
- Kod bledu ma sluzyc programistycznie i do logowania.
- Ten sam blad powinien byc opisywany spojnie w calej aplikacji.

## Tabela bledow

| Error code | Kiedy wystepuje | Komunikat dla usera | Uwagi |
|---|---|---|---|
| `UNAUTHORIZED` | brak sesji | `Musisz sie zalogowac, aby kontynuowac.` | auth / protected operations |
| `FORBIDDEN` | brak odpowiednich uprawnien | `Tylko wlasciciel sadu moze zarzadzac tym obszarem.` albo rownowazny wariant owner-only | ownership / RLS |
| `PROFILE_BOOTSTRAP_REQUIRED` | profil usera nie zostal poprawnie przygotowany albo odczytany | `Nie udalo sie poprawnie przygotowac profilu po logowaniu.` | auth bootstrap / profile |
| `NO_ACTIVE_ORCHARD` | brak aktywnego kontekstu orchard przy operacji orchard-scoped | `Wybierz sad, aby kontynuowac.` z wariantem zaleznym od encji | context |
| `ORCHARD_ONBOARDING_REQUIRED` | user nie ma jeszcze zadnego orchard | `Najpierw utworz pierwszy sad.` | onboarding context |
| `EXPORT_NOT_ALLOWED_FOR_ROLE` | account export bez owner scope i bez `super_admin` | `Eksport danych konta jest dostepny tylko dla wlasciciela co najmniej jednego sadu albo administratora systemu.` | export |
| `VALIDATION_ERROR` | niepoprawne dane formularza lub relacje encji poza aktywnym orchard | `Sprawdz formularz i popraw zaznaczone pola.` | `field_errors` moze zawierac szczegoly |
| `NOT_FOUND` | rekord nie istnieje w aktywnym orchard albo nie jest juz dostepny | `Nie znaleziono wskazanego rekordu.` | wspolny fallback dla wielu encji |
| `AUTH_SIGN_UP_FAILED` | nieudane tworzenie konta | `Nie udalo sie utworzyc konta.` | auth |
| `AUTH_RESET_PASSWORD_FAILED` | nieudane wyslanie resetu hasla | `Nie udalo sie wyslac linku resetujacego.` | auth |
| `ORCHARD_LIST_FAILED` | nieudany odczyt listy orchard | `Nie udalo sie pobrac listy sadow.` | orchard shell |
| `ORCHARD_CREATE_FAILED` | nieudane utworzenie orchard | `Nie udalo sie utworzyc sadu.` | orchard create |
| `ORCHARD_UPDATE_FAILED` | nieudany zapis ustawien orchard | `Nie udalo sie zapisac ustawien sadu.` | orchard settings |
| `ORCHARD_MEMBER_INVITE_FAILED` | nieudane dodanie czlonka orchard | `Nie udalo sie dodac czlonka do sadu.` | membership management |
| `PROFILE_UPDATE_FAILED` | nieudany zapis profilu albo preferencji onboardingu | `Nie udalo sie zapisac zmian profilu.` albo rownowazny wariant preferencji | profile |
| `DUPLICATE_PLOT_NAME` | duplikat nazwy dzialki w tym samym orchard | `Masz juz dzialke o tej nazwie w tym sadzie.` | plot business rule |
| `PLOT_MUTATION_FAILED` | ogolny blad create / update plot | `Nie udalo sie zapisac dzialki.` | plot fallback |
| `DUPLICATE_VARIETY` | duplikat `species + name` w orchard | `Masz juz zapisana taka odmiane w tym sadzie.` | variety business rule |
| `VARIETY_MUTATION_FAILED` | ogolny blad create / update variety | `Nie udalo sie zapisac odmiany.` | variety fallback |
| `LOCATION_CONFLICT` | konflikt aktywnego drzewa w tej samej lokalizacji lub batch preview conflict | `W tej lokalizacji na wybranej dzialce istnieje juz aktywne drzewo.` albo rownowazny wariant batch | tree business rule |
| `TREE_MUTATION_FAILED` | ogolny blad create / update tree | `Nie udalo sie zapisac drzewa.` | tree fallback |
| `TREE_BATCH_MUTATION_FAILED` | ogolny blad batch create / bulk deactivate | `Nie udalo sie wykonac operacji masowej na drzewach.` | tree batch fallback |
| `TREE_CODE_PATTERN_INVALID` | niepoprawny wzorzec generowania kodu drzewa | `Wzorzec kodu musi zawierac placeholder {{n}}.` | batch create |
| `PLOT_ARCHIVED` | zapis do zarchiwizowanej dzialki albo batch operation na archived plot | `Nie mozna wykonac tej operacji na zarchiwizowanej dzialce.` z wariantem zaleznym od flow | plot lifecycle |
| `PLOT_LAYOUT_UNSUPPORTED` | flow wymaga dzialki wspierajacej rzedy | `Ten flow dziala tylko dla dzialek, ktore wspieraja prace w rzedach.` albo rownowazny wariant | batch / layout |
| `NO_MATCHING_TREES` | bulk deactivate nie znalazl aktywnych drzew w zakresie | `W wybranym zakresie nie ma aktywnych drzew do wycofania.` | preview-aware error z `data` |
| `PREVIEW_REQUIRED` | potwierdzenie batch create / bulk deactivate bez wygenerowanego preview | `Najpierw wygeneruj podglad, a potem potwierdz zapis.` z wariantem zaleznym od flow | preview workflow |
| `ACTIVITY_MUTATION_FAILED` | ogolny blad create / update / status change / delete activity | `Nie udalo sie zapisac aktywnosci.` albo rownowazny wariant akcji | activity fallback |
| `ACTIVITY_SCOPE_INVALID` | niepoprawny zakres aktywnosci lub scope niezgodny z plot layout | `Zakres aktywnosci jest niepoprawny.` albo bardziej szczegolowy wariant layoutowy | activity scopes |
| `ACTIVITY_SCOPE_LAYOUT_UNSUPPORTED` | wybrany typ aktywnosci wymaga obslugiwanego ukladu plotu | `Wybrany typ aktywnosci nie jest wspierany dla tej dzialki.` | activity layout constraint |
| `TREE_NOT_IN_PLOT` | wybrane drzewo nie nalezy do tej samej dzialki co aktywnosc | `Wybrane drzewo nie nalezy do tej dzialki.` | activity relation |
| `PRUNING_SUBTYPE_REQUIRED` | brak subtype dla `pruning` | `Wybierz rodzaj przycinania.` | activity domain rule |
| `HARVEST_MUTATION_FAILED` | ogolny blad create / update / delete harvest record | `Nie udalo sie zapisac wpisu zbioru.` albo rownowazny wariant delete | harvest fallback |
| `HARVEST_SCOPE_INVALID` | niepoprawny scope harvest albo niespojne relacje plot / tree / variety / activity | `Zakres zbioru jest niepoprawny.` albo bardziej szczegolowy wariant | harvest domain rule |
| `HARVEST_LOCATION_RANGE_UNSUPPORTED` | zakres lokalizacyjny nie jest obslugiwany dla wybranego ukladu dzialki | `Ten zakres lokalizacji nie jest wspierany dla wybranej dzialki.` | harvest layout constraint |
| `HARVEST_UNIT_INVALID` | nieobslugiwana jednostka zbioru | `Wybrana jednostka zbioru nie jest wspierana.` | harvest units |

## Feedback notices versus `error_code`

- `error_code` dotyczy kontraktu `ActionResult<T>` albo route JSON response.
- redirect-based komunikaty UX, np. `member_revoked` albo `orchard_switch_unavailable`,
  nie sa `error_code`; dzialaja jako osobne `notice` w URL i sa renderowane przez
  `FeedbackBanner`.

## Bledy formularzowe - przyklady

### Orchard i membership

- `Nazwa orchard jest wymagana.`
- `Podaj poprawny adres email.`
- `Nie mozesz przypisac tej roli.`

### Dzialka

- `Nazwa jest wymagana.`
- `Powierzchnia musi byc liczba dodatnia.`

### Drzewo

- `Wybierz dzialke.`
- `Gatunek jest wymagany.`
- `Dla tej dzialki podaj rzad i pozycje.`

### Odmiana

- `Nazwa odmiany jest wymagana.`
- `Gatunek jest wymagany.`

### Aktywnosc

- `Wybierz dzialke.`
- `Data jest wymagana.`
- `Tytul jest wymagany.`
- `Wybierz rodzaj przycinania.`

### Zbior

- `Data zbioru jest wymagana.`
- `Ilosc musi byc wieksza od zera.`
- `Dla tego zakresu podaj rzad oraz pozycje od i do.`

## Bledy techniczne

- Nie pokazujemy surowych bledow SQL ani stack trace w UI.
- Szczegoly techniczne trafiaja do logow.
- User dostaje zrozumialy komunikat i ewentualnie opcje ponowienia.

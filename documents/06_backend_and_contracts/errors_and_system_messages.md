# OrchardLog / Sadownik+ - bledy i komunikaty systemowe

## Cel dokumentu

Ten dokument zbiera przewidywane kody bledow oraz propozycje komunikatow dla uzytkownika.

## Zasady ogolne

- Komunikat dla usera ma byc prosty.
- Kod bledu ma sluzyc programistycznie i do logowania.
- Ten sam blad powinien byc opisywany spojnie w calej aplikacji.

## Tabela bledow

| Error code | Kiedy wystepuje | Komunikat dla usera | Uwagi |
|---|---|---|---|
| `UNAUTHORIZED` | brak sesji | `Musisz sie zalogowac, aby wykonac te operacje.` | auth |
| `FORBIDDEN` | brak odpowiednich uprawnien | `Nie masz uprawnien do tej operacji.` | ownership / RLS |
| `NO_ACTIVE_ORCHARD` | brak ustawionego aktywnego orchard | `Wybierz albo utworz orchard, aby kontynuowac.` | context |
| `ORCHARD_MEMBERSHIP_REQUIRED` | brak aktywnego membership | `Nie masz aktywnego dostepu do tego orchard.` | membership |
| `ORCHARD_ONBOARDING_REQUIRED` | brak jakiegokolwiek orchard po pierwszym logowaniu | `Najpierw utworz pierwszy orchard.` | onboarding |
| `EXPORT_NOT_ALLOWED_FOR_ROLE` | probujemy eksportowac dane bez roli `owner` albo `super_admin` | `Ta rola nie moze eksportowac danych konta.` | export |
| `NOT_FOUND` | brak rekordu | `Nie znaleziono wskazanego rekordu.` | moze dotyczyc kazdej encji |
| `VALIDATION_ERROR` | niepoprawne dane formularza | `Sprawdz formularz i popraw zaznaczone pola.` | bledy polowe w `field_errors` |
| `DUPLICATE_PLOT_NAME` | duplikat nazwy dzialki | `Masz juz dzialke o tej nazwie w tym orchard.` | biznesowy |
| `DUPLICATE_VARIETY` | duplikat `species + name` | `Masz juz zapisana taka odmiane w tym orchard.` | biznesowy |
| `LOCATION_CONFLICT` | zajeta lokalizacja drzewa | `W tej lokalizacji istnieje juz aktywne drzewo.` | biznesowy |
| `TREE_NOT_IN_PLOT` | aktywnosc dla drzewa z innej dzialki | `Wybrane drzewo nie nalezy do tej dzialki.` | biznesowy |
| `PLOT_ARCHIVED` | zapis do zarchiwizowanej dzialki | `Nie mozna wykonac tej operacji na zarchiwizowanej dzialce.` | biznesowy |
| `BATCH_CONFLICT` | konflikt w batch create | `Nie udalo sie utworzyc zakresu drzew, bo wykryto konflikt lokalizacji.` | etap 0.2 |
| `ACTIVITY_SCOPE_INVALID` | niepoprawny `activity_scope` | `Zakres aktywnosci jest niepoprawny.` | sezonowe aktywnosci |
| `PRUNING_SUBTYPE_REQUIRED` | brak subtype dla `pruning` | `Wybierz rodzaj przycinania.` | sezonowe aktywnosci |
| `HARVEST_SCOPE_INVALID` | niepoprawny zakres zbioru | `Zakres zbioru jest niepoprawny.` | harvest |
| `HARVEST_UNIT_INVALID` | nieobslugiwana jednostka zbioru | `Wybrana jednostka zbioru nie jest wspierana.` | harvest |
| `IMPORT_VALIDATION_FAILED` | bledy w imporcie | `Plik zawiera bledy i nie zostal zaimportowany.` | etap 0.2 |
| `UNKNOWN_ERROR` | nieznany blad | `Wystapil nieoczekiwany blad. Sprobuj ponownie.` | fallback |

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

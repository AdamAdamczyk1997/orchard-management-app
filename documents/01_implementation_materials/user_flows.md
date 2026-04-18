# OrchardLog / Sadownik+ - user flows

## Cel dokumentu

Ten dokument opisuje najwazniejsze scenariusze uzytkownika krok po kroku.
Jego celem jest polaczenie zakresu MVP, regul biznesowych, ekranow i operacji backendowych w konkretne przeplywy pracy.

## Zasady ogolne

- Flow maja byc szybkie i mozliwe do wykonania na telefonie.
- Kazdy flow konczy sie jednoznacznym wynikiem: zapisano dane, pokazano blad albo wykryto konflikt.
- Dla wszystkich flow obowiazuje zasada izolacji danych per `orchard`.
- UI MVP pracuje w kontekscie jednego `active_orchard`.

## Flow 1 - rejestracja i pierwsze wejscie do aplikacji

### Cel

Uzytkownik zaklada konto i po raz pierwszy wchodzi do aplikacji.

### Kroki

1. Uzytkownik otwiera ekran rejestracji.
2. Podaje email, haslo i opcjonalnie nazwe wyswietlana.
3. System tworzy konto w `Supabase Auth`.
4. System tworzy rekord `profiles`.
5. Uzytkownik zostaje zalogowany albo potwierdza email, zalezne od konfiguracji auth.
6. System sprawdza, czy user ma aktywne rekordy `orchard_memberships`.
7. Jesli nie ma membership, kieruje usera do onboardingu `createOrchard`.
8. Jesli membership istnieje, system dobiera domyslny `active_orchard`.
9. System utrwala wybrany kontekst w `httpOnly` cookie `ol_active_orchard`.
10. User trafia na dashboard.

### Wynik

- konto jest aktywne
- profil istnieje
- user trafia albo do onboardingu orchard, albo do gotowego kontekstu pracy

## Flow 1a - onboarding i utworzenie pierwszego orchard

### Cel

Uzytkownik zaklada pierwszy orchard i ustawia podstawowy kontekst pracy.

### Kroki

1. Uzytkownik widzi ekran powitalny z krotkim wyjasnieniem modelu `orchard`.
2. Moze zamknac warstwe informacyjna przez `Never show again`.
3. System zapisuje `profiles.orchard_onboarding_dismissed_at`, ale nadal wymaga utworzenia pierwszego orchard.
4. Uzytkownik wybiera `Create orchard`.
5. Podaje:
   - `name`
   - `code` opcjonalnie
   - `description` opcjonalnie
6. System tworzy rekord `orchards`.
7. System tworzy rekord `orchard_memberships` z rola `owner`.
8. System ustawia nowy rekord jako `active_orchard`.
9. System utrwala kontekst w `httpOnly` cookie `ol_active_orchard`.
10. Uzytkownik trafia na dashboard pustego orchard.

### Wynik

- orchard istnieje
- user ma role `owner`
- `active_orchard` jest ustawiony

## Flow 1b - zmiana aktywnego orchard

### Cel

Uzytkownik przechodzi do innego orchard, do ktorego ma aktywne membership.

### Kroki

1. Uzytkownik otwiera orchard switcher.
2. System pokazuje liste orchard i role usera w kazdym z nich.
3. Uzytkownik wybiera docelowy orchard.
4. System wykonuje `setActiveOrchard`.
5. System aktualizuje `httpOnly` cookie `ol_active_orchard`.
6. Layout, dashboard, listy i filtry odswiezaja sie w nowym kontekscie.

## Flow 1d - nieprawidlowy albo przestarzaly active orchard

### Cel

System ma bezpiecznie obsluzyc nieprawidlowy working context zapisany w sesji UI.

### Kroki

1. User wchodzi do chronionej czesci aplikacji.
2. System odczytuje `ol_active_orchard`.
3. Jesli cookie wskazuje orchard bez aktywnego membership:
   - nie wpuszcza usera do cudzego kontekstu
   - czyści albo nadpisuje cookie poprawnym orchadem
4. Jesli user nie ma zadnego aktywnego orchard, system kieruje go do `createOrchard`.

### Wynik

- nieprawidlowy cookie context nie daje dostepu do cudzych danych
- user dostaje przewidywalny redirect do poprawnego orchard albo onboardingu

### Wynik

- wszystkie widoki pracuja na nowym `active_orchard`
- user nie podaje recznie `orchard_id` w kolejnych formularzach

## Flow 1c - zarzadzanie membership orchard

### Cel

`owner` zaprasza pracownika lub zmienia role czlonka orchard.

### Kroki

1. `owner` przechodzi do `Orchard members`.
2. Widzi liste aktywnych i zaproszonych membership.
3. Wybiera `Invite member`.
4. Podaje email i role, przy czym MVP UI gwarantuje co najmniej role `worker`, a dodatkowe role moga pozostac ukryte do czasu ich aktywacji.
5. System tworzy albo aktualizuje rekord `orchard_memberships` ze statusem `invited`.
6. `owner` moze pozniej:
   - zmienic role, jesli dana rola jest aktywna w releasie
   - odwolac zaproszenie
   - zdezaktywowac membership

### Wynik

- membership jest zarzadzany jawnie
- `worker` nie ma dostepu do tego flow

## Flow 2 - dodanie pierwszej dzialki

### Cel

Uzytkownik dodaje dzialke, aby zaczac ewidencje sadu.

### Kroki

1. Uzytkownik przechodzi do listy dzialek w aktywnym orchard.
2. Wybiera akcje `dodaj dzialke`.
3. Uzupelnia podstawowe dane:
   - nazwa
   - lokalizacja opisowa
   - powierzchnia opcjonalnie
   - typ gleby opcjonalnie
   - typ nawodnienia opcjonalnie
4. System waliduje wymagane pola i unikalnosc nazwy w obrebie aktywnego `orchard`.
5. Po poprawnym zapisie uzytkownik wraca do listy dzialek.

### Wynik

- nowa dzialka jest widoczna na liscie
- dzialka ma status `active`, chyba ze user wybierze inaczej

## Flow 2a - dodanie lub edycja odmiany

### Cel

Uzytkownik zapisuje baze odmian potrzebna do dalszej pracy z drzewami.

### Kroki

1. Uzytkownik przechodzi do listy odmian w aktywnym orchard.
2. Wybiera `dodaj odmiane` albo `edytuj`.
3. Podaje co najmniej:
   - `species`
   - `name`
4. Opcjonalnie uzupelnia opis, cechy, notatki pielegnacyjne i flagę `is_favorite`.
5. System waliduje wymagane pola i unikalnosc `species + name` w obrebie aktywnego `orchard`.
6. Po poprawnym zapisie uzytkownik wraca do listy odmian.

### Wynik

- odmiana jest widoczna na liscie
- odmiana moze byc pozniej wybrana przy tworzeniu drzewa

## Flow 3 - dodanie pojedynczego drzewa

### Cel

Uzytkownik zapisuje jedno konkretne drzewo w systemie.

### Kroki

1. Uzytkownik przechodzi do szczegolow dzialki albo do listy drzew.
2. Wybiera akcje `dodaj drzewo`.
3. Wskazuje dzialke z aktywnego orchard.
4. Podaje dane podstawowe:
   - gatunek
   - odmiana opcjonalnie
   - kod drzewa opcjonalnie
   - lokalizacja
   - status kondycji
   - data posadzenia opcjonalnie
   - notatki opcjonalnie
5. System sprawdza:
   - czy dzialka nalezy do aktywnego `orchard`
   - czy odmiana nalezy do aktywnego `orchard`
   - czy wybrana dzialka nie jest `archived`
   - czy lokalizacja nie koliduje z aktywnym drzewem
6. Po zapisie system wraca do listy drzew w aktywnym orchard.

### Wynik

- drzewo jest zapisane i widoczne na liscie
- jesli odmiana nie byla znana, drzewo nadal moze istniec bez `variety_id`

## Flow 4 - dodanie wpisu do dziennika prac

### Cel

Uzytkownik szybko zapisuje wykonana prace lub obserwacje.

### Kroki

1. Uzytkownik przechodzi do dziennika albo z poziomu dzialki / drzewa wybiera `dodaj aktywnosc`.
2. Wybiera dzialke.
3. Opcjonalnie wybiera konkretne drzewo.
4. Uzupelnia:
   - typ aktywnosci
   - date
   - status
   - tytul
   - opis opcjonalnie
   - materialy opcjonalnie
5. System sprawdza zgodnosc `plot_id` i `tree_id`.
6. System wylicza `season_year` i domyslnie proponuje `season_phase`.
7. Po zapisie wpis pojawia sie w dzienniku i w historii dzialki lub drzewa.

### Wynik

- aktywnosc jest widoczna w dzienniku
- wpis moze reprezentowac prace wykonana albo zaplanowana

## Flow 4a - zapis sezonowej pracy na zakresie dzialki

### Cel

Uzytkownik chce zapisac faktycznie wykonana prace sezonowa na czesci dzialki albo na kilku zakresach podczas jednego dnia pracy.

### Kroki

1. Uzytkownik przechodzi do dziennika, szczegolow dzialki albo szybkiej akcji terenowej.
2. Wybiera `dodaj aktywnosc`.
3. Wskazuje dzialke i typ aktywnosci:
   - `pruning`
   - `mowing`
   - `spraying`
4. Jesli wybral `pruning`, system wymaga `activity_subtype`:
   - `winter_pruning`
   - `summer_pruning`
5. Uzytkownik podaje:
   - date
   - status
   - tytul
   - wykonawce opcjonalnie
   - notatki opcjonalnie
6. W sekcji zakresu dodaje jeden albo wiele rekordow `activity_scopes`, na przyklad:
   - cala dzialka
   - rzad
   - zakres drzew w rzedzie
   - pojedyncze drzewo
7. System waliduje kazdy zakres osobno i sprawdza zgodnosc wszystkich scope z wybrana dzialka.
8. Po zapisie aktywnosc trafia do dziennika razem z czytelnym podsumowaniem zakresow.

### Wynik

- jedna aktywnosc moze opisac kilka rozlacznych zakresow wykonania
- historia pracy jest czytelna i nie wymaga oznaczania drzew pojedynczo

## Flow 4b - zapis oprysku z uzytymi srodkami

### Cel

Uzytkownik chce zapisac oprysk wraz z zakresem wykonania i lista uzytych srodkow ochrony roslin.

### Kroki

1. Uzytkownik wybiera aktywnosc `spraying`.
2. Wskazuje dzialke i dodaje co najmniej jeden zakres `activity_scopes`.
3. Uzupelnia date, status, notatki pogodowe i efekt zabiegu.
4. W sekcji `activity_materials` dopisuje uzyte srodki:
   - nazwa
   - ilosc
   - jednostka
   - notatka opcjonalnie
5. System zapisuje aktywnosc, zakresy i materialy w jednej operacji.
6. W historii dzialki wpis jest widoczny z informacja:
   - kiedy wykonano zabieg
   - na jakim obszarze
   - jakich srodkow uzyto

### Wynik

- zabieg jest zapisany jako kompletne zdarzenie operacyjne
- mozna pozniej odtworzyc zakres pracy i uzyte srodki

## Flow 4c - sprawdzenie, co juz zostalo wykonane w sezonie

### Cel

Uzytkownik chce sprawdzic, jakie prace sezonowe zostaly juz wykonane na dzialce albo w wybranym zakresie.

### Kroki

1. Uzytkownik otwiera dziennik prac albo raport sezonowych aktywnosci.
2. Filtruje dane po:
   - dzialce
   - typie aktywnosci
   - `activity_subtype` opcjonalnie
   - sezonie
   - wykonawcy opcjonalnie
3. System pobiera rekordy `activities` razem z `activity_scopes`.
4. Uzytkownik widzi:
   - daty wykonania
   - wykonawce
   - zakresy juz objete praca
5. Jesli user wskaze dodatkowy zakres terenowy do porownania, UI moze pokazac, ktore fragmenty nie maja jeszcze wpisu `done` dla danego typu pracy.

### Wynik

- odpowiedz `co juz zrobiono` wynika z historii aktywnosci i ich zakresow
- odpowiedz `co zostalo` jest liczona porownawczo, bez zapisywania sztucznych flag na drzewach

## Flow 5 - wyszukiwanie odmiany i przeglad wiedzy

### Cel

Uzytkownik chce znalezc informacje o odmianie albo podejrzec, gdzie jej uzywa.

### Kroki

1. Uzytkownik przechodzi do listy odmian aktywnego orchard.
2. Wyszukuje odmiane po nazwie lub filtruje po gatunku.
3. Widzi wynik na tej samej liscie i moze przejsc do edycji odmiany.
4. W kolejnym etapie aplikacji ten flow moze zostac rozszerzony o detail page i liste drzew dla wybranej odmiany.

### Wynik

- user szybko odnajduje odmiane
- lista odmian staje sie punktem wejscia do dalszej pracy z drzewami tej odmiany

## Flow 6 - zapis zbioru odmiany lub dzialki

### Cel

Uzytkownik chce szybko zapisac ilosc zebranych owocow, aby miec wiarygodne podsumowanie sezonu.

### Kroki

1. Uzytkownik otwiera ekran zbiorow albo akcje `dodaj zbior`.
2. Podaje:
   - date zbioru
   - poziom szczegolowosci
   - odmiane opcjonalnie
   - dzialke opcjonalnie
   - zakres lokalizacji opcjonalnie
   - ilosc
   - jednostke
3. System wylicza `season_year` na podstawie daty.
4. System przelicza wartosc do `quantity_kg`.
5. System waliduje spojnosci:
   - dzialka nalezy do tego samego orchard
   - odmiana nalezy do tego samego orchard
   - zakres lokalizacji jest logicznie poprawny
6. Po zapisie system pokazuje podsumowanie wpisu i aktualne sumy sezonowe.

### Wynik

- rekord `harvest_records` jest zapisany
- ilosc wprowadzona przez usera jest zachowana
- raporty sezonowe moga byc liczone bez parsowania opisow aktywnosci

## Flow 7 - podsumowanie sezonu zbiorow

### Cel

Uzytkownik chce zobaczyc, ile zebral lacznie w sezonie oraz jaka odmiana i dzialka daly najwiekszy plon.

### Kroki

1. Uzytkownik otwiera ekran podsumowania sezonu.
2. Wybiera `season_year`.
3. System pobiera `harvest_records` dla danego orchard i sezonu.
4. System agreguje dane:
   - globalnie
   - per odmiana
   - per dzialka
   - w czasie
5. Uzytkownik moze zawezic wynik filtrem po odmianie albo dzialce.

### Wynik

- user widzi laczna ilosc zbioru
- user widzi strukture zbiorow per odmiana i per dzialka
- user ma czytelna historie zbiorow w czasie

## Flow 8 - archiwizacja dzialki lub usuniecie drzewa z aktywnego uzycia

### Cel

Uzytkownik porzadkuje dane bez utraty historii.

### Kroki

1. Uzytkownik otwiera szczegoly dzialki albo drzewa.
2. Wybiera operacje zmiany statusu.
3. Dla dzialki system proponuje archiwizacje.
4. Dla drzewa system proponuje oznaczenie jako `removed` i `is_active = false`.
5. System zachowuje historie aktywnosci i zbiorow.

### Wynik

- rekord nie znika z historii
- aktywne listy i raporty nie sa zanieczyszczane nieaktualnymi obiektami

## Flow 9 - szybkie wejscie mobilne w trakcie pracy w sadzie

### Cel

Uzytkownik stojacy w sadzie ma zapisac informacje bez rozbudowanego przeklikiwania.

### Kroki

1. Uzytkownik loguje sie i trafia na dashboard aktywnego orchard.
2. Z dashboardu wybiera szybka akcje:
   - dodaj aktywnosc
   - dodaj drzewo
   - dodaj zbior
3. Formularz otwiera sie z domyslnymi wartosciami:
   - dzisiejsza data
   - ostatnio uzyta dzialka, jesli ma sens
4. Uzytkownik zapisuje dane w kilku polach i wraca do pracy.

### Wynik

- system wspiera prace terenowa
- liczba klikniec i czas wpisu pozostaja niskie

## Flow 10 - masowe dodanie drzew w zakresie - etap 0.2

### Cel

Uzytkownik chce zalozyc naraz duza partie drzew jednej odmiany.

### Kroki

1. Uzytkownik otwiera formularz batchowego dodawania drzew.
2. Wskazuje:
   - dzialke
   - sekcje opcjonalnie
   - rzad
   - zakres pozycji
   - gatunek
   - odmiane opcjonalnie
   - wspolne dane startowe
3. System wykonuje podglad walidacji zakresu.
4. Jesli wykryje konflikt lokalizacji, pokazuje blad i nie zapisuje danych.
5. Jesli walidacja przejdzie, system tworzy rekord `bulk_tree_import_batches`.
6. System tworzy rekordy `trees` dla wszystkich pozycji w zakresie.
7. Uzytkownik widzi podsumowanie liczby utworzonych drzew.

### Wynik

- cala partia drzew zostaje zalozona jedna operacja
- wszystkie rekordy maja wspolne powiazanie z batchem

## Flow 11 - masowe usuniecie drzew z aktywnego uzycia - etap 0.2

### Cel

Uzytkownik chce oznaczyc wiele drzew jako usuniete po wiekszym zakresie, bez klikania kazdego rekordu osobno.

### Kroki

1. Uzytkownik otwiera widok listy drzew albo dedykowana operacje masowa.
2. Wybiera dzialke oraz wskazuje zakres:
   - rzad
   - pozycja poczatkowa
   - pozycja koncowa
3. System pokazuje podglad liczby aktywnych drzew znalezionych w tym zakresie.
4. System pokazuje ostrzezenie, ze operacja oznaczy drzewa jako `removed` i ustawi `is_active = false`.
5. Uzytkownik potwierdza operacje.
6. System wykonuje operacje transakcyjnie.
7. System zwraca podsumowanie:
   - ile drzew oznaczono jako `removed`
   - ile pozycji nie zawieralo aktywnego drzewa
   - ile rekordow bylo juz nieaktywnych

### Wynik

- wiele drzew zostaje wycofanych z aktywnego sadu jedna operacja
- historia rekordow zostaje zachowana

## Flow 12 - raport lokalizacji odmiany - etap 0.2

### Cel

Uzytkownik chce odpowiedziec na pytanie: gdzie w sadzie znajduje sie dana odmiana.

### Kroki

1. Uzytkownik otwiera szczegoly odmiany albo ekran raportu odmianowego.
2. Wybiera odmiane.
3. System pobiera aktywne drzewa z przypisana odmiana i poprawna lokalizacja.
4. System grupuje rekordy po:
   - dzialce
   - sekcji
   - rzedzie
5. System sortuje po pozycjach i scala kolejne rekordy w zakresy.
6. Uzytkownik widzi wynik w czytelnej formie terenowej.

### Wynik

- user otrzymuje praktyczna liste miejsc do odwiedzenia podczas prac odmianowych lub zbiorow

## Wnioski implementacyjne

- Najkrytyczniejsze flow dla wersji 0.1 to: rejestracja, onboarding orchard, dodanie dzialki, dodanie drzewa, dodanie aktywnosci, zapis zbioru.
- Batch create, bulk deactivate i raport odmianowy sa bardzo wazne biznesowo, ale wchodza w etapie 0.2.
- Kazdy glowny flow powinien miec swoj scenariusz E2E.

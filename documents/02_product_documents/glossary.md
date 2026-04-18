# OrchardLog / Sadownik+ - slownik pojec

## Cel dokumentu

Ten dokument porzadkuje nazwy domenowe i jezyk, jakiego uzywamy w projekcie.
Ma pomagac przy dokumentacji, projektowaniu UI, modelu danych i implementacji.

## Slownik

### MVP

Minimal Viable Product.
Pierwsza realnie uzywalna wersja produktu, ktora ma dostarczac podstawowa wartosc biznesowa.

### MVP 0.1

Pierwszy planowany release OrchardLog / Sadownik+.
Oznacza zakres funkcji, ktory wdrazamy najpierw.

### Etap 0.2

Kolejny krok po `MVP 0.1`.
Obejmuje funkcje juz przewidziane w architekturze, ale swiadomie odlozone na pozniejszy etap wdrozenia.

### Source of truth

Dokument, ktory traktujemy jako nadrzedna specyfikacje przy implementacji.
Jesli kilka dokumentow opisuje ten sam temat i pojawia sie konflikt, pierwszenstwo ma `source of truth`.

### Orchard

Glowny kontener biznesowy dla danych gospodarstwa / sadu.
W modelu wielouzytkownikowym to do `orchards` naleza dzialki, drzewa, odmiany i aktywnosci.

### Orchard membership

Powiazanie uzytkownika z konkretnym `orchard`.
W modelu odpowiada mu rekord w tabeli `orchard_memberships`.

### Global role

Rola systemowa przypisana do konta, a nie do konkretnego gospodarstwa.
W aktualnym modelu glownym przykladem jest `super_admin`.

### Orchard role

Rola uzytkownika wewnatrz konkretnego `orchard`.
W MVP wspieramy `owner` i `worker`, a model jest przygotowany na `manager` i `viewer`.

### Dzialka

Podstawowy obszar fizyczny nalezacy do `orchard`.
To glowny kontener dla drzew i aktywnosci.

### Sekcja

Umowna czesc dzialki, na przyklad kwatera albo sektor.
Na start traktowana jako elastyczne oznaczenie tekstowe, a nie osobna tabela.

### Rzad

Logiczny lub fizyczny rzad drzew w dzialce.
W uporzadkowanym sadzie jeden z glownych elementow lokalizacji drzewa.

### Pozycja w rzedzie

Numer albo miejsce konkretnego drzewa wewnatrz rzedu.
W polaczeniu z dzialka i rzedem tworzy lokalizacje logiczna.

### Drzewo

Jeden fizyczny obiekt w sadzie.
W systemie odpowiada mu jeden rekord w tabeli `trees`.

### Odmiana

Opis odmiany drzewa owocowego wraz z wiedza w ramach konkretnego `orchard`.
Jedna odmiana moze byc przypisana do wielu drzew.

### Gatunek

Typ drzewa, na przyklad jablon, grusza, sliwa.
Gatunek jest nadrzedny wobec odmiany.

### Aktywnosc

Wpis w dzienniku prac, obserwacji albo planowanych dzialan.
Moze dotyczyc calej dzialki albo konkretnego drzewa.

### Seasonal activity

Aktywnosc wykonywana wielokrotnie w ciagu sezonu, na przyklad `pruning`, `mowing` albo `spraying`.
W modelu nadal odpowiada jej rekord w tabeli `activities`.

### Activity subtype

Doprecyzowanie wariantu aktywnosci glownej.
W MVP najwazniejsze przyklady to:
- `winter_pruning`
- `summer_pruning`

### Activity scope

Jeden zakres wykonania zapisany dla aktywnosci.
W modelu odpowiada mu rekord w tabeli `activity_scopes`.
Pozwala opisac cala dzialke, sekcje, rzad, zakres drzew albo pojedyncze drzewo.

### Material aktywnosci

Srodek, zasob albo material zuzyty w ramach aktywnosci.
Na przyklad nawoz, srodek ochrony roslin, woda albo paliwo.

### Harvest record

Jeden zapis ilosci zebranych owocow.
W modelu odpowiada mu rekord w tabeli `harvest_records`.
Moze byc ogolny dla orchard, dla dzialki, dla odmiany, dla zakresu lokalizacji albo dla pojedynczego drzewa.

### Harvest scope

Poziom szczegolowosci, na jakim zapisano zbior.
W MVP rekomendowane wartosci to:
- `orchard`
- `plot`
- `variety`
- `location_range`
- `tree`

### Harvest activity

Aktywnosc typu `harvest` w tabeli `activities`.
Opisuje fakt wykonania pracy, natomiast ilosci owocow powinny byc zapisywane w `harvest_records`.

### Seasonal harvest summary

Raport sumujacy dane z `harvest_records` dla wybranego `season_year`.
Powinien pozwalac policzyc zbiory per odmiana, per dzialka i dla calego orchard.

### Sezon

Rok i faza prac sadowniczych powiazana z aktywnoscia.
W MVP sezon liczony jest wedlug roku kalendarzowego.

### Faza sezonu

Umowny podzial sezonu na `wiosna`, `lato`, `jesien`, `zima`.
Moze byc wyliczony z daty albo poprawiony przez uzytkownika.

### Kondycja drzewa

Ogolny stan roboczy drzewa opisany polem `condition_status`.
Dozwolone wartosci: `new`, `good`, `warning`, `critical`, `removed`.

### Lokalizacja potwierdzona

Stan oznaczany polem `location_verified`.
Znaczy, ze polozenie drzewa zostalo sprawdzone i mozna na nim polegac w raportach terenowych.

### Batch

Jedna operacja hurtowego utworzenia wielu drzew.
W modelu odpowiada jej `bulk_tree_import_batches`.

### Raport lokalizacji odmiany

Widok lub wynik zapytania odpowiadajacy na pytanie, gdzie znajduje sie dana odmiana w sadzie.
Nie jest osobna tabela z danymi zrodlowymi.

### Archiwizacja dzialki

Zmiana statusu dzialki tak, aby nie byla juz aktywnie uzywana, ale pozostawala w historii.

### Drzewo usuniete

Drzewo oznaczone statusem `removed` i zwykle `is_active = false`.
Nie znika z historii, ale nie bierze udzialu w aktywnych raportach.

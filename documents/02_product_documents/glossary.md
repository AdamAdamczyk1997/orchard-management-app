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

### Active orchard

Aktualnie wybrany sad, w kontekscie ktorego user pracuje w aplikacji.
Wpływa na to, jakie rekordy widzi i jakie operacje moze wykonywac.

### Global role

Rola systemowa przypisana do konta, a nie do konkretnego gospodarstwa.
W aktualnym modelu glownym przykladem jest `super_admin`.

### Orchard role

Rola uzytkownika wewnatrz konkretnego `orchard`.
W MVP wspieramy `owner` i `worker`, a model jest przygotowany na `manager` i `viewer`.

### Dzialka

Podstawowy obszar fizyczny nalezacy do `orchard`.
To glowny kontener dla drzew i aktywnosci.

### Layout type

Typ ukladu dzialki zapisany w polu `layout_type`.
Okresla, jak interpretujemy lokalizacje drzew i czy dana dzialka wspiera workflow oparte o rzedy oraz zakresy.

### Rows

Uklad dzialki, w ktorym lokalizacja jest naturalnie opisywana przez `row_number` i `position_in_row`.
To najbardziej uporzadkowany wariant pracy terenowej.

### Mixed

Uklad dzialki, w ktorym czesc lokalizacji da sie opisac rzedami, ale potrzebne sa tez bardziej elastyczne wskazowki, takie jak sekcja, etykieta rzedu albo kod drzewa.

### Irregular

Uklad dzialki bez stabilnej logiki zakresow rzedowych.
W tym wariancie formularze i walidacje blokuja niektore operacje oparte o `row` albo `location_range`.

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

### Location range

Zakres lokalizacji w rzedzie, zapisywany przez `row_number`, `from_position` i `to_position`.
Uzywamy go w aktywnosciach i zbiorach, gdy operacja dotyczy odcinka rzedu, a nie calej dzialki albo pojedynczego drzewa.

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

### Seasonal activity summary

Podsumowanie sezonowych prac, budowane na podstawie aktywnosci typu `pruning`, `mowing` albo `spraying`.
Pomaga odpowiedziec na pytanie, co zostalo wykonane w danym sezonie i na jakich dzialkach.

### Coverage

Widok pokrycia wykonanych prac sezonowych dla wybranej dzialki.
Pokazuje zapisane zakresy z `activity_scopes`, zamiast zgadywac wykonanie na podstawie samych drzew albo dzialek.

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

### Batch create

Operacyjny flow tworzenia wielu drzew jednym zapisem, po wczesniejszym preview konfliktow lokalizacji.
W obecnym produkcie dziala tylko dla dzialek wspierajacych workflow zakresowy.

### Bulk deactivate

Operacyjny flow masowego oznaczania grupy drzew jako `removed`.
Nie kasuje historii, tylko zmienia stan roboczy i aktywnosc rekordow.

### Raport lokalizacji odmiany

Widok lub wynik zapytania odpowiadajacy na pytanie, gdzie znajduje sie dana odmiana w sadzie.
Nie jest osobna tabela z danymi zrodlowymi.

### Raport lokalizacji zbiorow

Widok raportowy pokazujacy, gdzie terenowo zapisano rekordy zbioru.
Moze grupowac dane po dzialce, sekcji, rzedzie i zakresie pozycji.

### Export konta

Pobranie danych usera do pliku JSON.
W obecnym produkcie obejmuje profil i te sady, w ktorych user ma aktywne membership `owner`.

### Baseline seed

Referencyjny zestaw danych lokalnych do manual QA i testow developerskich.
Zawiera konta, sady, membershipy oraz przykladowe rekordy domenowe.

### Baseline QA

Powtarzalna weryfikacja, czy lokalne srodowisko i referencyjne dane seedowe sa gotowe do recznych testow.

### Archiwizacja dzialki

Zmiana statusu dzialki tak, aby nie byla juz aktywnie uzywana, ale pozostawala w historii.

### Drzewo usuniete

Drzewo oznaczone statusem `removed` i zwykle `is_active = false`.
Nie znika z historii, ale nie bierze udzialu w aktywnych raportach.

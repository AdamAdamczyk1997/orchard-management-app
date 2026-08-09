# Tree inventory import - open product questions

Ten dokument zawiera pytania, na ktore nie da sie odpowiedziec na podstawie obecnego kodu, migracji, testow i aktywnej dokumentacji. Nie sa to decyzje techniczne do zgadniecia w implementacji.

## P0 - blokuje projekt szablonu

### 1. Czy "dzialka" w jezyku uzytkownika oznacza aktualny `plot`?

Pytanie:
Czy w XLSX slowo "dzialka" ma oznaczac rekord `plots`, praktyczna kwatere sadownicza, czy formalna dzialke ewidencyjna?

Dlaczego decyzja jest potrzebna:
Obecny model ma `orchards` i `plots`, ale nie rozroznia formalnej dzialki ewidencyjnej od kwatery/obszaru pracy.

Mozliwe warianty:

- `dzialka = plot`.
- W UI/XLSX uzywamy nazwy "kwatera" lub "plot", a formalna dzialka jest poza MVP.
- Dodajemy w przyszlosci osobny model formalnej dzialki.

Rekomendowany wariant:
Na MVP przyjac, ze szablon dotyczy `plot`, i nazwac pole jako `plot_code` + `plot_name`, z instrukcja domenowa.

Konsekwencje pozostalych wariantow:
Formalna dzialka ewidencyjna wymaga nowego modelu i migracji. Niejasne nazewnictwo zwieksza ryzyko blednego importu.

### 2. Czy jeden plik obejmuje jeden `plot`, wiele plotow, czy caly orchard?

Pytanie:
Jaki jest zakres pojedynczego XLSX?

Dlaczego decyzja jest potrzebna:
Obecny bulk flow dziala dla jednego `plot`, ale planowana inwentaryzacja moze naturalnie obejmowac caly sad.

Mozliwe warianty:

- Jeden plik = jeden `plot`.
- Jeden plik = jeden `orchard`, wiele arkuszy/sekcji dla plotow.
- Jeden plik = dowolny zakres, z row-level `plot_code`.

Rekomendowany wariant:
MVP: jeden plik = jeden `plot`, generowany z aplikacji dla aktywnego orchard.

Konsekwencje pozostalych wariantow:
Multi-plot wymaga bardziej zlozonego preview, walidacji slownikow, konfliktow per plot i wiekszego ryzyka timeoutow.

### 3. Czy pierwszy import jest pelnym stanem plot, czy danymi przyrostowymi?

Pytanie:
Czy import ma opisac caly aktualny stan nasadzen, czy tylko dodac/zmienic wybrane fragmenty?

Dlaczego decyzja jest potrzebna:
Znaczenie braku rekordu w pliku zalezy od tego, czy plik jest snapshotem.

Mozliwe warianty:

- Full snapshot dla plot.
- Incremental create/update.
- Tryb wybierany w `METADANE`.

Rekomendowany wariant:
MVP: incremental create/validate, bez automatycznego usuwania/dezaktywacji brakujacych drzew.

Konsekwencje pozostalych wariantow:
Full snapshot wymaga zasad dla brakujacych rekordow, usuniec, konfliktow i bezpiecznego cofania.

### 4. Co oznacza zakres `from_position` - `to_position`?

Pytanie:
Czy zakres oznacza fizyczne stanowiska, istniejace drzewa, czy tylko maksymalne numery pozycji?

Dlaczego decyzja jest potrzebna:
Obecny model nie ma encji stanowiska, a PVO inferuje puste pozycje tylko z istniejacych drzew.

Mozliwe warianty:

- Zakres oznacza wszystkie fizyczne stanowiska.
- Zakres oznacza tylko istniejace drzewa do utworzenia.
- Zakres oznacza ciag numerow, a braki sa w `WYJATKI`.

Rekomendowany wariant:
MVP: zakres oznacza ciag numerow pozycji, a braki w tym zakresie sa jawne w `WYJATKI`.

Konsekwencje pozostalych wariantow:
Fizyczne stanowiska jako byt trwaly wymagaja nowego modelu. Zakres tylko istniejacych drzew utrudnia wykrywanie brakow i luk.

### 5. Jak reprezentujemy brak drzewa?

Pytanie:
Czy brak drzewa jest brakiem rekordu, jawna pozycja/station, czy rekord `tree` o specjalnym statusie?

Dlaczego decyzja jest potrzebna:
DB nie ma osobnej tabeli stanowisk ani statusu `missing`.

Mozliwe warianty:

- Brak rekordu `tree`.
- Exception import-only bez zapisu do DB.
- Nowa encja stanowiska.
- Specjalny status drzewa.

Rekomendowany wariant:
MVP: brak rekordu `tree`, `missing_tree` tylko jako exception w raporcie importu/notes, bez tworzenia sztucznego drzewa.

Konsekwencje pozostalych wariantow:
Encja stanowiska albo specjalny status wymagaja migracji i zmian raportow/PVO.

### 6. Jak mapujemy "martwe", "usuniete" i "do wymiany"?

Pytanie:
Ktore wartosci XLSX maja trafiac na `condition_status` i `is_active`?

Dlaczego decyzja jest potrzebna:
Obecny status drzewa ma `new`, `good`, `warning`, `critical`, `removed`; nie ma `dead`.

Mozliwe warianty:

- `dead` mapuje sie na `critical`.
- `dead` mapuje sie na `removed` i `is_active=false`.
- Dodajemy nowy status.
- Trzymamy tekst w `health_status`/`notes`.

Rekomendowany wariant:
MVP: `dead/do wymiany` jako `critical` albo osobna kolumna `health_status`; `removed` tylko dla jawnie usunietych/dezaktywowanych.

Konsekwencje pozostalych wariantow:
Mapowanie na `removed` usuwa rekord z aktywnych raportow. Nowy status wymaga migracji i aktualizacji UI/testow.

### 7. Czy importer moze tworzyc nowe odmiany?

Pytanie:
Co ma sie stac, gdy w pliku jest odmiana spoza slownika aktywnego orchard?

Dlaczego decyzja jest potrzebna:
Odmiany sa orchard-local, ale brak aliasow i canonicalization.

Mozliwe warianty:

- Odrzuc rekord.
- Pomin variety i utworz drzewo z samym `species`.
- Proponuj utworzenie odmiany w preview.
- Automatycznie utworz odmiane.
- Zapisz surowa nazwe w `notes`.

Rekomendowany wariant:
MVP: nie tworzyc automatycznie; preview proponuje blokujacy blad albo jawna propozycje do potwierdzenia przez owner/worker zgodnie z decyzja uprawnien.

Konsekwencje pozostalych wariantow:
Auto-create grozi duplikatami przez literowki. Reject spowalnia prace, ale chroni slownik.

### 8. Czy nieznana odmiana i niepewna odmiana to to samo?

Pytanie:
Jak rozroznic "pracownik nie wie" od "odmiana nie istnieje w slowniku" i od "odmiana wpisana z literowka"?

Dlaczego decyzja jest potrzebna:
Obecny model pozwala `variety_id=null`, ale nie ma pola confidence ani raw variety.

Mozliwe warianty:

- `UNKNOWN` jako kontrolowana wartosc importowa.
- Puste pole oznacza brak wiedzy.
- Kolumna `variety_confidence`.
- Raw value w notes.

Rekomendowany wariant:
MVP: osobna kolumna `variety_status` z wartosciami `known`, `unknown`, `uncertain`, oraz `variety_note`; do DB mapowac `unknown/uncertain` jako `variety_id=null` plus notes.

Konsekwencje pozostalych wariantow:
Samo puste pole nie odroznia pomylki od swiadomego braku wiedzy.

### 9. Czy rok posadzenia jest wymagany w MVP?

Pytanie:
Czy inwentaryzacja musi przenosic rok posadzenia, i czy moze byc przyblizony?

Dlaczego decyzja jest potrzebna:
Obecny model ma tylko `planted_at date`, bez year-only, zakresu lat i confidence.

Mozliwe warianty:

- Nie zbierac roku w MVP.
- Zbierac dokladna date.
- Zbierac rok/przedzial jako import-only i zapisywac do notes.
- Dodac pola year/range/confidence.

Rekomendowany wariant:
MVP: opcjonalny `planted_year` albo `planted_year_from/to` jako import-only, z zapisem do `notes`, chyba ze raporty wieku sa P0.

Konsekwencje pozostalych wariantow:
Dokladna data bedzie sztuczna dla informacji "okolo 2015-2017". Migracja jest potrzebna, jesli rok ma byc filtrowalny.

### 10. Czy worker moze zatwierdzic import?

Pytanie:
Jakie role moga uploadowac, walidowac i confirmowac import?

Dlaczego decyzja jest potrzebna:
Obecnie worker moze mutowac dane operacyjne, ale import masowy moze miec wiekszy blast radius.

Mozliwe warianty:

- Worker moze upload/preview/confirm.
- Worker moze upload/preview, owner confirmuje.
- Tylko owner/super_admin.
- Konfigurowalne per orchard.

Rekomendowany wariant:
MVP: worker moze preview, confirm wymaga owner albo jawnej decyzji, ze worker ma prawo do importu.

Konsekwencje pozostalych wariantow:
Owner-only jest bezpieczniejsze, ale mniej ergonomiczne. Worker confirm jest zgodny z obecnym write model, ale zwieksza ryzyko masowych bledow.

## P1 - blokuje implementacje importera

### 11. Jakie strategie konfliktu sa dozwolone?

Pytanie:
Co robimy, gdy importowana pozycja koliduje z aktywnym drzewem?

Dlaczego decyzja jest potrzebna:
DB blokuje duplikat aktywnej lokalizacji, ale produkt musi okreslic oczekiwane zachowanie.

Mozliwe warianty:

- Odrzuc caly import.
- Pomin konfliktowe rekordy.
- Aktualizuj istniejace drzewa.
- Dezaktywuj stare i utworz nowe.
- Aktualizuj tylko puste pola.

Rekomendowany wariant:
MVP: reject all-or-nothing. Inne strategie dopiero po preview z jawna zgoda.

Konsekwencje pozostalych wariantow:
Partial/pomin wymaga final report i moze byc trudne do wytlumaczenia. Deactivate+create wymaga semantyki historii.

### 12. Czy confirm zawsze rewaliduje import?

Pytanie:
Czy confirm ma ponownie uruchomic walidacje po preview, gdy baza mogla sie zmienic?

Dlaczego decyzja jest potrzebna:
Miedzy preview i confirm inne osoby moga utworzyc/zmienic drzewa.

Mozliwe warianty:

- Confirm rewaliduje wszystko.
- Confirm ufa snapshotowi preview.
- Confirm porownuje revision/hash danych referencyjnych.

Rekomendowany wariant:
Confirm zawsze rewaliduje i robi DB transaction.

Konsekwencje pozostalych wariantow:
Zaufanie preview moze przepuscic konflikty albo wygenerowac niejasny blad DB.

### 13. Czy potrzebujemy persisted staging?

Pytanie:
Czy znormalizowane dane importu maja byc zapisane w bazie przed confirm?

Dlaczego decyzja jest potrzebna:
Bez stagingu trudniej rozdzielic upload od approval, wznowic prace i zapewnic idempotencje.

Mozliwe warianty:

- No staging, preview trzyma dane w request/response.
- Staging JSON w DB.
- Staging normalized rows w DB.
- Storage + metadata + staging rows.

Rekomendowany wariant:
Dla prawdziwego importu: staging w DB z import id, file hash, normalized rows i validation report.

Konsekwencje pozostalych wariantow:
No staging jest prostszy, ale slaby dla duzych plikow, approval i retry.

### 14. Jak dlugo niedokonczony import istnieje?

Pytanie:
Jaki TTL ma draft/staged import?

Dlaczego decyzja jest potrzebna:
Staging moze przechowywac dane operacyjne i potencjalnie oryginalny plik.

Mozliwe warianty:

- Tylko w czasie sesji.
- 24h.
- 7 dni.
- Do recznego usuniecia.

Rekomendowany wariant:
7 dni dla staging metadata, oryginalny plik opcjonalnie krocej, zgodnie z polityka storage.

Konsekwencje pozostalych wariantow:
Krotki TTL utrudnia review; dlugi TTL zwieksza koszt i obowiazki prywatnosci.

### 15. Jak zapewnic idempotencje?

Pytanie:
Jaki identyfikator ma blokowac ponowne zatwierdzenie tego samego importu?

Dlaczego decyzja jest potrzebna:
Obecny batch nie ma idempotency key.

Mozliwe warianty:

- `file_hash`.
- `import_id`.
- `idempotency_key` generowany przy upload.
- Kombinacja `orchard_id + plot_id + file_hash + contract_version`.

Rekomendowany wariant:
`import_id` jako glowny identyfikator procesu oraz `file_hash` do detekcji duplikatu pliku.

Konsekwencje pozostalych wariantow:
Sam hash nie rozroznia poprawionych decyzji preview; sam import id nie wykrywa reuploadu tego samego pliku.

### 16. Czy potrzebujemy cofniecia importu?

Pytanie:
Czy system ma pozwolic calkowicie cofnac import po confirm?

Dlaczego decyzja jest potrzebna:
Bez source-row mapping i audit logu undo moze usunac pozniejsze reczne zmiany.

Mozliwe warianty:

- Brak undo; tylko backup/manual correction.
- Undo tylko natychmiast, dopoki nikt nie zmienil rekordow.
- Undo tworzy odwrotna operacje/dezaktywacje.
- Pelny audit/event sourcing.

Rekomendowany wariant:
MVP: brak automatycznego undo; raport importu i jasne all-or-nothing. Undo jako P1/P2 po stagingu.

Konsekwencje pozostalych wariantow:
Bezpieczne undo wymaga nowego modelu historii zmian.

### 17. Czy PVO preview przed confirm jest wymagane?

Pytanie:
Czy user musi zobaczyc wizualny podglad plot z przyszlymi drzewami przed confirm?

Dlaczego decyzja jest potrzebna:
Obecne PVO dziala na zapisanych `trees`, nie na prospective import rows.

Mozliwe warianty:

- Tabelaryczny preview wystarcza w MVP.
- PVO preview wymagane.
- PVO preview tylko dla malych plotow.

Rekomendowany wariant:
MVP: tabelaryczny preview + summary per row/variety/conflict. PVO preview jako pozniejszy etap.

Konsekwencje pozostalych wariantow:
PVO preview wymaga adaptera danych tymczasowych i dodatkowych testow wydajnosci.

### 18. Jak walidujemy luki w rzedzie?

Pytanie:
Czy przerwa miedzy segmentami jest bledem, warningiem czy poprawnym stanem?

Dlaczego decyzja jest potrzebna:
Sady moga miec brakujace drzewa, a DB pozwala na luki.

Mozliwe warianty:

- Luka jest poprawna.
- Luka jest warningiem.
- Luka jest bledem bez `WYJATKI`.
- Zalezy od trybu full snapshot/incremental.

Rekomendowany wariant:
MVP: warning, chyba ze full snapshot wymaga jawnych `missing_tree` exceptions.

Konsekwencje pozostalych wariantow:
Blokowanie luk moze przeszkodzic realnej inwentaryzacji nieregularnych nasadzen.

### 19. Czy `WYJATKI` wspiera pojedyncza pozycje czy zakresy?

Pytanie:
Jak szczegolowy ma byc arkusz wyjatkow?

Dlaczego decyzja jest potrzebna:
Wyjatki moga oznaczac braki, dosadzenia, inna odmiane, stan, notatke.

Mozliwe warianty:

- Tylko pojedyncza pozycja.
- Pojedyncza pozycja i male zakresy.
- Dowolne zakresy z priorytetami.

Rekomendowany wariant:
MVP: pojedyncze pozycje; male zakresy dopiero po jasnych zasadach overlap.

Konsekwencje pozostalych wariantow:
Zakresowe wyjatki komplikuja normalizacje i konflikty.

### 20. Czy brak rekordu w pliku oznacza usuniecie istniejacego drzewa?

Pytanie:
Jak interpretowac istniejace drzewa w DB, ktorych nie ma w XLSX?

Dlaczego decyzja jest potrzebna:
To najwieksza roznica miedzy full snapshot i incremental.

Mozliwe warianty:

- Brak = bez zmian.
- Brak = warning.
- Brak = deactivation candidate.
- Brak = removed after owner confirmation.

Rekomendowany wariant:
MVP: brak = bez zmian.

Konsekwencje pozostalych wariantow:
Automatyczna dezaktywacja wymaga bardzo mocnego preview i cofania.

## P2 - mozna odlozyc po MVP

### 21. Czy potrzebujemy modelu podkladek?

Pytanie:
Czy `rootstock` ma pozostac tekstem, czy potrzebny jest slownik/tabela?

Dlaczego decyzja jest potrzebna:
Obecnie `rootstock` jest tekstem na `trees`.

Mozliwe warianty:

- Free text.
- Slownik w XLSX bez tabeli.
- Orchard-local `rootstocks` table.

Rekomendowany wariant:
MVP: free text, opcjonalny slownik pomocniczy w XLSX.

Konsekwencje pozostalych wariantow:
Tabela podkladek wymaga migracji i UI.

### 22. Czy potrzebujemy klonow, sportow i szczepow?

Pytanie:
Czy odmiana ma byc rozbita na variety/clone/sport/cultivar?

Dlaczego decyzja jest potrzebna:
Obecny model ma tylko `species` i `name`.

Mozliwe warianty:

- Wszystko w `varieties.name`.
- Dodatkowe pola tekstowe.
- Osobny model taksonomiczny.

Rekomendowany wariant:
MVP: nie rozbudowywac; doprecyzowania w `name` lub notes.

Konsekwencje pozostalych wariantow:
Model taksonomiczny istotnie rozszerza importer i slowniki.

### 23. Czy potrzebujemy GPS i geometrii rzedow?

Pytanie:
Czy import ma zawierac wspolrzedne punktow/rzedow?

Dlaczego decyzja jest potrzebna:
Obecny model nie ma GPS na trees/rows.

Mozliwe warianty:

- Brak GPS w MVP.
- Opcjonalny tekst w notes.
- Strukturalne pola GPS/geometry.

Rekomendowany wariant:
Odlozyc po MVP.

Konsekwencje pozostalych wariantow:
GPS wymaga migracji, walidacji formatu i zmian PVO/map.

### 24. Czy oryginalny XLSX musi byc przechowywany?

Pytanie:
Czy po imporcie trzymamy plik jako dowod/audit?

Dlaczego decyzja jest potrzebna:
Storage jest opisany jako przyszly kierunek, ale nie wdrozony.

Mozliwe warianty:

- Nie przechowywac pliku.
- Przechowywac przez krotki TTL.
- Przechowywac trwale private storage.

Rekomendowany wariant:
MVP bez storage albo krotki TTL, jesli staging wejdzie od razu.

Konsekwencje pozostalych wariantow:
Trwale storage wymaga polityk dostepu, retencji i kosztow.

### 25. Czy inwentaryzacja bedzie robiona offline/na papierze?

Pytanie:
Czy szablon ma byc zoptymalizowany pod komputer, telefon, czy wydruk i przepisanie?

Dlaczego decyzja jest potrzebna:
To wplywa na liczbe arkuszy, zablokowane kolumny, instrukcje i listy rozwijane.

Mozliwe warianty:

- Komputer z Excel/LibreOffice.
- Telefon/tablet.
- Papier + pozniejsze przepisanie.

Rekomendowany wariant:
MVP: komputer/LibreOffice/Excel, z mozliwoscia wydruku instrukcji.

Konsekwencje pozostalych wariantow:
Mobile/offline moze wymagac innego UX niz XLSX.

### 26. Czy potrzebny jest globalny katalog odmian?

Pytanie:
Czy import ma korzystac z publicznego slownika odmian, czy tylko z orchard-local varieties?

Dlaczego decyzja jest potrzebna:
Obecny model celowo trzyma odmiany per orchard.

Mozliwe warianty:

- Orchard-local only.
- Global suggestions, copy to orchard.
- Pelny global catalog.

Rekomendowany wariant:
MVP: orchard-local only.

Konsekwencje pozostalych wariantow:
Global catalog wymaga governance, aliasow i migracji.

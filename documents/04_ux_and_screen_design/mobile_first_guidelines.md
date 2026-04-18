# OrchardLog / Sadownik+ - mobile first wytyczne

## Cel dokumentu

Ten dokument zbiera zasady, ktore maja sprawic, ze aplikacja bedzie wygodna przede wszystkim na telefonie, bez utraty uzytecznosci na desktopie.

## Zasada glowna

Najwazniejsze akcje terenowe maja byc projektowane najpierw pod telefon.
Desktop ma byc rozszerzeniem wygody do porzadkowania i analizy, a nie jedynym wygodnym miejscem pracy.

## 1. Najwyzsze priorytety mobilne

- szybkie dodanie wpisu do dziennika
- szybkie dodanie pojedynczego drzewa
- szybkie odnalezienie dzialki lub drzewa
- szybki podglad ostatnich aktywnosci

## 2. Zasady projektowania formularzy

- najwazniejsze pola na gorze
- pola opcjonalne w sekcji rozwijanej
- jak najmniej przewijania
- sensowne wartosci domyslne
- przyciski akcji stale widoczne lub latwo dostepne

## 3. Zasady dla list

- lista musi byc czytelna na waskim ekranie
- element listy powinien pokazywac tylko najwazniejsze dane
- szczegoly poboczne lepiej przenosic do widoku detalu
- filtry powinny byc lekkie i mozliwe do schowania

## 4. Zasady dla nawigacji

- glowna nawigacja nie moze miec zbyt wielu pozycji
- szybkie akcje powinny byc dostepne z dashboardu
- powrot z formularza powinien byc przewidywalny

## 5. Zasady wydajnosci odczuwalnej

- formularze musza reagowac od razu
- stany ladowania maja byc czytelne
- po zapisie uzytkownik musi dostac szybkie potwierdzenie sukcesu
- niepotrzebne przejscia i reloady trzeba ograniczac

## 6. Typowe sytuacje terenowe

### Sytuacja 1

Uzytkownik stoi w sadzie i chce zapisac wykonany oprysk.

Wymaganie:

- powinien wejsc do formularza z dashboardu i zapisac wpis bez dlugiego wyszukiwania

### Sytuacja 2

Uzytkownik stoi przy drzewie i chce szybko dopisac obserwacje.

Wymaganie:

- po wejciu w szczegoly drzewa ma miec widoczna akcje "dodaj wpis"

### Sytuacja 3

Uzytkownik chce szybko sprawdzic, na ktorej dzialce jest dane drzewo.

Wymaganie:

- wyszukiwanie i lista drzew musza byc uzyteczne na telefonie

## 7. Co moze byc wygodniejsze na desktopie

- dluzsza edycja opisow odmian
- szerokie listy z wieloma filtrami
- przyszle raporty i eksport

## 8. Decyzje projektowe na teraz

- Projektujemy interfejs tak, jakby glownym urzadzeniem byl telefon.
- Desktop ma korzystac z tej samej logiki, ale moze miec wiecej przestrzeni na dodatkowe informacje.

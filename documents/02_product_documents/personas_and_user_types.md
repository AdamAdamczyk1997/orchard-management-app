# OrchardLog / Sadownik+ - persony i typy uzytkownikow

## Cel dokumentu

Ten dokument opisuje, dla kogo projektujemy produkt i jakie potrzeby ma glowny odbiorca.
Persony sa robocze i wynikaja z obecnych zalozen projektu.

## Zalozenie glowne

W obecnym kierunku OrchardLog jest projektowany przede wszystkim dla osoby, ktora zarzadza sadem albo pracuje w jego ramach i potrzebuje prostego cyfrowego systemu zamiast notatnika, pamieci albo rozproszonych plikow.

## Persona 1 - wlasciciel malego lub sredniego sadu

### Profil

- zarzadza wlasnym sadem
- zna realia pracy w sadzie, ale nie musi byc zaawansowany technicznie
- korzysta z telefonu podczas pracy i z laptopa przy podsumowaniach
- najczesciej pracuje sam albo z niewielkim wsparciem rodziny / pracownikow
- w nowym modelu jest naturalnym kandydatem na role `owner`

### Potrzeby

- wiedziec, co jest na ktorej dzialce
- szybko sprawdzic, jakie drzewa i odmiany ma w sadzie
- zapisac, co zostalo zrobione i kiedy
- miec porzadek w wiedzy o odmianach
- w przyszlosci latwo znalezc miejsca, gdzie rosnie dana odmiana

### Bole dzisiaj

- dane sa w glowie, zeszycie albo w rozproszonych notatkach
- trudno pozniej odtworzyc historie prac
- przy wiekszej liczbie drzew trudniej ogarnac lokalizacje i odmiany
- wpisywanie danych nie moze byc czasochlonne

### Oczekiwania wobec produktu

- prostota
- szybkie formularze
- czytelny jezyk po polsku
- brak skomplikowanej konfiguracji na start

## Persona 2 - bardziej uporzadkowany sadownik planujacy rozwoj

### Profil

- ma wiecej dzialek, rzedow i odmian
- zalezy mu na porzadku w strukturze sadu
- chce w przyszlosci korzystac z raportow, batch create i analiz
- czesc pracy wykonuje w terenie, ale planowanie robi na komputerze

### Potrzeby

- opisac lokalizacje drzew w rzedach i zakresach
- hurtowo dodawac nowe nasadzenia
- szybko sprawdzic, gdzie w sadzie wystepuje odmiana
- przygotowac system pod rozwoj bez przebudowy modelu danych

### Oczekiwania wobec produktu

- dobra struktura danych
- sensowne filtrowanie
- mozliwosc dalszej rozbudowy

## Persona 2a - pracownik operacyjny w sadzie

### Profil

- wykonuje prace terenowe w ramach cudzego gospodarstwa
- korzysta glownie z telefonu
- nie musi zarzadzac konfiguracja orchard ani uprawnieniami
- w nowym modelu jest naturalnym kandydatem na role `worker`

### Potrzeby

- szybko dodac wpis o wykonanej pracy
- znalezc konkretne drzewo lub dzialke
- oznaczyc zmiane stanu drzew bez wchodzenia w administracje systemu

### Oczekiwania wobec produktu

- bardzo prosty UX mobilny
- brak przeciazenia opcjami administracyjnymi
- czytelny zakres danych tylko dla orchard, w ktorym pracuje

## Persona 3 - uzytkownik okazjonalny lub poczatkujacy

### Profil

- ma mniejszy sad albo dopiero zaczyna porzadkowac dane
- nie zna jeszcze wszystkich odmian i szczegolow technicznych
- wprowadza dane nieregularnie

### Potrzeby

- mozliwosc zapisania drzewa bez pelnych danych
- mozliwosc uzupelniania informacji pozniej
- prosty start bez koniecznosci zrozumienia calego modelu

### Oczekiwania wobec produktu

- lagodne wejscie
- minimum wymaganych pol
- brak karania za brak kompletu informacji na starcie

## Typy uzytkownikow i role

### Role globalne

#### `super_admin`

- rola systemowa, nie codzienna rola produktowa sadownika
- sluzy do administracji systemem, wsparcia i operacji technicznych

### Role w `orchard`

#### `owner`

- glowny uzytkownik produktowy w MVP
- zarzadza danymi orchard i membership
- ma pelny dostep do dzialek, drzew, odmian i aktywnosci w swoim orchard

#### `worker`

- rola produktowa wspierana w MVP
- ma dostep do pracy operacyjnej wewnatrz przypisanego orchard
- nie zarzadza membership i konfiguracja orchard

#### `manager`

- rola przewidziana na przyszlosc
- docelowo do nadzoru i szerszych mutacji bez pelnego ownership

#### `viewer`

- rola przewidziana na przyszlosc
- docelowo tylko do odczytu

## Srodowisko korzystania z aplikacji

- telefon w sadzie:
  - szybkie dodawanie wpisow
  - sprawdzanie lokalizacji i historii
- laptop lub desktop:
  - porzadkowanie danych
  - edycja opisow odmian
  - przeglad szerszych list i raportow

## Najwazniejsze wnioski projektowe

- Interfejs musi byc zrozumialy bez technicznego zargonu.
- Trzeba pozwolic na niepelne dane na starcie, szczegolnie dla drzew i odmian.
- Najczestszy uzytkownik to nie administrator systemu, tylko praktyk terenowy lub wlasciciel orchard.
- Priorytetem jest minimalny friction przy codziennych wpisach.
- Model uprawnien powinien rozdzielac role globalne i role w konkretnym orchard.

# OrchardLog / Sadownik+ - strategia stanu i pobierania danych

## Cel dokumentu

Ten dokument ustala, jak pobieramy dane, gdzie trzymamy stan i jak odswiezamy widoki po mutacjach.

## 1. Zasada glowna

Zrodlem prawdy jest baza danych.
Stan klienta powinien byc minimalny i dotyczyc glownie interakcji UI, a nie duzych kopii danych domenowych.

## 2. Odczyty danych

### Server components

Preferowane dla:

- dashboardu
- ekranu onboardingowego orchard i zmiany aktywnego orchard
- list dzialek, drzew, odmian, aktywnosci i zbiorow
- widokow szczegolow
- raportow sezonowych
- osadzonego na `/activities` panelu `summary + coverage`

### Client components

Potrzebne dla:

- interaktywnych formularzy
- lokalnych filtrow tymczasowych
- orchard switchera
- drobnych elementow UI typu accordion, modal, sheet

## 3. Mutacje danych

- tworzenie, edycja i zmiana statusu powinny przechodzic przez server actions
- po udanej mutacji nalezy odswiezyc odpowiednie widoki przez `revalidatePath` albo mechanizm tagow
- dla bardziej zlozonych operacji mozna wydzielic wyspecjalizowane endpointy lub RPC
- standardowe formularze domenowe nie powinny przesylac recznie `orchard_id`, jesli dzialaja w kontekscie `active_orchard`
- operacje `createOrchard` i `setActiveOrchard` powinny odswiezac caly kontekst nawigacji i dane zalezne od orchard

## 4. Cache i odswiezanie

- widoki list i szczegolow powinny byc odswiezane po mutacji, nie recznie przepisywane w wielu miejscach
- filtrowanie oparte o URL powinno byc stabilne po odswiezeniu strony
- nie warto w MVP budowac rozbudowanego global store dla danych domenowych
- zmiana `active_orchard` musi invalidowac dane dashboardu, list, detali, raportow i formularzy zaleznych od kontekstu orchard

## 5. Optimistic update

Mozna rozwazyc dla prostych akcji, jesli daje realna korzysc:

- zmiana statusu aktywnosci
- zmiana statusu dzialki
- zapis preferencji UI zwiazanej z onboardingiem

Nie zaleca sie optimistic update dla:

- batch create drzew
- zlozonych zapisow z relacjami
- operacji o wysokim ryzyku konfliktu
- `setActiveOrchard`, jesli dane sa juz stale i wymagaja pelnego odswiezenia

## 6. Filtry i stan w URL

Warto przechowywac w URL:

- wybrana dzialke
- aktywny sezon zbiorow
- status aktywnosci
- typ aktywnosci
- wyszukiwana fraze
- gatunek lub odmiane
- filtry `summary_*` dla sezonowego podsumowania aktywnosci

Na `/activities` lista wpisow i sezonowe podsumowanie powinny utrzymywac
niezalezne zestawy parametrow URL, tak aby zmiana jednego panelu nie gubila stanu drugiego.

To pomaga zachowac:

- odswiezalnosc widoku
- linkowalnosc
- przewidywalnosc nawigacji

## 7. Active orchard context

- `active_orchard` powinien byc rozwiazywany po stronie serwera na poczatku requestu
- standardowe ekrany `(app)` powinny zakladac, ze pracujemy w kontekscie aktywnego orchard
- przy braku aktywnego orchard UI powinien przejsc do flow onboardingu albo wyboru orchard
- membership i orchard switcher powinny miec odczyt lekki, dostepny globalnie dla layoutu aplikacji

## 8. Pending state formularzy

- pending state powinien byc lokalny dla formularza
- przycisk zapisu musi miec stan blokady podczas zapisu
- sukces i blad musza byc raportowane czytelnie po stronie UI

## 9. Rekomendacja na MVP

- server components do odczytu
- server actions do zapisu
- minimalny client state
- filtry w URL tam, gdzie maja sens
- bez rozbudowanego store globalnego dla danych domenowych
- `active_orchard` trzymany po stronie serwera i odswiezany po zmianie membership lub orcharda

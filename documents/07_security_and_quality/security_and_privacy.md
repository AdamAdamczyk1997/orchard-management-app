# OrchardLog / Sadownik+ - security i prywatnosc

## Cel dokumentu

Ten dokument opisuje podstawowe zalozenia bezpieczenstwa i ochrony danych w projekcie.

## 1. Charakter danych

System przechowuje glownie:

- dane konta usera
- dane organizacyjne o orchard
- historie prac i obserwacji
- dane zbiorow i raportow sezonowych
- w przyszlosci opcjonalnie zdjecia i zalaczniki

Na obecnym etapie nie zakladamy przetwarzania szczegolnych kategorii danych osobowych.

## 2. Zasada podstawowa

- zadne dane domenowe nie sa publiczne
- dostep opiera sie o sesje, membership i RLS
- user widzi tylko dane orchard, do ktorych ma aktywne membership, chyba ze jest `super_admin`

## 3. Dane, ktore nalezy chronic szczegolnie

- email i dane konta
- historia dzialan usera
- eksporty danych
- przyszle zalaczniki i zdjecia

## 4. Co logujemy, a czego nie

### Logujemy

- kody bledow
- informacje o nieudanych operacjach
- identyfikator orchard, jesli pomaga diagnozowac problem
- identyfikator rekordu, jesli pomaga diagnozowac problem

### Nie logujemy bez potrzeby

- calych payloadow formularzy
- surowych danych eksportu
- sekretow i tokenow

## 5. RLS i dostep

- RLS wlaczone dla wszystkich tabel domenowych
- brak publicznego `select all`
- brak uzycia `service_role` po stronie klienta
- polityki danych domenowych oparte o `orchard_id`, nie o historyczne `user_id`

## 6. Retencja i historia

- dane historyczne domenowe sa wartoscia produktu i nie powinny byc kasowane agresywnie
- archiwizacja i statusy sa preferowane wobec fizycznego usuwania
- logika `removed` dla drzew i `archived` dla dzialek jest zgodna z tym zalozeniem

## 7. Prywatnosc usera

- user powinien miec mozliwosc wykonania `exportAccountData`, jesli ma aktywne membership `owner` w co najmniej jednym orchard
- eksport pozostaje account-wide, ale obejmuje tylko orchard, w ktorych user ma aktywne membership `owner`
- `worker` nie moze eksportowac wspoldzielonych danych
- w przyszlosci wart przewidziec proces usuniecia konta i danych
- w MVP wazne jest co najmniej bezpieczne oddzielenie danych miedzy kontami i orchard

## 8. Zdjecia i zalaczniki

- jesli zostana dodane, bucket musi byc prywatny
- sciezki musza byc namespacowane po `orchard_id`
- odczyt i zapis tylko dla aktywnego membership orchard albo `super_admin`

## 9. Tematy do dalszego doprecyzowania

- polityka pelnego usuniecia konta
- retencja logow aplikacyjnych
- formalne wymagania RODO po starcie produkcyjnym

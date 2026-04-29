# OrchardLog / Sadownik+ - monitoring i obserwowalnosc

## Cel dokumentu

Ten dokument opisuje, co warto monitorowac po stronie aplikacji, backendu i operacji krytycznych.

## 1. Zasada glowna

Monitoring ma pomagac szybko zauwazyc:

- bledy produkcyjne
- problemy z wydajnoscia
- nieudane operacje krytyczne
- problemy z autoryzacja, membership i danymi

## 2. Co logowac

### Aplikacyjnie

- nieudane logowania
- bledy server actions
- bledy pobierania list i detali
- konflikty lokalizacji drzew
- nieudane `setActiveOrchard`
- nieudane `exportAccountData`
- nieudane batch create

### Domenowo

- `createOrchard`
- `setActiveOrchard`
- `inviteOrchardMember`
- zmiana roli membership
- utworzenie dzialki
- utworzenie drzewa
- utworzenie aktywnosci
- utworzenie rekordu zbioru
- archiwizacja dzialki
- oznaczenie drzewa jako `removed`

## 3. Co mierzyc

- liczba nieudanych logowan
- liczba bledow mutacji
- czas odpowiedzi kluczowych operacji
- czas ladowania dashboardu
- liczba konfliktow batch create
- liczba bledow membership i orchard context
- liczba eksportow konta
- liczba utworzonych `harvest_records`

## 4. Co alertowac

- seria bledow logowania lub auth
- wzrost bledow 5xx
- masowe niepowodzenia zapisow
- problemy z baza danych lub storage
- seria bledow `NO_ACTIVE_ORCHARD` albo `ORCHARD_MEMBERSHIP_REQUIRED` po wdrozeniu

## 5. Poziomy logowania

- `info` dla zwyklych operacji biznesowych
- `warn` dla konfliktow i odrzuconych operacji
- `error` dla bledow systemowych i nieobsluzonych wyjatkow

## 6. Zasady prywatnosci przy monitoringu

- nie logowac pelnych danych formularzy bez potrzeby
- nie logowac sekretow i tokenow
- dane identyfikacyjne ograniczac do minimum potrzebnego do diagnozy

## 7. Minimalny zestaw na start

- logowanie bledow server actions
- monitorowanie auth
- monitorowanie najwazniejszych mutacji
- logowanie konfliktow lokalizacji
- logowanie bledow `createOrchard`, `setActiveOrchard`, `createHarvestRecord`
- logowanie bledow `exportAccountData`

## 8. Kierunek rozwoju

- dashboard techniczny z liczba bledow i najczestszymi problemami
- metryki wydajnosci glownego flow
- osobne raporty dla operacji import/export i batch create

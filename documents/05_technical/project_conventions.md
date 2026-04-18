# OrchardLog / Sadownik+ - konwencje projektowe

## Cel dokumentu

Ten dokument ustala robocze zasady nazewnictwa i organizacji kodu, aby implementacja byla spojna i czytelna.

## 1. Zasady ogolne

- Preferujemy prostote nad nadmierna abstrakcje.
- Kod ma byc czytelny dla zespolu, a nie tylko "sprytny".
- Logika biznesowa powinna byc nazwana domenowo.
- Rozmawiamy po polsku, ale kod, encje, DTO, endpointy, SQL i nazwy plikow sa po angielsku.

## 2. Nazewnictwo plikow i katalogow

- katalogi routingu: zgodne z Next.js App Router
- pliki markdown i dokumentacja: `snake_case.md`
- pliki komponentow React: `PascalCase.tsx`
- pliki pomocnicze i utilsy: `kebab-case.ts` lub `camelCase.ts` zgodnie z ustaleniem modulu

## 3. Nazewnictwo w bazie danych

- tabele w liczbie mnogiej:
  - `orchards`
  - `orchard_memberships`
  - `plots`
  - `trees`
  - `varieties`
  - `activities`
  - `activity_scopes`
  - `activity_materials`
  - `harvest_records`
- klucze obce w stylu:
  - `orchard_id`
  - `profile_id`
  - `plot_id`
  - `tree_id`
  - `variety_id`
  - `activity_id`
- pola techniczne opisowe:
  - `created_by_profile_id`
  - `performed_by_profile_id`

## 4. Nazewnictwo typow i struktur

- typy domenowe w TypeScript w liczbie pojedynczej:
  - `Orchard`
  - `Plot`
  - `Tree`
  - `Variety`
  - `Activity`
  - `HarvestRecord`
- typy formularzy:
  - `OrchardFormInput`
  - `PlotFormInput`
  - `TreeFormInput`
  - `VarietyFormInput`
  - `ActivityFormInput`
  - `HarvestRecordFormInput`

## 5. Konwencje dla komponentow

- komponenty prezentacyjne bez logiki domenowej trzymac w `components/`
- komponenty domenowe trzymac w `features/<domain>/`
- nie tworzyc wielkich komponentow laczacych formularz, fetch i logike zapisu w jednym miejscu, jesli da sie to czytelnie rozdzielic

## 6. Konwencje dla server actions i zapytan

- nazwy akcji zaczynac od czasownika:
  - `createOrchard`
  - `setActiveOrchard`
  - `createPlot`
  - `updateTree`
  - `listActivities`
  - `exportAccountData`
- akcje mutujace powinny zwracac jednolity ksztalt wyniku
- zapytania odczytowe powinny miec jasny zakres odpowiedzialnosci
- formularze domenowe nie przesylaja recznie `orchard_id`, jesli pracuja w kontekscie `active_orchard`

## 7. Konwencje dla error handlingu

- bledy biznesowe mapowac na znane `error_code`
- nie zwracac surowych komunikatow z bazy bezposrednio do UI
- komunikaty dla uzytkownika trzymac spojnie

## 8. Komentarze i dokumentacja kodu

- komentarze tylko tam, gdzie logika nie jest oczywista
- nazwy maja robic wiekszosc pracy
- wieksze decyzje architektoniczne dokumentowac w `documents/`

## 9. Styl implementacyjny

- preferowac male, czytelne funkcje
- unikac powielania walidacji w wielu miejscach bez wspolnego zrodla
- przy zmianach domenowych aktualizowac dokumentacje i test plan
- nie uzywac historycznego nazewnictwa `per user`, jesli aktywna domena jest orchard-scoped

## 10. Rekomendacja na start

- wlaczyc TypeScript strict
- trzymac formularze i akcje blisko domen
- od poczatku pilnowac spojnosc nazw miedzy UI, kodem i baza

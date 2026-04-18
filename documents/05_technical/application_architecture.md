# OrchardLog / Sadownik+ - architektura aplikacji

## Cel dokumentu

Ten dokument opisuje rekomendowany szkielet aplikacji webowej w Next.js, tak aby wdrozenie bylo spojne z modelem danych, RLS i planem MVP.

## 1. Zasady architektoniczne

- Aplikacja jest `web-first`.
- Glownym zrodlem prawdy jest PostgreSQL w Supabase.
- Odczyt danych powinien byc realizowany glownie po stronie serwera.
- Zapisy i mutacje powinny przechodzic przez server actions albo bezpieczne endpointy.
- Logika domenowa nie powinna byc rozproszona po losowych komponentach UI.
- Aplikacja musi rozrozniac warstwe konta od warstwy `active_orchard`.

## 2. Rekomendowana struktura katalogow

```text
app/
  page.tsx
  bootstrap-error/
  auth/
    sync-active-orchard/
      route.ts
  (auth)/
    layout.tsx
    login/
    register/
    reset-password/
  (onboarding)/
    layout.tsx
    orchards/
      new/
  (app)/
    layout.tsx
    dashboard/
    harvests/
      [harvestRecordId]/
      [harvestRecordId]/edit/
      new/
    plots/
      [plotId]/
      [plotId]/edit/
      new/
    trees/
      [treeId]/
      [treeId]/edit/
      new/
      batch/
        new/
      bulk-deactivate/
    varieties/
      [varietyId]/
      [varietyId]/edit/
      new/
    activities/
      [activityId]/
      [activityId]/edit/
      new/
    reports/
      season-summary/
    settings/
      export/
      orchard/
      members/
      profile/
components/
  ui/
  layouts/
  forms/
features/
  auth/
  orchards/
  plots/
  trees/
  varieties/
  activities/
  harvests/
lib/
  auth/
  orchard-context/
  supabase/
  validation/
  utils/
  errors/
server/
  actions/
types/
```

Uwagi etapowe:

- routing pokazuje docelowy kierunek struktury katalogow,
- w Phase 1 aktywne sa tylko:
  - `/login`
  - `/register`
  - `/reset-password`
  - `/orchards/new`
  - `/dashboard`
  - `/settings/profile`
- w Phase 2 aktywne sa dodatkowo:
  - `/plots`
  - `/plots/new`
  - `/plots/[plotId]/edit`
  - `/varieties`
  - `/varieties/new`
  - `/varieties/[varietyId]/edit`
  - `/trees`
  - `/trees/new`
  - `/trees/[treeId]/edit`
- detail pages `/plots/[plotId]`, `/varieties/[varietyId]`, `/trees/[treeId]` pozostaja swiadomie odlozone do kolejnych slice'ow,
- `GET /auth/sync-active-orchard` sluzy do bezpiecznej synchronizacji cookie `ol_active_orchard`,
- widoki `trees/batch/new`, `trees/bulk-deactivate`, `varieties/[varietyId]/locations` i `settings/export` pozostaja zakresem `0.2`, nawet jesli miejsce w strukturze jest juz przewidziane.

## 3. Podzial odpowiedzialnosci

### `app/`

- routy i skladanie ekranow
- server components dla widokow danych
- onboarding i ustawienie `active_orchard`
- centralne redirecty dla braku sesji, braku profilu albo braku working context

### `components/`

- wspolne komponenty UI
- komponenty formularzy
- layouty i elementy nawigacji

### `features/`

- logika i komponenty skupione wokol domen:
  - orchards
  - dzialki
  - drzewa
  - odmiany
  - aktywnosci
  - harvests

### `lib/`

- integracja z Supabase
- walidacje
- narzedzia pomocnicze
- mapowanie bledow i wynikow
- helpery kontekstu `active_orchard`

### `server/`

- server actions do zapisu
- zapytania serwerowe do pobierania danych
- helpery sesji i membership

## 4. Podejscie do warstwy danych

- odczyty list i szczegolow preferencyjnie w server components
- mutacje przez server actions
- dla zlozonych operacji mozna wydzielic funkcje serwerowe lub RPC
- UI nie powinno wprost trzymac logiki spojnosci domenowej
- ownership i walidacja maja byc orchard-scoped
- Phase 1 uzywa RPC `create_orchard_with_owner_membership(...)` dla atomowego onboardingu ownera

## 5. Moduly domenowe

### `features/orchards`

- onboarding tworzenia pierwszego orchard
- orchard switcher
- lista i zarzadzanie membership
- ustawienia orchard i eksport konta w etapie 0.2

### `features/plots`

- formularz dzialki
- lista dzialek
- akcje archiwizacji i przywracania
- helpery mapujace dane dzialki

### `features/trees`

- formularz drzewa
- lista drzew
- helpery filtrowania i mapowania lokalizacji
- batch create i bulk deactivate w etapie 0.2

### `features/varieties`

- formularz odmiany
- lista odmian
- wyszukiwanie i mapowanie summary
- raport lokalizacji w etapie 0.2

### `features/activities`

- formularz aktywnosci
- materialy aktywnosci
- lista i filtry dziennika
- raporty sezonowych prac

### `features/harvests`

- formularz zbioru
- lista zbiorow
- podsumowanie sezonu

## 6. Walidacja

- schematy walidacyjne powinny byc wspoldzielone miedzy UI i serwerem, o ile to praktyczne
- niezaleznie od tego serwer musi walidowac wszystko drugi raz
- warto trzymac schematy walidacji blisko domeny, a nie rozrzucac ich po ekranach

## 7. Aktualizacje i cache

- po mutacjach nalezy odswiezac widoki przez `revalidatePath` albo tagi
- nie nalezy nadmiernie trzymac stanu danych w klientowych store'ach
- local state klienta powinien obslugiwac glownie:
  - otwarte panele
  - filtry tymczasowe
  - pending state formularzy
- zmiana `active_orchard` powinna odswiezyc dane calej sekcji `(app)`

## 8. Bezpieczenstwo

- sesje i tozsamosc pochodza z Supabase Auth
- aplikacja nie moze polegac na ukrywaniu danych w UI
- kazdy odczyt i zapis musza respektowac RLS i walidacje ownership
- ownership jest orchard-scoped, a nie per `user_id`
- `active_orchard` jest source of truth po stronie serwera i jest utrwalany w `httpOnly` cookie `ol_active_orchard`
- Phase 1 nie wprowadza osobnego global admin shell dla `super_admin`

## 9. Rekomendacja na start implementacji

- zaczac od pionowych przekrojow:
  - auth
  - orchard onboarding i membership
  - dzialki
  - drzewa
  - aktywnosci
  - zbiory
- nie budowac od razu ogolnej "super warstwy abstrakcji"
- najpierw ugruntowac flow MVP, potem wyciagac wspolne elementy

# OrchardLog / Sadownik+ - dokladny model bazy danych

## Cel dokumentu

Ten dokument jest normatywna specyfikacja modelu danych dla OrchardLog / Sadownik+.
To na jego podstawie przygotowujemy migracje SQL, relacje, indeksy, constraints, DTO i walidacje serwerowe.

## Zasady nadrzedne

- Dane domenowe sa przypisane do `orchard`, a nie bezposrednio do pojedynczego `profile`.
- `profiles` opisuje konto i role globalne systemu.
- Dostep do danych operacyjnych wynika z `orchard_memberships`.
- UI MVP pracuje zawsze w kontekscie jednego `active_orchard`.
- `active_orchard_id` nie jest osobna encja domenowa ani stale zapisywanym kluczem w tabelach biznesowych.
- `active_orchard_id` jest stanem sesji/UI przechowywanym po stronie serwera, np. w cookie lub session storage serwera aplikacji.
- Gdy uzytkownik nie ma aktywnego membership, onboarding tworzy pierwszy `orchard` i ustawia go jako aktywny kontekst pracy.

## Co jest poza zakresem tego dokumentu

- szczegolowe polityki RLS
- ksztalty server actions
- layout i routing UI

Te tematy sa rozwijane w dokumentach:

- `authorization_and_rls_strategy.md`
- `api_and_system_operations.md`
- `screens_and_views.md`

## Jak czytac oznaczenia etapow

- `MVP`
  pierwsza realnie uzywalna wersja aplikacji.
- `MVP 0.1`
  zakres, ktory wdrazamy teraz jako pierwszy praktyczny release.
- `Etap 0.2`
  kolejny krok po `MVP 0.1`, czyli rozszerzenia juz przewidziane w architekturze, ale odlozone na nastepny etap.
- Jesli tabela albo funkcja jest oznaczona jako `Etap 0.2`, to model moze byc na nia gotowy juz teraz, ale implementacja nie musi wejsc do pierwszego wydania.

## Final Core Domain and Data Model - Final Consolidated Version

Ta sekcja jest nadrzednym, skonsolidowanym source of truth dla `baseline SQL migrations v1`.
Jej celem jest jednoznaczne zamkniecie finalnego rdzenia modelu danych bez potrzeby skladania decyzji z wielu dokumentow pomocniczych.

### Final architectural decisions

- Finalna jednostka ownership to `orchard`.
  Nie wracamy do `farm` ani do ownership per `profile`.
- `profiles` opisuje konto, preferencje i global role.
  Dane domenowe naleza do `orchard`.
- Relacja usera z orchard jest modelowana wylacznie przez `orchard_memberships`.
- UI MVP pracuje zawsze w kontekscie jednego `active_orchard`, ale `active_orchard_id` pozostaje stanem sesji/UI, a nie polem domenowym w tabelach biznesowych.
- `baseline SQL migrations v1` oznacza zakres `MVP 0.1`.
  Do baseline wchodza tylko encje core, bez `bulk_tree_import_batches` i bez rozszerzonego modelu ukladu dzialki.
- `manager` i `viewer` pozostaja future-ready w schema checks, DTO i politykach, ale nie sa wymaganymi aktywnymi rolami produktu w baseline v1.

### Final ownership model

| Obszar | Finalny owner | Uwagi |
|---|---|---|
| `profiles` | konto usera / `auth.users` | nie jest orchard-scoped |
| `orchards` | samodzielna encja biznesowa | glowny kontener ownership |
| `orchard_memberships` | relacja `profile <-> orchard` | jedyne zrodlo membership i roli orchard |
| `plots` | `orchard` | bezposrednio orchard-scoped |
| `varieties` | `orchard` | prywatne per orchard |
| `trees` | `orchard` | dodatkowo podrzedne wobec `plots` |
| `activities` | `orchard` | dodatkowo podrzedne wobec `plots`, opcjonalnie `trees` |
| `activity_scopes` | `activities` | nie zapisujemy osobnego `orchard_id`; ownership dziedziczone z aktywnosci |
| `activity_materials` | `activities` | nie zapisujemy osobnego `orchard_id`; ownership dziedziczone z aktywnosci |
| `harvest_records` | `orchard` | opcjonalnie powiazane z `plots`, `varieties`, `trees`, `activities` |
| `bulk_tree_import_batches` | `orchard` | encja techniczna etapu `0.2`, poza baseline v1 |

### Final role model

#### Global roles

- `user`
  standardowy profil aplikacji.
- `super_admin`
  globalna rola systemu, poza zwyklym membership orchard.

#### Orchard membership roles

- `owner`
  pelna mutacja danych orchard, membership management i prawo do eksportu account-wide danych owned orchard.
- `worker`
  mutacje operacyjne na `plots`, `trees`, `varieties`, `activities` i `harvest_records`, bez membership management i bez `exportAccountData`.
- `manager`
  future-ready only; brak wymaganego zachowania produktowego w baseline v1.
- `viewer`
  future-ready only; brak wymaganego zachowania produktowego w baseline v1.

### Final list of core entities

| Encja | Cel | Ownership | Najwazniejsze relacje |
|---|---|---|---|
| `profiles` | konto, preferencje, global role | `auth.users` | `auth.users (1) -> (1) profiles`, `profiles (1) -> (N) orchard_memberships` |
| `orchards` | glowny kontener biznesowy | self-owned business container | `orchards (1) -> (N) orchard_memberships`, `plots`, `varieties`, `trees`, `activities`, `harvest_records` |
| `orchard_memberships` | membership i rola usera w orchard | `orchard` + `profile` link | `profile_id`, `orchard_id`, `role`, `status` |
| `plots` | fizyczny obszar pracy | `orchard` | `plots (1) -> (N) trees`, `activities`, `harvest_records` |
| `varieties` | prywatna baza wiedzy o odmianach | `orchard` | `varieties (1) -> (N) trees`, `harvest_records` |
| `trees` | jeden fizyczny obiekt | `orchard` | `trees (N) -> (1) plots`, opcjonalnie `varieties`; powiazania do `activities`, `activity_scopes`, `harvest_records` |
| `activities` | glowny wpis dziennika prac | `orchard` | `activities (N) -> (1) plots`, opcjonalnie `trees`; `activities (1) -> (N) activity_scopes`, `activity_materials`, `harvest_records` |
| `activity_scopes` | dokladny zakres wykonania aktywnosci | child of `activities` | `activity_id`, opcjonalnie `tree_id` |
| `activity_materials` | materialy uzyte w aktywnosci | child of `activities` | `activity_id` |
| `harvest_records` | ilosciowy zapis zbioru | `orchard` | opcjonalnie `plot_id`, `variety_id`, `tree_id`, `activity_id` |

Finalny zestaw encji poza baseline v1:

- `bulk_tree_import_batches`
  techniczna encja batch create dla etapu `0.2`.

### Final relationship map

- `auth.users (1) -> (1) profiles`
- `profiles (1) -> (N) orchard_memberships`
- `orchards (1) -> (N) orchard_memberships`
- `orchards (1) -> (N) plots`
- `orchards (1) -> (N) varieties`
- `orchards (1) -> (N) trees`
- `orchards (1) -> (N) activities`
- `orchards (1) -> (N) harvest_records`
- `plots (1) -> (N) trees`
- `plots (1) -> (N) activities`
- `plots (1) -> (N) harvest_records`
- `varieties (1) -> (N) trees`
- `varieties (1) -> (N) harvest_records`
- `trees (1) -> (N) activities`
- `trees (1) -> (N) activity_scopes`
- `trees (1) -> (N) harvest_records`
- `activities (1) -> (N) activity_scopes`
- `activities (1) -> (N) activity_materials`
- `activities (1) -> (N) harvest_records`

### Final integrity rules

#### Ownership and cross-entity consistency

- Kazda encja domenowa core jest rozliczana przez `orchard_id` albo dziedziczy ownership przez relacje do encji nadrzednej.
- `trees.orchard_id = plots.orchard_id`
- jesli `trees.variety_id` jest ustawione, `trees.orchard_id = varieties.orchard_id`
- `activities.orchard_id = plots.orchard_id`
- jesli `activities.tree_id` jest ustawione:
  - drzewo musi nalezec do tego samego `orchard`
  - `activities.plot_id = trees.plot_id`
- jesli `activities.performed_by_profile_id` jest ustawione, wskazany `profile` musi miec aktywne membership w tym samym `orchard`
- `activity_scopes` nie zapisuje osobnego `orchard_id`; ownership wynika z `activities`
- jesli `activity_scopes.tree_id` jest ustawione, drzewo musi nalezec do tej samej dzialki co rekord `activities`
- jesli `harvest_records.plot_id`, `variety_id`, `tree_id` albo `activity_id` sa ustawione, wszystkie te rekordy musza nalezec do tego samego `orchard`

#### Final tree location model for baseline v1

- Lokalizacja drzewa siedzi na `trees`.
- Core fields baseline v1:
  - `section_name`
  - `row_number`
  - `position_in_row`
  - `row_label`
  - `position_label`
  - `tree_code`
- `location_verified`
- Unikalnosc aktywnej pozycji jest egzekwowana partial unique indexem na `(plot_id, row_number, position_in_row)` dla aktywnych drzew z pelna lokalizacja rzedowa.
- `plot_sections` nie istnieje jako osobna tabela w baseline v1.
- Aktualny model operacyjny rozszerza `plots` o `layout_type`, `row_numbering_scheme` i `tree_numbering_scheme`, ale tree-level enforcement nadal jest wdrazane etapowo.

#### Final activities model

- `activities` pozostaje glowna encja dziennika prac.
- Zakres wykonania modeluje `activity_scopes`.
- Uzyte materialy modeluje `activity_materials`.
- `pruning` rozroznia `winter_pruning` i `summer_pruning` przez `activity_subtype`.
- `mowing` i `spraying` pozostaja zwyklymi `activity_type`, a zakres wykonania jest modelowany przez `activity_scopes`.
- `activity_scopes` nie dostaje osobnego workflow statusow w MVP.

#### Final harvest model

- Ilosci plonu zapisujemy w `harvest_records`, nie tylko w `activities`.
- `harvest_records` moze opcjonalnie wskazywac `plot_id`, `variety_id`, `tree_id`, `activity_id`.
- Ilosc jest przechowywana jako:
  - `quantity_value`
  - `quantity_unit`
  - `quantity_kg`
- Wspierane jednostki core to:
  - `kg`
  - `t`
- Raporty sezonowe liczymy po `quantity_kg`.

#### Final `ON DELETE` recommendations

| Relacja | Rekomendowane `ON DELETE` |
|---|---|
| `profiles.id -> auth.users.id` | `cascade` |
| `orchards.created_by_profile_id -> profiles.id` | `restrict` |
| `orchard_memberships.orchard_id -> orchards.id` | `cascade` |
| `orchard_memberships.profile_id -> profiles.id` | `cascade` |
| `plots.orchard_id -> orchards.id` | `cascade` |
| `varieties.orchard_id -> orchards.id` | `cascade` |
| `trees.plot_id -> plots.id` | `restrict` |
| `trees.variety_id -> varieties.id` | `set null` |
| `activities.plot_id -> plots.id` | `restrict` |
| `activities.tree_id -> trees.id` | `set null` |
| `activities.performed_by_profile_id -> profiles.id` | `set null` |
| `activities.created_by_profile_id -> profiles.id` | `restrict` |
| `activity_scopes.activity_id -> activities.id` | `cascade` |
| `activity_scopes.tree_id -> trees.id` | `set null` |
| `activity_materials.activity_id -> activities.id` | `cascade` |
| `harvest_records.plot_id -> plots.id` | `set null` |
| `harvest_records.variety_id -> varieties.id` | `set null` |
| `harvest_records.tree_id -> trees.id` | `set null` |
| `harvest_records.activity_id -> activities.id` | `set null` |
| `harvest_records.created_by_profile_id -> profiles.id` | `restrict` |

#### Final critical constraints and indexes

- jeden aktywny `owner` per `orchard` w MVP
- unique `(orchard_id, profile_id)` on `orchard_memberships`
- unique `(orchard_id, name)` on `plots`
- unique `(orchard_id, species, name)` on `varieties`
- partial unique active logical location on `trees`
- `check` constraints dla:
  - statusow
  - rol
  - jednostek
  - zakresow pozycji
  - wartosci dodatnich
- indeksy orchard-scoped na wszystkich tabelach domenowych
- indeksy raportowe dla `activities` i `harvest_records`

### Core model readiness assessment

- Finalny core data model jest `ready for baseline SQL migrations v1`.
- `baseline SQL migrations v1` obejmuje:
  - `profiles`
  - `orchards`
  - `orchard_memberships`
  - `plots`
  - `varieties`
  - `trees`
  - `activities`
  - `activity_scopes`
  - `activity_materials`
  - `harvest_records`
- Poza baseline v1 pozostawaly historycznie:
  - `bulk_tree_import_batches`
  - rozszerzony plot layout model
- W aktualnym schemacie operacyjnym te rozszerzenia sa juz wdrozone.
- Nie ma blockerow biznesowych dla przygotowania baseline SQL migrations v1.
  Pozostale pytania rozwojowe, takie jak `plot_sections`, klasy jakosci zbioru albo ewentualne przesuniecie batch create do `0.1`, nie blokuja baseline v1.

## Minimalny zestaw tabel aktywnych

### MVP 0.1

- `profiles`
- `orchards`
- `orchard_memberships`
- `plots`
- `varieties`
- `trees`
- `activities`
- `activity_scopes`
- `activity_materials`
- `harvest_records`

### Etap 0.2

- `bulk_tree_import_batches`

## 1. Model tozsamosci i kontekstu pracy

### `profiles`

Konto uzytkownika powiazane z `auth.users`.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK, rowne `auth.users.id` |
| `email` | `text` | nie | email konta |
| `display_name` | `text` | tak | nazwa wyswietlana |
| `system_role` | `text` | nie | `user` albo `super_admin` |
| `locale` | `text` | tak | jezyk interfejsu |
| `timezone` | `text` | tak | strefa czasowa |
| `orchard_onboarding_dismissed_at` | `timestamptz` | tak | znacznik ukrycia warstwy onboardingowej |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `id -> auth.users.id on delete cascade`
- CHECK: `system_role in ('user', 'super_admin')`
- index on `system_role`

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  system_role text not null default 'user'
    check (system_role in ('user', 'super_admin')),
  locale text default 'pl',
  timezone text default 'Europe/Warsaw',
  orchard_onboarding_dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_system_role on profiles(system_role);
```

### `orchards`

Glowny kontener biznesowy dla gospodarstwa / sadu.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK |
| `name` | `text` | nie | nazwa orchard |
| `code` | `text` | tak | skrot roboczy |
| `description` | `text` | tak | opis gospodarstwa |
| `status` | `text` | nie | `active` albo `archived` |
| `created_by_profile_id` | `uuid` | nie | kto utworzyl orchard |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `created_by_profile_id -> profiles.id on delete restrict`
- CHECK: `status in ('active', 'archived')`
- index on `created_by_profile_id`
- index on `status`

```sql
create table orchards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  description text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by_profile_id uuid not null
    references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orchards_created_by on orchards(created_by_profile_id);
create index idx_orchards_status on orchards(status);
```

### `orchard_memberships`

Powiazanie `profile <-> orchard` wraz z lokalna rola.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK |
| `orchard_id` | `uuid` | nie | FK do `orchards` |
| `profile_id` | `uuid` | nie | FK do `profiles` |
| `role` | `text` | nie | `owner`, `worker`, `manager`, `viewer` |
| `status` | `text` | nie | `invited`, `active`, `revoked` |
| `invited_by_profile_id` | `uuid` | tak | kto zaprosil |
| `joined_at` | `timestamptz` | tak | kiedy aktywowano membership |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `orchard_id -> orchards.id on delete cascade`
- FK: `profile_id -> profiles.id on delete cascade`
- FK: `invited_by_profile_id -> profiles.id on delete set null`
- CHECK: `role in ('owner', 'worker', 'manager', 'viewer')`
- CHECK: `status in ('invited', 'active', 'revoked')`
- UNIQUE: `(orchard_id, profile_id)`
- partial UNIQUE: jeden aktywny `owner` per `orchard` w MVP
- index on `(profile_id, status)`
- index on `(orchard_id, role, status)`

```sql
create table orchard_memberships (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references orchards(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null
    check (role in ('owner', 'worker', 'manager', 'viewer')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'revoked')),
  invited_by_profile_id uuid references profiles(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orchard_id, profile_id)
);

create unique index uq_orchard_memberships_single_active_owner
  on orchard_memberships(orchard_id)
  where role = 'owner' and status = 'active';

create index idx_orchard_memberships_profile_status
  on orchard_memberships(profile_id, status);

create index idx_orchard_memberships_orchard_role_status
  on orchard_memberships(orchard_id, role, status);
```

## 2. Model domenowy orchard

### `plots`

Podstawowy kontener fizyczny wewnatrz orchard.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK |
| `orchard_id` | `uuid` | nie | FK do `orchards` |
| `name` | `text` | nie | nazwa dzialki |
| `code` | `text` | tak | kod roboczy |
| `description` | `text` | tak | opis dzialki |
| `location_name` | `text` | tak | lokalizacja opisowa |
| `area_m2` | `numeric(12,2)` | tak | powierzchnia |
| `soil_type` | `text` | tak | typ gleby |
| `irrigation_type` | `text` | tak | typ nawodnienia |
| `status` | `text` | nie | `planned`, `active`, `archived` |
| `is_active` | `boolean` | nie | flaga pomocnicza |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `orchard_id -> orchards.id on delete cascade`
- UNIQUE: `(orchard_id, name)`
- opcjonalnie UNIQUE: `(orchard_id, code)` gdy `code is not null`
- CHECK: `status in ('planned', 'active', 'archived')`
- CHECK: `area_m2 > 0` gdy ustawione
- index on `orchard_id`
- index on `(orchard_id, status)`

```sql
create table plots (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references orchards(id) on delete cascade,
  name text not null,
  code text,
  description text,
  location_name text,
  area_m2 numeric(12,2) check (area_m2 is null or area_m2 > 0),
  soil_type text,
  irrigation_type text,
  status text not null default 'active'
    check (status in ('planned', 'active', 'archived')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orchard_id, name)
);

create unique index uq_plots_orchard_code
  on plots(orchard_id, code)
  where code is not null;

create index idx_plots_orchard_id on plots(orchard_id);
create index idx_plots_orchard_status on plots(orchard_id, status);
```

### `varieties`

Prywatna baza odmian w obrebie orchard.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK |
| `orchard_id` | `uuid` | nie | FK do `orchards` |
| `species` | `text` | nie | gatunek |
| `name` | `text` | nie | nazwa odmiany |
| `description` | `text` | tak | opis |
| `care_notes` | `text` | tak | pielegnacja |
| `characteristics` | `text` | tak | cechy |
| `ripening_period` | `text` | tak | okres dojrzewania |
| `resistance_notes` | `text` | tak | odpornosc |
| `origin_country` | `text` | tak | pochodzenie |
| `is_favorite` | `boolean` | nie | ulubiona odmiana |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `orchard_id -> orchards.id on delete cascade`
- UNIQUE: `(orchard_id, species, name)`
- index on `orchard_id`
- index on `(orchard_id, species)`

```sql
create table varieties (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references orchards(id) on delete cascade,
  species text not null,
  name text not null,
  description text,
  care_notes text,
  characteristics text,
  ripening_period text,
  resistance_notes text,
  origin_country text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orchard_id, species, name)
);

create index idx_varieties_orchard_id on varieties(orchard_id);
create index idx_varieties_orchard_species on varieties(orchard_id, species);
```

### `trees`

Jeden rekord = jedno fizyczne drzewo.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK |
| `orchard_id` | `uuid` | nie | FK do `orchards` |
| `plot_id` | `uuid` | nie | FK do `plots` |
| `variety_id` | `uuid` | tak | FK do `varieties` |
| `species` | `text` | nie | gatunek |
| `tree_code` | `text` | tak | identyfikator terenowy |
| `display_name` | `text` | tak | przyjazna nazwa |
| `section_name` | `text` | tak | sekcja / kwatera |
| `row_number` | `integer` | tak | numer rzedu |
| `position_in_row` | `integer` | tak | pozycja w rzedzie |
| `row_label` | `text` | tak | alternatywna etykieta rzedu |
| `position_label` | `text` | tak | alternatywna etykieta pozycji |
| `planted_at` | `date` | tak | data posadzenia |
| `acquired_at` | `date` | tak | data pozyskania |
| `rootstock` | `text` | tak | podkladka |
| `pollinator_info` | `text` | tak | info o zapylaczu |
| `condition_status` | `text` | nie | stan drzewa |
| `health_status` | `text` | tak | opis zdrowia |
| `development_stage` | `text` | tak | faza rozwoju |
| `last_harvest_at` | `date` | tak | ostatni zbior |
| `notes` | `text` | tak | notatki |
| `location_verified` | `boolean` | nie | czy lokalizacja potwierdzona |
| `is_active` | `boolean` | nie | aktywnosc rekordu |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `orchard_id -> orchards.id on delete cascade`
- FK: `plot_id -> plots.id on delete restrict`
- FK: `variety_id -> varieties.id on delete set null`
- CHECK: `condition_status in ('new', 'good', 'warning', 'critical', 'removed')`
- CHECK: `row_number > 0` gdy ustawione
- CHECK: `position_in_row > 0` gdy ustawione
- CHECK: `row_number` i `position_in_row` powinny byc podawane razem albo oba pozostac puste
- CHECK: `condition_status = 'removed'` wymaga `is_active = false`
- partial UNIQUE dla aktywnego drzewa w lokalizacji logicznej:
  - `(plot_id, row_number, position_in_row)`
  - tylko gdy `is_active = true` i `row_number is not null` i `position_in_row is not null`
- index on `orchard_id`
- index on `(plot_id, condition_status)`
- index on `(orchard_id, variety_id)`
- `planted_batch_id` jest juz aktywna czescia aktualnego modelu operacyjnego i linkuje rekordy `trees` z `bulk_tree_import_batches`

```sql
create table trees (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references orchards(id) on delete cascade,
  plot_id uuid not null references plots(id) on delete restrict,
  variety_id uuid references varieties(id) on delete set null,
  species text not null,
  tree_code text,
  display_name text,
  section_name text,
  row_number integer check (row_number is null or row_number > 0),
  position_in_row integer check (position_in_row is null or position_in_row > 0),
  row_label text,
  position_label text,
  planted_at date,
  acquired_at date,
  rootstock text,
  pollinator_info text,
  condition_status text not null default 'good'
    check (condition_status in ('new', 'good', 'warning', 'critical', 'removed')),
  health_status text,
  development_stage text,
  last_harvest_at date,
  notes text,
  location_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (row_number is null and position_in_row is null)
    or (row_number is not null and position_in_row is not null)
  ),
  check (condition_status <> 'removed' or is_active = false)
);

create unique index uq_trees_active_logical_location
  on trees(plot_id, row_number, position_in_row)
  where is_active = true
    and row_number is not null
    and position_in_row is not null;

create index idx_trees_orchard_id on trees(orchard_id);
create index idx_trees_plot_condition on trees(plot_id, condition_status);
create index idx_trees_orchard_variety on trees(orchard_id, variety_id);
```

## 3. Aktywnosci sezonowe i materialy

### `activities`

Naglowek wpisu dziennika prac.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK |
| `orchard_id` | `uuid` | nie | FK do `orchards` |
| `plot_id` | `uuid` | nie | FK do `plots` |
| `tree_id` | `uuid` | tak | FK do `trees` |
| `activity_type` | `text` | nie | typ aktywnosci |
| `activity_subtype` | `text` | tak | np. `winter_pruning`, `summer_pruning` |
| `activity_date` | `date` | nie | data planowana lub wykonania |
| `title` | `text` | nie | krotki tytul |
| `description` | `text` | tak | opis |
| `status` | `text` | nie | `planned`, `done`, `skipped`, `cancelled` |
| `work_duration_minutes` | `integer` | tak | czas pracy |
| `cost_amount` | `numeric(12,2)` | tak | koszt |
| `weather_notes` | `text` | tak | uwagi pogodowe |
| `result_notes` | `text` | tak | efekt pracy |
| `performed_by_profile_id` | `uuid` | tak | wykonawca z membership |
| `performed_by` | `text` | tak | opisowy wykonawca |
| `created_by_profile_id` | `uuid` | nie | autor wpisu |
| `season_year` | `integer` | nie | rok sezonu |
| `season_phase` | `text` | tak | faza sezonu |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `orchard_id -> orchards.id on delete cascade`
- FK: `plot_id -> plots.id on delete restrict`
- FK: `tree_id -> trees.id on delete set null`
- FK: `performed_by_profile_id -> profiles.id on delete set null`
- FK: `created_by_profile_id -> profiles.id on delete restrict`
- CHECK: `activity_type in (...)`
- CHECK: `status in ('planned', 'done', 'skipped', 'cancelled')`
- CHECK: dla `activity_type = 'pruning'` `activity_subtype in ('winter_pruning', 'summer_pruning')`, a dla pozostalych typow `activity_subtype is null`
- CHECK: `work_duration_minutes >= 0` gdy ustawione
- CHECK: `cost_amount >= 0` gdy ustawione
- index on `orchard_id`
- index on `(plot_id, activity_date desc)`
- index on `(orchard_id, activity_type, status, activity_date desc)`
- index on `(performed_by_profile_id, activity_date desc)`
- index on `(orchard_id, season_year, activity_date desc)`

```sql
create table activities (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references orchards(id) on delete cascade,
  plot_id uuid not null references plots(id) on delete restrict,
  tree_id uuid references trees(id) on delete set null,
  activity_type text not null check (
    activity_type in (
      'watering',
      'fertilizing',
      'spraying',
      'pruning',
      'inspection',
      'planting',
      'harvest',
      'mowing',
      'weeding',
      'disease_observation',
      'pest_observation',
      'other'
    )
  ),
  activity_subtype text,
  activity_date date not null,
  title text not null,
  description text,
  status text not null default 'done'
    check (status in ('planned', 'done', 'skipped', 'cancelled')),
  work_duration_minutes integer
    check (work_duration_minutes is null or work_duration_minutes >= 0),
  cost_amount numeric(12,2)
    check (cost_amount is null or cost_amount >= 0),
  weather_notes text,
  result_notes text,
  performed_by_profile_id uuid references profiles(id) on delete set null,
  performed_by text,
  created_by_profile_id uuid not null references profiles(id) on delete restrict,
  season_year integer not null,
  season_phase text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (activity_type = 'pruning' and activity_subtype in ('winter_pruning', 'summer_pruning'))
    or (activity_type <> 'pruning' and activity_subtype is null)
  )
);

create index idx_activities_orchard_id on activities(orchard_id);
create index idx_activities_plot_date on activities(plot_id, activity_date desc);
create index idx_activities_orchard_type_status_date
  on activities(orchard_id, activity_type, status, activity_date desc);
create index idx_activities_performed_by_date
  on activities(performed_by_profile_id, activity_date desc);
create index idx_activities_orchard_season_date
  on activities(orchard_id, season_year, activity_date desc);
```

### `activity_scopes`

Dokladny zakres wykonania aktywnosci sezonowej.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK |
| `activity_id` | `uuid` | nie | FK do `activities` |
| `scope_order` | `integer` | tak | kolejnosc zakresow w UI |
| `scope_level` | `text` | nie | `plot`, `section`, `row`, `location_range`, `tree` |
| `section_name` | `text` | tak | sekcja |
| `row_number` | `integer` | tak | rzad |
| `from_position` | `integer` | tak | poczatek zakresu |
| `to_position` | `integer` | tak | koniec zakresu |
| `tree_id` | `uuid` | tak | jedno drzewo |
| `notes` | `text` | tak | komentarz do zakresu |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `activity_id -> activities.id on delete cascade`
- FK: `tree_id -> trees.id on delete set null`
- CHECK: `scope_level in ('plot', 'section', 'row', 'location_range', 'tree')`
- CHECK: `scope_order > 0` gdy ustawione
- CHECK: `row_number > 0` gdy ustawione
- CHECK: `from_position > 0` i `to_position > 0` gdy ustawione
- CHECK: `to_position >= from_position` gdy oba ustawione
- index on `activity_id`
- index on `(scope_level, row_number)`

```sql
create table activity_scopes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  scope_order integer check (scope_order is null or scope_order > 0),
  scope_level text not null
    check (scope_level in ('plot', 'section', 'row', 'location_range', 'tree')),
  section_name text,
  row_number integer check (row_number is null or row_number > 0),
  from_position integer check (from_position is null or from_position > 0),
  to_position integer check (to_position is null or to_position > 0),
  tree_id uuid references trees(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (from_position is null and to_position is null)
    or (from_position is not null and to_position is not null and to_position >= from_position)
  ),
  check (
    (scope_level = 'plot'
      and section_name is null
      and row_number is null
      and from_position is null
      and to_position is null
      and tree_id is null)
    or
    (scope_level = 'section'
      and section_name is not null
      and row_number is null
      and from_position is null
      and to_position is null
      and tree_id is null)
    or
    (scope_level = 'row'
      and row_number is not null
      and from_position is null
      and to_position is null
      and tree_id is null)
    or
    (scope_level = 'location_range'
      and row_number is not null
      and from_position is not null
      and to_position is not null
      and tree_id is null)
    or
    (scope_level = 'tree'
      and tree_id is not null
      and from_position is null
      and to_position is null)
  )
);

create index idx_activity_scopes_activity_id on activity_scopes(activity_id);
create index idx_activity_scopes_scope_level_row on activity_scopes(scope_level, row_number);
```

### `activity_materials`

Lista materialow uzytych w aktywnosci.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK |
| `activity_id` | `uuid` | nie | FK do `activities` |
| `name` | `text` | nie | nazwa materialu |
| `category` | `text` | tak | kategoria |
| `quantity` | `numeric(12,3)` | tak | ilosc |
| `unit` | `text` | tak | jednostka |
| `notes` | `text` | tak | notatka |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `activity_id -> activities.id on delete cascade`
- CHECK: `quantity >= 0` gdy ustawione
- index on `activity_id`

```sql
create table activity_materials (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  name text not null,
  category text,
  quantity numeric(12,3) check (quantity is null or quantity >= 0),
  unit text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_activity_materials_activity_id on activity_materials(activity_id);
```

## 4. Zbiory i raportowanie sezonowe

### `harvest_records`

Ilosciowy zapis zbioru. Nie zastępuje `activities`, tylko uzupelnia je o dane raportowe.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK |
| `orchard_id` | `uuid` | nie | FK do `orchards` |
| `plot_id` | `uuid` | tak | FK do `plots` |
| `variety_id` | `uuid` | tak | FK do `varieties` |
| `tree_id` | `uuid` | tak | FK do `trees` |
| `activity_id` | `uuid` | tak | FK do `activities` |
| `scope_level` | `text` | nie | `orchard`, `plot`, `variety`, `location_range`, `tree` |
| `harvest_date` | `date` | nie | data zbioru |
| `season_year` | `integer` | nie | rok sezonu |
| `section_name` | `text` | tak | sekcja |
| `row_number` | `integer` | tak | rzad |
| `from_position` | `integer` | tak | poczatek zakresu |
| `to_position` | `integer` | tak | koniec zakresu |
| `quantity_value` | `numeric(12,3)` | nie | ilosc w jednostce zrodlowej |
| `quantity_unit` | `text` | nie | `kg` lub `t` |
| `quantity_kg` | `numeric(12,3)` | nie | znormalizowana wartosc |
| `notes` | `text` | tak | komentarz |
| `created_by_profile_id` | `uuid` | nie | autor wpisu |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `orchard_id -> orchards.id on delete cascade`
- FK: `plot_id -> plots.id on delete set null`
- FK: `variety_id -> varieties.id on delete set null`
- FK: `tree_id -> trees.id on delete set null`
- FK: `activity_id -> activities.id on delete set null`
- FK: `created_by_profile_id -> profiles.id on delete restrict`
- CHECK: `scope_level in ('orchard', 'plot', 'variety', 'location_range', 'tree')`
- CHECK: `quantity_value > 0`
- CHECK: `quantity_unit in ('kg', 't')`
- CHECK: `quantity_kg > 0`
- CHECK: `to_position >= from_position` gdy oba ustawione
- index on `orchard_id`
- index on `(season_year, harvest_date desc)`
- index on `(orchard_id, variety_id, season_year)`
- index on `(orchard_id, plot_id, season_year)`

```sql
create table harvest_records (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references orchards(id) on delete cascade,
  plot_id uuid references plots(id) on delete set null,
  variety_id uuid references varieties(id) on delete set null,
  tree_id uuid references trees(id) on delete set null,
  activity_id uuid references activities(id) on delete set null,
  scope_level text not null
    check (scope_level in ('orchard', 'plot', 'variety', 'location_range', 'tree')),
  harvest_date date not null,
  season_year integer not null,
  section_name text,
  row_number integer check (row_number is null or row_number > 0),
  from_position integer check (from_position is null or from_position > 0),
  to_position integer check (to_position is null or to_position > 0),
  quantity_value numeric(12,3) not null check (quantity_value > 0),
  quantity_unit text not null check (quantity_unit in ('kg', 't')),
  quantity_kg numeric(12,3) not null check (quantity_kg > 0),
  notes text,
  created_by_profile_id uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (from_position is null and to_position is null)
    or (from_position is not null and to_position is not null and to_position >= from_position)
  )
);

create index idx_harvest_records_orchard_id on harvest_records(orchard_id);
create index idx_harvest_records_season_date on harvest_records(season_year, harvest_date desc);
create index idx_harvest_records_orchard_variety_season
  on harvest_records(orchard_id, variety_id, season_year);
create index idx_harvest_records_orchard_plot_season
  on harvest_records(orchard_id, plot_id, season_year);
```

## 5. Rozszerzenia etapu 0.2

### `bulk_tree_import_batches`

Techniczny zapis operacji batch create.
Tabela nie wchodzila do `baseline SQL migrations v1`, ale jest juz wdrozona w aktualnym pakiecie `0.2`.
W tym samym pakiecie aktywne jest tez `trees.planted_batch_id`.

| Pole | Typ | Null | Opis |
|---|---|---:|---|
| `id` | `uuid` | nie | PK |
| `orchard_id` | `uuid` | nie | FK do `orchards` |
| `plot_id` | `uuid` | nie | FK do `plots` |
| `variety_id` | `uuid` | tak | FK do `varieties` |
| `species` | `text` | nie | gatunek tworzonych drzew |
| `section_name` | `text` | tak | sekcja |
| `row_number` | `integer` | nie | rzad |
| `from_position` | `integer` | nie | poczatek zakresu |
| `to_position` | `integer` | nie | koniec zakresu |
| `generated_tree_code_pattern` | `text` | tak | wzorzec kodu |
| `default_condition_status` | `text` | nie | domyslny stan nowych drzew |
| `default_planted_at` | `date` | tak | domyslna data posadzenia |
| `default_rootstock` | `text` | tak | domyslna podkladka |
| `default_notes` | `text` | tak | wspolne notatki |
| `created_by_profile_id` | `uuid` | nie | autor batcha |
| `status` | `text` | nie | `draft`, `done`, `failed`, `cancelled` |
| `created_at` | `timestamptz` | nie | data utworzenia |
| `updated_at` | `timestamptz` | nie | data aktualizacji |

### Constraints i indeksy

- PK: `id`
- FK: `orchard_id -> orchards.id on delete cascade`
- FK: `plot_id -> plots.id on delete restrict`
- FK: `variety_id -> varieties.id on delete set null`
- FK: `created_by_profile_id -> profiles.id on delete restrict`
- CHECK: `from_position > 0`
- CHECK: `to_position >= from_position`
- CHECK: `status in ('draft', 'done', 'failed', 'cancelled')`
- CHECK: `default_condition_status in ('new', 'good', 'warning', 'critical', 'removed')`
- index on `(orchard_id, created_at desc)`

## 6. Relacje miedzy encjami

- `profiles (1) -> (N) orchard_memberships`
- `orchards (1) -> (N) orchard_memberships`
- `orchards (1) -> (N) plots`
- `orchards (1) -> (N) varieties`
- `orchards (1) -> (N) trees`
- `orchards (1) -> (N) activities`
- `orchards (1) -> (N) harvest_records`
- `plots (1) -> (N) trees`
- `plots (1) -> (N) activities`
- `plots (1) -> (N) harvest_records`
- `varieties (1) -> (N) trees`
- `varieties (1) -> (N) harvest_records`
- `trees (1) -> (N) activities`
- `trees (1) -> (N) activity_scopes`
- `trees (1) -> (N) harvest_records`
- `activities (1) -> (N) activity_scopes`
- `activities (1) -> (N) activity_materials`
- `activities (1) -> (N) harvest_records`

## 7. Reguly integralnosci przekrojowej

Te reguly sa krytyczne i musza byc egzekwowane w server actions, triggerach albo obu warstwach.

- `plots.orchard_id` musi nalezec do orchard aktywnego w operacji.
- `trees.orchard_id = plots.orchard_id`
- jesli `trees.variety_id` jest ustawione, to `trees.orchard_id = varieties.orchard_id`
- `activities.orchard_id = plots.orchard_id`
- jesli `activities.tree_id` jest ustawione, to:
  - `activities.tree_id` nalezy do tego samego `orchard`
  - `activities.plot_id = trees.plot_id`
- jesli `activities.performed_by_profile_id` jest ustawione, wskazany profil musi miec aktywne membership w tym samym `orchard`
- `activity_scopes` nalezy logicznie do `activities`; nie zapisujemy w nim osobnego `orchard_id`
- jesli `activity_scopes.tree_id` jest ustawione, drzewo musi nalezec do tej samej dzialki co rekord `activities`
- jesli `harvest_records.plot_id`, `variety_id`, `tree_id` albo `activity_id` sa ustawione, wszystkie te rekordy musza nalezec do tego samego `orchard`
- `quantity_kg` musi byc wyliczone deterministycznie z `quantity_value` i `quantity_unit`
- batch create i bulk deactivate dzialaja tylko w obrebie jednego `orchard` i jednej dzialki

## 8. Przykladowy rekord kontekstu orchard

```json
{
  "profile": {
    "id": "8d0f3388-0b13-4f5f-9784-2b7d2d0468d6",
    "email": "owner@example.com",
    "display_name": "Jan Sadownik",
    "system_role": "user",
    "locale": "pl",
    "timezone": "Europe/Warsaw",
    "orchard_onboarding_dismissed_at": "2026-04-14T08:12:00Z"
  },
  "active_orchard": {
    "id": "9fd8e55d-c50f-48df-b8dd-d51a08c70612",
    "name": "Sad Glowny",
    "status": "active"
  },
  "membership": {
    "role": "owner",
    "status": "active"
  }
}
```

## 9. Rekomendacja MVP

- Wdrazamy teraz:
  - `profiles`
  - `orchards`
  - `orchard_memberships`
  - `plots`
  - `varieties`
  - `trees`
  - `activities`
  - `activity_scopes`
  - `activity_materials`
  - `harvest_records`
- UI pracuje zawsze w kontekscie jednego `active_orchard`.
- `worker` ma mutacje operacyjne na `plots`, `trees`, `varieties`, `activities` i `harvest_records`.
- `owner` ma dodatkowo zarzadzanie membership i eksport account-wide.
- `manager` i `viewer` pozostaja przygotowane w modelu danych, ale bez pelnego wdrozenia zachowan w MVP.

## 10. Co zostaje bez zmian

- Supabase Auth pozostaje mechanizmem tozsamosci.
- PostgreSQL i RLS pozostaja podstawowym mechanizmem ochrony danych.
- `activities` pozostaje glowna encja dziennika prac.
- `harvest_records` pozostaje osobna encja ilosciowa dla raportow zbioru.

# OrchardLog / Sadownik+ - strategia autoryzacji i RLS

## Cel dokumentu

Ten dokument opisuje minimalna strategie bezpieczenstwa dostepu do danych dla aplikacji opartej o Supabase Auth i PostgreSQL z Row Level Security.

## 1. Zasady bazowe

- Autoryzacja uzytkownika opiera sie o `Supabase Auth`.
- Konto (`profile`) i dostep do danych domenowych (`orchard_memberships`) sa rozdzielone.
- Dane domenowe sa przypisane do `orchard`, a nie do pojedynczego `user_id`.
- Domyslna zasada dla tabel domenowych to `deny by default`.
- Dostep jest otwierany tylko przez jawne polityki RLS.
- Frontend i server actions korzystaja z sesji zalogowanego uzytkownika, a nie z roli uprzywilejowanej.
- UI MVP pracuje w kontekscie jednego `active_orchard`, ale polityki RLS pozostaja gotowe na wiele orchard.

## 2. Role systemowe

### `anon`

- brak dostepu do tabel domenowych
- dostep tylko do publicznych ekranow logowania i rejestracji

### `authenticated`

- dostep tylko do rekordow wynikajacych z aktywnego membership lub roli globalnej
- mozliwosc wykonywania operacji CRUD zgodnie z politykami

### `service_role`

- tylko dla migracji, administracji i operacji technicznych
- nigdy nie powinna byc uzywana bezposrednio po stronie klienta

## 3. Model tozsamosci

- `auth.users.id` jest glownym identyfikatorem konta
- `profiles.id` powinno byc rowne `auth.users.id`
- po utworzeniu konta powinien powstac rekord `profiles`
- `profiles` trzyma:
  - email
  - display_name
  - `system_role`
  - locale
  - timezone
  - `orchard_onboarding_dismissed_at`
- dostep do konkretnego gospodarstwa jest modelowany przez:
  - `orchards`
  - `orchard_memberships`

## 4. Rozdzielenie ról

### Role globalne

- `super_admin`
  - globalna administracja systemu
  - poza zwyklym membership orchard

### Role w `orchard`

- `owner`
  - pelny dostep do danych orchard
  - zarzadzanie membership i konfiguracja orchard
  - prawo do eksportu account-wide danych tego konta
- `worker`
  - praca operacyjna na `plots`, `trees`, `varieties`, `activities` i `harvest_records`
  - bez zarzadzania membership
  - bez prawa eksportu
- `manager`
  - rola przygotowana na przyszlosc
  - docelowo pelne mutacje operacyjne bez ownership i bez zarzadzania membership
- `viewer`
  - rola przygotowana na przyszlosc
  - docelowo tylko odczyt

## 5. Active orchard i onboarding

- `active_orchard_id` jest stanem sesji/UI, a nie polem domenowym w tabelach biznesowych
- po pierwszym logowaniu bez aktywnego membership system wymusza onboarding i `createOrchard`
- onboarding moze zapisac `profiles.orchard_onboarding_dismissed_at`, ale nie omija wymogu utworzenia pierwszego orchard
- `setActiveOrchard` zmienia tylko kontekst pracy sesji; nie zmienia ownership danych w bazie

## 6. Funkcje pomocnicze pod RLS

W pakiecie `v1_security` funkcje pomocnicze sa rozdzielone na dwa pliki:

- `supabase/migrations/012_add_core_integrity_and_rls_helpers.sql`
- `supabase/migrations/013_create_v1_security_helpers.sql`

Funkcje bazowe membership i global role:

- `is_super_admin()`
- `is_active_orchard_member(target_orchard_id uuid)`
- `has_orchard_role(target_orchard_id uuid, allowed_roles text[])`
- `is_orchard_owner(target_orchard_id uuid)`

Funkcje pomocnicze dla polityk operacyjnych:

- `can_read_profile(target_profile_id uuid)`
- `can_read_orchard_data(target_orchard_id uuid)`
- `can_write_orchard_operational_data(target_orchard_id uuid)`
- `can_manage_orchard(target_orchard_id uuid)`
- `can_bootstrap_orchard_owner(target_orchard_id uuid, target_profile_id uuid, target_role text, target_status text)`
- `can_read_activity_children(target_activity_id uuid)`
- `can_write_activity_children(target_activity_id uuid)`

Dodatkowy guard trigger dla `profiles`:

- `guard_profile_self_service_update()`

Zasady implementacyjne:

- `super_admin` jest rozpoznawany przez `profiles.system_role = 'super_admin'`
- membership orchard w helper functions zawsze sprawdza `orchard_memberships.status = 'active'`, chyba ze polityka dotyczy jawnie bootstrapu lub widocznosci membership
- jesli wynik helper function nie zalezy od danych konkretnego wiersza, bezposrednie wywolania `auth.uid()`, `auth.jwt()` i podobnych helperow w politykach RLS opakowujemy jako `(select auth.uid())` / `(select auth.jwt())`, zeby unikac per-row reevaluacji i korzystac z `initPlan`
- helper functions sa `security definer`
- helper functions maja jawne `revoke execute ... from public` i `grant execute ... to authenticated`
- self-service update `profiles` jest dodatkowo chroniony triggerem, ktory blokuje zmiane `id`, `email`, `system_role` i `created_at` dla zwyklego usera

## 7. Polityki RLS - tabela po tabeli

| Tabela | SELECT | INSERT | UPDATE | DELETE | Uwagi |
|---|---|---|---|---|---|
| `profiles` | swoj profil, `super_admin`, albo profile powiazane wspolnym orchard | brak bezposredniego insertu przez klienta | swoj profil lub `super_admin` | brak dla zwyklego usera | insert powstaje przez trigger po `auth.users`; polityka select korzysta z `can_read_profile()`; trigger ogranicza self-service update do bezpiecznych pol |
| `orchards` | aktywne membership, creator bootstrapu, albo `super_admin` | `authenticated` dla rekordow z `created_by_profile_id = (select auth.uid())` albo `super_admin` | `owner`, creator bootstrapu, albo `super_admin` | tylko `super_admin` | fizyczne usuniecie nie jest flow MVP |
| `orchard_memberships` | swoj membership, `owner` orchard, albo `super_admin` | bootstrap pierwszego `owner` po `createOrchard`, potem `owner` albo `super_admin` | `owner` albo `super_admin` | `owner` albo `super_admin` | `worker` nie ma mutacji na membership |
| `plots` | aktywne membership w `orchard` albo `super_admin` | `owner`, `worker`, przyszlosciowo `manager` | `owner`, `worker`, przyszlosciowo `manager` | `owner` albo `super_admin` | polityka po `orchard_id`; delete bardziej konserwatywny niz zwykle update |
| `varieties` | aktywne membership w `orchard` albo `super_admin` | `owner`, `worker`, przyszlosciowo `manager` | `owner`, `worker`, przyszlosciowo `manager` | `owner` albo `super_admin` | delete ograniczony ze wzgledu na powiazania z drzewami |
| `trees` | aktywne membership w `orchard` albo `super_admin` | `owner`, `worker`, przyszlosciowo `manager` | `owner`, `worker`, przyszlosciowo `manager` | `owner` albo `super_admin` | w UI preferowac `is_active = false` lub `condition_status = 'removed'` |
| `activities` | aktywne membership w `orchard` albo `super_admin` | `owner`, `worker`, przyszlosciowo `manager` | `owner`, `worker`, przyszlosciowo `manager` | `owner`, `worker`, albo `super_admin` | delete jest dopuszczony jako korekta pomylki operacyjnej |
| `activity_scopes` | przez aktywny dostep do parent `activities` albo `super_admin` | przez role mutacyjne w `activities` | przez role mutacyjne w `activities` | przez role mutacyjne w `activities` | polityka oparta o helper function dziedziczaca dostep z `activities` |
| `activity_materials` | przez aktywny dostep do parent `activities` albo `super_admin` | przez role mutacyjne w `activities` | przez role mutacyjne w `activities` | przez role mutacyjne w `activities` | polityka oparta o helper function dziedziczaca dostep z `activities` |
| `harvest_records` | aktywne membership w `orchard` albo `super_admin` | `owner`, `worker`, przyszlosciowo `manager` | `owner`, `worker`, przyszlosciowo `manager` | `owner`, `worker`, albo `super_admin` | delete jest dopuszczony jako korekta pomylki przy wpisie zbioru |
| `bulk_tree_import_batches` | aktywne membership w `orchard` albo `super_admin` | `owner`, `worker`, przyszlosciowo `manager` | tylko technicznie lub `owner` | tylko technicznie lub `super_admin` | etap 0.2 |

## 8. Walidacje, ktorych samo RLS nie zalatwia

RLS pilnuje wlasciciela rekordu, ale nie pilnuje wszystkich zaleznosci domenowych.
Dlatego trzeba dodac walidacje w warstwie backendowej lub triggerach.

### Dla `orchard_memberships`

- `profile_id` nie moze byc dodane drugi raz do tego samego `orchard`
- w MVP jeden `orchard` powinien miec dokladnie jednego aktywnego `owner`
- `owner` nie powinien moc sam siebie przypadkowo zdegradowac bez przekazania ownership
- `worker` nie powinien miec mutacji na `orchard_memberships`

### Dla `trees`

- `trees.orchard_id = plots.orchard_id`
- jesli `variety_id` nie jest puste, to `trees.orchard_id = varieties.orchard_id`
- aktywne drzewo nie moze dublowac lokalizacji `plot + row + position`

### Dla `activities`

- `activities.orchard_id = plots.orchard_id`
- jesli `tree_id` istnieje, to:
  - `activities.orchard_id = trees.orchard_id`
  - `activities.plot_id = trees.plot_id`
- `performed_by_profile_id`, jesli ustawione, powinno wskazywac `profile` z aktywnym membership w tym samym `orchard`
- dla `activity_type = 'pruning'` w MVP wymagane jest `activity_subtype in ('winter_pruning', 'summer_pruning')`

### Dla `activity_scopes`

- scope musi nalezec do aktywnosci dostepnej w orchard zalogowanego uzytkownika
- `activity_scopes` dziedziczy `orchard_id` i `plot_id` logicznie przez `activities`
- dla `scope_level = 'section'` wymagane jest `section_name`
- dla `scope_level = 'row'` wymagane jest `row_number`
- dla `scope_level = 'location_range'` wymagane sa `row_number`, `from_position`, `to_position`
- dla `scope_level = 'tree'` wymagane jest `tree_id`
- jesli `tree_id` jest ustawione, to:
  - `tree_id` musi nalezec do tego samego `orchard`
  - `tree_id` musi nalezec do tej samej dzialki co `activities.plot_id`

### Dla `harvest_records`

- `plot_id`, jesli ustawione, musi nalezec do tego samego `orchard`
- `variety_id`, jesli ustawione, musi nalezec do tego samego `orchard`
- `tree_id`, jesli ustawione, musi nalezec do tego samego `orchard`
- `activity_id`, jesli ustawione, musi nalezec do tego samego `orchard`
- dla `scope_level = 'location_range'` rekord musi miec poprawny zakres lokalizacji
- `quantity_kg` musi byc wyliczone deterministycznie z `quantity_value` i `quantity_unit`

### Dla eksportu

- `exportAccountData` nie powinien byc dostepny dla `worker`
- eksport account-wide powinien agregowac tylko orchard, gdzie user ma aktywne membership `owner`

## 9. Rekomendowane podejscie implementacyjne

- standardowe CRUD wykonywac przez server actions lub bezpieczne endpointy po stronie serwera
- nie polegac wylacznie na walidacji w UI
- dla krytycznych operacji dodac funkcje lub RPC po stronie bazy albo serwera
- polityki RLS opierac o `orchard_id`, a nie o historyczne `user_id`
- szczegolnie dotyczy to:
  - onboarding orchard
  - `setActiveOrchard`
  - batch create drzew
  - zapisow zbioru i raportow sezonowych
  - zarzadzania membership
  - aktywnosci z materialami i zakresami wykonania

## 10. Storage i zalaczniki

W MVP zalaczniki nie sa wymagane.
Jesli zostana dodane pozniej:

- bucket powinien byc prywatny
- sciezka pliku powinna zawierac `orchard_id`
- polityki storage musza ograniczac dostep do aktywnego membership orchard albo `super_admin`

## 11. Minimalna checklista bezpieczenstwa przed startem developmentu

- wlaczone RLS na wszystkich tabelach domenowych
- brak publicznych polityk `select all`
- trigger lub proces tworzacy `profiles`
- tabela `orchards` i `orchard_memberships`
- walidacje spojnosci relacji w server actions lub triggerach
- brak kluczy `service_role` po stronie klienta
- brak eksportu dla `worker`

## 12. Decyzje zamkniete teraz

- `worker` moze tworzyc, edytowac i wykonywac logiczne mutacje danych operacyjnych orchard
- `manager` i `viewer` pozostaja future-ready
- usuwanie odmian w UI powinno byc ograniczone, jesli sa powiazane z drzewami
- `activity_materials` i `activity_scopes` w MVP sa zarzadzane jako czesc formularza aktywnosci
- pozniejsze zalaczniki moga byc przypinane do `trees` i `activities`

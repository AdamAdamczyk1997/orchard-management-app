# OrchardLog / Sadownik+ - session handoff

## Cel

Ten plik sluzy do szybkiego przekazania stanu projektu do nowego chatu albo nowej sesji pracy.

Ma zawierac:

- stabilne fakty o projekcie
- ostatni potwierdzony stan implementacji
- rzeczy sprawdzone recznie
- rzeczy, ktore nadal czekaja
- kilka pol, ktore uzupelniasz sam po swojej lokalnej pracy

## Jak uzywac

1. Przed startem nowego chatu podaj temu plikowi priorytet razem z:
   - `documents/README.md`
   - `documents/01_implementation_materials/README.md`
   - `documents/01_implementation_materials/implementation_master_plan.md`
2. Po kazdej wiekszej sesji uzupelnij sekcje `UZUPELNIJ SAM`.
3. Nie duplikuj tutaj calej dokumentacji; zapisuj tylko najwazniejszy stan operacyjny.

## Aktualny stabilny stan projektu

### Architektura i model

- `active_orchard` jest rozwiazywany po stronie serwera i utrwalany w `httpOnly` cookie `ol_active_orchard`
- ownership danych jest `orchard`-scoped
- auth, onboarding, membership i protected app shell sa wdrozone
- core orchard structure dla `plots`, `varieties`, `trees` jest wdrozona
- baza, baseline migrations, seed i `v1_security` sa juz przygotowane

### Aktualnie wdrozone vertical slice

- `Phase 1`
  - auth
  - onboarding
  - `createOrchard`
  - `active_orchard`
  - protected shell
- `Phase 2`
  - `plots`
    - list
    - create
    - edit
    - archive / restore
  - `varieties`
    - list
    - create
    - edit
    - search
  - `trees`
    - list
    - create
    - edit
    - filters
    - baseline location fields
  - `settings`
    - owner-only `orchard settings`
    - owner-only `members`
    - add existing user to orchard as `worker`
    - revoke membership
 - `Phase 3 core slice`
   - `activities`
     - list z filtrami
     - create
     - edit
     - szybka zmiana statusu
     - delete
   - transakcyjny zapis `activity_scopes` i `activity_materials`
   - owner i worker moga operacyjnie pracowac na wpisach w swoim orchard
   - shell i dashboard maja wejscie do `Aktywnosci`

### Swiadomie odlozone po obecnym etapie

- detail pages dla `plots`, `varieties`, `trees`
- delete UI dla `varieties` i `trees`
- browser E2E
- `batch create` / `bulk deactivate`
- detail page i coverage / summary dla `activities`
- `harvest_records`

### Najwazniejsze punkty wejscia do dokumentacji

- [documents/README.md](../README.md)
- [documents/01_implementation_materials/README.md](../01_implementation_materials/README.md)
- [implementation_master_plan.md](../01_implementation_materials/implementation_master_plan.md)
- [phase_1_auth_onboarding_vertical_slice.md](../01_implementation_materials/phase_1_auth_onboarding_vertical_slice.md)
- [phase_2_core_orchard_structure_vertical_slice.md](../01_implementation_materials/phase_2_core_orchard_structure_vertical_slice.md)
- [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
- [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md)
- [test_plan.md](../07_security_and_quality/test_plan.md)
- [local_dev_tools_quickstart.md](./local_dev_tools_quickstart.md)

### Najwazniejsze punkty wejscia do kodu

- `app/`
- `features/`
- `server/actions/`
- `lib/orchard-context/`
- `supabase/migrations/`
- `supabase/seeds/`
- `tests/`

### Ostatni potwierdzony stan automatycznej weryfikacji

Ostatnio potwierdzone jako przechodzace:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

### Rekomendowany nastepny vertical slice

- `Phase 3 continuation - activity details + seasonal coverage / summary`

## UZUPELNIJ SAM - stan lokalny i reczna weryfikacja

### 1. Ostatnia reczna weryfikacja w przegladarce

- Data:
  - `19/04/2025`
- Co sprawdziles:
  - `register -> create orchard -> create plot -> create variety -> create tree`
- Wynik:
  - większość wygląda dobrze, działa jak należy, mam tylko małe uwagi które wdrożymy z czasem

### 2. Aktualny lokalny stan narzedzi

- Czy `supabase start` jest uruchomiony:
  - `tak`
- Czy `pnpm dev` startuje poprawnie:
  - `tak`
- Czy aplikacja otwiera sie pod `http://localhost:3000`:
  - `tak`

### 3. Ostatnie rzeczy zauwazone recznie

- UI / UX do poprawy, Bledy albo edge case'y zauwazone recznie, Security Issues:
  - Zamkniete w Pre-Phase 3 Stabilization Pass:
  - `Function Search Path Mutable` z Supabase lint naprawiony migracja `017_harden_function_search_paths.sql`
  - polski jest teraz domyslnym jezykiem glownego UX i copy dla aktualnie wdrozonych flow
  - dodane glowne `README.md` repo
  - onboarding intro ma lepszy kontrast i czytelniejszy naglowek
  - glowne CTA i link-buttony maja czytelniejszy kontrast
  - create plot proponuje kolejny `code`, gdy da sie bezpiecznie rozpoznac wzorzec
  - `species` w `variety` i `tree` ma presety `apple`, `pear`, `plum`, `cherry` z opcja wlasnej wartosci
  - dodane owner-only strony `/settings/orchard` i `/settings/members`
  - worker dostaje czytelny stan `forbidden` przy bezposrednim wejsciu w owner-only settings
  - Zamkniete w Phase 3 Core Slice:
  - dodane trasy `/activities`, `/activities/new` i `/activities/[activityId]/edit`
  - lista aktywnosci ma filtry po dacie, dzialce, drzewie, typie, statusie i wykonawcy
  - formularz aktywnosci obsluguje `scopes` i `materials` przez JSON hidden payloads
  - `pruning` wymaga `activity_subtype`, a `pruning` / `mowing` / `spraying` wymagaja zakresu
  - `spraying` wspiera wiele materialow, pogode i `result_notes`
  - zapis parent + `activity_scopes` + `activity_materials` jest transakcyjny przez RPC
  - worker i owner moga tworzyc, edytowac, zmieniac status i usuwac aktywnosci w swoim orchard
  - Nadal odlozone albo wymagajace osobnej decyzji:
  - przelacznik jezyka PL / EN i pelne i18n
  - globalny admin / super user shell, podglad userow i remove user
  - browser E2E
  - reczny smoke test nowych stron `activities` w przegladarce
  - detail page i seasonal coverage / summary dla aktywnosci

- Rzeczy, ktore dzialaja dobrze i nie wymagaja ruszania:
  - `większość dotychczasowej implementacji`

### 4. Najblizszy cel kolejnej sesji

- Co chcesz zrobic jako nastepne:
  - `domknac Phase 3 po core slice albo przejsc do Phase 4 - harvest_records`
- Co ma byc zakresem nowego chatu:
  - `dzialamy na aktualnym repo, bazujemy na wdrozonym core slice activities i wybieramy kolejny vertical bez rozjazdu z RLS, testami i dokumentacja`

### 5. Kontekst organizacyjny

- Nazwa brancha, jesli uzywasz gita:
  - `main`
- Czy masz lokalne niecommitowane zmiany, na ktore trzeba uwazac:
  - `troszkę się znajdzie`
- Czy byly robione dodatkowe reczne zmiany poza repo / dokumentacja:
  - `nie`

## Gotowy prompt startowy do nowego chatu

Mozesz wkleić cos w tym stylu:

```text
Przeczytaj najpierw:
- documents/00_overview_and_checklists/session_handoff.md
- documents/README.md
- documents/01_implementation_materials/README.md
- documents/01_implementation_materials/implementation_master_plan.md

Nastepnie kontynuuj prace od sekcji "Najblizszy cel kolejnej sesji" z session_handoff.md.
Nie zaczynaj od projektowania od zera - bazuj na aktualnym repo, dokumentacji, migracjach, testach i wdrozonych slice'ach.
```

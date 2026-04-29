# OrchardLog / Sadownik+

OrchardLog / Sadownik+ to aplikacja webowa do zarzadzania sadem budowana w stacku:
`Next.js + React + TypeScript + PostgreSQL + Supabase`.

Repo zawiera aktualna implementacje MVP 0.1 oraz dokumentacje, z ktorej korzystamy
jako source of truth podczas dalszej pracy.

## Szybki start lokalny

1. Zainstaluj zaleznosci:

```bash
pnpm install
```

2. Uruchom lokalne narzedzia Supabase i zresetuj baze wedlug projektu:

```bash
supabase start
supabase db reset
```

Jesli chcesz odbudowac pelny baseline do manual QA jedna komenda:

```bash
pnpm seed:baseline-reset
```

Jesli potrzebujesz tylko dopiac seed po istniejacym resecie, masz tez rozdzielone kroki:

```bash
pnpm seed:baseline-users
pnpm seed:baseline-sql
```

Po przygotowaniu danych mozesz sprawdzic gotowosc baseline do manual QA:

```bash
pnpm qa:baseline-status
```

3. Uruchom aplikacje:

```bash
pnpm dev
```

4. W osobnych krokach weryfikuj jakosc:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Gdzie jest dokumentacja robocza

- glowny indeks dokumentacji:
  `documents/README.md`
- mapa wejscia do dokumentacji:
  `documents/00_overview_and_checklists/documentation_map.md`
- minimalny zestaw materialow do implementacji:
  `documents/01_implementation_materials/README.md`
- nadrzedny plan wdrozenia:
  `documents/01_implementation_materials/implementation_master_plan.md`
- szybki kontekst sesyjny:
  `documents/00_overview_and_checklists/session_handoff.md`
- workflow narzedzi lokalnych:
  `documents/00_overview_and_checklists/local_dev_tools_quickstart.md`

## Aktualny stan produktu

Aktualnie repo obejmuje:

- auth, onboarding, `active_orchard` i protected shell,
- core orchard structure dla `plots`, `varieties` i `trees` razem z plot-aware location rules,
- orchard settings i members management w obecnym MVP simplification,
- `activities` z detail view, seasonal summary i coverage,
- `harvests` z CRUD, season summary i harvest location report,
- operacyjny `/dashboard` z quick actions, recent feeds i empty/loading states,
- account export dla `owner`,
- batch create i bulk deactivate dla `trees`,
- raport lokalizacji odmiany i raport lokalizacji zbiorow,
- baseline seed and manual QA tooling.

## Ważna zasada

Dokumenty z `documents/archive/` nie sa materialem implementacyjnym.
Jesli pojawi sie konflikt miedzy archiwum a aktywnymi dokumentami, pierwszenstwo
ma aktualna dokumentacja z `documents/`.

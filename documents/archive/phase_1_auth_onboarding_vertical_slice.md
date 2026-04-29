# OrchardLog / Sadownik+ - Phase 1 implementation note

Archived historical reference.
This note documents a closed implementation slice and should not be treated as
the current source of truth.

## Purpose

This note documents the first implemented vertical slice:
`Auth + Onboarding + Create Orchard + Active Orchard Resolution + Protected App Shell`.

It is intentionally implementation-oriented.
Use it together with:

- [implementation_master_plan.md](../01_implementation_materials/implementation_master_plan.md)
- [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
- [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md)
- [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
- [data_contracts.md](../06_backend_and_contracts/data_contracts.md)

## Scope implemented in this slice

- Next.js App Router scaffold with `pnpm`, TypeScript strict, ESLint and TailwindCSS
- Supabase Auth integration through `@supabase/ssr`
- `profiles` bootstrap verification after auth
- auth screens:
  - `/login`
  - `/register`
  - `/reset-password`
- onboarding screen:
  - `/orchards/new`
- protected shell:
  - `/dashboard`
  - `/settings/profile`
  - `/settings/orchard`
  - `/settings/members`
- `active_orchard` resolution and persistence
- server actions:
  - `signUp`
  - `signIn`
  - `signOut`
  - `resetPassword`
  - `getCurrentProfile`
  - `updateProfile`
  - `createOrchard`
  - `listMyOrchards`
  - `getActiveOrchardContext`
  - `setActiveOrchard`
  - `updateOrchard`
  - `listOrchardMembers`
  - `inviteOrchardMember`
  - `deactivateOrchardMembership`
- SQL RPC:
  - `create_orchard_with_owner_membership(...)`

## Route structure used in Phase 1

```text
app/
  page.tsx
  bootstrap-error/page.tsx
  auth/
    sync-active-orchard/route.ts
  (auth)/
    layout.tsx
    login/page.tsx
    register/page.tsx
    reset-password/page.tsx
  (onboarding)/
    layout.tsx
    orchards/
      new/page.tsx
  (app)/
    layout.tsx
    dashboard/page.tsx
    settings/
      profile/page.tsx
```

## Source of truth for `active_orchard`

- `active_orchard` is **not** stored in the database.
- Phase 1 uses the `httpOnly` cookie `ol_active_orchard` as the persisted working-context preference.
- If the cookie is missing or invalid, the server resolves the fallback orchard from active memberships.
- The helper route `GET /auth/sync-active-orchard` synchronizes the cookie before entering the protected shell.

Cookie policy:

- `httpOnly: true`
- `sameSite: "lax"`
- `path: "/"`
- `secure: true` in production
- `maxAge: 30 days`

## Resolution algorithm

`resolveActiveOrchardContext()` works as follows:

1. No session -> redirect to `/login`
2. Session without `profiles` -> redirect to `/bootstrap-error`
3. Session with no active orchard memberships -> redirect to `/orchards/new`
4. Valid cookie matching an active orchard membership -> use that orchard
5. Missing or invalid cookie -> choose orchard by:
   - role priority: `owner` > `worker` > `manager` > `viewer`
   - `joined_at desc`
   - `orchards.created_at desc`
   - `orchards.name asc`
6. Persist the chosen orchard back to `ol_active_orchard`

## Server-side responsibilities

- `middleware.ts`
  - refresh Supabase auth session
  - forward the current path in request headers for post-sync redirects
- server components / layouts
  - enforce auth guards
  - resolve `active_orchard`
  - redirect to onboarding or protected shell
- server actions
  - validate inputs with shared Zod schemas
  - call Supabase Auth or SQL RPC
  - respect RLS
  - revalidate relevant app paths

## Auth flow

- `signUp`
  - creates user in Supabase Auth
  - passes `display_name`, `locale = "pl"`, `timezone = "Europe/Warsaw"` in metadata
  - assumes auto sign-in when auth configuration allows it
  - if auth is configured with email confirmation, the action returns a success message instead of forcing a broken redirect
- `signIn`
  - uses password auth and redirects to `/`
- `signOut`
  - ends Supabase session
  - clears `ol_active_orchard`
  - redirects to `/login`
- `resetPassword`
  - only requests the reset email in Phase 1
  - full recovery / update-password flow is deferred

## Create orchard flow

- implemented through RPC `public.create_orchard_with_owner_membership(...)`
- the RPC:
  - uses `auth.uid()`
  - creates the `orchards` row
  - creates the first `orchard_memberships` row with:
    - `role = 'owner'`
    - `status = 'active'`
  - returns orchard and membership summary data
- the server action:
  - optionally updates `profiles.orchard_onboarding_dismissed_at`
  - persists `ol_active_orchard`
  - redirects to `/dashboard`

## Access assumptions in Phase 1

- `owner`
  - can create orchards
  - can enter the protected shell
  - can switch between orchards with active membership
- `worker`
  - does not create orchards in this slice
  - can enter the protected shell when an active membership exists
- `super_admin`
  - remains a global system role
  - does **not** get a separate global admin shell in Phase 1
  - without orchard membership, the app behaves like "no working context"
- outsider / unrelated user
  - cannot resolve or persist a foreign orchard context

## Definition of done for this slice

- auth routes and protected routes exist
- profile bootstrap is verified before orchard flow continues
- onboarding works for a user with no active memberships
- `createOrchard` is atomic
- `owner` membership is created automatically
- `active_orchard` is resolved server-side and persisted in `ol_active_orchard`
- invalid or stale orchard cookies do not grant access
- protected shell renders for `owner` and `worker`
- profile update works through RLS-safe self-service update

## Deferred items

- membership management UI
- standalone global admin UI for `super_admin`
- full password recovery flow
- domain CRUD modules:
  - `plots`
  - `varieties`
  - `trees`
  - `activities`
  - `harvest_records`

## Verification status

- Implementation completed at repository level.
- Runtime verification is still blocked in this environment because `node`, `pnpm`, and `npm` are not installed here.
- Before merging or deploying, run:
  1. `pnpm install`
  2. `pnpm lint`
  3. `pnpm typecheck`
  4. local auth/onboarding smoke test against Supabase

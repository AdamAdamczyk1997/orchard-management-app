# 02 Auth And Onboarding Flow

Login, registration, first orchard creation, and orchard selection.

## Mermaid source

```mermaid
sequenceDiagram
  actor User
  participant AuthPages as /login /register /reset-password
  participant AuthActions as server/actions/auth.ts
  participant SupabaseAuth as Supabase Auth
  participant ProfileTrigger as handle_new_user_profile()
  participant Root as app/page.tsx
  participant Context as resolveActiveOrchardContext()
  participant Onboarding as /orchards/new
  participant OrchardAction as createOrchard()
  participant OrchardRpc as create_orchard_with_owner_membership()
  participant Cookie as ol_active_orchard cookie
  participant App as /dashboard

  User->>AuthPages: sign in or sign up form
  AuthPages->>AuthActions: signIn() / signUp() / resetPassword()
  AuthActions->>SupabaseAuth: auth API
  SupabaseAuth-->>ProfileTrigger: after auth.users insert
  ProfileTrigger-->>SupabaseAuth: profiles row created
  AuthActions-->>Root: redirect("/")

  Root->>Context: resolve session, profile, cookie, memberships
  alt no session
    Root-->>User: redirect /login
  else no profile
    Root-->>User: redirect /bootstrap-error
  else no active membership
    Root-->>User: redirect /orchards/new
  else valid active orchard
    Root-->>User: redirect /dashboard
  end

  User->>Onboarding: submit orchard form
  Onboarding->>OrchardAction: createOrchard()
  OrchardAction->>OrchardRpc: create_orchard_with_owner_membership()
  OrchardRpc-->>OrchardAction: orchard_id + owner membership
  OrchardAction->>Cookie: persistActiveOrchardCookie(orchard_id)
  OrchardAction-->>App: redirect /dashboard

  User->>App: choose another orchard in OrchardSwitcher
  App->>OrchardAction: setActiveOrchard()
  OrchardAction->>Cookie: persist allowed orchard id
  OrchardAction-->>App: redirect current route
```

## Explanation

Auth is handled through Supabase Auth from server actions. A database trigger creates `profiles` after a new `auth.users` row. The app does not continue into operational pages unless `resolveActiveOrchardContext()` can resolve a session, profile, accessible orchard, and active membership.

First orchard creation is atomic through `create_orchard_with_owner_membership()`. The server action then persists `ol_active_orchard` as an `httpOnly` cookie and redirects to `/dashboard`.

Orchard selection does not mutate domain ownership. `setActiveOrchard()` verifies that the selected orchard is accessible to the user, persists only the session cookie, revalidates the app layout, and returns to the current route.

## Repository references

- `features/auth/login-form.tsx`
- `features/auth/register-form.tsx`
- `features/auth/reset-password-form.tsx`
- `server/actions/auth.ts`
- `supabase/migrations/002_create_profiles.sql`
- `app/page.tsx`
- `lib/orchard-context/resolve-active-orchard.ts`
- `app/(onboarding)/orchards/new/page.tsx`
- `server/actions/orchards.ts`
- `supabase/migrations/015_create_orchard_with_owner_membership_rpc.sql`
- `features/orchards/orchard-switcher.tsx`

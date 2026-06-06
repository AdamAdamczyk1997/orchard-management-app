# 03 Orchard Context Flow

Active orchard resolution, cookie synchronization, middleware, server actions, and permissions.

## Mermaid source

```mermaid
flowchart TD
  Request["Incoming request"] --> Middleware["middleware.ts"]
  Middleware --> SupabaseMiddleware["updateSession()"]
  SupabaseMiddleware --> Header["adds x-current-path"]
  SupabaseMiddleware --> AuthRefresh["supabase.auth.getUser() refreshes cookies"]

  Header --> LayoutDecision{"Route group"}
  LayoutDecision --> AppLayout["(app)/layout.tsx"]
  LayoutDecision --> AccountLayout["(account)/layout.tsx"]
  LayoutDecision --> OnboardingLayout["(onboarding)/layout.tsx"]

  AppLayout --> Resolve["resolveActiveOrchardContext()"]
  AccountLayout --> Resolve
  OnboardingLayout --> RequireSession["requireSessionUser() + readCurrentProfile()"]

  Resolve --> Session["getSessionUser()"]
  Resolve --> Profile["readCurrentProfile()"]
  Resolve --> Cookie["readActiveOrchardCookie()"]
  Resolve --> Memberships["listAccessibleOrchards(user.id)"]

  Session -->|missing| Login["redirect /login"]
  Profile -->|missing| Bootstrap["redirect /bootstrap-error"]
  Memberships -->|none| NewOrchard["redirect /orchards/new"]
  Cookie --> Preferred{"cookie orchard is accessible?"}
  Memberships --> Preferred

  Preferred -->|yes| Active["active orchard + membership"]
  Preferred -->|no cookie or stale cookie| Pick["pickPreferredActiveOrchard()"]
  Pick --> Active
  Active --> PersistNeeded{"cookie differs from resolved orchard?"}
  PersistNeeded -->|yes| Sync["GET /auth/sync-active-orchard"]
  PersistNeeded -->|no| ProtectedAppShell["render ProtectedAppShell"]

  Sync --> SyncCheck["listAccessibleOrchards()"]
  SyncCheck -->|allowed| SetCookie["set ol_active_orchard"]
  SyncCheck -->|not allowed| ClearCookie["clear ol_active_orchard"]
  SetCookie --> Back["redirect next"]
  ClearCookie --> Back

  ServerAction["Server action"] --> RequireActive["requireActiveOrchard(nextPath)"]
  RequireActive --> Resolve
  RequireActive --> Validation["Zod validation + relation checks"]
  Validation --> Permission["RLS helper policies in DB"]
  Permission --> Mutation["table mutation or RPC"]
```

## Explanation

The app uses middleware to keep Supabase SSR session cookies fresh and to pass the current route in `x-current-path`. The active orchard is resolved on the server, not trusted from client state. The cookie is only a preferred orchard hint and is reconciled against active memberships.

If the cookie is missing or stale, the app picks a preferred accessible orchard and redirects through `/auth/sync-active-orchard` so the `httpOnly` cookie can be set or cleared safely. Server actions call `requireActiveOrchard()` and then perform Zod validation, relation checks, and Supabase writes guarded by RLS and database functions.

## Repository references

- `middleware.ts`
- `lib/supabase/middleware.ts`
- `app/(app)/layout.tsx`
- `app/(account)/layout.tsx`
- `app/(onboarding)/layout.tsx`
- `lib/orchard-context/resolve-active-orchard.ts`
- `lib/orchard-context/active-orchard-cookie.ts`
- `lib/orchard-context/list-accessible-orchards.ts`
- `lib/orchard-context/require-active-orchard.ts`
- `app/auth/sync-active-orchard/route.ts`
- `server/actions/plots.ts`
- `server/actions/activities.ts`
- `server/actions/harvests.ts`
- `server/actions/trees.ts`

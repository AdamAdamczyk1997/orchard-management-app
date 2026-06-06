# 12 Membership Flow

Owner invite worker, invitation state, membership, and permission checks.

## Mermaid source

```mermaid
sequenceDiagram
  actor Owner
  actor Worker
  participant MembersPage as /settings/members
  participant InviteForm as InviteMemberForm
  participant OrchardAction as inviteOrchardMember()
  participant InviteRpc as invite_orchard_member_by_email()
  participant Profiles as profiles
  participant Memberships as orchard_memberships
  participant Context as resolveActiveOrchardContext()
  participant RLS as RLS helper functions

  Owner->>MembersPage: open members settings
  MembersPage->>Context: requireActiveOrchard()
  Context-->>MembersPage: active orchard + owner membership
  MembersPage->>InviteForm: render invite form
  Owner->>InviteForm: submit worker email
  InviteForm->>OrchardAction: inviteOrchardMember()
  OrchardAction->>Context: resolve owner context
  OrchardAction->>InviteRpc: p_orchard_id, p_email, p_role
  InviteRpc->>RLS: can_manage_orchard()
  InviteRpc->>Profiles: find existing profile by email
  InviteRpc->>Memberships: insert/reactivate membership status=active
  Memberships-->>MembersPage: list updated members

  Worker->>Context: later app request
  Context->>Memberships: listAccessibleOrchards(worker.id)
  Memberships-->>Context: active worker membership
  Context-->>Worker: app shell with worker role
  Worker->>RLS: read/write operational data
  RLS-->>Worker: allowed for can_write_orchard_operational_data()
  Worker->>RLS: manage members or export account data
  RLS-->>Worker: blocked
```

## Explanation

Current code supports owner-managed membership for existing accounts. The owner opens `/settings/members`, submits an email, and `invite_orchard_member_by_email()` finds the existing `profile` and inserts or reactivates an `orchard_memberships` row.

Important current-state note: there is no implemented Accept Invitation route/action in the repository. Although the database status enum includes `invited`, the current RPC sets membership `status = 'active'` immediately. In diagrams and implementation planning, any true accept-invitation flow should be treated as future work unless new code is added.

Permission checks happen at multiple layers:

- UI hides member settings for non-owners.
- Server actions check `context.membership.role === "owner"` before management mutations.
- RLS helper functions enforce read/write/manage permissions in the database.

## Repository references

- `app/(app)/settings/members/page.tsx`
- `features/orchards/invite-member-form.tsx`
- `features/orchards/member-list.tsx`
- `server/actions/orchards.ts`
- `supabase/migrations/004_create_orchard_memberships.sql`
- `supabase/migrations/016_create_invite_orchard_member_rpc.sql`
- `supabase/migrations/013_create_v1_security_helpers.sql`
- `supabase/migrations/014_enable_rls_and_v1_policies.sql`
- `tests/integration/orchard-management-flow.spec.ts`
- `tests/security/orchard-management-rls.spec.ts`

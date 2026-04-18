import { readCurrentProfile } from "@/lib/auth/get-current-profile";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { readActiveOrchardCookie } from "@/lib/orchard-context/active-orchard-cookie";
import {
  listAccessibleOrchards,
  type AccessibleOrchardRecord,
} from "@/lib/orchard-context/list-accessible-orchards";
import type {
  OrchardMembershipRole,
  ResolvedActiveOrchardContext,
} from "@/types/contracts";

const rolePriority: Record<OrchardMembershipRole, number> = {
  owner: 0,
  worker: 1,
  manager: 2,
  viewer: 3,
};

function sortAccessibleOrchards(records: AccessibleOrchardRecord[]) {
  return [...records].sort((left, right) => {
    const roleDiff =
      rolePriority[left.orchard.my_role] - rolePriority[right.orchard.my_role];

    if (roleDiff !== 0) {
      return roleDiff;
    }

    const leftJoinedAt = left.membership.joined_at ?? "";
    const rightJoinedAt = right.membership.joined_at ?? "";

    if (leftJoinedAt !== rightJoinedAt) {
      return rightJoinedAt.localeCompare(leftJoinedAt);
    }

    if (left.orchard_created_at !== right.orchard_created_at) {
      return right.orchard_created_at.localeCompare(left.orchard_created_at);
    }

    return left.orchard.name.localeCompare(right.orchard.name);
  });
}

export function pickPreferredActiveOrchard(records: AccessibleOrchardRecord[]) {
  return sortAccessibleOrchards(records)[0] ?? null;
}

export async function resolveActiveOrchardContext(): Promise<ResolvedActiveOrchardContext> {
  const user = await getSessionUser();

  if (!user) {
    return {
      authenticated: false,
      user_id: null,
      profile: null,
      orchard: null,
      available_orchards: [],
      membership: null,
      requires_onboarding: false,
      resolved_orchard_id: null,
      cookie_orchard_id: null,
      should_persist_cookie: false,
      should_clear_cookie: false,
      error_code: "UNAUTHORIZED",
    };
  }

  const [profile, cookieOrchardId] = await Promise.all([
    readCurrentProfile(),
    readActiveOrchardCookie(),
  ]);

  if (!profile) {
    return {
      authenticated: true,
      user_id: user.id,
      profile: null,
      orchard: null,
      available_orchards: [],
      membership: null,
      requires_onboarding: false,
      resolved_orchard_id: null,
      cookie_orchard_id: cookieOrchardId,
      should_persist_cookie: false,
      should_clear_cookie: Boolean(cookieOrchardId),
      error_code: "PROFILE_BOOTSTRAP_REQUIRED",
    };
  }

  const accessibleOrchards = await listAccessibleOrchards(user.id);
  const available_orchards = accessibleOrchards.map((record) => record.orchard);

  if (accessibleOrchards.length === 0) {
    return {
      authenticated: true,
      user_id: user.id,
      profile,
      orchard: null,
      available_orchards,
      membership: null,
      requires_onboarding: true,
      resolved_orchard_id: null,
      cookie_orchard_id: cookieOrchardId,
      should_persist_cookie: false,
      should_clear_cookie: Boolean(cookieOrchardId),
      error_code: "ORCHARD_ONBOARDING_REQUIRED",
    };
  }

  const currentRecord = cookieOrchardId
    ? accessibleOrchards.find((record) => record.orchard.id === cookieOrchardId)
    : null;
  const preferredRecord = currentRecord ?? pickPreferredActiveOrchard(accessibleOrchards);

  if (!preferredRecord) {
    return {
      authenticated: true,
      user_id: user.id,
      profile,
      orchard: null,
      available_orchards,
      membership: null,
      requires_onboarding: true,
      resolved_orchard_id: null,
      cookie_orchard_id: cookieOrchardId,
      should_persist_cookie: false,
      should_clear_cookie: Boolean(cookieOrchardId),
      error_code: "NO_ACTIVE_ORCHARD",
    };
  }

  const should_persist_cookie = cookieOrchardId !== preferredRecord.orchard.id;

  return {
    authenticated: true,
    user_id: user.id,
    profile,
    orchard: preferredRecord.orchard,
    available_orchards,
    membership: preferredRecord.membership,
    requires_onboarding: false,
    resolved_orchard_id: preferredRecord.orchard.id,
    cookie_orchard_id: cookieOrchardId,
    should_persist_cookie,
    should_clear_cookie: Boolean(cookieOrchardId) && !currentRecord && !should_persist_cookie,
  };
}

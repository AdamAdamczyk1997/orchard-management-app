import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, createAnonClient } from "./supabase";

const TEST_PASSWORD = "TestPassword123!";

function uniqueLabel(label: string) {
  return `${label}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export async function waitForProfile(profileId: string, timeoutMs = 10_000) {
  const admin = createAdminClient();
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(`Timed out while waiting for profile ${profileId}`);
}

export async function createTestUser(label: string, options?: {
  displayName?: string;
  emailConfirmed?: boolean;
}) {
  const admin = createAdminClient();
  const unique = uniqueLabel(label);
  const email = `${unique}@orchardlog.local`;
  const password = TEST_PASSWORD;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: options?.emailConfirmed ?? true,
    user_metadata: {
      display_name: options?.displayName ?? unique,
      locale: "pl",
      timezone: "Europe/Warsaw",
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(`No auth user returned for ${email}`);
  }

  const profile = await waitForProfile(data.user.id);

  return {
    user: data.user,
    profile,
    email,
    password,
  };
}

export async function signInTestUser(email: string, password: string) {
  const client = createAnonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.session || !data.user) {
    throw new Error(`No session returned for ${email}`);
  }

  return {
    client,
    session: data.session,
    user: data.user,
  };
}

export async function createOrchardAsUser(
  client: SupabaseClient<any>,
  input: {
    name: string;
    code?: string;
    description?: string;
  },
) {
  const { data, error } = await client
    .rpc("create_orchard_with_owner_membership", {
      p_name: input.name,
      p_code: input.code ?? null,
      p_description: input.description ?? null,
    })
    .single();

  if (error) {
    throw error;
  }

  return data as {
    orchard_id: string;
    orchard_name: string;
    orchard_code: string | null;
    orchard_status: "active" | "archived";
    membership_id: string;
    membership_role: "owner" | "worker" | "manager" | "viewer";
    membership_status: "invited" | "active" | "revoked";
    membership_joined_at: string | null;
  };
}

export async function addWorkerMembership(options: {
  orchardId: string;
  workerProfileId: string;
  invitedByProfileId?: string | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orchard_memberships")
    .insert({
      orchard_id: options.orchardId,
      profile_id: options.workerProfileId,
      role: "worker",
      status: "active",
      invited_by_profile_id: options.invitedByProfileId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    orchard_id: string;
    profile_id: string;
    role: "worker";
    status: "active";
  };
}

export async function inviteOrchardMemberByEmailAsUser(
  client: SupabaseClient<any>,
  input: {
    orchardId: string;
    email: string;
    role?: "worker" | "manager" | "viewer";
  },
) {
  const { data, error } = await client
    .rpc("invite_orchard_member_by_email", {
      p_orchard_id: input.orchardId,
      p_email: input.email,
      p_role: input.role ?? "worker",
    })
    .single();

  if (error) {
    throw error;
  }

  return data as {
    membership_id: string;
    orchard_id: string;
    profile_id: string;
    email: string;
    display_name: string | null;
    role: "owner" | "worker" | "manager" | "viewer";
    status: "invited" | "active" | "revoked";
    joined_at: string | null;
  };
}

export async function updateMembershipAsAdmin(options: {
  membershipId: string;
  patch: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orchard_memberships")
    .update(options.patch)
    .eq("id", options.membershipId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    orchard_id: string;
    profile_id: string;
    role: "owner" | "worker" | "manager" | "viewer";
    status: "invited" | "active" | "revoked";
    joined_at: string | null;
  };
}

export async function createPlotAsUser(
  client: SupabaseClient<any>,
  input: {
    orchardId: string;
    name: string;
    code?: string;
    description?: string;
    locationName?: string;
    areaM2?: number;
  },
) {
  const { data, error } = await client
    .from("plots")
    .insert({
      orchard_id: input.orchardId,
      name: input.name,
      code: input.code ?? null,
      description: input.description ?? null,
      location_name: input.locationName ?? null,
      area_m2: input.areaM2 ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    orchard_id: string;
    name: string;
    code: string | null;
    description: string | null;
    location_name: string | null;
    area_m2: number | null;
    status: "planned" | "active" | "archived";
    is_active: boolean;
  };
}

export async function updatePlotAsUser(
  client: SupabaseClient<any>,
  input: {
    plotId: string;
    orchardId: string;
    patch: Record<string, unknown>;
  },
) {
  const { data, error } = await client
    .from("plots")
    .update(input.patch)
    .eq("id", input.plotId)
    .eq("orchard_id", input.orchardId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    orchard_id: string;
    name: string;
    code: string | null;
    description: string | null;
    location_name: string | null;
    area_m2: number | null;
    status: "planned" | "active" | "archived";
    is_active: boolean;
  };
}

export async function createVarietyAsUser(
  client: SupabaseClient<any>,
  input: {
    orchardId: string;
    species: string;
    name: string;
    description?: string;
  },
) {
  const { data, error } = await client
    .from("varieties")
    .insert({
      orchard_id: input.orchardId,
      species: input.species,
      name: input.name,
      description: input.description ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    orchard_id: string;
    species: string;
    name: string;
    description: string | null;
  };
}

export async function updateVarietyAsUser(
  client: SupabaseClient<any>,
  input: {
    varietyId: string;
    orchardId: string;
    patch: Record<string, unknown>;
  },
) {
  const { data, error } = await client
    .from("varieties")
    .update(input.patch)
    .eq("id", input.varietyId)
    .eq("orchard_id", input.orchardId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    orchard_id: string;
    species: string;
    name: string;
    description: string | null;
    is_favorite: boolean;
  };
}

export async function createTreeAsUser(
  client: SupabaseClient<any>,
  input: {
    orchardId: string;
    plotId: string;
    varietyId?: string | null;
    species: string;
    treeCode?: string;
    displayName?: string;
    sectionName?: string;
    rowNumber?: number | null;
    positionInRow?: number | null;
    conditionStatus?: "new" | "good" | "warning" | "critical" | "removed";
    locationVerified?: boolean;
  },
) {
  const { data, error } = await client
    .from("trees")
    .insert({
      orchard_id: input.orchardId,
      plot_id: input.plotId,
      variety_id: input.varietyId ?? null,
      species: input.species,
      tree_code: input.treeCode ?? null,
      display_name: input.displayName ?? null,
      section_name: input.sectionName ?? null,
      row_number: input.rowNumber ?? null,
      position_in_row: input.positionInRow ?? null,
      condition_status: input.conditionStatus ?? "good",
      location_verified: input.locationVerified ?? false,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    orchard_id: string;
    plot_id: string;
    variety_id: string | null;
    species: string;
    tree_code: string | null;
    display_name: string | null;
    section_name: string | null;
    row_number: number | null;
    position_in_row: number | null;
    condition_status: "new" | "good" | "warning" | "critical" | "removed";
    location_verified: boolean;
    is_active: boolean;
  };
}

export async function updateTreeAsUser(
  client: SupabaseClient<any>,
  input: {
    treeId: string;
    orchardId: string;
    patch: Record<string, unknown>;
  },
) {
  const { data, error } = await client
    .from("trees")
    .update(input.patch)
    .eq("id", input.treeId)
    .eq("orchard_id", input.orchardId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as {
    id: string;
    orchard_id: string;
    plot_id: string;
    variety_id: string | null;
    species: string;
    tree_code: string | null;
    display_name: string | null;
    section_name: string | null;
    row_number: number | null;
    position_in_row: number | null;
    condition_status: "new" | "good" | "warning" | "critical" | "removed";
    is_active: boolean;
  };
}

export async function createActivityAsUser(
  client: SupabaseClient<any>,
  input: {
    parent: Record<string, unknown>;
    scopes?: Array<Record<string, unknown>>;
    materials?: Array<Record<string, unknown>>;
  },
) {
  const { data, error } = await client
    .rpc("create_activity_with_children", {
      p_parent: input.parent,
      p_scopes: input.scopes ?? [],
      p_materials: input.materials ?? [],
    })
    .single();

  if (error) {
    throw error;
  }

  return data as {
    activity_id: string;
  };
}

export async function updateActivityAsUser(
  client: SupabaseClient<any>,
  input: {
    activityId: string;
    parent: Record<string, unknown>;
    scopes?: Array<Record<string, unknown>>;
    materials?: Array<Record<string, unknown>>;
  },
) {
  const { data, error } = await client
    .rpc("update_activity_with_children", {
      p_activity_id: input.activityId,
      p_parent: input.parent,
      p_scopes: input.scopes ?? [],
      p_materials: input.materials ?? [],
    })
    .single();

  if (error) {
    throw error;
  }

  return data as {
    activity_id: string;
  };
}

export async function cleanupTestUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return;
  }

  const admin = createAdminClient();
  const uniqueIds = [...new Set(userIds)];

  const { data: orchardRows, error: orchardLookupError } = await admin
    .from("orchards")
    .select("id")
    .in("created_by_profile_id", uniqueIds);

  if (orchardLookupError) {
    throw orchardLookupError;
  }

  const orchardIds = ((orchardRows ?? []) as Array<{ id: string }>).map(
    (row) => row.id,
  );

  if (orchardIds.length > 0) {
    const { error: deleteOrchardsError } = await admin
      .from("orchards")
      .delete()
      .in("id", orchardIds);

    if (deleteOrchardsError) {
      throw deleteOrchardsError;
    }
  }

  const { error: deleteMembershipsError } = await admin
    .from("orchard_memberships")
    .delete()
    .in("profile_id", uniqueIds);

  if (deleteMembershipsError) {
    throw deleteMembershipsError;
  }

  for (const userId of uniqueIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }
  }
}

export function createTestOrchardName(label: string) {
  return `Test Orchard ${uniqueLabel(label)}`;
}

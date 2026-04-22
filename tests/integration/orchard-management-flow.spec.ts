import { afterEach, describe, expect, it } from "vitest";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createOrchardAsUser,
  createTestOrchardName,
  createTestUser,
  inviteOrchardMemberByEmailAsUser,
  signInTestUser,
  updateMembershipAsAdmin,
} from "../helpers/test-data";

describe("orchard management flow", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("lets the owner update orchard settings while blocking workers", async () => {
    const owner = await createTestUser("orchard-settings-owner");
    const worker = await createTestUser("orchard-settings-worker");

    createdUserIds.push(owner.user.id, worker.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("orchard-settings"),
      code: "SET-01",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const ownerUpdate = await ownerClient
      .from("orchards")
      .update({
        name: "Sad po aktualizacji",
        code: "SET-02",
        description: "Zmienione ustawienia sadu",
      })
      .eq("id", orchard.orchard_id)
      .select("id, name, code, description")
      .single();

    expect(ownerUpdate.error).toBeNull();
    expect(ownerUpdate.data).toMatchObject({
      id: orchard.orchard_id,
      name: "Sad po aktualizacji",
      code: "SET-02",
      description: "Zmienione ustawienia sadu",
    });

    const workerUpdate = await workerClient
      .from("orchards")
      .update({
        description: "Proba zmiany przez worker",
      })
      .eq("id", orchard.orchard_id)
      .select("id, description");

    expect(workerUpdate.error).toBeNull();
    expect(workerUpdate.data).toEqual([]);
  });

  it("lists orchard members with profile data and invites an existing worker by email", async () => {
    const owner = await createTestUser("members-owner");
    const worker = await createTestUser("members-worker");

    createdUserIds.push(owner.user.id, worker.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("members"),
      code: "MEM-01",
    });

    const inviteResult = await inviteOrchardMemberByEmailAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      email: worker.email,
    });

    expect(inviteResult.email).toBe(worker.email);
    expect(inviteResult.role).toBe("worker");
    expect(inviteResult.status).toBe("active");
    expect(inviteResult.joined_at).not.toBeNull();

    const members = await ownerClient
      .from("orchard_memberships")
      .select(
        `
          id,
          role,
          status,
          profile:profiles!orchard_memberships_profile_id_fkey (
            email,
            display_name
          )
        `,
      )
      .eq("orchard_id", orchard.orchard_id);

    expect(members.error).toBeNull();
    expect(members.data).toHaveLength(2);

    const emails = (members.data ?? []).map((row) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;

      return profile?.email ?? null;
    });

    expect(emails).toContain(owner.email);
    expect(emails).toContain(worker.email);
  });

  it("rejects missing accounts, blocks duplicate active membership, and reactivates revoked membership", async () => {
    const owner = await createTestUser("invite-owner");
    const worker = await createTestUser("invite-worker");

    createdUserIds.push(owner.user.id, worker.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("invite"),
      code: "INV-01",
    });

    const missingProfileInvite = await ownerClient
      .rpc("invite_orchard_member_by_email", {
        p_orchard_id: orchard.orchard_id,
        p_email: "missing@orchardlog.local",
        p_role: "worker",
      })
      .single();

    expect(missingProfileInvite.data).toBeNull();
    expect(missingProfileInvite.error?.code).toBe("P0001");

    const firstInvite = await inviteOrchardMemberByEmailAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      email: worker.email,
    });

    const duplicateInvite = await ownerClient
      .rpc("invite_orchard_member_by_email", {
        p_orchard_id: orchard.orchard_id,
        p_email: worker.email,
        p_role: "worker",
      })
      .single();

    expect(duplicateInvite.data).toBeNull();
    expect(duplicateInvite.error?.code).toBe("23505");

    await updateMembershipAsAdmin({
      membershipId: firstInvite.membership_id,
      patch: {
        status: "revoked",
      },
    });

    const reactivatedInvite = await inviteOrchardMemberByEmailAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      email: worker.email,
    });

    expect(reactivatedInvite.membership_id).toBe(firstInvite.membership_id);
    expect(reactivatedInvite.status).toBe("active");
    expect(reactivatedInvite.joined_at).not.toBeNull();
  });
});

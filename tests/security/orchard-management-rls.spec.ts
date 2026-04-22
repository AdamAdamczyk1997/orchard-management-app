import { afterEach, describe, expect, it } from "vitest";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createOrchardAsUser,
  createTestOrchardName,
  createTestUser,
  inviteOrchardMemberByEmailAsUser,
  signInTestUser,
} from "../helpers/test-data";

describe("orchard management RLS", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("owner can see all orchard memberships while worker can only see their own row", async () => {
    const owner = await createTestUser("mgmt-owner");
    const worker = await createTestUser("mgmt-worker");
    const outsider = await createTestUser("mgmt-outsider");

    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const outsiderClient = (await signInTestUser(outsider.email, outsider.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("mgmt"),
      code: "MGT-01",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const ownerMemberships = await ownerClient
      .from("orchard_memberships")
      .select("id, profile_id, role, status")
      .eq("orchard_id", orchard.orchard_id);

    expect(ownerMemberships.error).toBeNull();
    expect(ownerMemberships.data).toHaveLength(2);

    const workerMemberships = await workerClient
      .from("orchard_memberships")
      .select("id, profile_id, role, status")
      .eq("orchard_id", orchard.orchard_id);

    expect(workerMemberships.error).toBeNull();
    expect(workerMemberships.data).toHaveLength(1);
    expect(workerMemberships.data?.[0]?.profile_id).toBe(worker.user.id);

    const outsiderMemberships = await outsiderClient
      .from("orchard_memberships")
      .select("id, profile_id, role, status")
      .eq("orchard_id", orchard.orchard_id);

    expect(outsiderMemberships.error).toBeNull();
    expect(outsiderMemberships.data).toEqual([]);
  });

  it("owner can invite by email but worker cannot use the membership RPC", async () => {
    const owner = await createTestUser("rpc-owner");
    const worker = await createTestUser("rpc-worker");
    const invitee = await createTestUser("rpc-invitee");

    createdUserIds.push(owner.user.id, worker.user.id, invitee.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("rpc"),
      code: "RPC-01",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const ownerInvite = await inviteOrchardMemberByEmailAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      email: invitee.email,
    });

    expect(ownerInvite.email).toBe(invitee.email);
    expect(ownerInvite.status).toBe("active");

    const workerInvite = await workerClient
      .rpc("invite_orchard_member_by_email", {
        p_orchard_id: orchard.orchard_id,
        p_email: "outsider@orchardlog.local",
        p_role: "worker",
      })
      .single();

    expect(workerInvite.data).toBeNull();
    expect(workerInvite.error?.code).toBe("42501");
  });
});

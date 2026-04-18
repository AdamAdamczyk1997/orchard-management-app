import { afterEach, describe, expect, it } from "vitest";
import { createAdminClient } from "../helpers/supabase";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createOrchardAsUser,
  createTestOrchardName,
  createTestUser,
  signInTestUser,
} from "../helpers/test-data";

describe("orchard RLS", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("owner sees only own orchard, worker sees only assigned orchard, outsider sees nothing", async () => {
    const ownerA = await createTestUser("owner-a");
    const ownerB = await createTestUser("owner-b");
    const worker = await createTestUser("worker-a");
    const outsider = await createTestUser("outsider-a");

    createdUserIds.push(
      ownerA.user.id,
      ownerB.user.id,
      worker.user.id,
      outsider.user.id,
    );

    const ownerASignedIn = await signInTestUser(ownerA.email, ownerA.password);
    const ownerBSignedIn = await signInTestUser(ownerB.email, ownerB.password);
    const workerSignedIn = await signInTestUser(worker.email, worker.password);
    const outsiderSignedIn = await signInTestUser(
      outsider.email,
      outsider.password,
    );

    const orchardA = await createOrchardAsUser(ownerASignedIn.client, {
      name: createTestOrchardName("orchard-a"),
      code: "A-TEST",
    });

    const orchardB = await createOrchardAsUser(ownerBSignedIn.client, {
      name: createTestOrchardName("orchard-b"),
      code: "B-TEST",
    });

    await addWorkerMembership({
      orchardId: orchardA.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: ownerA.user.id,
    });

    const ownerAOrchards = await ownerASignedIn.client
      .from("orchards")
      .select("id, name")
      .order("name");

    expect(ownerAOrchards.error).toBeNull();
    expect(ownerAOrchards.data?.map((row) => row.id)).toEqual([
      orchardA.orchard_id,
    ]);

    const workerOrchards = await workerSignedIn.client
      .from("orchards")
      .select("id, name")
      .order("name");

    expect(workerOrchards.error).toBeNull();
    expect(workerOrchards.data?.map((row) => row.id)).toEqual([
      orchardA.orchard_id,
    ]);

    const outsiderOrchards = await outsiderSignedIn.client
      .from("orchards")
      .select("id, name");

    expect(outsiderOrchards.error).toBeNull();
    expect(outsiderOrchards.data).toEqual([]);

    const workerTryingForeignOrchard = await workerSignedIn.client
      .from("orchards")
      .select("id, name")
      .eq("id", orchardB.orchard_id);

    expect(workerTryingForeignOrchard.error).toBeNull();
    expect(workerTryingForeignOrchard.data).toEqual([]);

    const outsiderMemberships = await outsiderSignedIn.client
      .from("orchard_memberships")
      .select("id, orchard_id, profile_id");

    expect(outsiderMemberships.error).toBeNull();
    expect(outsiderMemberships.data).toEqual([]);
  });

  it("owner can read worker profile from the same orchard, outsider cannot", async () => {
    const owner = await createTestUser("owner-profile");
    const worker = await createTestUser("worker-profile");
    const outsider = await createTestUser("outsider-profile");

    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerSignedIn = await signInTestUser(owner.email, owner.password);
    const outsiderSignedIn = await signInTestUser(
      outsider.email,
      outsider.password,
    );

    const orchard = await createOrchardAsUser(ownerSignedIn.client, {
      name: createTestOrchardName("profiles"),
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const ownerProfileRead = await ownerSignedIn.client
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", worker.user.id)
      .maybeSingle();

    expect(ownerProfileRead.error).toBeNull();
    expect(ownerProfileRead.data?.id).toBe(worker.user.id);

    const outsiderProfileRead = await outsiderSignedIn.client
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", worker.user.id)
      .maybeSingle();

    expect(outsiderProfileRead.error).toBeNull();
    expect(outsiderProfileRead.data).toBeNull();

    const admin = createAdminClient();
    const adminProfiles = await admin
      .from("profiles")
      .select("id")
      .in("id", [owner.user.id, worker.user.id, outsider.user.id]);

    expect(adminProfiles.error).toBeNull();
    expect(adminProfiles.data).toHaveLength(3);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupTestUsers,
  createOrchardAsUser,
  createTestOrchardName,
  createTestUser,
  signInTestUser,
} from "../helpers/test-data";

describe("create orchard flow", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("creates orchard, owner membership, and user access in one flow", async () => {
    const owner = await createTestUser("owner-flow");
    createdUserIds.push(owner.user.id);

    const { client } = await signInTestUser(owner.email, owner.password);
    const orchardName = createTestOrchardName("owner-flow");

    const rpcResult = await createOrchardAsUser(client, {
      name: orchardName,
      code: "OWN-FLOW",
      description: "Test orchard created inside integration test.",
    });

    expect(rpcResult.orchard_id).toBeTruthy();
    expect(rpcResult.orchard_name).toBe(orchardName);
    expect(rpcResult.membership_role).toBe("owner");
    expect(rpcResult.membership_status).toBe("active");

    const { data: orchards, error: orchardsError } = await client
      .from("orchards")
      .select("id, name, created_by_profile_id")
      .eq("id", rpcResult.orchard_id);

    expect(orchardsError).toBeNull();
    expect(orchards).toHaveLength(1);
    expect(orchards?.[0]?.created_by_profile_id).toBe(owner.user.id);

    const { data: memberships, error: membershipsError } = await client
      .from("orchard_memberships")
      .select("orchard_id, profile_id, role, status")
      .eq("orchard_id", rpcResult.orchard_id)
      .eq("profile_id", owner.user.id);

    expect(membershipsError).toBeNull();
    expect(memberships).toHaveLength(1);
    expect(memberships?.[0]?.role).toBe("owner");
    expect(memberships?.[0]?.status).toBe("active");
  });

  it("returns no orchard access for a user without membership", async () => {
    const outsider = await createTestUser("outsider-no-orchard");
    createdUserIds.push(outsider.user.id);

    const { client } = await signInTestUser(outsider.email, outsider.password);
    const { data, error } = await client.from("orchards").select("id, name");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

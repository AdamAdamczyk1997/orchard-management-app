import { afterEach, describe, expect, it } from "vitest";
import { createAdminClient } from "../helpers/supabase";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createActivityAsUser,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  createTreeAsUser,
  signInTestUser,
  updateActivityAsUser,
} from "../helpers/test-data";

describe("activity management flow", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("lets owner and worker create and edit activities with scopes and materials", async () => {
    const owner = await createTestUser("activity-owner");
    const worker = await createTestUser("activity-worker");

    createdUserIds.push(owner.user.id, worker.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("activities"),
      code: "ACT-01",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera A",
      code: "A-01",
    });
    const tree = await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      species: "apple",
      treeCode: "A-01-01",
      displayName: "Jablon przy drodze",
      rowNumber: 1,
      positionInRow: 1,
    });

    const createdActivity = await createActivityAsUser(ownerClient, {
      parent: {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        activity_type: "spraying",
        activity_date: "2026-04-19",
        title: "Oprysk po opadach",
        status: "done",
        performed_by_profile_id: owner.user.id,
        performed_by: owner.profile.display_name,
        season_phase: "wiosna",
      },
      scopes: [
        {
          scope_level: "tree",
          tree_id: tree.id,
          scope_order: 1,
        },
      ],
      materials: [
        {
          name: "Miedzian 50 WP",
          category: "spray",
          quantity: 0.25,
          unit: "kg",
        },
        {
          name: "Woda",
          category: "carrier",
          quantity: 10,
          unit: "l",
        },
      ],
    });

    const createdRow = await ownerClient
      .from("activities")
      .select("id, activity_type, title, season_year, season_phase, performed_by_profile_id")
      .eq("id", createdActivity.activity_id)
      .single();

    expect(createdRow.error).toBeNull();
    expect(createdRow.data).toMatchObject({
      id: createdActivity.activity_id,
      activity_type: "spraying",
      title: "Oprysk po opadach",
      season_year: 2026,
      season_phase: "wiosna",
      performed_by_profile_id: owner.user.id,
    });

    const createdScopes = await ownerClient
      .from("activity_scopes")
      .select("scope_level, tree_id")
      .eq("activity_id", createdActivity.activity_id);
    const createdMaterials = await ownerClient
      .from("activity_materials")
      .select("name, category, quantity, unit")
      .eq("activity_id", createdActivity.activity_id);

    expect(createdScopes.error).toBeNull();
    expect(createdScopes.data).toEqual([
      {
        scope_level: "tree",
        tree_id: tree.id,
      },
    ]);
    expect(createdMaterials.error).toBeNull();
    expect(createdMaterials.data).toHaveLength(2);

    await updateActivityAsUser(workerClient, {
      activityId: createdActivity.activity_id,
      parent: {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        activity_type: "inspection",
        activity_date: "2026-04-20",
        title: "Kontrola po zabiegu",
        status: "planned",
        performed_by_profile_id: worker.user.id,
        performed_by: worker.profile.display_name,
        season_phase: "wiosna",
      },
      scopes: [
        {
          scope_level: "plot",
          scope_order: 1,
        },
      ],
      materials: [],
    });

    const updatedRow = await ownerClient
      .from("activities")
      .select("id, activity_type, title, status, performed_by_profile_id")
      .eq("id", createdActivity.activity_id)
      .single();
    const updatedScopes = await ownerClient
      .from("activity_scopes")
      .select("scope_level, tree_id")
      .eq("activity_id", createdActivity.activity_id);
    const updatedMaterials = await ownerClient
      .from("activity_materials")
      .select("id")
      .eq("activity_id", createdActivity.activity_id);

    expect(updatedRow.error).toBeNull();
    expect(updatedRow.data).toMatchObject({
      id: createdActivity.activity_id,
      activity_type: "inspection",
      title: "Kontrola po zabiegu",
      status: "planned",
      performed_by_profile_id: worker.user.id,
    });
    expect(updatedScopes.data).toEqual([
      {
        scope_level: "plot",
        tree_id: null,
      },
    ]);
    expect(updatedMaterials.data).toEqual([]);
  });

  it("rejects pruning without subtype and performer outside the orchard membership", async () => {
    const owner = await createTestUser("activity-pruning-owner");
    const outsider = await createTestUser("activity-pruning-outsider");

    createdUserIds.push(owner.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("pruning"),
      code: "PRN-01",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera B",
      code: "B-01",
    });

    const missingSubtype = await ownerClient
      .rpc("create_activity_with_children", {
        p_parent: {
          orchard_id: orchard.orchard_id,
          plot_id: plot.id,
          activity_type: "pruning",
          activity_date: "2026-02-10",
          title: "Ciecie bez podtypu",
          status: "done",
        },
        p_scopes: [
          {
            scope_level: "plot",
            scope_order: 1,
          },
        ],
        p_materials: [],
      })
      .single();

    expect(missingSubtype.data).toBeNull();
    expect(missingSubtype.error?.code).toBe("22023");
    expect(missingSubtype.error?.message).toContain("PRUNING_SUBTYPE_REQUIRED");

    const invalidPerformer = await ownerClient
      .rpc("create_activity_with_children", {
        p_parent: {
          orchard_id: orchard.orchard_id,
          plot_id: plot.id,
          activity_type: "inspection",
          activity_date: "2026-04-19",
          title: "Kontrola z obcym wykonawca",
          status: "done",
          performed_by_profile_id: outsider.user.id,
        },
        p_scopes: [],
        p_materials: [],
      })
      .single();

    expect(invalidPerformer.data).toBeNull();
    expect(invalidPerformer.error?.code).toBe("23514");
    expect(invalidPerformer.error?.message).toContain(
      "Activity performer must have an active membership",
    );
  });

  it("keeps the write atomic when a scope tree belongs to another plot", async () => {
    const owner = await createTestUser("activity-atomic-owner");

    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("atomic"),
      code: "ATM-01",
    });
    const plotA = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera C",
      code: "C-01",
    });
    const plotB = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera D",
      code: "D-01",
    });
    const treeOnPlotB = await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plotB.id,
      species: "pear",
      treeCode: "D-01-02",
      rowNumber: 1,
      positionInRow: 2,
    });

    const admin = createAdminClient();
    const beforeActivities = await admin
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("orchard_id", orchard.orchard_id);
    const beforeScopes = await admin
      .from("activity_scopes")
      .select("id", { count: "exact", head: true });
    const beforeMaterials = await admin
      .from("activity_materials")
      .select("id", { count: "exact", head: true });

    const failedMutation = await ownerClient
      .rpc("create_activity_with_children", {
        p_parent: {
          orchard_id: orchard.orchard_id,
          plot_id: plotA.id,
          activity_type: "spraying",
          activity_date: "2026-04-19",
          title: "Niepoprawny zakres drzewa",
          status: "done",
        },
        p_scopes: [
          {
            scope_level: "tree",
            tree_id: treeOnPlotB.id,
            scope_order: 1,
          },
        ],
        p_materials: [
          {
            name: "Preparat testowy",
          },
        ],
      })
      .single();

    expect(failedMutation.data).toBeNull();
    expect(failedMutation.error?.code).toBe("23514");
    expect(failedMutation.error?.message).toContain(
      "Activity scope tree must belong to the same orchard and plot",
    );

    const afterActivities = await admin
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("orchard_id", orchard.orchard_id);
    const scopeRows = await admin
      .from("activity_scopes")
      .select("id", { count: "exact", head: true });
    const materialRows = await admin
      .from("activity_materials")
      .select("id", { count: "exact", head: true });

    expect(afterActivities.count).toBe(beforeActivities.count);
    expect(scopeRows.count).toBe(beforeScopes.count);
    expect(materialRows.count).toBe(beforeMaterials.count);
    expect(scopeRows.error).toBeNull();
    expect(materialRows.error).toBeNull();
  });

  it("stores mowing plot scopes, allows status changes under RLS, and deletes children with the parent", async () => {
    const owner = await createTestUser("activity-delete-owner");
    const worker = await createTestUser("activity-delete-worker");

    createdUserIds.push(owner.user.id, worker.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("delete"),
      code: "DEL-01",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera E",
      code: "E-01",
    });

    const createdActivity = await createActivityAsUser(workerClient, {
      parent: {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        activity_type: "mowing",
        activity_date: "2026-05-02",
        title: "Koszenie calej dzialki",
        status: "done",
        performed_by_profile_id: worker.user.id,
      },
      scopes: [
        {
          scope_level: "plot",
          scope_order: 1,
        },
      ],
      materials: [],
    });

    const statusUpdate = await workerClient
      .from("activities")
      .update({
        status: "cancelled",
      })
      .eq("id", createdActivity.activity_id)
      .eq("orchard_id", orchard.orchard_id)
      .select("id, status")
      .single();

    expect(statusUpdate.error).toBeNull();
    expect(statusUpdate.data).toMatchObject({
      id: createdActivity.activity_id,
      status: "cancelled",
    });

    const deleteResult = await workerClient
      .from("activities")
      .delete()
      .eq("id", createdActivity.activity_id)
      .eq("orchard_id", orchard.orchard_id)
      .select("id")
      .single();

    expect(deleteResult.error).toBeNull();

    const admin = createAdminClient();
    const scopesAfterDelete = await admin
      .from("activity_scopes")
      .select("id")
      .eq("activity_id", createdActivity.activity_id);
    const materialsAfterDelete = await admin
      .from("activity_materials")
      .select("id")
      .eq("activity_id", createdActivity.activity_id);

    expect(scopesAfterDelete.data).toEqual([]);
    expect(materialsAfterDelete.data).toEqual([]);
  });
});

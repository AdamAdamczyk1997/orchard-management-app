import { afterEach, describe, expect, it } from "vitest";
import {
  getHarvestSeasonSummaryForOrchard,
  getHarvestTimelineForOrchard,
  listHarvestRecordsForOrchard,
  readHarvestRecordByIdForOrchard,
} from "@/lib/orchard-data/harvests";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createActivityAsUser,
  createHarvestRecordAsUser,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  createTreeAsUser,
  createVarietyAsUser,
  signInTestUser,
  updateHarvestRecordAsUser,
} from "../helpers/test-data";

describe("harvest management flow", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("lets owner and worker create, read, update, filter, and delete harvest records", async () => {
    const owner = await createTestUser("harvest-owner");
    const worker = await createTestUser("harvest-worker");

    createdUserIds.push(owner.user.id, worker.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("harvests"),
      code: "HRV-01",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera J",
      code: "J-01",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Gala",
    });
    const tree = await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      varietyId: variety.id,
      species: "apple",
      treeCode: "J-01-11",
      displayName: "Gala przy alejce",
      rowNumber: 2,
      positionInRow: 11,
    });
    const harvestActivity = await createActivityAsUser(ownerClient, {
      parent: {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        tree_id: tree.id,
        activity_type: "harvest",
        activity_date: "2026-09-15",
        title: "Zbior rzadu 2",
        status: "done",
        performed_by_profile_id: owner.user.id,
        performed_by: owner.profile.display_name,
        season_phase: "jesien",
      },
      scopes: [],
      materials: [],
    });

    const firstRecord = await createHarvestRecordAsUser(ownerClient, {
      orchard_id: orchard.orchard_id,
      plot_id: plot.id,
      variety_id: variety.id,
      activity_id: harvestActivity.activity_id,
      scope_level: "location_range",
      harvest_date: "2026-09-15",
      section_name: "Poludnie",
      row_number: 2,
      from_position: 10,
      to_position: 16,
      quantity_value: 1.25,
      quantity_unit: "t",
      notes: "Pierwszy przejazd",
      created_by_profile_id: owner.user.id,
    });

    const secondRecord = await createHarvestRecordAsUser(workerClient, {
      orchard_id: orchard.orchard_id,
      plot_id: plot.id,
      variety_id: variety.id,
      tree_id: tree.id,
      scope_level: "tree",
      harvest_date: "2026-09-20",
      quantity_value: 45,
      quantity_unit: "kg",
      notes: "Drugi przejazd",
      created_by_profile_id: worker.user.id,
    });

    expect(firstRecord).toMatchObject({
      season_year: 2026,
      quantity_kg: 1250,
    });
    expect(secondRecord).toMatchObject({
      season_year: 2026,
      quantity_kg: 45,
    });

    const details = await readHarvestRecordByIdForOrchard(
      orchard.orchard_id,
      firstRecord.id,
      ownerClient,
    );
    const allRecords = await listHarvestRecordsForOrchard(
      orchard.orchard_id,
      {
        season_year: 2026,
      },
      ownerClient,
    );
    const plotRecords = await listHarvestRecordsForOrchard(
      orchard.orchard_id,
      {
        season_year: 2026,
        plot_id: plot.id,
      },
      ownerClient,
    );
    const varietyRecords = await listHarvestRecordsForOrchard(
      orchard.orchard_id,
      {
        season_year: 2026,
        variety_id: variety.id,
      },
      ownerClient,
    );

    expect(details).not.toBeNull();
    expect(details).toMatchObject({
      id: firstRecord.id,
      plot_name: "Kwatera J",
      variety_name: "Gala",
      activity_title: "Zbior rzadu 2",
      created_by_display: owner.profile.display_name,
      section_name: "Poludnie",
      row_number: 2,
      from_position: 10,
      to_position: 16,
    });
    expect(allRecords.map((record) => record.id)).toEqual([
      secondRecord.id,
      firstRecord.id,
    ]);
    expect(plotRecords).toHaveLength(2);
    expect(varietyRecords).toHaveLength(2);

    const updatedRecord = await updateHarvestRecordAsUser(workerClient, {
      harvestRecordId: firstRecord.id,
      orchardId: orchard.orchard_id,
      patch: {
        plot_id: plot.id,
        variety_id: null,
        tree_id: null,
        activity_id: null,
        scope_level: "plot",
        harvest_date: "2026-09-18",
        section_name: null,
        row_number: null,
        from_position: null,
        to_position: null,
        quantity_value: 980,
        quantity_unit: "kg",
        notes: "Korekta po wazeniu",
      },
    });

    expect(updatedRecord).toMatchObject({
      scope_level: "plot",
      harvest_date: "2026-09-18",
      quantity_value: 980,
      quantity_unit: "kg",
      quantity_kg: 980,
    });

    const updatedDetails = await readHarvestRecordByIdForOrchard(
      orchard.orchard_id,
      firstRecord.id,
      ownerClient,
    );

    expect(updatedDetails).toMatchObject({
      id: firstRecord.id,
      scope_level: "plot",
      variety_name: null,
      activity_title: null,
      quantity_kg: 980,
    });

    const deletedRecord = await workerClient
      .from("harvest_records")
      .delete()
      .eq("id", secondRecord.id)
      .eq("orchard_id", orchard.orchard_id)
      .select("id");

    expect(deletedRecord.error).toBeNull();
    expect(deletedRecord.data).toEqual([{ id: secondRecord.id }]);

    const recordsAfterDelete = await listHarvestRecordsForOrchard(
      orchard.orchard_id,
      {
        season_year: 2026,
      },
      ownerClient,
    );

    expect(recordsAfterDelete).toHaveLength(1);
    expect(recordsAfterDelete[0]?.id).toBe(firstRecord.id);
  });

  it("rejects unsupported units and tree/plot mismatches", async () => {
    const owner = await createTestUser("harvest-invalid-owner");

    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("harvest-invalid"),
      code: "HRV-02",
    });
    const plotA = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera K",
      code: "K-01",
    });
    const plotB = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera L",
      code: "L-01",
    });
    const treeOnPlotB = await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plotB.id,
      species: "pear",
      treeCode: "L-01-04",
      rowNumber: 1,
      positionInRow: 4,
    });

    const invalidUnit = await ownerClient
      .from("harvest_records")
      .insert({
        orchard_id: orchard.orchard_id,
        plot_id: plotA.id,
        scope_level: "plot",
        harvest_date: "2026-09-10",
        quantity_value: 10,
        quantity_unit: "crate",
        created_by_profile_id: owner.user.id,
      })
      .select("*")
      .single();

    const mismatchedTree = await ownerClient
      .from("harvest_records")
      .insert({
        orchard_id: orchard.orchard_id,
        plot_id: plotA.id,
        tree_id: treeOnPlotB.id,
        scope_level: "tree",
        harvest_date: "2026-09-11",
        quantity_value: 20,
        quantity_unit: "kg",
        created_by_profile_id: owner.user.id,
      })
      .select("*")
      .single();

    expect(invalidUnit.data).toBeNull();
    expect(invalidUnit.error?.code).toBe("23514");
    expect(invalidUnit.error?.message).toContain(
      "Unsupported harvest quantity unit",
    );

    expect(mismatchedTree.data).toBeNull();
    expect(mismatchedTree.error?.code).toBe("23514");
    expect(mismatchedTree.error?.message).toContain(
      "Harvest plot_id must match tree plot_id",
    );
  });

  it("builds season summary and timeline aggregates with optional plot and variety filters", async () => {
    const owner = await createTestUser("harvest-summary-owner");

    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("harvest-summary"),
      code: "HRV-03",
    });
    const plotA = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera M",
      code: "M-01",
    });
    const plotB = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera N",
      code: "N-01",
    });
    const varietyA = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Gala",
    });
    const varietyB = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Ligol",
    });

    await createHarvestRecordAsUser(ownerClient, {
      orchard_id: orchard.orchard_id,
      scope_level: "orchard",
      harvest_date: "2026-09-01",
      quantity_value: 100,
      quantity_unit: "kg",
      created_by_profile_id: owner.user.id,
    });
    await createHarvestRecordAsUser(ownerClient, {
      orchard_id: orchard.orchard_id,
      plot_id: plotA.id,
      variety_id: varietyA.id,
      scope_level: "variety",
      harvest_date: "2026-09-02",
      quantity_value: 200,
      quantity_unit: "kg",
      created_by_profile_id: owner.user.id,
    });
    await createHarvestRecordAsUser(ownerClient, {
      orchard_id: orchard.orchard_id,
      plot_id: plotA.id,
      variety_id: varietyA.id,
      scope_level: "plot",
      harvest_date: "2026-09-02",
      quantity_value: 50,
      quantity_unit: "kg",
      created_by_profile_id: owner.user.id,
    });
    await createHarvestRecordAsUser(ownerClient, {
      orchard_id: orchard.orchard_id,
      plot_id: plotB.id,
      variety_id: varietyB.id,
      scope_level: "variety",
      harvest_date: "2026-09-03",
      quantity_value: 1.1,
      quantity_unit: "t",
      created_by_profile_id: owner.user.id,
    });
    await createHarvestRecordAsUser(ownerClient, {
      orchard_id: orchard.orchard_id,
      plot_id: plotA.id,
      scope_level: "plot",
      harvest_date: "2026-09-03",
      quantity_value: 70,
      quantity_unit: "kg",
      created_by_profile_id: owner.user.id,
    });
    await createHarvestRecordAsUser(ownerClient, {
      orchard_id: orchard.orchard_id,
      plot_id: plotA.id,
      variety_id: varietyA.id,
      scope_level: "variety",
      harvest_date: "2025-09-03",
      quantity_value: 999,
      quantity_unit: "kg",
      created_by_profile_id: owner.user.id,
    });

    const summary = await getHarvestSeasonSummaryForOrchard(
      orchard.orchard_id,
      {
        season_year: 2026,
      },
      ownerClient,
    );
    const timeline = await getHarvestTimelineForOrchard(
      orchard.orchard_id,
      {
        season_year: 2026,
      },
      ownerClient,
    );
    const plotSummary = await getHarvestSeasonSummaryForOrchard(
      orchard.orchard_id,
      {
        season_year: 2026,
        plot_id: plotA.id,
      },
      ownerClient,
    );
    const varietySummary = await getHarvestSeasonSummaryForOrchard(
      orchard.orchard_id,
      {
        season_year: 2026,
        variety_id: varietyA.id,
      },
      ownerClient,
    );

    expect(summary).toEqual({
      season_year: 2026,
      total_quantity_kg: 1520,
      record_count: 5,
      by_variety: [
        {
          variety_id: varietyB.id,
          variety_name: "Ligol",
          total_quantity_kg: 1100,
          record_count: 1,
        },
        {
          variety_id: varietyA.id,
          variety_name: "Gala",
          total_quantity_kg: 250,
          record_count: 2,
        },
      ],
      by_plot: [
        {
          plot_id: plotB.id,
          plot_name: "Kwatera N",
          total_quantity_kg: 1100,
          record_count: 1,
        },
        {
          plot_id: plotA.id,
          plot_name: "Kwatera M",
          total_quantity_kg: 320,
          record_count: 3,
        },
      ],
    });
    expect(timeline).toEqual([
      {
        harvest_date: "2026-09-01",
        total_quantity_kg: 100,
        record_count: 1,
      },
      {
        harvest_date: "2026-09-02",
        total_quantity_kg: 250,
        record_count: 2,
      },
      {
        harvest_date: "2026-09-03",
        total_quantity_kg: 1170,
        record_count: 2,
      },
    ]);
    expect(plotSummary).toEqual({
      season_year: 2026,
      total_quantity_kg: 320,
      record_count: 3,
      by_variety: [
        {
          variety_id: varietyA.id,
          variety_name: "Gala",
          total_quantity_kg: 250,
          record_count: 2,
        },
      ],
      by_plot: [
        {
          plot_id: plotA.id,
          plot_name: "Kwatera M",
          total_quantity_kg: 320,
          record_count: 3,
        },
      ],
    });
    expect(varietySummary).toEqual({
      season_year: 2026,
      total_quantity_kg: 250,
      record_count: 2,
      by_variety: [
        {
          variety_id: varietyA.id,
          variety_name: "Gala",
          total_quantity_kg: 250,
          record_count: 2,
        },
      ],
      by_plot: [
        {
          plot_id: plotA.id,
          plot_name: "Kwatera M",
          total_quantity_kg: 250,
          record_count: 2,
        },
      ],
    });
  });
});

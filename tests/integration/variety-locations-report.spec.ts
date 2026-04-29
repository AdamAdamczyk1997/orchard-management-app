import { afterEach, describe, expect, it } from "vitest";
import { getVarietyLocationsReportForOrchard } from "@/lib/orchard-data/varieties";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  createTreeAsUser,
  createVarietyAsUser,
  signInTestUser,
  updateTreeAsUser,
} from "../helpers/test-data";

describe("variety locations report", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("groups active trees of one variety into location ranges and respects orchard access", async () => {
    const owner = await createTestUser("variety-report-owner");
    const worker = await createTestUser("variety-report-worker");
    const outsider = await createTestUser("variety-report-outsider");

    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const outsiderClient = (await signInTestUser(outsider.email, outsider.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("variety-report"),
      code: "VR-01",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plotA = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera A",
      code: "A-01",
    });
    const plotB = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera B",
      code: "B-01",
    });
    const targetVariety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Gala Report",
    });
    const otherVariety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Ligol Other",
    });

    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plotA.id,
      varietyId: targetVariety.id,
      species: "apple",
      treeCode: "A-R1-P1",
      rowNumber: 1,
      positionInRow: 1,
      locationVerified: true,
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plotA.id,
      varietyId: targetVariety.id,
      species: "apple",
      treeCode: "A-R1-P2",
      rowNumber: 1,
      positionInRow: 2,
      locationVerified: false,
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plotA.id,
      varietyId: targetVariety.id,
      species: "apple",
      treeCode: "A-R1-P4",
      rowNumber: 1,
      positionInRow: 4,
      locationVerified: true,
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plotA.id,
      varietyId: targetVariety.id,
      species: "apple",
      treeCode: "A-S-R2-P1",
      sectionName: "South",
      rowNumber: 2,
      positionInRow: 1,
      locationVerified: true,
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plotB.id,
      varietyId: targetVariety.id,
      species: "apple",
      treeCode: "B-R3-P5",
      rowNumber: 3,
      positionInRow: 5,
      locationVerified: true,
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plotA.id,
      varietyId: targetVariety.id,
      species: "apple",
      treeCode: "A-NO-LOC",
      locationVerified: false,
    });
    const inactiveTree = await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plotB.id,
      varietyId: targetVariety.id,
      species: "apple",
      treeCode: "B-R3-P6",
      rowNumber: 3,
      positionInRow: 6,
      locationVerified: true,
    });
    await updateTreeAsUser(ownerClient, {
      treeId: inactiveTree.id,
      orchardId: orchard.orchard_id,
      patch: {
        condition_status: "removed",
        is_active: false,
      },
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plotA.id,
      varietyId: otherVariety.id,
      species: "apple",
      treeCode: "A-OTHER-3",
      rowNumber: 1,
      positionInRow: 3,
      locationVerified: true,
    });

    const ownerReport = await getVarietyLocationsReportForOrchard(
      orchard.orchard_id,
      targetVariety.id,
      ownerClient,
    );
    const workerReport = await getVarietyLocationsReportForOrchard(
      orchard.orchard_id,
      targetVariety.id,
      workerClient,
    );
    const outsiderReport = await getVarietyLocationsReportForOrchard(
      orchard.orchard_id,
      targetVariety.id,
      outsiderClient,
    );

    expect(ownerReport).toEqual({
      variety_id: targetVariety.id,
      variety_name: "Gala Report",
      variety_species: "apple",
      total_active_trees_count: 6,
      located_trees_count: 5,
      unlocated_trees_count: 1,
      verified_trees_count: 4,
      unverified_trees_count: 1,
      groups: [
        {
          plot_id: plotA.id,
          plot_name: "Kwatera A",
          plot_status: "active",
          section_name: null,
          row_number: 1,
          tree_count: 3,
          verified_trees_count: 2,
          unverified_trees_count: 1,
          ranges: [
            {
              from_position: 1,
              to_position: 2,
              tree_count: 2,
              verified_trees_count: 1,
              unverified_trees_count: 1,
            },
            {
              from_position: 4,
              to_position: 4,
              tree_count: 1,
              verified_trees_count: 1,
              unverified_trees_count: 0,
            },
          ],
        },
        {
          plot_id: plotA.id,
          plot_name: "Kwatera A",
          plot_status: "active",
          section_name: "South",
          row_number: 2,
          tree_count: 1,
          verified_trees_count: 1,
          unverified_trees_count: 0,
          ranges: [
            {
              from_position: 1,
              to_position: 1,
              tree_count: 1,
              verified_trees_count: 1,
              unverified_trees_count: 0,
            },
          ],
        },
        {
          plot_id: plotB.id,
          plot_name: "Kwatera B",
          plot_status: "active",
          section_name: null,
          row_number: 3,
          tree_count: 1,
          verified_trees_count: 1,
          unverified_trees_count: 0,
          ranges: [
            {
              from_position: 5,
              to_position: 5,
              tree_count: 1,
              verified_trees_count: 1,
              unverified_trees_count: 0,
            },
          ],
        },
      ],
    });
    expect(workerReport).toEqual(ownerReport);
    expect(outsiderReport).toBeNull();
  });
});

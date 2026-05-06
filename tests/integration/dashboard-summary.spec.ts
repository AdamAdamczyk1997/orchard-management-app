import { afterEach, describe, expect, it } from "vitest";
import { getDashboardSummaryForOrchard } from "@/lib/orchard-data/dashboard";
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
  signInTestUser,
  updatePlotAsUser,
  updateTreeAsUser,
} from "../helpers/test-data";

function isoDateFromToday(offsetDays: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

describe("dashboard summary", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("returns active structure counts plus recent activities and harvests for one orchard only", async () => {
    const owner = await createTestUser("dashboard-owner");
    const worker = await createTestUser("dashboard-worker");
    const outsider = await createTestUser("dashboard-outsider");

    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const outsiderClient = (await signInTestUser(outsider.email, outsider.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("dashboard-main"),
      code: "DB-01",
    });
    const outsiderOrchard = await createOrchardAsUser(outsiderClient, {
      name: createTestOrchardName("dashboard-other"),
      code: "DB-02",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const activePlot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera A",
      code: "A-01",
    });
    const plannedPlot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera B",
      code: "B-01",
    });
    const archivedPlot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera C",
      code: "C-01",
    });

    await updatePlotAsUser(ownerClient, {
      plotId: plannedPlot.id,
      orchardId: orchard.orchard_id,
      patch: { status: "planned" },
    });
    await updatePlotAsUser(ownerClient, {
      plotId: archivedPlot.id,
      orchardId: orchard.orchard_id,
      patch: { status: "archived" },
    });

    const activeTree = await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: activePlot.id,
      species: "apple",
      treeCode: "A-01-01",
      displayName: "Gala 01",
      rowNumber: 1,
      positionInRow: 1,
    });
    const inactiveTree = await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: activePlot.id,
      species: "apple",
      treeCode: "A-01-02",
      displayName: "Gala 02",
      rowNumber: 1,
      positionInRow: 2,
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plannedPlot.id,
      species: "pear",
      treeCode: "B-01-01",
      displayName: "Konferencja 01",
      rowNumber: 2,
      positionInRow: 1,
    });

    await updateTreeAsUser(ownerClient, {
      treeId: inactiveTree.id,
      orchardId: orchard.orchard_id,
      patch: { is_active: false },
    });

    await createTreeAsUser(outsiderClient, {
      orchardId: outsiderOrchard.orchard_id,
      plotId: (
        await createPlotAsUser(outsiderClient, {
          orchardId: outsiderOrchard.orchard_id,
          name: "Obcy sad",
          code: "OUT-01",
        })
      ).id,
      species: "plum",
      treeCode: "OUT-01-01",
      displayName: "Obce drzewo",
      rowNumber: 1,
      positionInRow: 1,
    });

    const activitySpecs = [
      { date: "2026-04-11", title: "Przeglad rzedu 1", status: "done" as const },
      { date: "2026-04-12", title: "Oprysk 1", status: "planned" as const },
      { date: "2026-04-13", title: "Koszenie miedzyrzedzi", status: "cancelled" as const },
      { date: "2026-04-14", title: "Ciecie korekcyjne", status: "done" as const },
      { date: "2026-04-15", title: "Zbior poranny", status: "done" as const },
      { date: "2026-04-15", title: "Zbior popoludniowy", status: "skipped" as const },
    ];

    const createdActivityIds: string[] = [];

    for (const spec of activitySpecs) {
      const result = await createActivityAsUser(ownerClient, {
        parent: {
          orchard_id: orchard.orchard_id,
          plot_id: activePlot.id,
          tree_id: activeTree.id,
          activity_type: "harvest",
          activity_date: spec.date,
          title: spec.title,
          status: spec.status,
          performed_by_profile_id: owner.user.id,
          performed_by: owner.profile.display_name,
          season_phase: "wiosna",
        },
        scopes: [],
        materials: [],
      });

      createdActivityIds.push(result.activity_id);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    await createActivityAsUser(outsiderClient, {
      parent: {
        orchard_id: outsiderOrchard.orchard_id,
        plot_id: (
          await createPlotAsUser(outsiderClient, {
            orchardId: outsiderOrchard.orchard_id,
            name: "Kwatera obca 2",
            code: "OUT-02",
          })
        ).id,
        activity_type: "inspection",
        activity_date: "2026-04-30",
        title: "Obca aktywnosc",
        status: "done",
        performed_by_profile_id: outsider.user.id,
        performed_by: outsider.profile.display_name,
      },
      scopes: [],
      materials: [],
    });

    const harvestSpecs = [
      { date: "2026-09-11", quantityKg: 110 },
      { date: "2026-09-12", quantityKg: 120 },
      { date: "2026-09-13", quantityKg: 130 },
      { date: "2026-09-14", quantityKg: 140 },
      { date: "2026-09-15", quantityKg: 150 },
      { date: "2026-09-15", quantityKg: 160 },
    ];

    const createdHarvestIds: string[] = [];

    for (const spec of harvestSpecs) {
      const result = await createHarvestRecordAsUser(ownerClient, {
        orchard_id: orchard.orchard_id,
        plot_id: activePlot.id,
        scope_level: "plot",
        harvest_date: spec.date,
        quantity_value: spec.quantityKg,
        quantity_unit: "kg",
        created_by_profile_id: owner.user.id,
      });

      createdHarvestIds.push(result.id);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    await createHarvestRecordAsUser(outsiderClient, {
      orchard_id: outsiderOrchard.orchard_id,
      scope_level: "orchard",
      harvest_date: "2026-10-01",
      quantity_value: 999,
      quantity_unit: "kg",
      created_by_profile_id: outsider.user.id,
    });

    const ownerSummary = await getDashboardSummaryForOrchard(
      orchard.orchard_id,
      ownerClient,
    );
    const workerSummary = await getDashboardSummaryForOrchard(
      orchard.orchard_id,
      workerClient,
    );

    expect(ownerSummary.active_plots_count).toBe(1);
    expect(ownerSummary.active_trees_count).toBe(2);
    expect(ownerSummary.recent_activities).toHaveLength(5);
    expect(ownerSummary.recent_harvests).toHaveLength(5);

    expect(ownerSummary.recent_activities.map((activity) => activity.id)).toEqual([
      createdActivityIds[5],
      createdActivityIds[4],
      createdActivityIds[3],
      createdActivityIds[2],
      createdActivityIds[1],
    ]);
    expect(ownerSummary.recent_activities.map((activity) => activity.title)).toEqual([
      "Zbior popoludniowy",
      "Zbior poranny",
      "Ciecie korekcyjne",
      "Koszenie miedzyrzedzi",
      "Oprysk 1",
    ]);
    expect(ownerSummary.recent_activities.map((activity) => activity.plot_name)).toEqual([
      "Kwatera A",
      "Kwatera A",
      "Kwatera A",
      "Kwatera A",
      "Kwatera A",
    ]);

    expect(ownerSummary.recent_harvests.map((harvest) => harvest.id)).toEqual([
      createdHarvestIds[5],
      createdHarvestIds[4],
      createdHarvestIds[3],
      createdHarvestIds[2],
      createdHarvestIds[1],
    ]);
    expect(ownerSummary.recent_harvests.map((harvest) => harvest.quantity_kg)).toEqual([
      160,
      150,
      140,
      130,
      120,
    ]);
    expect(ownerSummary.recent_harvests.every((harvest) => harvest.plot_name === "Kwatera A")).toBe(
      true,
    );

    expect(workerSummary).toEqual(ownerSummary);
  });

  it("returns only planned activities from today forward in ascending order with a dashboard limit", async () => {
    const owner = await createTestUser("dashboard-upcoming-owner");

    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("dashboard-upcoming"),
      code: "DB-UP-01",
    });
    const secondOrchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("dashboard-upcoming-other"),
      code: "DB-UP-02",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera Upcoming",
      code: "UP-01",
    });
    const secondPlot = await createPlotAsUser(ownerClient, {
      orchardId: secondOrchard.orchard_id,
      name: "Kwatera Obca",
      code: "UP-02",
    });

    await createActivityAsUser(ownerClient, {
      parent: {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        activity_type: "inspection",
        activity_date: isoDateFromToday(-2),
        title: "Planowana zalegla",
        status: "planned",
        performed_by_profile_id: owner.user.id,
        performed_by: owner.profile.display_name,
        season_phase: "wiosna",
      },
      scopes: [],
      materials: [],
    });

    await createActivityAsUser(ownerClient, {
      parent: {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        activity_type: "watering",
        activity_date: isoDateFromToday(2),
        title: "Wykonany przyszly wpis",
        status: "done",
        performed_by_profile_id: owner.user.id,
        performed_by: owner.profile.display_name,
        season_phase: "wiosna",
      },
      scopes: [],
      materials: [],
    });

    const upcomingSpecs = [
      { offsetDays: 0, title: "Plan na dzis", activityType: "inspection" as const },
      { offsetDays: 1, title: "Plan na jutro", activityType: "watering" as const },
      { offsetDays: 3, title: "Plan za 3 dni", activityType: "fertilizing" as const },
      { offsetDays: 4, title: "Plan za 4 dni", activityType: "weeding" as const },
      { offsetDays: 5, title: "Plan za 5 dni", activityType: "disease_observation" as const },
      { offsetDays: 6, title: "Plan za 6 dni", activityType: "pest_observation" as const },
    ];

    const createdUpcomingActivityIds: string[] = [];

    for (const spec of upcomingSpecs) {
      const result = await createActivityAsUser(ownerClient, {
        parent: {
          orchard_id: orchard.orchard_id,
          plot_id: plot.id,
          activity_type: spec.activityType,
          activity_date: isoDateFromToday(spec.offsetDays),
          title: spec.title,
          status: "planned",
          performed_by_profile_id: owner.user.id,
          performed_by: owner.profile.display_name,
          season_phase: "wiosna",
        },
        scopes: [],
        materials: [],
      });

      createdUpcomingActivityIds.push(result.activity_id);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    await createActivityAsUser(ownerClient, {
      parent: {
        orchard_id: secondOrchard.orchard_id,
        plot_id: secondPlot.id,
        activity_type: "inspection",
        activity_date: isoDateFromToday(1),
        title: "Obcy plan",
        status: "planned",
        performed_by_profile_id: owner.user.id,
        performed_by: owner.profile.display_name,
        season_phase: "wiosna",
      },
      scopes: [],
      materials: [],
    });

    const summary = await getDashboardSummaryForOrchard(
      orchard.orchard_id,
      ownerClient,
    );

    expect(summary.upcoming_activities).toHaveLength(5);
    expect(summary.upcoming_activities.map((activity) => activity.id)).toEqual([
      createdUpcomingActivityIds[0],
      createdUpcomingActivityIds[1],
      createdUpcomingActivityIds[2],
      createdUpcomingActivityIds[3],
      createdUpcomingActivityIds[4],
    ]);
    expect(summary.upcoming_activities.map((activity) => activity.title)).toEqual([
      "Plan na dzis",
      "Plan na jutro",
      "Plan za 3 dni",
      "Plan za 4 dni",
      "Plan za 5 dni",
    ]);
    expect(summary.upcoming_activities.map((activity) => activity.activity_type)).toEqual([
      "inspection",
      "watering",
      "fertilizing",
      "weeding",
      "disease_observation",
    ]);
    expect(summary.upcoming_activities.every((activity) => activity.plot_name === "Kwatera Upcoming")).toBe(
      true,
    );
  });
});

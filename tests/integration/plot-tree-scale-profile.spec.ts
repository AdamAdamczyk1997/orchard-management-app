import { afterEach, describe, expect, it } from "vitest";
import { getPlotTreeScaleProfileForOrchard } from "@/lib/orchard-data/trees";
import {
  cleanupTestUsers,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  signInTestUser,
} from "../helpers/test-data";

describe("plot tree scale profile", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("profiles more than 1000 plot trees without PostgREST truncation", async () => {
    const owner = await createTestUser("plot-scale-owner");
    createdUserIds.push(owner.user.id);

    const { client } = await signInTestUser(owner.email, owner.password);
    const orchard = await createOrchardAsUser(client, {
      name: createTestOrchardName("plot-scale"),
      code: "PVO-SCALE",
    });
    const plot = await createPlotAsUser(client, {
      orchardId: orchard.orchard_id,
      name: "Scale Rows",
      code: "SCALE-R",
      layoutType: "rows",
      rowNumberingScheme: "north_to_south",
      treeNumberingScheme: "from_row_start",
      defaultRowCount: 21,
      defaultTreesPerRow: 50,
    });
    const rows = Array.from({ length: 1005 }, (_, index) => {
      const treeNumber = index + 1;
      const rowNumber = Math.floor(index / 50) + 1;
      const position = (index % 50) + 1;
      const removed = treeNumber % 101 === 0;

      return {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        species: "apple",
        tree_code: `SCALE-${String(treeNumber).padStart(4, "0")}`,
        display_name: `Scale tree ${treeNumber}`,
        section_name: rowNumber <= 10 ? "A" : "B",
        row_number: rowNumber,
        position_in_row: position,
        condition_status: removed
          ? "removed"
          : treeNumber % 53 === 0
            ? "critical"
            : treeNumber % 17 === 0
              ? "warning"
              : "good",
        location_verified: treeNumber % 7 !== 0,
        is_active: !removed,
      };
    });
    const { error } = await client.from("trees").insert(rows);

    if (error) {
      throw error;
    }

    const profile = await getPlotTreeScaleProfileForOrchard(
      orchard.orchard_id,
      plot.id,
      client,
    );

    expect(profile.total_trees).toBe(1005);
    expect(profile.scale_class).toBe("large");
    expect(profile.should_render_full_visual).toBe(false);
    expect(profile.row_count).toBe(21);
    expect(profile.max_row_length).toBe(50);
    expect(profile.sections).toHaveLength(2);
    expect(profile.rows.at(-1)).toMatchObject({
      section_name: "B",
      row_number: 21,
      occupied_positions: 5,
      from_position: 1,
      to_position: 5,
    });
  });
});

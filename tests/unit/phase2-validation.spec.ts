import { describe, expect, it } from "vitest";
import { plotFormSchema } from "@/lib/validation/plots";
import { formatTreeLocationLabel } from "@/lib/orchard-data/trees";
import { treeFormSchema } from "@/lib/validation/trees";
import { varietyFormSchema } from "@/lib/validation/varieties";

const VALID_PLOT_ID = "11111111-1111-4111-8111-111111111111";
const VALID_VARIETY_ID = "22222222-2222-4222-8222-222222222222";

describe("phase 2 validation", () => {
  it("parses plot form data and trims optional fields", () => {
    const parsed = plotFormSchema.parse({
      name: "  North Block  ",
      code: " NB-01 ",
      description: "  Production plot  ",
      location_name: "  North edge  ",
      area_m2: "1250.50",
      soil_type: "  clay loam ",
      irrigation_type: "  drip ",
      status: "active",
    });

    expect(parsed).toMatchObject({
      name: "North Block",
      code: "NB-01",
      description: "Production plot",
      location_name: "North edge",
      area_m2: 1250.5,
      soil_type: "clay loam",
      irrigation_type: "drip",
      status: "active",
    });
  });

  it("rejects invalid plot area values", () => {
    const parsed = plotFormSchema.safeParse({
      name: "Plot A",
      status: "active",
      area_m2: "0",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.area_m2).toContain(
      "Powierzchnia musi byc wieksza od 0.",
    );
  });

  it("parses variety form values including favorite checkbox", () => {
    const parsed = varietyFormSchema.parse({
      species: " apple ",
      name: " Ligol ",
      description: " flagship orchard variety ",
      is_favorite: "on",
    });

    expect(parsed).toMatchObject({
      species: "apple",
      name: "Ligol",
      description: "flagship orchard variety",
      is_favorite: true,
    });
  });

  it("requires tree location row and position together", () => {
    const parsed = treeFormSchema.safeParse({
      plot_id: VALID_PLOT_ID,
      variety_id: "",
      species: "apple",
      condition_status: "good",
      row_number: "3",
      position_in_row: "",
      location_verified: "on",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.position_in_row).toContain(
      "Numer rzedu i pozycja w rzedzie musza byc podane razem.",
    );
  });

  it("parses full tree form input and location label", () => {
    const parsed = treeFormSchema.parse({
      plot_id: VALID_PLOT_ID,
      variety_id: VALID_VARIETY_ID,
      species: " apple ",
      tree_code: " A-01-07 ",
      display_name: " Border tree ",
      section_name: " North ",
      row_number: "4",
      position_in_row: "7",
      planted_at: "2025-03-14",
      condition_status: "warning",
      location_verified: "true",
    });

    expect(parsed).toMatchObject({
      plot_id: VALID_PLOT_ID,
      variety_id: VALID_VARIETY_ID,
      species: "apple",
      tree_code: "A-01-07",
      display_name: "Border tree",
      section_name: "North",
      row_number: 4,
      position_in_row: 7,
      planted_at: "2025-03-14",
      condition_status: "warning",
      location_verified: true,
    });

    expect(formatTreeLocationLabel(parsed)).toBe("Section North · Row 4, pos 7 · A-01-07");
  });
});

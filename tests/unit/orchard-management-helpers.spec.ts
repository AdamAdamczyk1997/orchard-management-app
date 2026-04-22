import { describe, expect, it } from "vitest";
import { normalizeSpeciesInput } from "@/lib/domain/species";
import { suggestNextPlotCode } from "@/lib/orchard-data/plot-code-suggestion";

describe("orchard management helpers", () => {
  it("suggests the next plot code when existing codes share one prefix pattern", () => {
    expect(suggestNextPlotCode(["DZ-01", "DZ-02", "DZ-09"])).toBe("DZ-10");
  });

  it("does not suggest a plot code when the existing pattern is ambiguous", () => {
    expect(suggestNextPlotCode(["DZ-01", "S-02"])).toBeUndefined();
    expect(suggestNextPlotCode(["North", "DZ-02"])).toBeUndefined();
  });

  it("normalizes known species presets but preserves custom values", () => {
    expect(normalizeSpeciesInput(" Apple ")).toBe("apple");
    expect(normalizeSpeciesInput("Pear")).toBe("pear");
    expect(normalizeSpeciesInput("Antonowka zimowa")).toBe("Antonowka zimowa");
  });
});

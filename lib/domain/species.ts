export const SPECIES_PRESETS = ["apple", "pear", "plum", "cherry"] as const;

export type SpeciesPreset = (typeof SPECIES_PRESETS)[number];

const speciesPresetSet = new Set<string>(SPECIES_PRESETS);

export function normalizeSpeciesInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return value;
  }

  const normalized = trimmed.toLowerCase();

  if (speciesPresetSet.has(normalized)) {
    return normalized;
  }

  return trimmed;
}

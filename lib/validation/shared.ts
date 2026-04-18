import { z } from "zod";

export function trimmedString() {
  return z.string().trim();
}

export function optionalTrimmedString() {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();

      return trimmed === "" ? undefined : trimmed;
    }

    return value;
  }, z.string().optional());
}

export const checkboxBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    return value === "on" || value === "true";
  }

  return Boolean(value);
}, z.boolean().optional());

export function optionalUuidString(message = "Choose a valid value.") {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();

      return trimmed === "" ? undefined : trimmed;
    }

    return value;
  }, z.string().uuid(message).optional());
}

export function optionalNumberInput(message: string) {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();

      if (trimmed === "") {
        return undefined;
      }

      const parsed = Number(trimmed);

      return Number.isNaN(parsed) ? value : parsed;
    }

    return value;
  }, z.number({ message }).optional());
}

export function optionalDateInput(message = "Enter a valid date.") {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();

      return trimmed === "" ? undefined : trimmed;
    }

    return value;
  }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message).optional());
}

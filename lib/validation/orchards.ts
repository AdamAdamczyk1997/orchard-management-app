import { z } from "zod";
import {
  checkboxBoolean,
  optionalTrimmedString,
  trimmedString,
} from "@/lib/validation/shared";

export const orchardFormSchema = z.object({
  name: trimmedString()
    .min(2, "Orchard name must have at least 2 characters.")
    .max(120, "Orchard name must have at most 120 characters."),
  code: optionalTrimmedString().refine(
    (value) => !value || value.length <= 32,
    "Code must have at most 32 characters.",
  ),
  description: optionalTrimmedString().refine(
    (value) => !value || value.length <= 400,
    "Description must have at most 400 characters.",
  ),
});

export const createOrchardSchema = orchardFormSchema.extend({
  dismiss_intro: checkboxBoolean,
});

export const setActiveOrchardSchema = z.object({
  orchard_id: trimmedString().uuid("Choose a valid orchard."),
});

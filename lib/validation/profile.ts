import { z } from "zod";
import { optionalTrimmedString } from "@/lib/validation/shared";

export const updateProfileSchema = z.object({
  display_name: optionalTrimmedString().refine(
    (value) => !value || value.length <= 80,
    "Display name must have at most 80 characters.",
  ),
  locale: optionalTrimmedString().refine(
    (value) => !value || value.length <= 16,
    "Locale must have at most 16 characters.",
  ),
  timezone: optionalTrimmedString().refine(
    (value) => !value || value.length <= 64,
    "Timezone must have at most 64 characters.",
  ),
});

import { z } from "zod";
import { optionalTrimmedString } from "@/lib/validation/shared";

export const updateProfileSchema = z.object({
  display_name: optionalTrimmedString().refine(
    (value) => !value || value.length <= 80,
    "Nazwa wyswietlana moze miec maksymalnie 80 znakow.",
  ),
  locale: optionalTrimmedString().refine(
    (value) => !value || value.length <= 16,
    "Kod jezyka moze miec maksymalnie 16 znakow.",
  ),
  timezone: optionalTrimmedString().refine(
    (value) => !value || value.length <= 64,
    "Strefa czasowa moze miec maksymalnie 64 znaki.",
  ),
});

import { z } from "zod";
import {
  checkboxBoolean,
  optionalTrimmedString,
  trimmedString,
} from "@/lib/validation/shared";

export const orchardFormSchema = z.object({
  name: trimmedString()
    .min(2, "Nazwa sadu musi miec co najmniej 2 znaki.")
    .max(120, "Nazwa sadu moze miec maksymalnie 120 znakow."),
  code: optionalTrimmedString().refine(
    (value) => !value || value.length <= 32,
    "Kod moze miec maksymalnie 32 znaki.",
  ),
  description: optionalTrimmedString().refine(
    (value) => !value || value.length <= 400,
    "Opis moze miec maksymalnie 400 znakow.",
  ),
});

export const createOrchardSchema = orchardFormSchema.extend({
  dismiss_intro: checkboxBoolean,
});

export const updateOrchardSchema = orchardFormSchema;

export const inviteOrchardMemberSchema = z.object({
  email: trimmedString().email("Podaj poprawny adres email."),
  role: z.preprocess((value) => {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }

    return "worker";
  }, z.enum(["worker", "manager", "viewer"])),
});

export const deactivateOrchardMembershipSchema = z.object({
  membership_id: trimmedString().uuid("Wybierz poprawne czlonkostwo orchard."),
});

export const setActiveOrchardSchema = z.object({
  orchard_id: trimmedString().uuid("Wybierz poprawny sad."),
});

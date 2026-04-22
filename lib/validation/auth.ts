import { z } from "zod";
import { optionalTrimmedString, trimmedString } from "@/lib/validation/shared";

export const signUpSchema = z.object({
  email: trimmedString().email("Podaj poprawny adres email."),
  password: trimmedString().min(8, "Haslo musi miec co najmniej 8 znakow."),
  display_name: optionalTrimmedString().refine(
    (value) => !value || value.length <= 80,
    "Nazwa wyswietlana moze miec maksymalnie 80 znakow.",
  ),
});

export const signInSchema = z.object({
  email: trimmedString().email("Podaj poprawny adres email."),
  password: trimmedString().min(1, "Haslo jest wymagane."),
});

export const resetPasswordSchema = z.object({
  email: trimmedString().email("Podaj poprawny adres email."),
});

import { z } from "zod";
import { optionalTrimmedString, trimmedString } from "@/lib/validation/shared";

export const signUpSchema = z.object({
  email: trimmedString().email("Enter a valid email address."),
  password: trimmedString().min(8, "Password must have at least 8 characters."),
  display_name: optionalTrimmedString().refine(
    (value) => !value || value.length <= 80,
    "Display name must have at most 80 characters.",
  ),
});

export const signInSchema = z.object({
  email: trimmedString().email("Enter a valid email address."),
  password: trimmedString().min(1, "Password is required."),
});

export const resetPasswordSchema = z.object({
  email: trimmedString().email("Enter a valid email address."),
});

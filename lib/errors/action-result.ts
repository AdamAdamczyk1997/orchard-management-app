import type { ZodError } from "zod";
import type { ActionResult } from "@/types/contracts";

export const INITIAL_ACTION_STATE: ActionResult<null> = {
  success: false,
};

export function createSuccessResult<T>(
  data?: T,
  message?: string,
): ActionResult<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function createErrorResult<T>(
  error_code: string,
  message: string,
  field_errors?: Record<string, string>,
): ActionResult<T> {
  return {
    success: false,
    error_code,
    message,
    field_errors,
  };
}

export function createValidationErrorResult<T>(
  error: ZodError,
  message = "Sprawdz formularz i popraw zaznaczone pola.",
): ActionResult<T> {
  const field_errors = error.issues.reduce<Record<string, string>>(
    (accumulator, issue) => {
      const key = issue.path[0];

      if (typeof key === "string" && !accumulator[key]) {
        accumulator[key] = issue.message;
      }

      return accumulator;
    },
    {},
  );

  return createErrorResult("VALIDATION_ERROR", message, field_errors);
}

export function formDataToObject(formData: FormData) {
  const result: Record<string, FormDataEntryValue> = {};

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION_")) {
      continue;
    }

    result[key] = value;
  }

  return result;
}

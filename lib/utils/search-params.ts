export type NextSearchParams = Record<string, string | string[] | undefined>;

export function getSingleSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function buildPathWithSearchParams(
  pathname: string,
  searchParams: URLSearchParams,
) {
  const serialized = searchParams.toString();

  return serialized ? `${pathname}?${serialized}` : pathname;
}

export function toUrlSearchParams(
  searchParams: NextSearchParams,
  options?: {
    excludeKeys?: string[];
  },
) {
  const next = new URLSearchParams();
  const excludedKeys = new Set(options?.excludeKeys ?? []);

  for (const [key, value] of Object.entries(searchParams)) {
    if (excludedKeys.has(key) || typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        next.append(key, entry);
      }

      continue;
    }

    next.set(key, value);
  }

  return next;
}

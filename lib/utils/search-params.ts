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

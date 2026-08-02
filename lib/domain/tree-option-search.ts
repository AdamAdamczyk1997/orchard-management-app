import { z } from "zod";

export const TREE_OPTION_SEARCH_MIN_QUERY_LENGTH = 2;
export const TREE_OPTION_SEARCH_DEFAULT_LIMIT = 50;
export const TREE_OPTION_SEARCH_MAX_LIMIT = 100;
export const TREE_OPTION_SEARCH_INCLUDE_ID_LIMIT = 50;
export const TREE_OPTION_SEARCH_QUERY_MAX_LENGTH = 80;

const uuidSchema = z.string().uuid();

export type TreeOptionSearchInput = {
  plot_id?: unknown;
  q?: unknown;
  include_ids?: unknown;
  active_only?: unknown;
  limit?: unknown;
};

export type NormalizedTreeOptionSearchInput = {
  plot_id?: string;
  q: string;
  include_ids: string[];
  active_only: boolean;
  limit: number;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/[%,()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, TREE_OPTION_SEARCH_QUERY_MAX_LENGTH);
}

function normalizeUuid(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = uuidSchema.safeParse(value.trim());

  return parsed.success ? parsed.data : undefined;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function normalizeLimit(value: unknown) {
  const rawLimit =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : TREE_OPTION_SEARCH_DEFAULT_LIMIT;
  const limit = Number.isFinite(rawLimit)
    ? Math.trunc(rawLimit)
    : TREE_OPTION_SEARCH_DEFAULT_LIMIT;

  return Math.min(
    TREE_OPTION_SEARCH_MAX_LIMIT,
    Math.max(1, limit),
  );
}

function normalizeIncludeIds(value: unknown) {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];
  const ids = new Set<string>();

  for (const rawValue of rawValues) {
    if (typeof rawValue !== "string") {
      continue;
    }

    for (const part of rawValue.split(",")) {
      const id = normalizeUuid(part);

      if (id) {
        ids.add(id);
      }

      if (ids.size >= TREE_OPTION_SEARCH_INCLUDE_ID_LIMIT) {
        return [...ids];
      }
    }
  }

  return [...ids];
}

export function normalizeTreeOptionSearchInput(
  input: TreeOptionSearchInput,
): NormalizedTreeOptionSearchInput {
  return {
    plot_id: normalizeUuid(input.plot_id),
    q: normalizeText(input.q),
    include_ids: normalizeIncludeIds(input.include_ids),
    active_only: normalizeBoolean(input.active_only, false),
    limit: normalizeLimit(input.limit),
  };
}

export function parseTreeOptionSearchParams(params: URLSearchParams) {
  return normalizeTreeOptionSearchInput({
    plot_id: params.get("plot_id"),
    q: params.get("q"),
    include_ids: [
      ...params.getAll("include_id"),
      ...params.getAll("include_ids"),
    ],
    active_only: params.get("active_only"),
    limit: params.get("limit"),
  });
}

export function shouldFetchTreeOptionSearch(
  input: NormalizedTreeOptionSearchInput,
) {
  return Boolean(
    input.plot_id ||
      input.include_ids.length > 0 ||
      input.q.length >= TREE_OPTION_SEARCH_MIN_QUERY_LENGTH,
  );
}

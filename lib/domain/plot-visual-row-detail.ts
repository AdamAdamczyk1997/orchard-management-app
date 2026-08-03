import { z } from "zod";
import {
  DEFAULT_PLOT_VISUAL_TREE_FILTERS,
  type PlotVisualTreeFilters,
} from "@/lib/domain/plot-visual-grid";
import type {
  PlotVisualRowDetailFilters,
  PlotVisualRowLifecycleFilter,
  PlotVisualRowLocationVerifiedFilter,
  TreeConditionStatus,
} from "@/types/contracts";

export const PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT = 300;
export const PLOT_VISUAL_ROW_DETAIL_TABLE_PREVIEW_LIMIT = 100;

export const PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS = {
  section_name: "section",
  row_number: "row",
  lifecycle: "lifecycle",
  variety_id: "variety_id",
  condition_status: "condition_status",
  location_verified: "location_verified",
} as const;

const uuidSchema = z.string().uuid();
const conditionStatuses = new Set<TreeConditionStatus>([
  "new",
  "good",
  "warning",
  "critical",
  "removed",
]);
const lifecycleFilters = new Set<PlotVisualRowLifecycleFilter>([
  "all",
  "active",
  "removed",
]);
const locationVerifiedFilters = new Set<PlotVisualRowLocationVerifiedFilter>([
  "all",
  "verified",
  "unverified",
]);

function normalizePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.trim());

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed > 0 ? parsed : null;
}

function normalizeSectionName(value: string | null) {
  const trimmed = value?.trim();

  return trimmed ? trimmed.slice(0, 80) : null;
}

function normalizeLifecycleFilter(
  value: string | null,
): PlotVisualRowLifecycleFilter {
  return value && lifecycleFilters.has(value as PlotVisualRowLifecycleFilter)
    ? (value as PlotVisualRowLifecycleFilter)
    : "all";
}

function normalizeVarietyFilter(value: string | null) {
  if (!value) {
    return "all";
  }

  const trimmed = value.trim();

  if (trimmed === "all" || trimmed === "unassigned") {
    return trimmed;
  }

  const parsed = uuidSchema.safeParse(trimmed);

  return parsed.success ? parsed.data : "all";
}

function normalizeConditionFilter(value: string | null) {
  if (!value || value === "all") {
    return "all";
  }

  return conditionStatuses.has(value as TreeConditionStatus)
    ? (value as TreeConditionStatus)
    : "all";
}

function normalizeLocationVerifiedFilter(
  value: string | null,
): PlotVisualRowLocationVerifiedFilter {
  return value &&
    locationVerifiedFilters.has(value as PlotVisualRowLocationVerifiedFilter)
    ? (value as PlotVisualRowLocationVerifiedFilter)
    : "all";
}

export function parsePlotVisualRowFocusParams(
  params: URLSearchParams,
): PlotVisualRowDetailFilters | null {
  const rowNumber = normalizePositiveInteger(
    params.get(PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.row_number),
  );

  if (!rowNumber) {
    return null;
  }

  return {
    section_name: normalizeSectionName(
      params.get(PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.section_name),
    ),
    row_number: rowNumber,
    lifecycle: normalizeLifecycleFilter(
      params.get(PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.lifecycle),
    ),
    variety_id: normalizeVarietyFilter(
      params.get(PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.variety_id),
    ),
    condition_status: normalizeConditionFilter(
      params.get(PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.condition_status),
    ),
    location_verified: normalizeLocationVerifiedFilter(
      params.get(PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.location_verified),
    ),
  };
}

export function hasActivePlotVisualRowDetailFilters(
  filters: PlotVisualRowDetailFilters,
) {
  return (
    filters.lifecycle !== "all" ||
    filters.variety_id !== "all" ||
    filters.condition_status !== "all" ||
    filters.location_verified !== "all"
  );
}

export function toPlotVisualTreeFilters(
  filters: PlotVisualRowDetailFilters,
): PlotVisualTreeFilters {
  return {
    lifecycle: filters.lifecycle,
    variety_id: filters.variety_id,
    condition_status: filters.condition_status,
    location_verified: filters.location_verified,
  };
}

export function buildPlotVisualRowFocusHref(
  plotId: string,
  filters: PlotVisualRowDetailFilters,
) {
  const params = new URLSearchParams();
  params.set(
    PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.row_number,
    String(filters.row_number),
  );

  if (filters.section_name) {
    params.set(PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.section_name, filters.section_name);
  }

  if (filters.lifecycle !== DEFAULT_PLOT_VISUAL_TREE_FILTERS.lifecycle) {
    params.set(PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.lifecycle, filters.lifecycle);
  }

  if (filters.variety_id !== DEFAULT_PLOT_VISUAL_TREE_FILTERS.variety_id) {
    params.set(PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.variety_id, filters.variety_id);
  }

  if (
    filters.condition_status !==
    DEFAULT_PLOT_VISUAL_TREE_FILTERS.condition_status
  ) {
    params.set(
      PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.condition_status,
      filters.condition_status,
    );
  }

  if (
    filters.location_verified !==
    DEFAULT_PLOT_VISUAL_TREE_FILTERS.location_verified
  ) {
    params.set(
      PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.location_verified,
      filters.location_verified,
    );
  }

  return `/plots/${plotId}?${params.toString()}`;
}

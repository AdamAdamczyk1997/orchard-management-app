import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deriveSeasonPhaseFromDate,
  formatActivityScopeLabel,
} from "@/lib/domain/activities";
import { formatTreeLocationLabel } from "@/lib/orchard-data/trees";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActiveMemberOption,
  ActivityDetails,
  ActivityListFilters,
  ActivityMaterialSummary,
  ActivityScopeSummary,
  ActivitySummary,
  OrchardMembershipRole,
  PlotStatus,
  SeasonalActivityCoverage,
  SeasonalActivityCoverageFilters,
  SeasonalActivitySummary,
  SeasonalActivitySummaryFilters,
  TreeOption,
} from "@/types/contracts";

type ActivityListQueryRow = {
  id: string;
  orchard_id: string;
  plot_id: string;
  tree_id: string | null;
  activity_type: ActivitySummary["activity_type"];
  activity_subtype: ActivitySummary["activity_subtype"];
  activity_date: string;
  season_year: number;
  season_phase: string | null;
  status: ActivitySummary["status"];
  title: string;
  description: string | null;
  performed_by: string | null;
  created_at: string;
  updated_at: string;
  plot:
    | { id: string; name: string; status: PlotStatus }
    | Array<{ id: string; name: string; status: PlotStatus }>
    | null;
  tree:
    | {
        id: string;
        display_name: string | null;
        tree_code: string | null;
        species: string;
      }
    | Array<{
        id: string;
        display_name: string | null;
        tree_code: string | null;
        species: string;
      }>
    | null;
  performer:
    | {
        id: string;
        email: string;
        display_name: string | null;
      }
    | Array<{
        id: string;
        email: string;
        display_name: string | null;
      }>
    | null;
  activity_scopes: Array<{ id: string }> | null;
  activity_materials: Array<{ id: string }> | null;
};

type ActivityDetailsQueryRow = Omit<ActivityListQueryRow, "activity_scopes" | "activity_materials"> & {
  work_duration_minutes: number | null;
  cost_amount: number | null;
  weather_notes: string | null;
  result_notes: string | null;
  performed_by_profile_id: string | null;
  created_by_profile_id: string;
};

type ActivityScopeQueryRow = {
  id: string;
  activity_id: string;
  scope_order: number | null;
  scope_level: ActivityScopeSummary["scope_level"];
  section_name: string | null;
  row_number: number | null;
  from_position: number | null;
  to_position: number | null;
  tree_id: string | null;
  notes: string | null;
  tree:
    | {
        id: string;
        display_name: string | null;
        tree_code: string | null;
        species: string;
      }
    | Array<{
        id: string;
        display_name: string | null;
        tree_code: string | null;
        species: string;
      }>
    | null;
};

type ActivityMaterialQueryRow = {
  id: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
};

type TreeOptionQueryRow = {
  id: string;
  plot_id: string;
  species: string;
  tree_code: string | null;
  display_name: string | null;
  section_name: string | null;
  row_number: number | null;
  position_in_row: number | null;
  is_active: boolean;
  plot:
    | { id: string; name: string }
    | Array<{ id: string; name: string }>
    | null;
};

type MemberOptionRpcRow = {
  profile_id: string;
  email: string;
  display_name: string | null;
  role: OrchardMembershipRole;
};

type SeasonalActivitySummaryQueryRow = {
  id: string;
  plot_id: string;
  activity_date: string;
  plot:
    | { id: string; name: string }
    | Array<{ id: string; name: string }>
    | null;
};

type SeasonalActivityCoverageQueryRow = {
  id: string;
  plot_id: string;
  activity_type: SeasonalActivityCoverage[number]["activity_type"];
  activity_subtype: SeasonalActivityCoverage[number]["activity_subtype"];
  activity_date: string;
  status: SeasonalActivityCoverage[number]["status"];
  plot:
    | { id: string; name: string }
    | Array<{ id: string; name: string }>
    | null;
};

const activityListSelect = `
  id,
  orchard_id,
  plot_id,
  tree_id,
  activity_type,
  activity_subtype,
  activity_date,
  season_year,
  season_phase,
  status,
  title,
  description,
  performed_by,
  created_at,
  updated_at,
  plot:plots (
    id,
    name,
    status
  ),
  tree:trees (
    id,
    display_name,
    tree_code,
    species
  ),
  performer:profiles!activities_performed_by_profile_id_fkey (
    id,
    email,
    display_name
  ),
  activity_scopes (
    id
  ),
  activity_materials (
    id
  )
`;

const activityDetailsSelect = `
  id,
  orchard_id,
  plot_id,
  tree_id,
  activity_type,
  activity_subtype,
  activity_date,
  season_year,
  season_phase,
  status,
  title,
  description,
  work_duration_minutes,
  cost_amount,
  weather_notes,
  result_notes,
  performed_by_profile_id,
  performed_by,
  created_by_profile_id,
  created_at,
  updated_at,
  plot:plots (
    id,
    name,
    status
  ),
  tree:trees (
    id,
    display_name,
    tree_code,
    species
  ),
  performer:profiles!activities_performed_by_profile_id_fkey (
    id,
    email,
    display_name
  )
`;

function pickJoinedRecord<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function resolveSupabaseClient(supabaseClient?: SupabaseClient) {
  return supabaseClient ?? createSupabaseServerClient();
}

function formatTreeDisplayName(tree: {
  display_name?: string | null;
  tree_code?: string | null;
  species?: string | null;
}) {
  return tree.display_name ?? tree.tree_code ?? (tree.species ? `${tree.species} drzewo` : null);
}

function resolvePerformerLabel(row: {
  performed_by?: string | null;
  performer?: ActivityListQueryRow["performer"];
}) {
  if (row.performed_by) {
    return row.performed_by;
  }

  const performer = pickJoinedRecord(row.performer);

  return performer?.display_name ?? performer?.email ?? null;
}

function mapActivityRowToSummary(row: ActivityListQueryRow): ActivitySummary {
  const plot = pickJoinedRecord(row.plot);
  const tree = pickJoinedRecord(row.tree);

  return {
    id: row.id,
    orchard_id: row.orchard_id,
    plot_id: row.plot_id,
    tree_id: row.tree_id,
    activity_type: row.activity_type,
    activity_subtype: row.activity_subtype,
    activity_date: row.activity_date,
    season_year: row.season_year,
    season_phase: row.season_phase ?? deriveSeasonPhaseFromDate(row.activity_date),
    status: row.status,
    title: row.title,
    description: row.description,
    plot_name: plot?.name ?? "Nieznana dzialka",
    tree_display_name: tree ? formatTreeDisplayName(tree) : null,
    scope_count: row.activity_scopes?.length ?? 0,
    material_count: row.activity_materials?.length ?? 0,
    performed_by_display: resolvePerformerLabel(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapActivityScopeRow(row: ActivityScopeQueryRow): ActivityScopeSummary {
  const tree = pickJoinedRecord(row.tree);

  return {
    id: row.id,
    scope_order: row.scope_order,
    scope_level: row.scope_level,
    section_name: row.section_name,
    row_number: row.row_number,
    from_position: row.from_position,
    to_position: row.to_position,
    tree_id: row.tree_id,
    tree_display_name: tree ? formatTreeDisplayName(tree) : null,
    notes: row.notes,
  };
}

function sortActivitySummaries(left: ActivitySummary, right: ActivitySummary) {
  if (left.activity_date !== right.activity_date) {
    return right.activity_date.localeCompare(left.activity_date);
  }

  return (right.created_at ?? "").localeCompare(left.created_at ?? "");
}

function buildScopeActivityFilter(
  treeId: string,
  scopedActivityIds: string[],
) {
  if (scopedActivityIds.length === 0) {
    return `tree_id.eq.${treeId}`;
  }

  return `tree_id.eq.${treeId},id.in.(${scopedActivityIds.join(",")})`;
}

export async function listActivitiesForOrchard(
  orchardId: string,
  filters: ActivityListFilters = {},
) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("activities")
    .select(activityListSelect)
    .eq("orchard_id", orchardId)
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.date_from) {
    query = query.gte("activity_date", filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte("activity_date", filters.date_to);
  }

  if (filters.plot_id) {
    query = query.eq("plot_id", filters.plot_id);
  }

  if (filters.activity_type && filters.activity_type !== "all") {
    query = query.eq("activity_type", filters.activity_type);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.performed_by_profile_id) {
    query = query.eq("performed_by_profile_id", filters.performed_by_profile_id);
  }

  if (filters.tree_id) {
    const { data: scopedActivityRows, error: scopedActivityError } = await supabase
      .from("activity_scopes")
      .select("activity_id")
      .eq("tree_id", filters.tree_id);

    if (scopedActivityError) {
      throw scopedActivityError;
    }

    const scopedActivityIds = [...new Set(
      ((scopedActivityRows ?? []) as Array<{ activity_id: string }>).map(
        (row) => row.activity_id,
      ),
    )];

    query = query.or(buildScopeActivityFilter(filters.tree_id, scopedActivityIds));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as ActivityListQueryRow[])
    .map(mapActivityRowToSummary)
    .sort(sortActivitySummaries);
}

export async function readActivityByIdForOrchard(
  orchardId: string,
  activityId: string,
  supabaseClient?: SupabaseClient,
) {
  const supabase = await resolveSupabaseClient(supabaseClient);
  const [{ data: activityData, error: activityError }, { data: scopesData, error: scopesError }, { data: materialsData, error: materialsError }] = await Promise.all([
    supabase
      .from("activities")
      .select(activityDetailsSelect)
      .eq("orchard_id", orchardId)
      .eq("id", activityId)
      .maybeSingle(),
    supabase
      .from("activity_scopes")
      .select(
        `
          id,
          activity_id,
          scope_order,
          scope_level,
          section_name,
          row_number,
          from_position,
          to_position,
          tree_id,
          notes,
          tree:trees (
            id,
            display_name,
            tree_code,
            species
          )
        `,
      )
      .eq("activity_id", activityId)
      .order("scope_order", { ascending: true }),
    supabase
      .from("activity_materials")
      .select("id, name, category, quantity, unit, notes")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true }),
  ]);

  if (activityError) {
    throw activityError;
  }

  if (scopesError) {
    throw scopesError;
  }

  if (materialsError) {
    throw materialsError;
  }

  if (!activityData) {
    return null;
  }

  const summary = mapActivityRowToSummary({
    ...(activityData as ActivityDetailsQueryRow),
    activity_scopes: (scopesData ?? []).map((row) => ({ id: row.id })),
    activity_materials: (materialsData ?? []).map((row) => ({ id: row.id })),
  });

  return {
    ...summary,
    description: (activityData as ActivityDetailsQueryRow).description,
    work_duration_minutes: (activityData as ActivityDetailsQueryRow).work_duration_minutes,
    cost_amount: (activityData as ActivityDetailsQueryRow).cost_amount,
    weather_notes: (activityData as ActivityDetailsQueryRow).weather_notes,
    result_notes: (activityData as ActivityDetailsQueryRow).result_notes,
    performed_by_profile_id: (activityData as ActivityDetailsQueryRow).performed_by_profile_id,
    created_by_profile_id: (activityData as ActivityDetailsQueryRow).created_by_profile_id,
    scopes: ((scopesData ?? []) as ActivityScopeQueryRow[]).map(mapActivityScopeRow),
    materials: ((materialsData ?? []) as ActivityMaterialQueryRow[]).map(
      (row): ActivityMaterialSummary => ({
        id: row.id,
        name: row.name,
        category: row.category,
        quantity: row.quantity,
        unit: row.unit,
        notes: row.notes,
      }),
    ),
  } satisfies ActivityDetails;
}

function buildSeasonalActivitySummary(
  filters: SeasonalActivitySummaryFilters,
  rows: SeasonalActivitySummaryQueryRow[],
): SeasonalActivitySummary {
  const affectedPlots = new Map<
    string,
    SeasonalActivitySummary["affected_plots"][number]
  >();

  for (const row of rows) {
    const plot = pickJoinedRecord(row.plot);
    const plotName = plot?.name ?? "Nieznana dzialka";
    const existingPlot = affectedPlots.get(row.plot_id);

    if (!existingPlot) {
      affectedPlots.set(row.plot_id, {
        plot_id: row.plot_id,
        plot_name: plotName,
        total_done_count: 1,
        last_activity_date: row.activity_date,
      });
      continue;
    }

    existingPlot.total_done_count += 1;

    if (
      !existingPlot.last_activity_date ||
      existingPlot.last_activity_date < row.activity_date
    ) {
      existingPlot.last_activity_date = row.activity_date;
    }
  }

  return {
    season_year: filters.season_year,
    activity_type: filters.activity_type,
    activity_subtype: filters.activity_subtype ?? null,
    total_done_count: rows.length,
    affected_plots: [...affectedPlots.values()].sort((left, right) => {
      if (left.total_done_count !== right.total_done_count) {
        return right.total_done_count - left.total_done_count;
      }

      if (left.last_activity_date !== right.last_activity_date) {
        return (right.last_activity_date ?? "").localeCompare(
          left.last_activity_date ?? "",
        );
      }

      return left.plot_name.localeCompare(right.plot_name, "pl");
    }),
  };
}

export async function getSeasonalActivitySummaryForOrchard(
  orchardId: string,
  filters: SeasonalActivitySummaryFilters,
  supabaseClient?: SupabaseClient,
) {
  const supabase = await resolveSupabaseClient(supabaseClient);
  let query = supabase
    .from("activities")
    .select(
      `
        id,
        plot_id,
        activity_date,
        plot:plots (
          id,
          name
        )
      `,
    )
    .eq("orchard_id", orchardId)
    .eq("status", "done")
    .eq("season_year", filters.season_year)
    .eq("activity_type", filters.activity_type);

  if (filters.activity_subtype) {
    query = query.eq("activity_subtype", filters.activity_subtype);
  }

  if (filters.plot_id) {
    query = query.eq("plot_id", filters.plot_id);
  }

  if (filters.performed_by_profile_id) {
    query = query.eq("performed_by_profile_id", filters.performed_by_profile_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return buildSeasonalActivitySummary(
    filters,
    (data ?? []) as SeasonalActivitySummaryQueryRow[],
  );
}

export async function getSeasonalActivityCoverageForOrchard(
  orchardId: string,
  filters: SeasonalActivityCoverageFilters,
  supabaseClient?: SupabaseClient,
) {
  const supabase = await resolveSupabaseClient(supabaseClient);
  let activitiesQuery = supabase
    .from("activities")
    .select(
      `
        id,
        plot_id,
        activity_type,
        activity_subtype,
        activity_date,
        status,
        plot:plots (
          id,
          name
        )
      `,
    )
    .eq("orchard_id", orchardId)
    .eq("status", "done")
    .eq("season_year", filters.season_year)
    .eq("activity_type", filters.activity_type)
    .eq("plot_id", filters.plot_id)
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.activity_subtype) {
    activitiesQuery = activitiesQuery.eq("activity_subtype", filters.activity_subtype);
  }

  if (filters.performed_by_profile_id) {
    activitiesQuery = activitiesQuery.eq(
      "performed_by_profile_id",
      filters.performed_by_profile_id,
    );
  }

  const { data: activityData, error: activityError } = await activitiesQuery;

  if (activityError) {
    throw activityError;
  }

  const activityRows = (activityData ?? []) as SeasonalActivityCoverageQueryRow[];

  if (activityRows.length === 0) {
    return [] satisfies SeasonalActivityCoverage;
  }

  const activityIds = activityRows.map((row) => row.id);
  const activityOrderById = new Map(
    activityIds.map((activityId, index) => [activityId, index]),
  );
  const activitiesById = new Map(activityRows.map((row) => [row.id, row]));
  const { data: scopesData, error: scopesError } = await supabase
    .from("activity_scopes")
    .select(
      `
        id,
        activity_id,
        scope_order,
        scope_level,
        section_name,
        row_number,
        from_position,
        to_position,
        tree_id,
        notes,
        tree:trees (
          id,
          display_name,
          tree_code,
          species
        )
      `,
    )
    .in("activity_id", activityIds)
    .order("scope_order", { ascending: true });

  if (scopesError) {
    throw scopesError;
  }

  const coverageItems: SeasonalActivityCoverage = [];

  for (const scopeRow of (scopesData ?? []) as ActivityScopeQueryRow[]) {
    const activity = activitiesById.get(scopeRow.activity_id);

    if (!activity) {
      continue;
    }

    const plot = pickJoinedRecord(activity.plot);

    coverageItems.push({
      activity_id: scopeRow.activity_id,
      activity_date: activity.activity_date,
      status: activity.status,
      plot_id: activity.plot_id,
      plot_name: plot?.name ?? "Nieznana dzialka",
      activity_type: activity.activity_type,
      activity_subtype: activity.activity_subtype ?? null,
      scope: mapActivityScopeRow(scopeRow),
    });
  }

  return coverageItems.sort((left, right) => {
      const activityOrderDiff =
        (activityOrderById.get(left.activity_id) ?? Number.MAX_SAFE_INTEGER) -
        (activityOrderById.get(right.activity_id) ?? Number.MAX_SAFE_INTEGER);

      if (activityOrderDiff !== 0) {
        return activityOrderDiff;
      }

      const leftScopeOrder = left.scope.scope_order ?? Number.MAX_SAFE_INTEGER;
      const rightScopeOrder = right.scope.scope_order ?? Number.MAX_SAFE_INTEGER;

      if (leftScopeOrder !== rightScopeOrder) {
        return leftScopeOrder - rightScopeOrder;
      }

      return formatActivityScopeLabel(left.scope).localeCompare(
        formatActivityScopeLabel(right.scope),
        "pl",
      );
    });
}

export async function listActiveMemberOptionsForOrchard(orchardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_active_orchard_member_options", {
    p_orchard_id: orchardId,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MemberOptionRpcRow[]).map(
    (member): ActiveMemberOption => ({
      profile_id: member.profile_id,
      email: member.email,
      display_name: member.display_name,
      role: member.role,
      label: member.display_name ?? member.email,
    }),
  );
}

export async function listTreeOptionsForOrchard(orchardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trees")
    .select(
      `
        id,
        plot_id,
        species,
        tree_code,
        display_name,
        section_name,
        row_number,
        position_in_row,
        is_active,
        plot:plots (
          id,
          name
        )
      `,
    )
    .eq("orchard_id", orchardId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as TreeOptionQueryRow[])
    .map((tree): TreeOption => {
      const plot = pickJoinedRecord(tree.plot);

      return {
        id: tree.id,
        plot_id: tree.plot_id,
        plot_name: plot?.name ?? "Nieznana dzialka",
        label: [
          formatTreeDisplayName(tree),
          formatTreeLocationLabel(tree),
        ]
          .filter(Boolean)
          .join(" · "),
        is_active: tree.is_active,
      };
    })
    .sort((left, right) => {
      const plotDiff = left.plot_name.localeCompare(right.plot_name, "pl");

      if (plotDiff !== 0) {
        return plotDiff;
      }

      return left.label.localeCompare(right.label, "pl");
    });
}

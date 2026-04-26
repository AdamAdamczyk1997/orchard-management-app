import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActivityStatus, DashboardSummary } from "@/types/contracts";

type JoinedPlotRow =
  | {
      id: string;
      name: string;
    }
  | Array<{
      id: string;
      name: string;
    }>
  | null;

type RecentActivityQueryRow = {
  id: string;
  title: string;
  activity_date: string;
  status: ActivityStatus;
  created_at: string;
  plot: JoinedPlotRow;
};

type RecentHarvestQueryRow = {
  id: string;
  harvest_date: string;
  quantity_kg: number;
  created_at: string;
  plot: JoinedPlotRow;
};

function pickJoinedRecord<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function resolveSupabaseClient(supabaseClient?: SupabaseClient) {
  return supabaseClient ?? createSupabaseServerClient();
}

function mapRecentActivity(
  row: RecentActivityQueryRow,
): DashboardSummary["recent_activities"][number] {
  const plot = pickJoinedRecord(row.plot);

  return {
    id: row.id,
    title: row.title,
    activity_date: row.activity_date,
    status: row.status,
    plot_name: plot?.name ?? "Nieznana dzialka",
  };
}

function mapRecentHarvest(
  row: RecentHarvestQueryRow,
): DashboardSummary["recent_harvests"][number] {
  const plot = pickJoinedRecord(row.plot);

  return {
    id: row.id,
    harvest_date: row.harvest_date,
    quantity_kg: row.quantity_kg,
    plot_name: plot?.name ?? "Bez przypisanej dzialki",
  };
}

export async function getDashboardSummaryForOrchard(
  orchardId: string,
  supabaseClient?: SupabaseClient,
) {
  const supabase = await resolveSupabaseClient(supabaseClient);
  const [
    { count: activePlotsCount, error: activePlotsError },
    { count: activeTreesCount, error: activeTreesError },
    { data: recentActivitiesData, error: recentActivitiesError },
    { data: recentHarvestsData, error: recentHarvestsError },
  ] = await Promise.all([
    supabase
      .from("plots")
      .select("id", { count: "exact", head: true })
      .eq("orchard_id", orchardId)
      .eq("status", "active"),
    supabase
      .from("trees")
      .select("id", { count: "exact", head: true })
      .eq("orchard_id", orchardId)
      .eq("is_active", true),
    supabase
      .from("activities")
      .select(
        `
          id,
          title,
          activity_date,
          status,
          created_at,
          plot:plots (
            id,
            name
          )
        `,
      )
      .eq("orchard_id", orchardId)
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("harvest_records")
      .select(
        `
          id,
          harvest_date,
          quantity_kg,
          created_at,
          plot:plots (
            id,
            name
          )
        `,
      )
      .eq("orchard_id", orchardId)
      .order("harvest_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (activePlotsError) {
    throw activePlotsError;
  }

  if (activeTreesError) {
    throw activeTreesError;
  }

  if (recentActivitiesError) {
    throw recentActivitiesError;
  }

  if (recentHarvestsError) {
    throw recentHarvestsError;
  }

  return {
    active_plots_count: activePlotsCount ?? 0,
    active_trees_count: activeTreesCount ?? 0,
    recent_activities: ((recentActivitiesData ?? []) as RecentActivityQueryRow[]).map(
      mapRecentActivity,
    ),
    recent_harvests: ((recentHarvestsData ?? []) as RecentHarvestQueryRow[]).map(
      mapRecentHarvest,
    ),
  } satisfies DashboardSummary;
}

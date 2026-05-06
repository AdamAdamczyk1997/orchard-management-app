import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateHarvestLocationSummary,
  aggregateHarvestSeasonSummary,
  aggregateHarvestTimeline,
  type HarvestLocationSourceRecord,
} from "@/lib/domain/harvests";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  HarvestActivityOption,
  HarvestLocationSummaryFilters,
  HarvestRecordDetails,
  HarvestRecordListFilters,
  HarvestRecordSummary,
  HarvestSeasonSummaryFilters,
  HarvestTimelineFilters,
  PlotStatus,
  VarietySummary,
} from "@/types/contracts";

type HarvestQueryRow = {
  id: string;
  orchard_id: string;
  plot_id: string | null;
  variety_id: string | null;
  tree_id: string | null;
  activity_id: string | null;
  scope_level: HarvestRecordSummary["scope_level"];
  harvest_date: string;
  season_year: number;
  section_name: string | null;
  row_number: number | null;
  from_position: number | null;
  to_position: number | null;
  quantity_value: number;
  quantity_unit: HarvestRecordSummary["quantity_unit"];
  quantity_kg: number;
  notes: string | null;
  created_by_profile_id: string;
  created_at: string;
  updated_at: string;
  plot:
    | { id: string; name: string; status: PlotStatus }
    | Array<{ id: string; name: string; status: PlotStatus }>
    | null;
  variety:
    | { id: string; name: string; species: VarietySummary["species"] }
    | Array<{ id: string; name: string; species: VarietySummary["species"] }>
    | null;
  tree:
    | {
        id: string;
        display_name: string | null;
        tree_code: string | null;
        species: string;
        plot_id: string;
        section_name: string | null;
        row_number: number | null;
        position_in_row: number | null;
        plot:
          | { id: string; name: string; status: PlotStatus }
          | Array<{ id: string; name: string; status: PlotStatus }>
          | null;
      }
    | Array<{
        id: string;
        display_name: string | null;
        tree_code: string | null;
        species: string;
        plot_id: string;
        section_name: string | null;
        row_number: number | null;
        position_in_row: number | null;
        plot:
          | { id: string; name: string; status: PlotStatus }
          | Array<{ id: string; name: string; status: PlotStatus }>
          | null;
      }>
    | null;
  activity:
    | {
        id: string;
        title: string;
        activity_date: string;
        activity_type: string;
      }
    | Array<{
        id: string;
        title: string;
        activity_date: string;
        activity_type: string;
      }>
    | null;
  creator:
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
};

type HarvestActivityOptionQueryRow = {
  id: string;
  plot_id: string;
  tree_id: string | null;
  title: string;
  activity_date: string;
  status: string;
  plot:
    | { id: string; name: string }
    | Array<{ id: string; name: string }>
    | null;
};

const harvestSelect = `
  id,
  orchard_id,
  plot_id,
  variety_id,
  tree_id,
  activity_id,
  scope_level,
  harvest_date,
  season_year,
  section_name,
  row_number,
  from_position,
  to_position,
  quantity_value,
  quantity_unit,
  quantity_kg,
  notes,
  created_by_profile_id,
  created_at,
  updated_at,
  plot:plots (
    id,
    name,
    status
  ),
  variety:varieties (
    id,
    name,
    species
  ),
  tree:trees (
    id,
    display_name,
    tree_code,
    species,
    plot_id,
    section_name,
    row_number,
    position_in_row,
    plot:plots (
      id,
      name,
      status
    )
  ),
  activity:activities (
    id,
    title,
    activity_date,
    activity_type
  ),
  creator:profiles!harvest_records_created_by_profile_id_fkey (
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

function resolveCreatorLabel(row: { creator: HarvestQueryRow["creator"] }) {
  const creator = pickJoinedRecord(row.creator);

  return creator?.display_name ?? creator?.email ?? null;
}

function mapHarvestRowToSummary(row: HarvestQueryRow): HarvestRecordSummary {
  const plot = pickJoinedRecord(row.plot);
  const variety = pickJoinedRecord(row.variety);
  const tree = pickJoinedRecord(row.tree);
  const activity = pickJoinedRecord(row.activity);

  return {
    id: row.id,
    orchard_id: row.orchard_id,
    plot_id: row.plot_id,
    variety_id: row.variety_id,
    tree_id: row.tree_id,
    activity_id: row.activity_id,
    scope_level: row.scope_level,
    harvest_date: row.harvest_date,
    season_year: row.season_year,
    section_name: row.section_name,
    row_number: row.row_number,
    from_position: row.from_position,
    to_position: row.to_position,
    quantity_value: row.quantity_value,
    quantity_unit: row.quantity_unit,
    quantity_kg: row.quantity_kg,
    notes: row.notes,
    plot_name: plot?.name ?? null,
    variety_name: variety?.name ?? null,
    variety_species: variety?.species ?? null,
    tree_display_name: tree ? formatTreeDisplayName(tree) : null,
    activity_title: activity?.title ?? null,
    created_by_display: resolveCreatorLabel(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function sortHarvestSummaries(left: HarvestRecordSummary, right: HarvestRecordSummary) {
  if (left.harvest_date !== right.harvest_date) {
    return right.harvest_date.localeCompare(left.harvest_date);
  }

  return (right.created_at ?? "").localeCompare(left.created_at ?? "");
}

const listHarvestSummarySourceRecordsCached = cache(
  async (
    orchardId: string,
    seasonYear: number,
    plotId?: string,
    varietyId?: string,
  ) =>
    listHarvestRecordsForOrchard(orchardId, {
      season_year: seasonYear,
      plot_id: plotId,
      variety_id: varietyId,
    }),
);

const listHarvestLocationSourceRecordsCached = cache(
  async (
    orchardId: string,
    seasonYear: number,
    plotId?: string,
    varietyId?: string,
  ) =>
    listHarvestLocationSourceRecordsForOrchard(orchardId, {
      season_year: seasonYear,
      plot_id: plotId,
      variety_id: varietyId,
    }),
);

async function listHarvestSummarySourceRecords(
  orchardId: string,
  filters: HarvestSeasonSummaryFilters,
  supabaseClient?: SupabaseClient,
) {
  if (supabaseClient) {
    return listHarvestRecordsForOrchard(
      orchardId,
      {
        season_year: filters.season_year,
        plot_id: filters.plot_id,
        variety_id: filters.variety_id,
      },
      supabaseClient,
    );
  }

  return listHarvestSummarySourceRecordsCached(
    orchardId,
    filters.season_year,
    filters.plot_id,
    filters.variety_id,
  );
}

async function listHarvestLocationSourceRecordsForOrchard(
  orchardId: string,
  filters: Pick<HarvestLocationSummaryFilters, "season_year" | "plot_id" | "variety_id">,
  supabaseClient?: SupabaseClient,
) {
  const supabase = await resolveSupabaseClient(supabaseClient);
  let treeIdsInPlot: string[] = [];

  if (filters.plot_id) {
    const { data: treeRows, error: treeError } = await supabase
      .from("trees")
      .select("id")
      .eq("orchard_id", orchardId)
      .eq("plot_id", filters.plot_id);

    if (treeError) {
      throw treeError;
    }

    treeIdsInPlot = ((treeRows ?? []) as Array<{ id: string }>).map((row) => row.id);
  }

  let query = supabase
    .from("harvest_records")
    .select(harvestSelect)
    .eq("orchard_id", orchardId)
    .eq("season_year", filters.season_year);

  if (filters.plot_id) {
    if (treeIdsInPlot.length > 0) {
      query = query.or(
        `plot_id.eq.${filters.plot_id},tree_id.in.(${treeIdsInPlot.join(",")})`,
      );
    } else {
      query = query.eq("plot_id", filters.plot_id);
    }
  }

  if (filters.variety_id) {
    query = query.eq("variety_id", filters.variety_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as HarvestQueryRow[]).map(mapHarvestRowToLocationSourceRecord);
}

export async function listHarvestRecordsForOrchard(
  orchardId: string,
  filters: HarvestRecordListFilters,
  supabaseClient?: SupabaseClient,
) {
  const supabase = await resolveSupabaseClient(supabaseClient);
  let query = supabase
    .from("harvest_records")
    .select(harvestSelect)
    .eq("orchard_id", orchardId)
    .eq("season_year", filters.season_year)
    .order("harvest_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.date_from) {
    query = query.gte("harvest_date", filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte("harvest_date", filters.date_to);
  }

  if (filters.plot_id) {
    query = query.eq("plot_id", filters.plot_id);
  }

  if (filters.variety_id) {
    query = query.eq("variety_id", filters.variety_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as HarvestQueryRow[])
    .map(mapHarvestRowToSummary)
    .sort(sortHarvestSummaries);
}

export async function readHarvestRecordByIdForOrchard(
  orchardId: string,
  harvestRecordId: string,
  supabaseClient?: SupabaseClient,
) {
  const supabase = await resolveSupabaseClient(supabaseClient);
  const { data, error } = await supabase
    .from("harvest_records")
    .select(harvestSelect)
    .eq("orchard_id", orchardId)
    .eq("id", harvestRecordId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...mapHarvestRowToSummary(data as HarvestQueryRow),
    created_by_profile_id: (data as HarvestQueryRow).created_by_profile_id,
  } satisfies HarvestRecordDetails;
}

function mapHarvestRowToLocationSourceRecord(row: HarvestQueryRow): HarvestLocationSourceRecord {
  const plot = pickJoinedRecord(row.plot);
  const tree = pickJoinedRecord(row.tree);
  const treePlot = tree ? pickJoinedRecord(tree.plot) : null;
  const resolvedPlotId = row.plot_id ?? tree?.plot_id ?? treePlot?.id ?? null;
  const resolvedPlotName = plot?.name ?? treePlot?.name ?? null;
  const resolvedPlotStatus = plot?.status ?? treePlot?.status ?? null;

  if (
    row.scope_level === "location_range" &&
    typeof row.row_number === "number" &&
    typeof row.from_position === "number" &&
    typeof row.to_position === "number"
  ) {
    return {
      id: row.id,
      scope_level: row.scope_level,
      harvest_date: row.harvest_date,
      quantity_kg: row.quantity_kg,
      plot_id: resolvedPlotId,
      plot_name: resolvedPlotName,
      plot_status: resolvedPlotStatus,
      section_name: row.section_name,
      row_number: row.row_number,
      from_position: row.from_position,
      to_position: row.to_position,
    };
  }

  if (
    row.scope_level === "tree" &&
    typeof tree?.row_number === "number" &&
    typeof tree.position_in_row === "number"
  ) {
    return {
      id: row.id,
      scope_level: row.scope_level,
      harvest_date: row.harvest_date,
      quantity_kg: row.quantity_kg,
      plot_id: resolvedPlotId,
      plot_name: resolvedPlotName,
      plot_status: resolvedPlotStatus,
      section_name: row.section_name ?? tree.section_name,
      row_number: tree.row_number,
      from_position: tree.position_in_row,
      to_position: tree.position_in_row,
    };
  }

  return {
    id: row.id,
    scope_level: row.scope_level,
    harvest_date: row.harvest_date,
    quantity_kg: row.quantity_kg,
    plot_id: resolvedPlotId,
    plot_name: resolvedPlotName,
    plot_status: resolvedPlotStatus,
    section_name: row.section_name,
    row_number: null,
    from_position: null,
    to_position: null,
  };
}

export async function getHarvestSeasonSummaryForOrchard(
  orchardId: string,
  filters: HarvestSeasonSummaryFilters,
  supabaseClient?: SupabaseClient,
) {
  const records = await listHarvestSummarySourceRecords(
    orchardId,
    filters,
    supabaseClient,
  );

  return aggregateHarvestSeasonSummary(records, filters.season_year);
}

export async function getHarvestTimelineForOrchard(
  orchardId: string,
  filters: HarvestTimelineFilters,
  supabaseClient?: SupabaseClient,
) {
  const records = await listHarvestSummarySourceRecords(
    orchardId,
    filters,
    supabaseClient,
  );

  return aggregateHarvestTimeline(records);
}

export async function getHarvestLocationSummaryForOrchard(
  orchardId: string,
  filters: HarvestLocationSummaryFilters,
  supabaseClient?: SupabaseClient,
) {
  const sourceRecords = supabaseClient
    ? await listHarvestLocationSourceRecordsForOrchard(
        orchardId,
        {
          season_year: filters.season_year,
          plot_id: filters.plot_id,
          variety_id: filters.variety_id,
        },
        supabaseClient,
      )
    : await listHarvestLocationSourceRecordsCached(
        orchardId,
        filters.season_year,
        filters.plot_id,
        filters.variety_id,
      );

  return aggregateHarvestLocationSummary(sourceRecords, filters.season_year);
}

export async function listHarvestActivityOptionsForOrchard(orchardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("activities")
    .select(
      `
        id,
        plot_id,
        tree_id,
        title,
        activity_date,
        status,
        plot:plots (
          id,
          name
        )
      `,
    )
    .eq("orchard_id", orchardId)
    .eq("activity_type", "harvest")
    .order("activity_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as HarvestActivityOptionQueryRow[]).map((activity) => {
    const plot = pickJoinedRecord(activity.plot);

    return {
      id: activity.id,
      plot_id: activity.plot_id,
      tree_id: activity.tree_id,
      label: [activity.activity_date, activity.title, plot?.name, activity.status]
        .filter(Boolean)
        .join(" · "),
    } satisfies HarvestActivityOption;
  });
}

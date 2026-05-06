import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Input } from "@/components/ui/input";
import { ListPageLoading } from "@/components/ui/list-page-loading";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import {
  FEEDBACK_NOTICE_QUERY_PARAM,
  resolveFeedbackNotice,
} from "@/lib/domain/feedback-notices";
import { ActivityList } from "@/features/activities/activity-list";
import { ActivitySeasonSummary } from "@/features/activities/activity-season-summary";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  getActivityStatusLabel,
  getActivityTypeLabel,
} from "@/lib/domain/activities";
import { hasActiveActivityListFilters } from "@/lib/domain/list-filters";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import {
  getSeasonalActivityCoverageForOrchard,
  getSeasonalActivitySummaryForOrchard,
  listActivitiesForOrchard,
  listActiveMemberOptionsForOrchard,
  listTreeOptionsForOrchard,
} from "@/lib/orchard-data/activities";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
  toUrlSearchParams,
} from "@/lib/utils/search-params";
import {
  activityListFiltersSchema,
  resolveActivitySummaryFilters,
} from "@/lib/validation/activities";
import type { ActivityListFilters } from "@/types/contracts";

type ActivitiesPageProps = {
  searchParams: Promise<NextSearchParams>;
};

function HiddenInputs({
  entries,
}: {
  entries: Array<{ name: string; value: string }>;
}) {
  return entries.map((entry) => (
    <input
      key={`${entry.name}:${entry.value}`}
      name={entry.name}
      type="hidden"
      value={entry.value}
    />
  ));
}

export default async function ActivitiesPage({
  searchParams,
}: ActivitiesPageProps) {
  const context = await requireActiveOrchard("/activities");

  return (
    <Suspense fallback={<ListPageLoading filterFieldCount={7} />}>
      <ActivitiesPageContent
        orchardId={context.orchard.id}
        orchardName={context.orchard.name}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function ActivitiesPageContent({
  orchardId,
  orchardName,
  searchParams,
}: {
  orchardId: string;
  orchardName: string;
  searchParams: Promise<NextSearchParams>;
}) {
  const [plotOptions, treeOptions, memberOptions, resolvedSearchParams] =
    await Promise.all([
      listPlotOptionsForOrchard(orchardId),
      listTreeOptionsForOrchard(orchardId),
      listActiveMemberOptionsForOrchard(orchardId),
      searchParams,
    ]);
  const feedbackNotice = resolveFeedbackNotice(
    getSingleSearchParam(resolvedSearchParams[FEEDBACK_NOTICE_QUERY_PARAM]),
  );

  const parsedFilters = activityListFiltersSchema.safeParse({
    date_from: getSingleSearchParam(resolvedSearchParams.date_from),
    date_to: getSingleSearchParam(resolvedSearchParams.date_to),
    plot_id: getSingleSearchParam(resolvedSearchParams.plot_id),
    tree_id: getSingleSearchParam(resolvedSearchParams.tree_id),
    activity_type:
      getSingleSearchParam(resolvedSearchParams.activity_type) ?? "all",
    status: getSingleSearchParam(resolvedSearchParams.status) ?? "all",
    performed_by_profile_id: getSingleSearchParam(
      resolvedSearchParams.performed_by_profile_id,
    ),
  });

  const filters: ActivityListFilters = parsedFilters.success
    ? parsedFilters.data
    : {
        activity_type: "all",
        status: "all",
      };
  const currentYear = new Date().getFullYear();
  const summaryFilters = resolveActivitySummaryFilters(
    {
      summary_season_year: getSingleSearchParam(
        resolvedSearchParams.summary_season_year,
      ),
      summary_plot_id: getSingleSearchParam(
        resolvedSearchParams.summary_plot_id,
      ),
      summary_activity_type: getSingleSearchParam(
        resolvedSearchParams.summary_activity_type,
      ),
      summary_activity_subtype: getSingleSearchParam(
        resolvedSearchParams.summary_activity_subtype,
      ),
      summary_performed_by_profile_id: getSingleSearchParam(
        resolvedSearchParams.summary_performed_by_profile_id,
      ),
    },
    currentYear,
  );

  const [activities, seasonalSummary, seasonalCoverage] = await Promise.all([
    listActivitiesForOrchard(orchardId, filters),
    getSeasonalActivitySummaryForOrchard(orchardId, summaryFilters),
    summaryFilters.plot_id
      ? getSeasonalActivityCoverageForOrchard(orchardId, {
          ...summaryFilters,
          plot_id: summaryFilters.plot_id,
        })
      : Promise.resolve([]),
  ]);
  const hasActiveFilters = hasActiveActivityListFilters(filters);
  const dismissHref = buildPathWithSearchParams(
    "/activities",
    toUrlSearchParams(resolvedSearchParams, {
      excludeKeys: [FEEDBACK_NOTICE_QUERY_PARAM],
    }),
  );
  const listSearchParams = new URLSearchParams();

  if (filters.date_from) {
    listSearchParams.set("date_from", filters.date_from);
  }

  if (filters.date_to) {
    listSearchParams.set("date_to", filters.date_to);
  }

  if (filters.plot_id) {
    listSearchParams.set("plot_id", filters.plot_id);
  }

  if (filters.tree_id) {
    listSearchParams.set("tree_id", filters.tree_id);
  }

  if (filters.activity_type) {
    listSearchParams.set("activity_type", filters.activity_type);
  }

  if (filters.status) {
    listSearchParams.set("status", filters.status);
  }

  if (filters.performed_by_profile_id) {
    listSearchParams.set(
      "performed_by_profile_id",
      filters.performed_by_profile_id,
    );
  }

  const summarySearchParams = new URLSearchParams();

  if (summaryFilters.season_year !== currentYear) {
    summarySearchParams.set(
      "summary_season_year",
      String(summaryFilters.season_year),
    );
  }

  if (summaryFilters.plot_id) {
    summarySearchParams.set("summary_plot_id", summaryFilters.plot_id);
  }

  if (summaryFilters.activity_type !== "pruning") {
    summarySearchParams.set(
      "summary_activity_type",
      summaryFilters.activity_type,
    );
  }

  if (summaryFilters.activity_subtype) {
    summarySearchParams.set(
      "summary_activity_subtype",
      summaryFilters.activity_subtype,
    );
  }

  if (summaryFilters.performed_by_profile_id) {
    summarySearchParams.set(
      "summary_performed_by_profile_id",
      summaryFilters.performed_by_profile_id,
    );
  }

  const combinedSearchParams = new URLSearchParams(listSearchParams);

  for (const [name, value] of summarySearchParams.entries()) {
    combinedSearchParams.set(name, value);
  }

  const redirectTo = buildPathWithSearchParams(
    "/activities",
    combinedSearchParams,
  );
  const clearListHref = buildPathWithSearchParams(
    "/activities",
    summarySearchParams,
  );
  const clearSummaryHref = buildPathWithSearchParams(
    "/activities",
    listSearchParams,
  );
  const preservedSummaryEntries = [...summarySearchParams.entries()].map(
    ([name, value]) => ({
      name,
      value,
    }),
  );
  const preservedListEntries = [...listSearchParams.entries()].map(
    ([name, value]) => ({
      name,
      value,
    }),
  );

  return (
    <div className="grid gap-6">
      {feedbackNotice ? (
        <FeedbackBanner dismissHref={dismissHref} notice={feedbackNotice} />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Dziennik prac
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Aktywnosci w sadzie {orchardName}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Zapisuj prace sezonowe, zakres wykonania i uzyte materialy w jednym
            dzienniku operacyjnym.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <LinkButton className="w-full sm:w-auto" href="/activities/new">
            Nowa aktywnosc
          </LinkButton>
        </div>
      </div>

      <ActivitySeasonSummary
        coverage={seasonalCoverage}
        filters={summaryFilters}
        memberOptions={memberOptions}
        plotOptions={plotOptions}
        preservedListParams={preservedListEntries}
        resetHref={clearSummaryHref}
        summary={seasonalSummary}
      />

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Filtry</CardTitle>
          <CardDescription>
            Sortowanie jest domyslnie malejaco po dacie aktywnosci. Bez filtrow
            zobaczysz wszystkie statusy wpisow.
          </CardDescription>
        </div>
        <form className="grid gap-4 lg:grid-cols-3" method="get">
          <HiddenInputs entries={preservedSummaryEntries} />
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Od daty</span>
            <Input
              defaultValue={filters.date_from ?? ""}
              name="date_from"
              type="date"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Do daty</span>
            <Input
              defaultValue={filters.date_to ?? ""}
              name="date_to"
              type="date"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Dzialka</span>
            <Select defaultValue={filters.plot_id ?? ""} name="plot_id">
              <option value="">Wszystkie dzialki</option>
              {plotOptions.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                  {plot.status === "archived" ? " (zarchiwizowana)" : ""}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Drzewo</span>
            <Select defaultValue={filters.tree_id ?? ""} name="tree_id">
              <option value="">Wszystkie drzewa</option>
              {treeOptions.map((tree) => (
                <option key={tree.id} value={tree.id}>
                  {tree.plot_name} - {tree.label}
                  {tree.is_active ? "" : " (nieaktywne)"}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">
              Typ aktywnosci
            </span>
            <Select
              defaultValue={filters.activity_type ?? "all"}
              name="activity_type"
            >
              <option value="all">Wszystkie typy</option>
              {ACTIVITY_TYPES.map((activityType) => (
                <option key={activityType} value={activityType}>
                  {getActivityTypeLabel(activityType)}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Status</span>
            <Select defaultValue={filters.status ?? "all"} name="status">
              <option value="all">Wszystkie statusy</option>
              {ACTIVITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getActivityStatusLabel(status)}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-medium text-[#304335]">
              Wykonawca
            </span>
            <Select
              defaultValue={filters.performed_by_profile_id ?? ""}
              name="performed_by_profile_id"
            >
              <option value="">Wszyscy wykonawcy</option>
              {memberOptions.map((member) => (
                <option key={member.profile_id} value={member.profile_id}>
                  {member.label}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex flex-wrap items-end gap-3 lg:col-span-3">
            <Button className="w-full sm:w-auto" type="submit" variant="secondary">
              Zastosuj
            </Button>
            <LinkButton
              className="w-full sm:w-auto"
              href={clearListHref}
              variant="ghost"
            >
              Wyczysc filtry
            </LinkButton>
          </div>
        </form>
      </Card>

      <ActivityList
        activities={activities}
        clearHref={clearListHref}
        createHref="/activities/new"
        hasActiveFilters={hasActiveFilters}
        redirectTo={redirectTo}
      />
    </div>
  );
}

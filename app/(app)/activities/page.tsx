import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { ActivityList } from "@/features/activities/activity-list";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  getActivityStatusLabel,
  getActivityTypeLabel,
} from "@/lib/domain/activities";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import {
  listActivitiesForOrchard,
  listActiveMemberOptionsForOrchard,
  listTreeOptionsForOrchard,
} from "@/lib/orchard-data/activities";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
} from "@/lib/utils/search-params";
import { activityListFiltersSchema } from "@/lib/validation/activities";
import type { ActivityListFilters } from "@/types/contracts";

type ActivitiesPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function ActivitiesPage({ searchParams }: ActivitiesPageProps) {
  const context = await requireActiveOrchard("/activities");
  const orchard = context.orchard;

  if (!orchard) {
    throw new Error("Active orchard is required for activities.");
  }

  const [plotOptions, treeOptions, memberOptions, resolvedSearchParams] = await Promise.all([
    listPlotOptionsForOrchard(orchard.id),
    listTreeOptionsForOrchard(orchard.id),
    listActiveMemberOptionsForOrchard(orchard.id),
    searchParams,
  ]);

  const parsedFilters = activityListFiltersSchema.safeParse({
    date_from: getSingleSearchParam(resolvedSearchParams.date_from),
    date_to: getSingleSearchParam(resolvedSearchParams.date_to),
    plot_id: getSingleSearchParam(resolvedSearchParams.plot_id),
    tree_id: getSingleSearchParam(resolvedSearchParams.tree_id),
    activity_type: getSingleSearchParam(resolvedSearchParams.activity_type) ?? "all",
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

  const activities = await listActivitiesForOrchard(orchard.id, filters);
  const currentSearchParams = new URLSearchParams();

  if (filters.date_from) {
    currentSearchParams.set("date_from", filters.date_from);
  }

  if (filters.date_to) {
    currentSearchParams.set("date_to", filters.date_to);
  }

  if (filters.plot_id) {
    currentSearchParams.set("plot_id", filters.plot_id);
  }

  if (filters.tree_id) {
    currentSearchParams.set("tree_id", filters.tree_id);
  }

  if (filters.activity_type) {
    currentSearchParams.set("activity_type", filters.activity_type);
  }

  if (filters.status) {
    currentSearchParams.set("status", filters.status);
  }

  if (filters.performed_by_profile_id) {
    currentSearchParams.set(
      "performed_by_profile_id",
      filters.performed_by_profile_id,
    );
  }

  const redirectTo = buildPathWithSearchParams("/activities", currentSearchParams);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Dziennik prac
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Aktywnosci w sadzie {orchard.name}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Zapisuj prace sezonowe, zakres wykonania i uzyte materialy w jednym
            dzienniku operacyjnym.
          </p>
        </div>
        <LinkButton href="/activities/new">Nowa aktywnosc</LinkButton>
      </div>

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Filtry</CardTitle>
          <CardDescription>
            Sortowanie jest domyslnie malejaco po dacie aktywnosci. Bez filtrow
            zobaczysz wszystkie statusy wpisow.
          </CardDescription>
        </div>
        <form className="grid gap-4 lg:grid-cols-3" method="get">
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
            <span className="text-sm font-medium text-[#304335]">Typ aktywnosci</span>
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
            <span className="text-sm font-medium text-[#304335]">Wykonawca</span>
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
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#efe6d3] px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#e5d9bf]"
              type="submit"
            >
              Zastosuj
            </button>
            <LinkButton href="/activities" variant="ghost">
              Wyczyść
            </LinkButton>
          </div>
        </form>
      </Card>

      <ActivityList activities={activities} redirectTo={redirectTo} />
    </div>
  );
}

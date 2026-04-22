import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  getActivityPruningSubtypeLabel,
  getActivityStatusLabel,
  getActivityTypeLabel,
} from "@/lib/domain/activities";
import { changeActivityStatus, deleteActivity } from "@/server/actions/activities";
import type { ActivitySummary } from "@/types/contracts";

type ActivityListProps = {
  activities: ActivitySummary[];
  redirectTo: string;
};

function formatActivityDate(activityDate: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
  }).format(new Date(activityDate));
}

export function ActivityList({ activities, redirectTo }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <Card className="grid gap-3">
        <CardTitle>Brak aktywnosci</CardTitle>
        <CardDescription>
          Dodaj pierwszy wpis do dziennika prac albo zmien filtry, aby zobaczyc
          zapisane aktywnosci.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {activities.map((activity) => (
        <Card className="grid gap-4" key={activity.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{activity.title}</CardTitle>
                <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                  {getActivityStatusLabel(activity.status)}
                </span>
                <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
                  {getActivityTypeLabel(activity.activity_type)}
                </span>
                {activity.activity_subtype ? (
                  <span className="rounded-full border border-[#d8d1c0] px-3 py-1 text-xs font-medium text-[#5b6155]">
                    {getActivityPruningSubtypeLabel(activity.activity_subtype)}
                  </span>
                ) : null}
              </div>
              <CardDescription>
                {formatActivityDate(activity.activity_date)} · {activity.plot_name}
                {activity.tree_display_name ? ` · ${activity.tree_display_name}` : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
                href={`/activities/${activity.id}/edit`}
              >
                Edytuj
              </Link>
              <form action={deleteActivity}>
                <input name="activity_id" type="hidden" value={activity.id} />
                <input name="redirect_to" type="hidden" value={redirectTo} />
                <Button type="submit" variant="danger">
                  Usun
                </Button>
              </form>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-2 lg:grid-cols-4">
            <p>
              <span className="font-medium text-[#304335]">Typ:</span>{" "}
              {getActivityTypeLabel(activity.activity_type)}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Faza sezonu:</span>{" "}
              {activity.season_phase ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Zakresy:</span>{" "}
              {activity.scope_count ?? 0}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Materialy:</span>{" "}
              {activity.material_count ?? 0}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-[#304335]">Wykonawca:</span>{" "}
              {activity.performed_by_display ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Sezon:</span>{" "}
              {activity.season_year}
            </p>
          </div>

          {activity.description ? (
            <CardDescription>{activity.description}</CardDescription>
          ) : null}

          <form
            action={changeActivityStatus}
            className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] px-4 py-4"
          >
            <input name="activity_id" type="hidden" value={activity.id} />
            <input name="redirect_to" type="hidden" value={redirectTo} />
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#304335]">
                Szybka zmiana statusu
              </span>
              <select
                className="min-h-11 rounded-xl border border-[#d4c6aa] bg-white px-3 py-2 text-sm text-[#1f2a1f] shadow-sm outline-none transition focus:border-[#b48446] focus:ring-2 focus:ring-[#f0d6a8]"
                defaultValue={activity.status}
                name="status"
              >
                <option value="planned">Planowana</option>
                <option value="done">Wykonana</option>
                <option value="skipped">Pominieta</option>
                <option value="cancelled">Anulowana</option>
              </select>
            </label>
            <Button type="submit" variant="secondary">
              Zmien status
            </Button>
          </form>
        </Card>
      ))}
    </div>
  );
}

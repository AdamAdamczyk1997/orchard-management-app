import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import {
  formatActivityScopeLabel,
  getActivityPruningSubtypeLabel,
  getActivityStatusLabel,
  getActivityTypeLabel,
} from "@/lib/domain/activities";
import { changeActivityStatus, deleteActivity } from "@/server/actions/activities";
import type { ActivityDetails } from "@/types/contracts";

type ActivityDetailProps = {
  activity: ActivityDetails;
};

function formatActivityDate(activityDate: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
  }).format(new Date(activityDate));
}

function formatTimestamp(timestamp: string | undefined) {
  if (!timestamp) {
    return "Brak danych";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatDurationLabel(minutes: number | null | undefined) {
  if (typeof minutes !== "number") {
    return "Brak";
  }

  return `${minutes} min`;
}

function formatCostLabel(costAmount: number | null | undefined) {
  if (typeof costAmount !== "number") {
    return "Brak";
  }

  return `${costAmount.toFixed(2)} PLN`;
}

export function ActivityDetail({ activity }: ActivityDetailProps) {
  const detailPath = `/activities/${activity.id}`;

  return (
    <div className="grid gap-6">
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
              Szczegoly aktywnosci
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{activity.title}</CardTitle>
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
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/activities" variant="secondary">
              Powrot
            </LinkButton>
            <LinkButton href={`/activities/${activity.id}/edit`}>
              Edytuj
            </LinkButton>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3 text-sm text-[#5b6155] sm:grid-cols-2">
            <p>
              <span className="font-medium text-[#304335]">Dzialka:</span>{" "}
              {activity.plot_name ?? "Nieznana dzialka"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Drzewo:</span>{" "}
              {activity.tree_display_name ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Wykonawca:</span>{" "}
              {activity.performed_by_display ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Faza sezonu:</span>{" "}
              {activity.season_phase ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Sezon:</span>{" "}
              {activity.season_year}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Czas pracy:</span>{" "}
              {formatDurationLabel(activity.work_duration_minutes)}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Koszt:</span>{" "}
              {formatCostLabel(activity.cost_amount)}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Zakresy:</span>{" "}
              {activity.scopes.length}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Materialy:</span>{" "}
              {activity.materials.length}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Utworzono:</span>{" "}
              {formatTimestamp(activity.created_at)}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Ostatnia aktualizacja:</span>{" "}
              {formatTimestamp(activity.updated_at)}
            </p>
          </div>

          <Card className="grid gap-3 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
            <div className="grid gap-1">
              <CardTitle className="text-lg">Szybkie akcje</CardTitle>
              <CardDescription>
                Status zmienia sie bez wychodzenia z widoku szczegolow.
              </CardDescription>
            </div>
            <form action={changeActivityStatus} className="grid gap-3">
              <input name="activity_id" type="hidden" value={activity.id} />
              <input name="redirect_to" type="hidden" value={detailPath} />
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#304335]">Status</span>
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
            <form action={deleteActivity}>
              <input name="activity_id" type="hidden" value={activity.id} />
              <input name="redirect_to" type="hidden" value="/activities" />
              <Button type="submit" variant="danger">
                Usun aktywnosc
              </Button>
            </form>
          </Card>
        </div>
      </Card>

      {activity.description ? (
        <Card className="grid gap-2">
          <CardTitle className="text-lg">Opis</CardTitle>
          <CardDescription>{activity.description}</CardDescription>
        </Card>
      ) : null}

      {activity.weather_notes ? (
        <Card className="grid gap-2">
          <CardTitle className="text-lg">Warunki pogodowe</CardTitle>
          <CardDescription>{activity.weather_notes}</CardDescription>
        </Card>
      ) : null}

      {activity.result_notes ? (
        <Card className="grid gap-2">
          <CardTitle className="text-lg">Efekt pracy</CardTitle>
          <CardDescription>{activity.result_notes}</CardDescription>
        </Card>
      ) : null}

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Zakres wykonania</CardTitle>
          <CardDescription>
            Szczegoly pokazuja zapisane `activity_scopes` w kolejnosci formularza.
          </CardDescription>
        </div>
        {activity.scopes.length === 0 ? (
          <CardDescription>Ta aktywnosc nie ma zapisanych zakresow.</CardDescription>
        ) : (
          <div className="grid gap-3">
            {activity.scopes.map((scope) => (
              <div
                className="grid gap-2 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] px-4 py-4"
                key={scope.id}
              >
                <p className="text-sm font-medium text-[#304335]">
                  {formatActivityScopeLabel(scope)}
                </p>
                {scope.notes ? (
                  <CardDescription>{scope.notes}</CardDescription>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Materialy</CardTitle>
          <CardDescription>
            Lista materialow pochodzi bezposrednio z zapisanych `activity_materials`.
          </CardDescription>
        </div>
        {activity.materials.length === 0 ? (
          <CardDescription>Ta aktywnosc nie ma zapisanych materialow.</CardDescription>
        ) : (
          <div className="grid gap-3">
            {activity.materials.map((material) => (
              <div
                className="grid gap-2 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] px-4 py-4"
                key={material.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[#304335]">{material.name}</p>
                  {material.category ? (
                    <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
                      {material.category}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-2">
                  <p>
                    <span className="font-medium text-[#304335]">Ilosc:</span>{" "}
                    {typeof material.quantity === "number" ? material.quantity : "Brak"}
                  </p>
                  <p>
                    <span className="font-medium text-[#304335]">Jednostka:</span>{" "}
                    {material.unit ?? "Brak"}
                  </p>
                </div>
                {material.notes ? (
                  <CardDescription>{material.notes}</CardDescription>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

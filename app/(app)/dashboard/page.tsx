import Link from "next/link";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { getActivityStatusLabel, getActivityTypeLabel } from "@/lib/domain/activities";
import {
  FEEDBACK_NOTICE_QUERY_PARAM,
  resolveFeedbackNotice,
} from "@/lib/domain/feedback-notices";
import { formatHarvestKg } from "@/lib/domain/harvests";
import { getOrchardRoleLabel } from "@/lib/domain/labels";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { getDashboardSummaryForOrchard } from "@/lib/orchard-data/dashboard";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
  toUrlSearchParams,
} from "@/lib/utils/search-params";
import type { DashboardSummary } from "@/types/contracts";

function formatDashboardDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function DashboardMetricCard(props: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
      <CardTitle className="text-lg">{props.title}</CardTitle>
      <p className="text-3xl font-semibold text-[#1f2a1f]">{props.value}</p>
      <CardDescription>{props.description}</CardDescription>
    </Card>
  );
}

function DashboardActivityFeed(props: {
  activities: DashboardSummary["recent_activities"];
}) {
  if (props.activities.length === 0) {
    return (
      <div className="grid gap-3">
        <CardDescription>
          Nie ma jeszcze wpisow aktywnosci w tym sadzie. Zacznij od zapisania
          pierwszej pracy sezonowej.
        </CardDescription>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/activities/new">Dodaj aktywnosc</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {props.activities.map((activity) => (
        <Link
          className="grid gap-2 rounded-2xl border border-[#e3d8c4] bg-white px-4 py-4 transition hover:border-[#d4c19d] hover:bg-[#fcfaf4] focus:outline-none focus:ring-2 focus:ring-[#b48446]"
          href={`/activities/${activity.id}`}
          key={activity.id}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-[#304335]">
              {activity.title}
            </p>
            <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
              {getActivityStatusLabel(activity.status)}
            </span>
          </div>
          <CardDescription>
            {formatDashboardDate(activity.activity_date)} · {activity.plot_name}
          </CardDescription>
        </Link>
      ))}
    </div>
  );
}

function DashboardUpcomingActivityFeed(props: {
  activities: DashboardSummary["upcoming_activities"];
}) {
  if (props.activities.length === 0) {
    return (
      <div className="grid gap-3" data-testid="dashboard-upcoming-feed">
        <CardDescription>
          Nie ma jeszcze zaplanowanych aktywnosci od dzis wzwyz. Dodaj pierwsza
          planowana prace, aby pojawila sie na dashboardzie.
        </CardDescription>
        <div className="flex flex-wrap gap-3">
          <LinkButton className="w-full sm:w-auto" href="/activities/new">
            Dodaj aktywnosc
          </LinkButton>
          <LinkButton className="w-full sm:w-auto" href="/activities" variant="ghost">
            Zobacz wszystkie aktywnosci
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3" data-testid="dashboard-upcoming-feed">
      {props.activities.map((activity) => (
        <Link
          className="grid gap-2 rounded-2xl border border-[#e3d8c4] bg-white px-4 py-4 transition hover:border-[#d4c19d] hover:bg-[#fcfaf4] focus:outline-none focus:ring-2 focus:ring-[#b48446]"
          data-testid="dashboard-upcoming-activity-link"
          href={`/activities/${activity.id}`}
          key={activity.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[#304335]">{activity.title}</p>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9d7e4e]">
              {formatDashboardDate(activity.activity_date)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
              {getActivityTypeLabel(activity.activity_type)}
            </span>
            <CardDescription>{activity.plot_name}</CardDescription>
          </div>
        </Link>
      ))}
    </div>
  );
}

function DashboardHarvestFeed(props: {
  harvests: DashboardSummary["recent_harvests"];
}) {
  if (props.harvests.length === 0) {
    return (
      <div className="grid gap-3">
        <CardDescription>
          Nie ma jeszcze wpisow zbioru. Dodaj pierwszy rekord, aby sledzic mase
          i historie sezonu.
        </CardDescription>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/harvests/new">Dodaj zbior</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {props.harvests.map((harvest) => (
        <Link
          className="grid gap-2 rounded-2xl border border-[#e3d8c4] bg-white px-4 py-4 transition hover:border-[#d4c19d] hover:bg-[#fcfaf4] focus:outline-none focus:ring-2 focus:ring-[#b48446]"
          href={`/harvests/${harvest.id}`}
          key={harvest.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[#304335]">
              {formatHarvestKg(harvest.quantity_kg)}
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9d7e4e]">
              {formatDashboardDate(harvest.harvest_date)}
            </p>
          </div>
          <CardDescription>{harvest.plot_name}</CardDescription>
        </Link>
      ))}
    </div>
  );
}

type DashboardPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const [context, resolvedSearchParams] = await Promise.all([
    requireActiveOrchard("/dashboard"),
    searchParams,
  ]);
  const summary = await getDashboardSummaryForOrchard(context.orchard.id);
  const isOwner = context.membership.role === "owner";
  const feedbackNotice = resolveFeedbackNotice(
    getSingleSearchParam(resolvedSearchParams[FEEDBACK_NOTICE_QUERY_PARAM]),
  );
  const dismissHref = buildPathWithSearchParams(
    "/dashboard",
    toUrlSearchParams(resolvedSearchParams, {
      excludeKeys: [FEEDBACK_NOTICE_QUERY_PARAM],
    }),
  );
  const isCompletelyEmpty =
    summary.active_plots_count === 0 &&
    summary.active_trees_count === 0 &&
    summary.recent_activities.length === 0 &&
    summary.recent_harvests.length === 0;

  return (
    <div className="grid gap-6">
      {feedbackNotice ? (
        <FeedbackBanner dismissHref={dismissHref} notice={feedbackNotice} />
      ) : null}
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Kontekst pracy
        </p>
        <CardTitle>{context.orchard.name}</CardTitle>
        <CardDescription>
          Pracujesz teraz jako `{getOrchardRoleLabel(context.membership.role)}`.
          Ten widok pokazuje biezacy stan operacyjny sadu: aktywne rekordy
          struktury, ostatnie prace i ostatnie wpisy zbioru.
        </CardDescription>
      </Card>

      {isCompletelyEmpty ? (
        <EmptyStateCard
          actions={[
            { href: "/plots/new", label: "Dodaj dzialke" },
            { href: "/trees/new", label: "Dodaj drzewo", variant: "secondary" },
            {
              href: "/activities/new",
              label: "Dodaj aktywnosc",
              variant: "secondary",
            },
            { href: "/harvests/new", label: "Dodaj zbior", variant: "secondary" },
          ]}
          description="Zacznij od dodania pierwszej dzialki i drzewa, a potem przejdz do dziennika prac i wpisow zbioru."
          title="Sad jest jeszcze pusty"
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <DashboardMetricCard
                description="Dzialki ze statusem `active` w aktywnym sadzie."
                title="Aktywne dzialki"
                value={summary.active_plots_count}
              />
              <DashboardMetricCard
                description="Drzewa z `is_active = true` w aktywnym sadzie."
                title="Aktywne drzewa"
                value={summary.active_trees_count}
              />
            </div>
            <Card className="grid gap-4">
              <div className="grid gap-1">
                <CardTitle className="text-lg">Szybkie akcje</CardTitle>
                <CardDescription>
                  Najkrotsza sciezka do najczestszych operacji i harvestowego
                  raportu sezonu.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <LinkButton className="w-full sm:w-auto" href="/plots/new">
                  Dodaj dzialke
                </LinkButton>
                <LinkButton className="w-full sm:w-auto" href="/trees/new" variant="secondary">
                  Dodaj drzewo
                </LinkButton>
                <LinkButton
                  className="w-full sm:w-auto"
                  href="/activities/new"
                  variant="secondary"
                >
                  Dodaj aktywnosc
                </LinkButton>
                <LinkButton
                  className="w-full sm:w-auto"
                  href="/harvests/new"
                  variant="secondary"
                >
                  Dodaj zbior
                </LinkButton>
                <LinkButton
                  className="w-full sm:w-auto"
                  href="/reports/season-summary"
                  variant="ghost"
                >
                  Raport sezonu
                </LinkButton>
                {isOwner ? (
                  <>
                    <LinkButton
                      className="w-full sm:w-auto"
                      href="/settings/orchard"
                      variant="ghost"
                    >
                      Ustawienia sadu
                    </LinkButton>
                    <LinkButton
                      className="w-full sm:w-auto"
                      href="/settings/members"
                      variant="ghost"
                    >
                      Czlonkowie
                    </LinkButton>
                  </>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="grid gap-4" data-testid="dashboard-upcoming-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <CardTitle className="text-lg">Nadchodzace aktywnosci</CardTitle>
                  <CardDescription>
                    Najblizsze wpisy `planned` od dzis wzwyz w aktywnym sadzie.
                  </CardDescription>
                </div>
                <LinkButton href="/activities" variant="ghost">
                  Zobacz wszystkie aktywnosci
                </LinkButton>
              </div>
              <DashboardUpcomingActivityFeed activities={summary.upcoming_activities} />
            </Card>

            <Card className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <CardTitle className="text-lg">Ostatnie aktywnosci</CardTitle>
                  <CardDescription>
                    Ostatnie wpisy operacyjne zapisane w aktywnym sadzie.
                  </CardDescription>
                </div>
                <LinkButton href="/activities" variant="ghost">
                  Zobacz wszystkie aktywnosci
                </LinkButton>
              </div>
              <DashboardActivityFeed activities={summary.recent_activities} />
            </Card>

            <Card className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <CardTitle className="text-lg">Ostatnie zbiory</CardTitle>
                  <CardDescription>
                    Najnowsze rekordy z `harvest_records`, gotowe do podgladu i
                    dalszego raportowania.
                  </CardDescription>
                </div>
                <LinkButton href="/harvests" variant="ghost">
                  Zobacz wszystkie zbiory
                </LinkButton>
              </div>
              <DashboardHarvestFeed harvests={summary.recent_harvests} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

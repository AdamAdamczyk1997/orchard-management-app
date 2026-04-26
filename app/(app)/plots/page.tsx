import { Suspense } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { ListPageLoading } from "@/components/ui/list-page-loading";
import { Select } from "@/components/ui/select";
import { PlotList } from "@/features/plots/plot-list";
import { hasActivePlotListFilters } from "@/lib/domain/list-filters";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotsForOrchard } from "@/lib/orchard-data/plots";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
} from "@/lib/utils/search-params";
import { plotListFiltersSchema } from "@/lib/validation/plots";

type PlotsPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function PlotsPage({ searchParams }: PlotsPageProps) {
  const context = await requireActiveOrchard("/plots");

  return (
    <Suspense fallback={<ListPageLoading filterFieldCount={1} />}>
      <PlotsPageContent
        orchardId={context.orchard.id}
        orchardName={context.orchard.name}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function PlotsPageContent({
  orchardId,
  orchardName,
  searchParams,
}: {
  orchardId: string;
  orchardName: string;
  searchParams: Promise<NextSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const parsedFilters = plotListFiltersSchema.safeParse({
    status: getSingleSearchParam(resolvedSearchParams.status),
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};
  const plots = await listPlotsForOrchard(orchardId, filters);
  const hasActiveFilters = hasActivePlotListFilters(filters);
  const currentSearchParams = new URLSearchParams();

  if (filters.status) {
    currentSearchParams.set("status", filters.status);
  }

  const redirectTo = buildPathWithSearchParams("/plots", currentSearchParams);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Dzialki
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Dzialki w sadzie {orchardName}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Dzialki sa podstawowymi kontenerami fizycznymi w aktywnym sadzie. To
            do nich beda pozniej przypiete drzewa, aktywnosci i wpisy zbioru.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[#eff2ed]">
          <LinkButton href="/plots/new">Utworz dzialke</LinkButton>
        </div>
      </div>

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Filtry</CardTitle>
          <CardDescription>
            Zarchiwizowane dzialki sa domyslnie ukryte, aby lista skupiala sie
            na aktualnej strukturze pracy.
          </CardDescription>
        </div>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Status</span>
            <Select defaultValue={filters.status ?? ""} name="status">
              <option value="">Aktywne + planowane</option>
              <option value="active">Tylko aktywne</option>
              <option value="planned">Tylko planowane</option>
              <option value="archived">Tylko zarchiwizowane</option>
              <option value="all">Wszystkie dzialki</option>
            </Select>
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#efe6d3] px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#e5d9bf]"
            type="submit"
          >
            Zastosuj
          </button>
          <LinkButton href="/plots" variant="ghost">
            Wyczyść
          </LinkButton>
        </form>
      </Card>

      <PlotList
        clearHref="/plots"
        createHref="/plots/new"
        hasActiveFilters={hasActiveFilters}
        plots={plots}
        redirectTo={redirectTo}
      />
    </div>
  );
}

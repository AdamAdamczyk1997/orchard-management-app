import { Suspense } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Input } from "@/components/ui/input";
import { ListPageLoading } from "@/components/ui/list-page-loading";
import { LinkButton } from "@/components/ui/link-button";
import { VarietyList } from "@/features/varieties/variety-list";
import {
  FEEDBACK_NOTICE_QUERY_PARAM,
  resolveFeedbackNotice,
} from "@/lib/domain/feedback-notices";
import { hasActiveVarietyListFilters } from "@/lib/domain/list-filters";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listVarietiesForOrchard } from "@/lib/orchard-data/varieties";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
  toUrlSearchParams,
} from "@/lib/utils/search-params";
import { varietyListFiltersSchema } from "@/lib/validation/varieties";
import type { VarietyListFilters } from "@/types/contracts";

type VarietiesPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function VarietiesPage({
  searchParams,
}: VarietiesPageProps) {
  const context = await requireActiveOrchard("/varieties");

  return (
    <Suspense fallback={<ListPageLoading filterFieldCount={1} />}>
      <VarietiesPageContent
        orchardId={context.orchard.id}
        orchardName={context.orchard.name}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function VarietiesPageContent({
  orchardId,
  orchardName,
  searchParams,
}: {
  orchardId: string;
  orchardName: string;
  searchParams: Promise<NextSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const feedbackNotice = resolveFeedbackNotice(
    getSingleSearchParam(resolvedSearchParams[FEEDBACK_NOTICE_QUERY_PARAM]),
  );
  const parsedFilters = varietyListFiltersSchema.safeParse({
    q: getSingleSearchParam(resolvedSearchParams.q),
  });
  const filters: VarietyListFilters = parsedFilters.success
    ? parsedFilters.data
    : {};
  const varieties = await listVarietiesForOrchard(orchardId, filters);
  const hasActiveFilters = hasActiveVarietyListFilters(filters);
  const dismissHref = buildPathWithSearchParams(
    "/varieties",
    toUrlSearchParams(resolvedSearchParams, {
      excludeKeys: [FEEDBACK_NOTICE_QUERY_PARAM],
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
            Odmiany
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Biblioteka odmian w sadzie {orchardName}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Trzymaj wiedze o odmianach blisko drzew, ktore beda z niej korzystac
            w kolejnych etapach pracy.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[#eff2ed]">
          <div className="text-[#0c0c0c]">
            <LinkButton href="/reports/variety-locations" variant="secondary">
              Raport lokalizacji
            </LinkButton>
          </div>
          <LinkButton href="/varieties/new">Utworz odmiane</LinkButton>
        </div>
      </div>

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Wyszukiwanie</CardTitle>
          <CardDescription>
            Szukaj po nazwie odmiany lub gatunku w aktywnym sadzie.
          </CardDescription>
        </div>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="grid min-w-[220px] flex-1 gap-2">
            <span className="text-sm font-medium text-[#304335]">Szukaj</span>
            <Input
              defaultValue={filters.q ?? ""}
              name="q"
              placeholder="np. Ligol lub apple"
            />
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#efe6d3] px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#e5d9bf]"
            type="submit"
          >
            Zastosuj
          </button>
          <LinkButton href="/varieties" variant="ghost">
            Wyczyść
          </LinkButton>
        </form>
      </Card>

      <VarietyList
        clearHref="/varieties"
        createHref="/varieties/new"
        hasActiveFilters={hasActiveFilters}
        varieties={varieties}
      />
    </div>
  );
}

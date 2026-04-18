import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { PlotList } from "@/features/plots/plot-list";
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
  const orchard = context.orchard;

  if (!orchard) {
    throw new Error("Active orchard is required for plots.");
  }

  const resolvedSearchParams = await searchParams;
  const parsedFilters = plotListFiltersSchema.safeParse({
    status: getSingleSearchParam(resolvedSearchParams.status),
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};
  const plots = await listPlotsForOrchard(orchard.id, filters);
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
            Plots
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Orchard plots in {orchard.name}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Plots are the first physical containers inside the active orchard. They will later anchor trees, activities, and harvest records.
          </p>
        </div>
        <LinkButton href="/plots/new">Create plot</LinkButton>
      </div>

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            Archived plots stay hidden by default so the working list focuses on active orchard structure.
          </CardDescription>
        </div>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Status</span>
            <Select defaultValue={filters.status ?? ""} name="status">
              <option value="">Active + planned</option>
              <option value="active">Only active</option>
              <option value="planned">Only planned</option>
              <option value="archived">Only archived</option>
              <option value="all">All plots</option>
            </Select>
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#efe6d3] px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#e5d9bf]"
            type="submit"
          >
            Apply
          </button>
          <LinkButton href="/plots" variant="ghost">
            Clear
          </LinkButton>
        </form>
      </Card>

      <PlotList plots={plots} redirectTo={redirectTo} />
    </div>
  );
}

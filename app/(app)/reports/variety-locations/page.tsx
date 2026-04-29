import { VarietyLocationsReportView } from "@/features/varieties/variety-locations-report-view";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import {
  getVarietyLocationsReportForOrchard,
  listVarietyOptionsForOrchard,
} from "@/lib/orchard-data/varieties";
import {
  getSingleSearchParam,
  type NextSearchParams,
} from "@/lib/utils/search-params";
import { varietyLocationsReportFiltersSchema } from "@/lib/validation/varieties";

type VarietyLocationsReportPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function VarietyLocationsReportPage({
  searchParams,
}: VarietyLocationsReportPageProps) {
  const context = await requireActiveOrchard("/reports/variety-locations");
  const [varietyOptions, resolvedSearchParams] = await Promise.all([
    listVarietyOptionsForOrchard(context.orchard.id),
    searchParams,
  ]);

  const parsedFilters = varietyLocationsReportFiltersSchema.safeParse({
    variety_id: getSingleSearchParam(resolvedSearchParams.variety_id),
  });
  const selectedVarietyId = parsedFilters.success
    ? parsedFilters.data.variety_id
    : undefined;
  const report = selectedVarietyId
    ? await getVarietyLocationsReportForOrchard(context.orchard.id, selectedVarietyId)
    : null;

  return (
    <VarietyLocationsReportView
      isMissingSelectedVariety={Boolean(selectedVarietyId) && !report}
      report={report}
      resetHref="/reports/variety-locations"
      selectedVarietyId={selectedVarietyId}
      varietyOptions={varietyOptions}
    />
  );
}

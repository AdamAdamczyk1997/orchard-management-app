import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import {
  FEEDBACK_NOTICE_QUERY_PARAM,
  resolveFeedbackNotice,
} from "@/lib/domain/feedback-notices";
import { HarvestDetail } from "@/features/harvests/harvest-detail";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readHarvestRecordByIdForOrchard } from "@/lib/orchard-data/harvests";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
  toUrlSearchParams,
} from "@/lib/utils/search-params";

type HarvestDetailsPageProps = {
  params: Promise<{
    harvestRecordId: string;
  }>;
  searchParams: Promise<NextSearchParams>;
};

export default async function HarvestDetailsPage({
  params,
  searchParams,
}: HarvestDetailsPageProps) {
  const context = await requireActiveOrchard("/harvests");
  const { harvestRecordId } = await params;
  const resolvedSearchParams = await searchParams;
  const feedbackNotice = resolveFeedbackNotice(
    getSingleSearchParam(resolvedSearchParams[FEEDBACK_NOTICE_QUERY_PARAM]),
  );
  const harvestRecord = await readHarvestRecordByIdForOrchard(
    context.orchard.id,
    harvestRecordId,
  );

  if (!harvestRecord) {
    return (
      <RecordNotFoundCard
        backHref="/harvests"
        description="Ten wpis zbioru nie istnieje w aktywnym sadzie albo nie jest juz dostepny."
        title="Nie znaleziono wpisu zbioru"
      />
    );
  }

  const dismissHref = buildPathWithSearchParams(
    `/harvests/${harvestRecordId}`,
    toUrlSearchParams(resolvedSearchParams, {
      excludeKeys: [FEEDBACK_NOTICE_QUERY_PARAM],
    }),
  );

  return (
    <div className="grid gap-6">
      {feedbackNotice ? (
        <FeedbackBanner dismissHref={dismissHref} notice={feedbackNotice} />
      ) : null}
      <HarvestDetail harvestRecord={harvestRecord} />
    </div>
  );
}

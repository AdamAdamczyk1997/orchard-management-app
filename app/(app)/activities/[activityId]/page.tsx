import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import {
  FEEDBACK_NOTICE_QUERY_PARAM,
  resolveFeedbackNotice,
} from "@/lib/domain/feedback-notices";
import { ActivityDetail } from "@/features/activities/activity-detail";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readActivityByIdForOrchard } from "@/lib/orchard-data/activities";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
  toUrlSearchParams,
} from "@/lib/utils/search-params";

type ActivityDetailsPageProps = {
  params: Promise<{
    activityId: string;
  }>;
  searchParams: Promise<NextSearchParams>;
};

export default async function ActivityDetailsPage({
  params,
  searchParams,
}: ActivityDetailsPageProps) {
  const context = await requireActiveOrchard("/activities");
  const { activityId } = await params;
  const resolvedSearchParams = await searchParams;
  const feedbackNotice = resolveFeedbackNotice(
    getSingleSearchParam(resolvedSearchParams[FEEDBACK_NOTICE_QUERY_PARAM]),
  );
  const activity = await readActivityByIdForOrchard(context.orchard.id, activityId);

  if (!activity) {
    return (
      <RecordNotFoundCard
        backHref="/activities"
        description="Ten wpis aktywnosci nie istnieje w aktywnym sadzie albo nie jest juz dostepny."
        title="Nie znaleziono aktywnosci"
      />
    );
  }

  const dismissHref = buildPathWithSearchParams(
    `/activities/${activityId}`,
    toUrlSearchParams(resolvedSearchParams, {
      excludeKeys: [FEEDBACK_NOTICE_QUERY_PARAM],
    }),
  );

  return (
    <div className="grid gap-6">
      {feedbackNotice ? (
        <FeedbackBanner dismissHref={dismissHref} notice={feedbackNotice} />
      ) : null}
      <ActivityDetail activity={activity} />
    </div>
  );
}

import { AccessDeniedCard } from "@/components/ui/access-denied-card";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { MemberList } from "@/features/orchards/member-list";
import { InviteMemberForm } from "@/features/orchards/invite-member-form";
import {
  FEEDBACK_NOTICE_QUERY_PARAM,
  resolveFeedbackNotice,
} from "@/lib/domain/feedback-notices";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listOrchardMembersForOrchard } from "@/lib/orchard-data/orchards";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
  toUrlSearchParams,
} from "@/lib/utils/search-params";

type OrchardMembersPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function OrchardMembersPage({
  searchParams,
}: OrchardMembersPageProps) {
  const [context, resolvedSearchParams] = await Promise.all([
    requireActiveOrchard("/settings/members"),
    searchParams,
  ]);

  if (context.membership.role !== "owner") {
    return (
      <AccessDeniedCard description="Tylko wlasciciel sadu moze przegladac i zarzadzac czlonkami sadu." />
    );
  }

  const members = await listOrchardMembersForOrchard(context.orchard.id);
  const feedbackNotice = resolveFeedbackNotice(
    getSingleSearchParam(resolvedSearchParams[FEEDBACK_NOTICE_QUERY_PARAM]),
  );
  const dismissHref = buildPathWithSearchParams(
    "/settings/members",
    toUrlSearchParams(resolvedSearchParams, {
      excludeKeys: [FEEDBACK_NOTICE_QUERY_PARAM],
    }),
  );

  return (
    <div className="grid gap-6">
      {feedbackNotice ? (
        <FeedbackBanner dismissHref={dismissHref} notice={feedbackNotice} />
      ) : null}
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Czlonkowie sadu
        </p>
        <CardTitle>{context.orchard.name}</CardTitle>
        <CardDescription>
          W tym etapie mozesz dodac do sadu istniejace konto jako pracownika i
          odebrac aktywny dostep czlonkom operacyjnym.
        </CardDescription>
      </Card>

      <Card className="grid gap-5">
        <div className="space-y-2">
          <CardTitle className="text-lg">Dodaj pracownika</CardTitle>
          <CardDescription>
            Obecny MVP obsluguje dodawanie tylko istniejacych kont z rola
            `worker`.
          </CardDescription>
        </div>
        <InviteMemberForm />
      </Card>

      <MemberList members={members} />
    </div>
  );
}

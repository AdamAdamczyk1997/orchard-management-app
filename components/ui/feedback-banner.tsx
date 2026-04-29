import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import type { FeedbackNotice } from "@/lib/domain/feedback-notices";

type FeedbackBannerProps = {
  notice: FeedbackNotice;
  dismissHref?: string;
};

export function FeedbackBanner({ notice, dismissHref }: FeedbackBannerProps) {
  return (
    <Card
      className="grid gap-3 border-[#b9d2be] bg-[#edf6ef]"
      data-testid="feedback-banner"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#537a5f]">
            Gotowe
          </p>
          <CardTitle className="text-lg text-[#264430]">Zmiany zapisane</CardTitle>
          <CardDescription className="text-[#365742]">
            {notice.message}
          </CardDescription>
        </div>
        {dismissHref ? (
          <LinkButton href={dismissHref} variant="ghost">
            Ukryj
          </LinkButton>
        ) : null}
      </div>
    </Card>
  );
}

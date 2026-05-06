import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import type { FeedbackNotice } from "@/lib/domain/feedback-notices";

type FeedbackBannerProps = {
  notice: FeedbackNotice;
  dismissHref?: string;
};

export function FeedbackBanner({ notice, dismissHref }: FeedbackBannerProps) {
  const toneClasses =
    notice.tone === "warning"
      ? {
          card: "border-[#e2c48a] bg-[#fff6e6]",
          eyebrow: "text-[#9b6524]",
          title: "text-[#6f4317]",
          description: "text-[#7b5526]",
        }
      : {
          card: "border-[#b9d2be] bg-[#edf6ef]",
          eyebrow: "text-[#537a5f]",
          title: "text-[#264430]",
          description: "text-[#365742]",
        };

  return (
    <Card
      className={`grid gap-3 ${toneClasses.card}`}
      data-testid="feedback-banner"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.24em] ${toneClasses.eyebrow}`}
          >
            {notice.eyebrow}
          </p>
          <CardTitle className={`text-lg ${toneClasses.title}`}>
            {notice.title}
          </CardTitle>
          <CardDescription className={toneClasses.description}>
            {notice.message}
          </CardDescription>
        </div>
        {dismissHref ? (
          <LinkButton className="w-full sm:w-auto" href={dismissHref} variant="ghost">
            Ukryj
          </LinkButton>
        ) : null}
      </div>
    </Card>
  );
}

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

type AccessDeniedCardProps = {
  title?: string;
  description: string;
  backHref?: string;
  backLabel?: string;
};

export function AccessDeniedCard({
  title = "Brak dostepu do tego obszaru",
  description,
  backHref = "/dashboard",
  backLabel = "Wroc do panelu",
}: AccessDeniedCardProps) {
  return (
    <Card className="grid gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Ograniczenie roli
        </p>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <div className="flex flex-wrap gap-3">
        <LinkButton href={backHref} variant="secondary">
          {backLabel}
        </LinkButton>
      </div>
    </Card>
  );
}

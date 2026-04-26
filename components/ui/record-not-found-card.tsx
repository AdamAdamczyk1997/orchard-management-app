import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

type RecordNotFoundCardProps = {
  eyebrow?: string;
  title?: string;
  description: string;
  backHref: string;
  backLabel?: string;
};

export function RecordNotFoundCard({
  eyebrow = "Brak rekordu",
  title = "Nie znaleziono tego wpisu",
  description,
  backHref,
  backLabel = "Wroc do listy",
}: RecordNotFoundCardProps) {
  return (
    <Card className="grid gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          {eyebrow}
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

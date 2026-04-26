import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

type PrerequisiteCardAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

type PrerequisiteCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions: PrerequisiteCardAction[];
};

export function PrerequisiteCard({
  eyebrow,
  title,
  description,
  actions,
}: PrerequisiteCardProps) {
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
        {actions.map((action) => (
          <LinkButton
            href={action.href}
            key={`${action.href}:${action.label}`}
            variant={action.variant}
          >
            {action.label}
          </LinkButton>
        ))}
      </div>
    </Card>
  );
}

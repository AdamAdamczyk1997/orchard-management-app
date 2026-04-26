import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

type EmptyStateAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

type EmptyStateCardProps = {
  title: string;
  description: string;
  actions?: EmptyStateAction[];
};

export function EmptyStateCard({
  title,
  description,
  actions = [],
}: EmptyStateCardProps) {
  return (
    <Card className="grid gap-3">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
      {actions.length > 0 ? (
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
      ) : null}
    </Card>
  );
}

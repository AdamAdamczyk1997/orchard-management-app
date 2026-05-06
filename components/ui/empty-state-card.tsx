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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {actions.map((action) => (
            <LinkButton
              className="w-full sm:w-auto"
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

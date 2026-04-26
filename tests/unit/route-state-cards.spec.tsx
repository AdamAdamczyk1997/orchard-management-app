import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { PrerequisiteCard } from "@/components/ui/prerequisite-card";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";

describe("route state cards", () => {
  it("renders a missing-record recovery card with a back action", () => {
    const markup = renderToStaticMarkup(
      <RecordNotFoundCard
        backHref="/activities"
        backLabel="Wroc do aktywnosci"
        description="Ten wpis nie jest juz dostepny."
        title="Nie znaleziono aktywnosci"
      />,
    );

    expect(markup).toContain("Nie znaleziono aktywnosci");
    expect(markup).toContain("Ten wpis nie jest juz dostepny.");
    expect(markup).toContain("Wroc do aktywnosci");
    expect(markup).toContain('href="/activities"');
  });

  it("renders prerequisite guidance with multiple recovery actions", () => {
    const markup = renderToStaticMarkup(
      <PrerequisiteCard
        actions={[
          { href: "/plots/new", label: "Utworz dzialke" },
          { href: "/trees", label: "Wroc do drzew", variant: "secondary" },
        ]}
        description="Najpierw potrzebujesz aktywnej dzialki."
        eyebrow="Nowe drzewo"
        title="Najpierw utworz dzialke"
      />,
    );

    expect(markup).toContain("Nowe drzewo");
    expect(markup).toContain("Najpierw utworz dzialke");
    expect(markup).toContain("Najpierw potrzebujesz aktywnej dzialki.");
    expect(markup).toContain("Utworz dzialke");
    expect(markup).toContain("Wroc do drzew");
    expect(markup).toContain('href="/plots/new"');
    expect(markup).toContain('href="/trees"');
  });
});

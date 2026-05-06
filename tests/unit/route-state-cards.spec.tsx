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
import { AccessDeniedCard } from "@/components/ui/access-denied-card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";

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
    expect(markup).toContain("w-full sm:w-auto");
  });

  it("renders permission recovery with a single clear back action", () => {
    const markup = renderToStaticMarkup(
      <AccessDeniedCard
        backHref="/dashboard"
        backLabel="Wroc do panelu"
        description="Tylko wlasciciel moze otworzyc ten ekran."
      />,
    );

    expect(markup).toContain("Brak dostepu do tego obszaru");
    expect(markup).toContain("Tylko wlasciciel moze otworzyc ten ekran.");
    expect(markup).toContain("Wroc do panelu");
    expect(markup).toContain('href="/dashboard"');
    expect(markup).toContain("w-full sm:w-auto");
  });

  it("renders empty-state actions with the recovery action first on mobile-friendly buttons", () => {
    const markup = renderToStaticMarkup(
      <EmptyStateCard
        actions={[
          { href: "/trees", label: "Wyczysc filtry", variant: "secondary" },
          { href: "/trees/new", label: "Utworz drzewo", variant: "ghost" },
        ]}
        description="Zmien filtr, aby zobaczyc pozostale drzewa."
        title="Brak wynikow dla wybranych filtrow"
      />,
    );

    expect(markup).toContain("Brak wynikow dla wybranych filtrow");
    expect(markup).toContain("Zmien filtr, aby zobaczyc pozostale drzewa.");
    expect(markup.indexOf("Wyczysc filtry")).toBeLessThan(
      markup.indexOf("Utworz drzewo"),
    );
    expect(markup).toContain('href="/trees"');
    expect(markup).toContain('href="/trees/new"');
    expect(markup).toContain("w-full sm:w-auto");
  });
});

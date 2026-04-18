import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { readCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireSessionUser } from "@/lib/auth/require-session-user";

type OnboardingLayoutProps = {
  children: ReactNode;
};

export default async function OnboardingLayout({
  children,
}: OnboardingLayoutProps) {
  await requireSessionUser();
  const profile = await readCurrentProfile();

  if (!profile) {
    redirect("/bootstrap-error");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <Card className="w-full bg-[#fbfaf7]/80 p-4 sm:p-6">{children}</Card>
    </main>
  );
}

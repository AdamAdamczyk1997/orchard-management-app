import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/layouts/auth-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/get-session-user";

type AuthLayoutProps = {
  children: ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const user = await getSessionUser();

  if (user) {
    redirect("/");
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-xl">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Dostep do aplikacji
          </p>
          <CardTitle>Logowanie i przygotowanie pierwszego sadu</CardTitle>
          <CardDescription>
            Konto uzytkownika pozostaje oddzielone od kontekstu pracy w sadzie. Zaloguj sie lub utworz konto, aby kontynuowac.
          </CardDescription>
        </div>
        {children}
      </Card>
    </AuthShell>
  );
}

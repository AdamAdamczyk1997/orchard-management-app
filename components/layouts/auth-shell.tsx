import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-[2rem] bg-[#264430] p-10 text-white shadow-[0_30px_90px_rgba(38,68,48,0.22)] lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.3em] text-[#d7c5a1]">
              OrchardLog / Sadownik+
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight">
              One orchard context, clear field work, and a stable base for the whole app.
            </h1>
            <p className="max-w-lg text-base leading-7 text-[#d7e3d8]">
              Phase 1 focuses on secure access, first-orchard onboarding, and a protected shell that the next modules can build on.
            </p>
          </div>
          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-[#d7e3d8]">
            <p>Auth is handled by Supabase.</p>
            <p>Working context is resolved as `active_orchard`.</p>
            <p>Operational data stays orchard-scoped from day one.</p>
          </div>
        </section>
        <section className="flex items-center justify-center">{children}</section>
      </div>
    </main>
  );
}

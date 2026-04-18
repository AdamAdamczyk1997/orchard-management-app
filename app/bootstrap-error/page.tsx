import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function BootstrapErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6">
      <Card className="grid w-full gap-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Profile bootstrap error
          </p>
          <CardTitle>We could not find the profile required for this account.</CardTitle>
          <CardDescription>
            The database trigger that should create `profiles` after auth did not complete correctly. This is a safe-stop page so the app does not continue with an inconsistent working context.
          </CardDescription>
        </div>
        <div className="rounded-2xl border border-[#e6d7bb] bg-[#fbfaf7] px-4 py-3 text-sm leading-6 text-[#5b6155]">
          Re-run the auth bootstrap check or sign out and try again after validating the baseline migrations and triggers.
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2c5b3b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#234a30]"
          href="/login"
        >
          Go to sign in
        </Link>
      </Card>
    </main>
  );
}

import { AccessDeniedCard } from "@/components/ui/access-denied-card";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { MemberList } from "@/features/orchards/member-list";
import { InviteMemberForm } from "@/features/orchards/invite-member-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listOrchardMembersForOrchard } from "@/lib/orchard-data/orchards";

export default async function OrchardMembersPage() {
  const context = await requireActiveOrchard("/settings/members");
  const orchard = context.orchard;

  if (!orchard || !context.membership) {
    throw new Error("Active orchard is required for orchard members.");
  }

  if (context.membership.role !== "owner") {
    return (
      <AccessDeniedCard description="Tylko wlasciciel sadu moze przegladac i zarzadzac czlonkami orchard." />
    );
  }

  const members = await listOrchardMembersForOrchard(orchard.id);

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Czlonkowie sadu
        </p>
        <CardTitle>{orchard.name}</CardTitle>
        <CardDescription>
          W tym etapie mozesz dodac do sadu istniejace konto jako pracownika i
          odebrac aktywny dostep czlonkom operacyjnym.
        </CardDescription>
      </Card>

      <Card className="grid gap-5">
        <div className="space-y-2">
          <CardTitle className="text-lg">Dodaj pracownika</CardTitle>
          <CardDescription>
            Obecny MVP obsluguje dodawanie tylko istniejacych kont z rola
            `worker`.
          </CardDescription>
        </div>
        <InviteMemberForm />
      </Card>

      <MemberList members={members} />
    </div>
  );
}

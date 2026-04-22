import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  getOrchardMembershipStatusLabel,
  getOrchardRoleLabel,
} from "@/lib/domain/labels";
import { deactivateOrchardMembership } from "@/server/actions/orchards";
import type { OrchardMembershipSummary } from "@/types/contracts";

type MemberListProps = {
  members: OrchardMembershipSummary[];
};

function formatJoinedAt(joinedAt: string | null | undefined) {
  if (!joinedAt) {
    return "Brak daty dolaczenia";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
  }).format(new Date(joinedAt));
}

export function MemberList({ members }: MemberListProps) {
  const hasOnlyOwner =
    members.length === 1 &&
    members[0]?.role === "owner" &&
    members[0]?.status === "active";

  return (
    <div className="grid gap-4">
      {hasOnlyOwner ? (
        <Card className="grid gap-2 border-dashed">
          <CardTitle className="text-lg">Na razie tylko wlasciciel ma dostep</CardTitle>
          <CardDescription>
            Dodaj pierwszego pracownika po adresie email, aby wspoldzielic pracę w tym
            sadzie.
          </CardDescription>
        </Card>
      ) : null}

      {members.map((member) => {
        const displayLabel = member.display_name ?? member.email ?? "Nieznany uzytkownik";

        return (
          <Card className="grid gap-4" key={member.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">{displayLabel}</CardTitle>
                  <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                    {getOrchardRoleLabel(member.role)}
                  </span>
                  <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
                    {getOrchardMembershipStatusLabel(member.status)}
                  </span>
                </div>
                <CardDescription>{member.email ?? "Brak adresu email"}</CardDescription>
              </div>

              {member.role !== "owner" && member.status === "active" ? (
                <form action={deactivateOrchardMembership}>
                  <input name="membership_id" type="hidden" value={member.id} />
                  <Button type="submit" variant="danger">
                    Odbierz dostep
                  </Button>
                </form>
              ) : null}
            </div>

            <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-2">
              <p>
                <span className="font-medium text-[#304335]">Rola:</span>{" "}
                {getOrchardRoleLabel(member.role)}
              </p>
              <p>
                <span className="font-medium text-[#304335]">Status:</span>{" "}
                {getOrchardMembershipStatusLabel(member.status)}
              </p>
              <p className="sm:col-span-2">
                <span className="font-medium text-[#304335]">Dolaczyl:</span>{" "}
                {formatJoinedAt(member.joined_at)}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

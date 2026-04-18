"use client";

import { useRef } from "react";
import { Select } from "@/components/ui/select";
import { setActiveOrchard } from "@/server/actions/orchards";
import type { OrchardSummary } from "@/types/contracts";

type OrchardSwitcherProps = {
  orchards: OrchardSummary[];
  activeOrchardId: string;
};

export function OrchardSwitcher({
  orchards,
  activeOrchardId,
}: OrchardSwitcherProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={setActiveOrchard} ref={formRef}>
      <Select
        defaultValue={activeOrchardId}
        disabled={orchards.length <= 1}
        name="orchard_id"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {orchards.map((orchard) => (
          <option key={orchard.id} value={orchard.id}>
            {orchard.name} ({orchard.my_role})
          </option>
        ))}
      </Select>
    </form>
  );
}

"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { getOrchardRoleLabel } from "@/lib/domain/labels";
import { Select } from "@/components/ui/select";
import { setActiveOrchard } from "@/server/actions/orchards";
import type { OrchardSummary } from "@/types/contracts";

type OrchardSwitcherProps = {
  orchards: OrchardSummary[];
  activeOrchardId: string;
  nextPath: string;
};

function OrchardSwitcherFields({
  activeOrchardId,
  orchards,
  onChange,
}: {
  orchards: OrchardSummary[];
  activeOrchardId: string;
  onChange: (nextOrchardId: string) => void;
}) {
  const { pending } = useFormStatus();
  const hasSingleOrchard = orchards.length <= 1;
  const helperText = pending
    ? "Przelaczam aktywny sad i odswiezam widok operacyjny."
    : hasSingleOrchard
      ? "Masz teraz dostep tylko do jednego sadu, wiec przelacznik pozostaje zablokowany."
      : "Zmiana aktywnego sadu odswiezy dashboard i listy w nowym kontekscie pracy.";

  return (
    <div className="grid gap-2">
      <Select
        aria-describedby="orchard-switcher-hint"
        aria-label="Wybierz aktywny sad"
        data-testid="orchard-switcher-select"
        defaultValue={activeOrchardId}
        disabled={hasSingleOrchard || pending}
        name="orchard_id"
        onChange={(event) => onChange(event.target.value)}
      >
        {orchards.map((orchard) => (
          <option key={orchard.id} value={orchard.id}>
            {orchard.name} ({getOrchardRoleLabel(orchard.my_role)})
          </option>
        ))}
      </Select>
      <p
        className="text-xs leading-5 text-[#6d7269]"
        data-testid="orchard-switcher-hint"
        id="orchard-switcher-hint"
      >
        {helperText}
      </p>
    </div>
  );
}

export function OrchardSwitcher({
  orchards,
  activeOrchardId,
  nextPath,
}: OrchardSwitcherProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      action={setActiveOrchard}
      className="w-full sm:min-w-[280px]"
      data-testid="orchard-switcher-form"
      ref={formRef}
    >
      <input name="next_path" type="hidden" value={nextPath} />
      <OrchardSwitcherFields
        activeOrchardId={activeOrchardId}
        onChange={(nextOrchardId) => {
          if (!nextOrchardId || nextOrchardId === activeOrchardId) {
            return;
          }

          formRef.current?.requestSubmit();
        }}
        orchards={orchards}
      />
    </form>
  );
}

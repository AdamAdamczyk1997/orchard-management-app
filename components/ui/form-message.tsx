import type { ActionResult } from "@/types/contracts";

type FormMessageProps = {
  state: ActionResult<unknown>;
};

export function FormMessage({ state }: FormMessageProps) {
  if (!state.message && !state.error_code) {
    return null;
  }

  return (
    <div
      className={
        state.success
          ? "rounded-2xl border border-[#b9d2be] bg-[#edf6ef] px-4 py-3 text-sm text-[#264430]"
          : "rounded-2xl border border-[#ebc4bb] bg-[#fff4f1] px-4 py-3 text-sm text-[#823225]"
      }
    >
      {state.message ?? state.error_code}
    </div>
  );
}

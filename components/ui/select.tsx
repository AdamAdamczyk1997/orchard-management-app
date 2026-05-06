import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type SelectProps = ComponentProps<"select">;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-xl border border-[#d4c6aa] bg-white px-3 py-2 text-sm text-[#1f2a1f] shadow-sm outline-none transition focus:border-[#b48446] focus:ring-2 focus:ring-[#f0d6a8] disabled:cursor-not-allowed disabled:border-[#e3d8c4] disabled:bg-[#f4efe5] disabled:text-[#7f8c80]",
        className,
      )}
      {...props}
    />
  );
}

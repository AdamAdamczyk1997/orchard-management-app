import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-xl border border-[#d4c6aa] bg-white px-3 py-2 text-sm text-[#1f2a1f] shadow-sm outline-none transition placeholder:text-[#7b7b70] focus:border-[#b48446] focus:ring-2 focus:ring-[#f0d6a8]",
        className,
      )}
      {...props}
    />
  );
}

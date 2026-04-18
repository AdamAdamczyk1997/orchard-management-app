import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type FieldProps = {
  htmlFor: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function Field({
  htmlFor,
  label,
  error,
  hint,
  children,
  className,
}: FieldProps) {
  return (
    <label className={cn("grid gap-2", className)} htmlFor={htmlFor}>
      <span className="text-sm font-medium text-[#304335]">{label}</span>
      {children}
      {error ? (
        <span className="text-sm text-[#9a3f2b]">{error}</span>
      ) : hint ? (
        <span className="text-sm text-[#6f7469]">{hint}</span>
      ) : null}
    </label>
  );
}

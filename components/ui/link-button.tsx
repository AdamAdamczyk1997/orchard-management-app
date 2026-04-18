import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type LinkButtonProps = LinkProps & {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variantClasses: Record<NonNullable<LinkButtonProps["variant"]>, string> = {
  primary:
    "bg-[#2c5b3b] text-white shadow-sm hover:bg-[#234a30] disabled:bg-[#6e8a76]",
  secondary:
    "bg-[#efe6d3] text-[#274430] hover:bg-[#e5d9bf] disabled:bg-[#f4efe5]",
  ghost:
    "bg-transparent text-[#274430] hover:bg-[#efe6d3] disabled:text-[#7f8c80]",
  danger:
    "bg-[#9a3f2b] text-white hover:bg-[#813422] disabled:bg-[#c58a7d]",
};

export function LinkButton({
  children,
  className,
  variant = "primary",
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#b48446] focus:ring-offset-2 focus:ring-offset-[#fbfaf7]",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

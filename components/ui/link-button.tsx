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
    "bg-[#21452d] text-[#fff9f0] shadow-sm hover:bg-[#193622] disabled:bg-[#718976]",
  secondary:
    "bg-[#efe6d3] text-[#1f3c28] hover:bg-[#e2d4b3] disabled:bg-[#f4efe5]",
  ghost:
    "bg-transparent text-[#1f3c28] hover:bg-[#efe6d3] disabled:text-[#7f8c80]",
  danger:
    "bg-[#8d3323] text-[#fff7f5] hover:bg-[#742818] disabled:bg-[#c58a7d]",
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
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#b48446] focus:ring-offset-2 focus:ring-offset-[#fbfaf7]",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

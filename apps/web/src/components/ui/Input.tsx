import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-line bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-cyan/50 focus:bg-white/[0.07] focus:ring-4 focus:ring-cyan/10",
        className
      )}
      {...props}
    />
  );
}

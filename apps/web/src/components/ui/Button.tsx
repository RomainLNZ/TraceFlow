import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "ghost" | "quiet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, variant = "primary", children, ...props }: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-cyan/40 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-white text-ink shadow-glow hover:-translate-y-0.5 hover:bg-cyan",
        variant === "ghost" && "border border-line bg-white/5 text-white hover:bg-white/10",
        variant === "quiet" && "text-muted hover:bg-white/8 hover:text-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

import type { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={cn("glass rounded-lg p-5", className)}>{children}</section>;
}

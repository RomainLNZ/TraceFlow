import { createElement } from "react";
import type { Priority } from "@qualis/types";

export const priorityLabels: Record<Priority, string> = {
  LOW: "Basse",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
  URGENT: "Urgente"
};

export const priorityDotClass: Record<Priority, string> = {
  LOW: "bg-mint",
  MEDIUM: "bg-cyan",
  HIGH: "bg-coral",
  URGENT: "bg-red-500"
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return createElement(
    "span",
    { className: "inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-line px-2 py-1 text-xs text-muted" },
    createElement("span", { className: `h-2.5 w-2.5 rounded-full ${priorityDotClass[priority]}` }),
    priorityLabels[priority]
  );
}

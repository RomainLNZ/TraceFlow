import type { WorkStatus } from "@qualis/types";

export const metrics = [
  { label: "Utilisateurs", value: "1", delta: "admin", tone: "cyan" },
  { label: "Projets", value: "0", delta: "vide", tone: "brand" },
  { label: "Velocity", value: "0", delta: "aucun sprint", tone: "mint" },
  { label: "Retards", value: "0", delta: "aucune alerte", tone: "coral" },
  { label: "Charge globale", value: "0%", delta: "aucune tache", tone: "amber" },
  { label: "Temps restant", value: "0h", delta: "aucune estimation", tone: "cyan" }
];

export const userTasks: Array<{ title: string; status: string; priority: string; time: string }> = [];

export const columns: Array<{ id: WorkStatus; title: string }> = [
  { id: "BACKLOG", title: "Backlog" },
  { id: "TODO", title: "A faire" },
  { id: "IN_PROGRESS", title: "En cours" },
  { id: "REVIEW", title: "En revue" },
  { id: "TESTING", title: "Tests" },
  { id: "BLOCKED", title: "Bloque" },
  { id: "DONE", title: "Termine" }
];

export const boardItems: Array<{
  id: string;
  status: WorkStatus;
  title: string;
  kind: string;
  priority: string;
  assignee: string;
  tags: string[];
}> = [];

export const activity: string[] = [];

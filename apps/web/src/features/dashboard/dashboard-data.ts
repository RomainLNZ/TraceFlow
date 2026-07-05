import type { Priority, WorkStatus } from "@qualis/types";
import { getPayloadErrorMessage } from "@/lib/errors";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type DashboardProject = {
  id: string;
  name: string;
  description: string;
  color: string;
  progress: number;
  status: string;
  createdAt?: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  description?: string | null;
  status: WorkStatus;
  priority: Priority;
  kind: string;
  createdAt?: string;
  project: {
    id: string;
    name: string;
    color: string;
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
};

export type DashboardData = {
  projects: DashboardProject[];
  tasks: DashboardTask[];
};

export const statusLabels: Record<WorkStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "A faire",
  IN_PROGRESS: "En cours",
  REVIEW: "En revue",
  TESTING: "Tests",
  BLOCKED: "Bloque",
  DONE: "Termine"
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(getPayloadErrorMessage(payload, "Impossible de charger les données."));
  }

  return payload.data ?? payload;
}

export async function loadDashboardData(): Promise<DashboardData> {
  return fetchJson<DashboardData>("/api/projects/overview");
}

export function formatTaskAge(value: string | undefined) {
  if (!value) {
    return "recent";
  }

  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) {
    return `il y a ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `il y a ${hours} h`;
  }

  return `il y a ${Math.round(hours / 24)} j`;
}

import { CheckCircle2, CircleDot, FolderKanban, KanbanSquare, LineChart, Loader2, ShieldCheck, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Card } from "@/components/ui/Card";
import { getAccessToken, getSessionUser } from "@/features/auth/session";
import { getPayloadErrorMessage, getRequestErrorMessage } from "@/lib/errors";
import { PriorityBadge } from "@/lib/priority";
import { ensureRealtimeConnected, realtime } from "@/lib/realtime";
import { MetricCard } from "./MetricCard";
import { loadDashboardData, statusLabels } from "./dashboard-data";
import type { DashboardData } from "./dashboard-data";

const emptyData: DashboardData = {
  projects: [],
  tasks: []
};

const statusOrder = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "TESTING", "BLOCKED", "DONE"] as const;
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  title?: string | null;
  department?: string | null;
};

function formatUserName(user: Pick<AdminUser, "firstName" | "lastName">) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionUser = getSessionUser();

  function authHeaders() {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function loadUsers() {
    const response = await fetch(`${API_BASE_URL}/api/users`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(getPayloadErrorMessage(payload, "Impossible de charger les utilisateurs."));
    }

    setUsers(payload.data ?? []);
  }

  async function refreshAdminData() {
    const [dashboard] = await Promise.all([
      loadDashboardData(),
      loadUsers()
    ]);
    setData(dashboard);
  }

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        await refreshAdminData();
      } catch (requestError) {
        setError(getRequestErrorMessage(requestError, "Impossible de charger les indicateurs."));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    ensureRealtimeConnected();
    let refreshTimer: ReturnType<typeof window.setTimeout> | undefined;
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        loadDashboardData()
          .then(setData)
          .catch((requestError) => setError(getRequestErrorMessage(requestError, "Impossible de charger les indicateurs.")));
      }, 120);
    };

    realtime.on("projects:changed", refresh);
    realtime.on("work-items:changed", refresh);
    return () => {
      window.clearTimeout(refreshTimer);
      realtime.off("projects:changed", refresh);
      realtime.off("work-items:changed", refresh);
    };
  }, []);

  async function deleteUser(user: AdminUser) {
    const confirmed = window.confirm(`Supprimer l'utilisateur "${formatUserName(user)}" ?`);

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
        method: "DELETE",
        headers: authHeaders()
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(getPayloadErrorMessage(payload, "Impossible de supprimer l'utilisateur."));
      }

      setUsers((current) => current.filter((item) => item.id !== user.id));
      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => task.assignee?.id === user.id ? { ...task, assignee: null } : task)
      }));
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de supprimer l'utilisateur."));
    }
  }

  async function deleteProject(project: DashboardData["projects"][number]) {
    const confirmed = window.confirm(`Supprimer le projet "${project.name}" et toutes ses taches ?`);

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${project.id}`, {
        method: "DELETE",
        headers: authHeaders()
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(getPayloadErrorMessage(payload, "Impossible de supprimer le projet."));
      }

      setData((current) => ({
        projects: current.projects.filter((item) => item.id !== project.id),
        tasks: current.tasks.filter((task) => task.project.id !== project.id)
      }));
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de supprimer le projet."));
    }
  }

  async function deleteTask(task: DashboardData["tasks"][number]) {
    const confirmed = window.confirm(`Supprimer la tache "${task.title}" ?`);

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${task.project.id}/work-items/${task.id}`, {
        method: "DELETE",
        headers: authHeaders()
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(getPayloadErrorMessage(payload, "Impossible de supprimer la tâche."));
      }

      setData((current) => ({
        ...current,
        tasks: current.tasks.filter((item) => item.id !== task.id)
      }));
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de supprimer la tâche."));
    }
  }

  const summary = useMemo(() => {
    const doneTasks = data.tasks.filter((task) => task.status === "DONE").length;
    const blockedTasks = data.tasks.filter((task) => task.status === "BLOCKED").length;
    const urgentTasks = data.tasks.filter((task) => task.priority === "URGENT").length;
    const progress = data.tasks.length === 0 ? 0 : Math.round((doneTasks / data.tasks.length) * 100);

    return {
      doneTasks,
      blockedTasks,
      urgentTasks,
      progress
    };
  }, [data.tasks]);

  const metrics = [
    { label: "Projets", value: String(data.projects.length), delta: `${data.projects.filter((project) => project.status === "ACTIVE").length} actifs`, tone: "brand" as const },
    { label: "Taches", value: String(data.tasks.length), delta: `${summary.doneTasks} terminees`, tone: "cyan" as const },
    { label: "Progression", value: `${summary.progress}%`, delta: "global", tone: "mint" as const },
    { label: "Bloquees", value: String(summary.blockedTasks), delta: "a traiter", tone: "coral" as const },
    { label: "Urgentes", value: String(summary.urgentTasks), delta: "priorite", tone: "amber" as const },
    { label: "En cours", value: String(data.tasks.filter((task) => task.status === "IN_PROGRESS").length), delta: "actives", tone: "cyan" as const }
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-cyan">Cockpit administrateur</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Pilotage global</h1>
        <p className="mt-3 max-w-2xl text-muted">KPIs calcules depuis les projets et les taches crees dans l'application.</p>
      </div>

      {error && <Card className="border-coral/40 text-sm text-coral">{error}</Card>}

      {isLoading ? (
        <Card className="flex items-center gap-3 text-sm text-muted">
          <Loader2 className="animate-spin text-cyan" size={16} />
          Chargement des indicateurs...
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="min-h-80">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Repartition des taches</h2>
                  <p className="mt-1 text-sm text-muted">Volume par colonne Kanban</p>
                </div>
                <LineChart className="text-cyan" size={20} />
              </div>
              <div className="space-y-3">
                {statusOrder.map((status) => {
                  const count = data.tasks.filter((task) => task.status === status).length;
                  const width = data.tasks.length === 0 ? 0 : Math.max(8, Math.round((count / data.tasks.length) * 100));

                  return (
                    <div key={status} className="grid gap-2 sm:grid-cols-[8rem_1fr_2rem] sm:items-center">
                      <span className="text-sm text-muted">{statusLabels[status]}</span>
                      <div className="h-2 rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan to-brand" style={{ width: `${width}%` }} />
                      </div>
                      <span className="text-right text-sm text-muted">{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <div className="mb-6 flex items-center gap-2">
                <ShieldCheck className="text-mint" size={18} />
                <h2 className="text-lg font-semibold">Sante operationnelle</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-line bg-white/[0.035] p-4">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="text-cyan" size={17} />
                    <span className="text-sm">Dernier projet</span>
                  </div>
                  <span className="text-sm text-muted">{data.projects[0]?.name ?? "aucun"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-line bg-white/[0.035] p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-mint" size={17} />
                    <span className="text-sm">Completion</span>
                  </div>
                  <span className="text-sm text-muted">{summary.progress}%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-line bg-white/[0.035] p-4">
                  <div className="flex items-center gap-3">
                    <CircleDot className="text-cyan" size={17} />
                    <span className="text-sm">Blocages</span>
                  </div>
                  <span className="text-sm text-muted">{summary.blockedTasks}</span>
                </div>
                <Link className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white/5 text-sm font-medium transition hover:bg-white/10" to="/board">
                  <KanbanSquare size={16} />
                  Ouvrir le Kanban
                </Link>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <div className="mb-5 flex items-center gap-2">
                <Users className="text-cyan" size={18} />
                <h2 className="text-lg font-semibold">Utilisateurs</h2>
              </div>
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.035] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{formatUserName(user)}</p>
                      <p className="truncate text-xs text-muted">{user.email} · {user.role}</p>
                    </div>
                    <button
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-coral transition hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      title="Supprimer l'utilisateur"
                      aria-label="Supprimer l'utilisateur"
                      disabled={user.id === sessionUser?.id || user.email === sessionUser?.email}
                      onClick={() => void deleteUser(user)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {users.length === 0 && <p className="text-sm text-muted">Aucun utilisateur charge.</p>}
              </div>
            </Card>

            <Card>
              <div className="mb-5 flex items-center gap-2">
                <FolderKanban className="text-cyan" size={18} />
                <h2 className="text-lg font-semibold">Projets</h2>
              </div>
              <div className="space-y-3">
                {data.projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.035] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                      <p className="text-xs text-muted">{project.progress}% · {project.status}</p>
                    </div>
                    <button className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-coral transition hover:bg-coral/10" type="button" title="Supprimer le projet" aria-label="Supprimer le projet" onClick={() => void deleteProject(project)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-5 flex items-center gap-2">
                <KanbanSquare className="text-cyan" size={18} />
                <h2 className="text-lg font-semibold">Taches</h2>
              </div>
              <div className="space-y-3">
                {data.tasks.slice(0, 8).map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.035] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="truncate text-xs text-muted">{task.project.name} · {statusLabels[task.status]}</p>
                      <div className="mt-2">
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>
                    <button className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-coral transition hover:bg-coral/10" type="button" title="Supprimer la tache" aria-label="Supprimer la tache" onClick={() => void deleteTask(task)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

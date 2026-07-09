import { CalendarDays, CheckCircle2, Clock3, Flame, FolderKanban, Loader2, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Card } from "@/components/ui/Card";
import { getSessionUser } from "@/features/auth/session";
import { getRequestErrorMessage } from "@/lib/errors";
import { PriorityBadge } from "@/lib/priority";
import { ensureRealtimeConnected, realtime } from "@/lib/realtime";
import { formatTaskAge, loadDashboardData, statusLabels } from "./dashboard-data";
import type { DashboardData } from "./dashboard-data";

const emptyData: DashboardData = {
  projects: [],
  tasks: []
};

function formatUserName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function UserDashboard() {
  const user = getSessionUser();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshDashboard(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      setData(await loadDashboardData());
    } catch (requestError) {
      if (!options?.silent) {
        setError(getRequestErrorMessage(requestError, "Impossible de charger le tableau de bord."));
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void refreshDashboard();
  }, []);

  useEffect(() => {
    ensureRealtimeConnected();
    let refreshTimer: ReturnType<typeof window.setTimeout> | undefined;
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refreshDashboard({ silent: true }), 120);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    const refreshInterval = window.setInterval(refresh, 10_000);

    realtime.on("projects:changed", refresh);
    realtime.on("work-items:changed", refresh);
    realtime.on("connect", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(refreshTimer);
      window.clearInterval(refreshInterval);
      realtime.off("projects:changed", refresh);
      realtime.off("work-items:changed", refresh);
      realtime.off("connect", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const userTasks = useMemo(() => {
    if (!user) {
      return [];
    }

    return data.tasks.filter((task) => (
      task.assignee?.id === user.id || task.assignee?.email === user.email
    ));
  }, [data.tasks, user]);

  const stats = useMemo(() => {
    const doneTasks = userTasks.filter((task) => task.status === "DONE").length;
    const activeTasks = userTasks.filter((task) => task.status !== "DONE").length;
    const urgentTasks = userTasks.filter((task) => task.priority === "URGENT").length;
    const activeProjects = data.projects.filter((project) => project.status === "ACTIVE").length;

    return [
      { label: "Actives", value: String(activeTasks), icon: Clock3 },
      { label: "Terminees", value: String(doneTasks), icon: CheckCircle2 },
      { label: "Urgentes", value: String(urgentTasks), icon: Flame },
      { label: "Projets", value: String(activeProjects), icon: Target }
    ];
  }, [data.projects, userTasks]);

  const visibleTasks = userTasks
    .filter((task) => task.status !== "DONE")
    .slice(0, 6);
  const recentTasks = [...userTasks]
    .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-cyan">Espace personnel</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Bonjour{user ? ` ${user.firstName}` : ""}</h1>
          <p className="mt-3 max-w-2xl text-muted">Vue rapide sur tes projets, tes taches en cours et les prochaines actions.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-line bg-white/[0.04] p-3">
              <Icon className="mb-2 text-cyan" size={16} />
              <p className="text-lg font-semibold">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {error && <Card className="border-coral/40 text-sm text-coral">{error}</Card>}

      {isLoading ? (
        <Card className="flex items-center gap-3 text-sm text-muted">
          <Loader2 className="animate-spin text-cyan" size={16} />
          Chargement du dashboard...
        </Card>
      ) : data.projects.length === 0 ? (
        <Card className="grid min-h-72 place-items-center text-center">
          <div>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg border border-line bg-white/[0.04]">
              <FolderKanban className="text-cyan" size={22} />
            </div>
            <h2 className="text-xl font-semibold">Aucun projet pour le moment</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Cree un projet, ajoute quelques taches, puis reviens ici pour suivre l'avancement.
            </p>
            <Link className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-ink shadow-glow transition hover:-translate-y-0.5 hover:bg-cyan" to="/projects">
              Creer un projet
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mes taches</h2>
              <Link className="text-sm text-cyan hover:underline" to="/board">Ouvrir le Kanban</Link>
            </div>
            <div className="space-y-3">
              {visibleTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-3 rounded-lg border border-line bg-white/[0.035] p-4 transition hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {task.project.name} · {statusLabels[task.status]} · {task.assignee ? formatUserName(task.assignee) : "Non attribuee"}
                    </p>
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
              {visibleTasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-line bg-white/[0.025] p-6 text-sm text-muted">
                  Toutes les taches sont terminees.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-5 flex items-center gap-2">
              <CalendarDays className="text-cyan" size={18} />
              <h2 className="text-lg font-semibold">Activite recente</h2>
            </div>
            <div className="space-y-4">
              {recentTasks.map((task) => (
                <div key={task.id} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-cyan" />
                  <div>
                    <p className="text-sm">{task.title}</p>
                    <p className="mt-1 text-xs text-muted">{task.project.name} · {formatTaskAge(task.createdAt)}</p>
                  </div>
                </div>
              ))}
              {recentTasks.length === 0 && <p className="text-sm text-muted">Aucune tache recente.</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

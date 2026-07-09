import { AlertTriangle, CheckCircle2, CircleDot, ClipboardCheck, Flame, Loader2, MoveRight, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Card } from "@/components/ui/Card";
import { getSessionUser } from "@/features/auth/session";
import { formatTaskAge, loadDashboardData, statusLabels } from "@/features/dashboard/dashboard-data";
import type { DashboardData, DashboardTask } from "@/features/dashboard/dashboard-data";
import { getRequestErrorMessage } from "@/lib/errors";
import { PriorityBadge } from "@/lib/priority";
import { ensureRealtimeConnected, realtime } from "@/lib/realtime";

const emptyData: DashboardData = {
  projects: [],
  tasks: []
};

function taskChecklistProgress(task: DashboardTask) {
  const checklist = task.checklist ?? [];
  if (checklist.length === 0) {
    return null;
  }

  const done = checklist.filter((item) => item.done).length;
  return { done, total: checklist.length, percent: Math.round((done / checklist.length) * 100) };
}

function formatUserName(user: NonNullable<DashboardTask["assignee"]>) {
  return `${user.firstName} ${user.lastName}`.trim();
}

function TaskRow({ task, accent = "cyan" }: { task: DashboardTask; accent?: "cyan" | "coral" | "white" }) {
  const checklist = taskChecklistProgress(task);
  const accentClass = accent === "coral" ? "bg-coral" : accent === "white" ? "bg-white" : "bg-cyan";

  return (
    <Link
      className="group block rounded-lg border border-line bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.065]"
      to="/board"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${accentClass}`} />
            <p className="truncate font-medium text-white">{task.title}</p>
          </div>
          <p className="mt-1 text-sm text-muted">
            {task.project.name} · {statusLabels[task.status]} · {task.assignee ? formatUserName(task.assignee) : "Non attribuee"}
          </p>
          {task.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{task.description}</p>}
        </div>
        <PriorityBadge priority={task.priority} />
      </div>
      {checklist && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Checklist</span>
            <span>{checklist.done}/{checklist.total}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-cyan transition-all" style={{ width: `${checklist.percent}%` }} />
          </div>
        </div>
      )}
    </Link>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white/[0.025] p-5 text-sm text-muted">
      {label}
    </div>
  );
}

export function TodayPage() {
  const user = getSessionUser();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshToday() {
    setIsLoading(true);
    setError(null);

    try {
      setData(await loadDashboardData());
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de charger la vue Aujourd'hui."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshToday();
  }, []);

  useEffect(() => {
    ensureRealtimeConnected();
    let refreshTimer: ReturnType<typeof window.setTimeout> | undefined;
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refreshToday(), 120);
    };

    realtime.on("projects:changed", refresh);
    realtime.on("work-items:changed", refresh);
    return () => {
      window.clearTimeout(refreshTimer);
      realtime.off("projects:changed", refresh);
      realtime.off("work-items:changed", refresh);
    };
  }, []);

  const myTasks = useMemo(() => {
    if (!user) {
      return [];
    }

    return data.tasks.filter((task) => task.assignee?.id === user.id || task.assignee?.email === user.email);
  }, [data.tasks, user]);

  const activeTasks = useMemo(() => (
    myTasks.filter((task) => task.status !== "DONE")
  ), [myTasks]);

  const focusTasks = useMemo(() => (
    activeTasks
      .filter((task) => ["TODO", "IN_PROGRESS", "TESTING", "BLOCKED"].includes(task.status))
      .sort((left, right) => {
        const statusWeight = { BLOCKED: 0, URGENT: 1, HIGH: 2 };
        const leftWeight = left.status === "BLOCKED" ? statusWeight.BLOCKED : left.priority === "URGENT" ? statusWeight.URGENT : left.priority === "HIGH" ? statusWeight.HIGH : 3;
        const rightWeight = right.status === "BLOCKED" ? statusWeight.BLOCKED : right.priority === "URGENT" ? statusWeight.URGENT : right.priority === "HIGH" ? statusWeight.HIGH : 3;
        return leftWeight - rightWeight;
      })
      .slice(0, 6)
  ), [activeTasks]);

  const urgentTasks = activeTasks.filter((task) => task.priority === "URGENT" || task.status === "BLOCKED").slice(0, 5);
  const reviewTasks = activeTasks.filter((task) => task.status === "REVIEW" || task.status === "TESTING").slice(0, 5);
  const checklistTasks = activeTasks
    .filter((task) => {
      const progress = taskChecklistProgress(task);
      return progress && progress.done < progress.total;
    })
    .slice(0, 5);

  const stats = [
    { label: "A faire", value: activeTasks.filter((task) => task.status === "TODO").length, icon: CircleDot },
    { label: "Urgences", value: urgentTasks.length, icon: Flame },
    { label: "En validation", value: reviewTasks.length, icon: ClipboardCheck },
    { label: "Checklist", value: checklistTasks.length, icon: CheckCircle2 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-cyan">Vue personnelle</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Aujourd'hui</h1>
          <p className="mt-3 max-w-2xl text-muted">Tes priorites, tes urgences et les validations qui meritent ton attention maintenant.</p>
        </div>
        <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-ink shadow-glow transition hover:-translate-y-0.5 hover:bg-cyan" to="/board">
          Ouvrir le Kanban
          <MoveRight size={16} />
        </Link>
      </div>

      {error && <Card className="border-coral/40 text-sm text-coral">{error}</Card>}

      {isLoading ? (
        <Card className="flex items-center gap-3 text-sm text-muted">
          <Loader2 className="animate-spin text-cyan" size={16} />
          Chargement de la journee...
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-line bg-white/[0.04] p-4">
                <Icon className="mb-3 text-cyan" size={18} />
                <p className="text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-sm text-muted">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">A faire maintenant</h2>
                  <p className="mt-1 text-sm text-muted">Les cartes les plus utiles pour avancer aujourd'hui.</p>
                </div>
                <TimerReset className="text-cyan" size={20} />
              </div>
              <div className="space-y-3">
                {focusTasks.map((task) => <TaskRow key={task.id} task={task} accent={task.status === "BLOCKED" ? "coral" : "cyan"} />)}
                {focusTasks.length === 0 && <EmptyPanel label="Rien d'urgent dans ta file. Respiration rare, profite." />}
              </div>
            </Card>

            <div className="space-y-6">
              <Card>
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-coral" size={18} />
                  <h2 className="text-lg font-semibold">Urgences et blocages</h2>
                </div>
                <div className="space-y-3">
                  {urgentTasks.map((task) => <TaskRow key={task.id} task={task} accent="coral" />)}
                  {urgentTasks.length === 0 && <EmptyPanel label="Aucun blocage ou urgent assigne." />}
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardCheck className="text-cyan" size={18} />
                  <h2 className="text-lg font-semibold">Validations en attente</h2>
                </div>
                <div className="space-y-3">
                  {reviewTasks.map((task) => <TaskRow key={task.id} task={task} accent="white" />)}
                  {reviewTasks.length === 0 && <EmptyPanel label="Aucune tache en revue ou en tests." />}
                </div>
              </Card>
            </div>
          </div>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-cyan" size={18} />
              <h2 className="text-lg font-semibold">Checklists a terminer</h2>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {checklistTasks.map((task) => <TaskRow key={task.id} task={task} />)}
              {checklistTasks.length === 0 && <EmptyPanel label="Aucune checklist incomplete sur tes taches actives." />}
            </div>
          </Card>

          <p className="text-xs text-muted">Derniere mise a jour: {formatTaskAge(new Date().toISOString())}</p>
        </>
      )}
    </div>
  );
}

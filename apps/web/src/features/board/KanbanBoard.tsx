import { DndContext, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { EyeOff, GripVertical, Plus, RotateCcw, Settings2, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Priority, WorkStatus } from "@qualis/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getAccessToken, getSessionUser } from "@/features/auth/session";
import { getPayloadErrorMessage, getRequestErrorMessage } from "@/lib/errors";
import { columns } from "@/lib/mock-data";
import { PriorityBadge, priorityLabels } from "@/lib/priority";
import { ensureRealtimeConnected, realtime } from "@/lib/realtime";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const BOARD_COLUMNS_STORAGE_KEY = "traceflow.kanban.columns";

type Project = {
  id: string;
  name: string;
  color: string;
};

type WorkItem = {
  id: string;
  project: Project;
  status: WorkStatus;
  title: string;
  description?: string | null;
  kind: string;
  priority: Priority;
  tags: string[];
  assignee?: UserSummary | null;
};

type UserSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type BoardColumn = {
  id: WorkStatus;
  title: string;
  isVisible: boolean;
};

const priorities: Array<{ value: Priority; label: string }> = [
  { value: "LOW", label: priorityLabels.LOW },
  { value: "MEDIUM", label: priorityLabels.MEDIUM },
  { value: "HIGH", label: priorityLabels.HIGH },
  { value: "URGENT", label: priorityLabels.URGENT }
];

const defaultBoardColumns: BoardColumn[] = columns.map((column) => ({
  ...column,
  isVisible: true
}));

function formatUserName(user: Pick<UserSummary, "firstName" | "lastName">) {
  return `${user.firstName} ${user.lastName}`.trim();
}

function loadStoredBoardColumns() {
  try {
    const rawColumns = localStorage.getItem(BOARD_COLUMNS_STORAGE_KEY);
    if (!rawColumns) {
      return defaultBoardColumns;
    }

    const storedColumns = JSON.parse(rawColumns) as Partial<BoardColumn>[];
    const mergedColumns = defaultBoardColumns.map((column) => {
      const storedColumn = storedColumns.find((item) => item.id === column.id);
      return {
        ...column,
        title: typeof storedColumn?.title === "string" && storedColumn.title.trim() ? storedColumn.title.trim() : column.title,
        isVisible: typeof storedColumn?.isVisible === "boolean" ? storedColumn.isVisible : column.isVisible
      };
    });

    return mergedColumns.some((column) => column.isVisible) ? mergedColumns : defaultBoardColumns;
  } catch {
    return defaultBoardColumns;
  }
}

function TaskCard({
  item,
  isDragging = false,
  isOverlay = false,
  onDelete
}: {
  item: WorkItem;
  isDragging?: boolean;
  isOverlay?: boolean;
  onDelete?: ((item: WorkItem) => void) | undefined;
}) {
  return (
    <article
      className={`rounded-lg border border-line bg-white/[0.045] p-4 shadow-panel transition ${
        isOverlay ? "w-[18rem] cursor-grabbing bg-ink/95" : "cursor-grab hover:-translate-y-0.5 hover:bg-white/[0.07] active:cursor-grabbing"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-5">{item.title}</p>
        <div className="flex shrink-0 items-center gap-1">
          {onDelete && !isOverlay && (
            <button
              className="grid h-7 w-7 place-items-center rounded-md text-coral transition hover:bg-coral/10"
              type="button"
              title="Supprimer la tache"
              aria-label="Supprimer la tache"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(item);
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
          <GripVertical className="text-muted" size={16} />
        </div>
      </div>
      {item.description && <p className="mb-4 text-xs leading-5 text-muted">{item.description}</p>}
      <div className="mb-4 flex items-center gap-2 rounded-md border border-line bg-white/[0.035] px-2 py-1.5 text-xs text-muted">
        <span className="grid h-5 w-5 place-items-center rounded bg-white/[0.06] text-[10px] font-semibold text-white">
          {item.assignee ? `${item.assignee.firstName[0] ?? ""}${item.assignee.lastName[0] ?? ""}`.toUpperCase() : "--"}
        </span>
        {item.assignee ? formatUserName(item.assignee) : "Non attribuee"}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <PriorityBadge priority={item.priority} />
        <span>{item.kind}</span>
      </div>
    </article>
  );
}

function DraggableTaskCard({ item, onDelete }: { item: WorkItem; onDelete?: ((item: WorkItem) => void) | undefined }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { status: item.status }
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <TaskCard item={item} isDragging={isDragging} onDelete={onDelete} />
    </div>
  );
}

function KanbanColumn({ column, children }: { column: BoardColumn; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });

  return (
    <section key={column.id} ref={setNodeRef} className="w-[18rem] flex-none">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{column.title}</h2>
      </div>
      <div className={`min-h-32 space-y-3 rounded-lg transition ${isOver ? "bg-cyan/10 ring-2 ring-cyan/30" : ""}`}>
        {children}
      </div>
    </section>
  );
}

export function KanbanBoard() {
  const sessionUser = getSessionUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [items, setItems] = useState<WorkItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [boardColumns, setBoardColumns] = useState<BoardColumn[]>(loadStoredBoardColumns);
  const [isCustomizingBoard, setIsCustomizingBoard] = useState(false);
  const isAdmin = sessionUser?.role === "ADMIN";

  const visibleColumns = useMemo(() => boardColumns.filter((column) => column.isVisible), [boardColumns]);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const activeTask = useMemo(
    () => items.find((item) => item.id === activeTaskId) ?? null,
    [activeTaskId, items]
  );
  const visibleItems = useMemo(() => {
    if (isAdmin) {
      return items;
    }

    if (!sessionUser) {
      return [];
    }

    return items.filter((item) => (
      item.assignee?.id === sessionUser.id || item.assignee?.email === sessionUser.email
    ));
  }, [isAdmin, items, sessionUser]);
  const itemCountByStatus = useMemo(() => (
    items.reduce<Record<WorkStatus, number>>((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {} as Record<WorkStatus, number>)
  ), [items]);
  const defaultTaskStatus = visibleColumns[0]?.id ?? "BACKLOG";

  function authHeaders() {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function persistBoardColumns(nextColumns: BoardColumn[]) {
    setBoardColumns(nextColumns);
    localStorage.setItem(BOARD_COLUMNS_STORAGE_KEY, JSON.stringify(nextColumns));
  }

  function renameColumn(columnId: WorkStatus, nextTitle: string) {
    persistBoardColumns(boardColumns.map((column) => (
      column.id === columnId ? { ...column, title: nextTitle } : column
    )));
  }

  function toggleColumnVisibility(columnId: WorkStatus) {
    const column = boardColumns.find((item) => item.id === columnId);
    if (!column) {
      return;
    }

    if (column.isVisible && (itemCountByStatus[columnId] ?? 0) > 0) {
      setError("Vide d'abord cette étape avant de la masquer.");
      return;
    }

    const nextColumns = boardColumns.map((item) => (
      item.id === columnId ? { ...item, isVisible: !item.isVisible } : item
    ));

    if (!nextColumns.some((item) => item.isVisible)) {
      setError("Le tableau doit garder au moins une étape visible.");
      return;
    }

    setError(null);
    persistBoardColumns(nextColumns);
  }

  function resetBoardColumns() {
    setError(null);
    persistBoardColumns(defaultBoardColumns);
  }

  async function loadProjects() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(getPayloadErrorMessage(payload, "Impossible de charger les projets."));
      }

      const loadedProjects = payload.data ?? [];
      setProjects(loadedProjects);
      setSelectedProjectId((current) => loadedProjects.some((project: Project) => project.id === current) ? current : loadedProjects[0]?.id || "");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de charger les projets."));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(getPayloadErrorMessage(payload, "Impossible de charger les utilisateurs."));
      }

      setUsers(payload.data ?? []);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de charger les utilisateurs."));
    }
  }

  async function loadWorkItems(projectId: string) {
    if (!projectId) {
      setItems([]);
      return;
    }

    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/work-items`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(getPayloadErrorMessage(payload, "Impossible de charger les tâches."));
      }

      setItems(payload.data ?? []);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de charger les tâches."));
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProjectId) {
      setError("Crée d'abord un projet avant d'ajouter une tâche.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${selectedProjectId}/work-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          status: defaultTaskStatus,
          assigneeId: assigneeId || null
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(getPayloadErrorMessage(payload, "Impossible de créer la tâche."));
      }

      setItems((current) => [payload.data, ...current]);
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setAssigneeId("");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de créer la tâche."));
    } finally {
      setIsCreating(false);
    }
  }

  async function moveTask(itemId: string, nextStatus: WorkStatus) {
    const item = items.find((current) => current.id === itemId);

    if (!item || item.status === nextStatus || !selectedProjectId) {
      return;
    }

    const previousItems = items;
    setItems((current) => current.map((currentItem) => (
      currentItem.id === itemId ? { ...currentItem, status: nextStatus } : currentItem
    )));
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${selectedProjectId}/work-items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(getPayloadErrorMessage(payload, "Impossible de déplacer la tâche."));
      }

      setItems((current) => current.map((currentItem) => (
        currentItem.id === itemId ? payload.data : currentItem
      )));
    } catch (requestError) {
      setItems(previousItems);
      setError(getRequestErrorMessage(requestError, "Impossible de déplacer la tâche."));
    }
  }

  async function deleteTask(item: WorkItem) {
    const confirmed = window.confirm(`Supprimer la tache "${item.title}" ?`);

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${item.project.id}/work-items/${item.id}`, {
        method: "DELETE",
        headers: authHeaders()
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(getPayloadErrorMessage(payload, "Impossible de supprimer la tâche."));
      }

      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de supprimer la tâche."));
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const itemId = String(event.active.id);
    const nextStatus = event.over?.id as WorkStatus | undefined;

    setActiveTaskId(null);

    if (!nextStatus || !visibleColumns.some((column) => column.id === nextStatus)) {
      return;
    }

    void moveTask(itemId, nextStatus);
  }

  useEffect(() => {
    void loadProjects();
    void loadUsers();
  }, []);

  useEffect(() => {
    void loadWorkItems(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    ensureRealtimeConnected();
    const refreshProjects = () => void loadProjects();
    const refreshWorkItems = (payload?: { projectId?: string }) => {
      if (!payload?.projectId || payload.projectId === selectedProjectId) {
        void loadWorkItems(selectedProjectId);
      }
    };

    realtime.on("projects:changed", refreshProjects);
    realtime.on("work-items:changed", refreshWorkItems);
    return () => {
      realtime.off("projects:changed", refreshProjects);
      realtime.off("work-items:changed", refreshWorkItems);
    };
  }, [selectedProjectId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-cyan">Projet</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Tableau Kanban</h1>
          <p className="mt-3 max-w-2xl text-muted">Cree des taches, puis suis leur avancement par colonne.</p>
        </div>
        <label className="block min-w-72 space-y-2 text-sm">
          <span className="font-medium">Projet actif</span>
          <select
            className="h-11 w-full rounded-lg border border-line bg-ink px-3 text-sm text-white outline-none transition focus:border-cyan/50 focus:ring-4 focus:ring-cyan/10"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            disabled={isLoading || projects.length === 0}
          >
            {projects.length === 0 && <option value="">Aucun projet</option>}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <Card className="border-coral/40 text-sm text-coral">{error}</Card>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Étapes visibles: {visibleColumns.map((column) => column.title || column.id).join(" · ")}</p>
        <Button type="button" variant="ghost" onClick={() => setIsCustomizingBoard((current) => !current)}>
          <Settings2 size={16} />
          Personnaliser les étapes
        </Button>
      </div>

      {isCustomizingBoard && (
        <Card className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Étapes du tableau</h2>
              <p className="mt-1 text-sm text-muted">Renomme les colonnes ou masque les étapes vides.</p>
            </div>
            <Button type="button" variant="quiet" onClick={resetBoardColumns}>
              <RotateCcw size={16} />
              Réinitialiser
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {boardColumns.map((column) => {
              const itemCount = itemCountByStatus[column.id] ?? 0;
              const canHide = !column.isVisible || itemCount === 0;
              return (
                <div key={column.id} className="flex items-center gap-3 rounded-lg border border-line bg-white/[0.035] p-3">
                  <label className="min-w-0 flex-1 space-y-1 text-sm">
                    <span className="text-xs uppercase tracking-wide text-muted">{column.id}</span>
                    <Input
                      value={column.title}
                      onChange={(event) => renameColumn(column.id, event.target.value)}
                      onBlur={(event) => {
                        if (!event.target.value.trim()) {
                          renameColumn(column.id, columns.find((item) => item.id === column.id)?.title ?? column.id);
                        }
                      }}
                    />
                  </label>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-md border border-line bg-white/[0.04] px-2 py-0.5 text-xs text-muted">{itemCount}</span>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white/[0.04] text-muted transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      title={column.isVisible ? "Masquer l'étape" : "Afficher l'étape"}
                      aria-label={column.isVisible ? "Masquer l'étape" : "Afficher l'étape"}
                      disabled={!canHide}
                      onClick={() => toggleColumnVisibility(column.id)}
                    >
                      <EyeOff size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <form className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr_auto_auto_auto]" onSubmit={createTask}>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Titre de la tache</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex: Preparer le sprint" required minLength={2} disabled={!selectedProjectId} />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Description</span>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contexte ou details utiles" disabled={!selectedProjectId} />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Priorite</span>
            <select
              className="h-11 w-full rounded-lg border border-line bg-ink px-3 text-sm text-white outline-none transition focus:border-cyan/50 focus:ring-4 focus:ring-cyan/10"
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
              disabled={!selectedProjectId}
            >
              {priorities.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Attribuee a</span>
            <select
              className="h-11 w-full rounded-lg border border-line bg-ink px-3 text-sm text-white outline-none transition focus:border-cyan/50 focus:ring-4 focus:ring-cyan/10"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              disabled={!selectedProjectId}
            >
              <option value="">Non attribuee</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{formatUserName(user)}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button className="h-11 w-full whitespace-nowrap" type="submit" disabled={isCreating || !selectedProjectId}>
              <Plus size={16} />
              Ajouter
            </Button>
          </div>
        </form>
      </Card>

      {!isLoading && projects.length === 0 && (
        <Card className="text-sm text-muted">Aucun projet disponible. Va dans Projets pour creer le premier projet.</Card>
      )}

      {selectedProject && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedProject.color }} />
          {selectedProject.name}
        </div>
      )}

      <DndContext onDragStart={handleDragStart} onDragCancel={() => setActiveTaskId(null)} onDragEnd={handleDragEnd}>
        <div className="scrollbar-thin -mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
          {visibleColumns.map((column) => {
            const columnItems = visibleItems.filter((item) => item.status === column.id);
            return (
              <KanbanColumn key={column.id} column={column}>
                <div className="mb-3 flex items-center justify-end px-1">
                  <span className="rounded-md border border-line bg-white/[0.04] px-2 py-0.5 text-xs text-muted">{columnItems.length}</span>
                </div>
                {columnItems.map((item) => (
                  <DraggableTaskCard key={item.id} item={item} onDelete={isAdmin ? deleteTask : undefined} />
                ))}
                {columnItems.length === 0 && <Card className="p-4 text-sm text-muted">Aucune carte</Card>}
              </KanbanColumn>
            );
          })}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCard item={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

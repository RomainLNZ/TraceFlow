import { CheckCircle2, FolderKanban, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getAccessToken, getSessionUser } from "@/features/auth/session";
import { apiFetch } from "@/lib/api";
import { getPayloadErrorMessage, getRequestErrorMessage } from "@/lib/errors";
import { ensureRealtimeConnected, realtime } from "@/lib/realtime";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type Project = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  progress: number;
  status: string;
};

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectColor, setProjectColor] = useState("#22D3EE");
  const isAdmin = getSessionUser()?.role === "ADMIN";

  function authHeaders() {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function loadProjects(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/projects`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(getPayloadErrorMessage(payload, "Impossible de charger les projets."));
      }

      setProjects(payload.data ?? []);
    } catch (requestError) {
      if (!options?.silent) {
        setError(getRequestErrorMessage(requestError, "Impossible de charger les projets."));
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          color: projectColor
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(getPayloadErrorMessage(payload, "Impossible de créer le projet."));
      }

      setProjects((current) => [payload.data, ...current]);
      setProjectName("");
      setProjectDescription("");
      setProjectColor("#22D3EE");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de créer le projet."));
    } finally {
      setIsCreating(false);
    }
  }

  async function completeProject(project: Project) {
    setError(null);

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/projects/${project.id}`, {
        method: "PATCH",
        headers: authHeaders()
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(getPayloadErrorMessage(payload, "Impossible de terminer le projet."));
      }

      setProjects((current) => current.map((item) => (item.id === project.id ? payload.data : item)));
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de terminer le projet."));
    }
  }

  async function deleteProject(project: Project) {
    const confirmed = window.confirm(`Supprimer le projet "${project.name}" et toutes ses taches ?`);

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/projects/${project.id}`, {
        method: "DELETE",
        headers: authHeaders()
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(getPayloadErrorMessage(payload, "Impossible de supprimer le projet."));
      }

      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Impossible de supprimer le projet."));
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    ensureRealtimeConnected();
    const refresh = () => void loadProjects({ silent: true });
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    const refreshInterval = window.setInterval(refresh, 10_000);

    realtime.on("projects:changed", refresh);
    realtime.on("connect", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(refreshInterval);
      realtime.off("projects:changed", refresh);
      realtime.off("connect", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-cyan">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Projets & roadmap</h1>
        </div>
        <Button variant="ghost" onClick={() => void loadProjects()} disabled={isLoading}>
          <RefreshCw size={16} />
          Actualiser
        </Button>
      </div>

      <Card>
        <form className="grid gap-4 lg:grid-cols-[1fr_1.4fr_auto_auto]" onSubmit={createProject}>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Nom du projet</span>
            <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex: Refonte produit" required minLength={2} />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Description</span>
            <Input value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} placeholder="Objectif, contexte, livrable..." />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Couleur</span>
            <Input className="h-11 w-24 p-1" type="color" value={projectColor} onChange={(event) => setProjectColor(event.target.value)} />
          </label>
          <div className="flex items-end">
            <Button className="h-11 w-full whitespace-nowrap" type="submit" disabled={isCreating}>
              <Plus size={16} />
              Creer
            </Button>
          </div>
        </form>
      </Card>

      {error && <Card className="border-coral/40 text-sm text-coral">{error}</Card>}

      {isLoading && <Card className="text-sm text-muted">Chargement des projets...</Card>}

      {!isLoading && projects.length === 0 && (
        <Card className="grid min-h-72 place-items-center text-center">
          <div>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg border border-line bg-white/[0.04]">
              <FolderKanban className="text-cyan" size={22} />
            </div>
            <h2 className="text-xl font-semibold">Aucun projet</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Cree ton premier projet avec le formulaire ci-dessus. Il apparaitra ensuite ici et dans le Kanban.
            </p>
          </div>
        </Card>
      )}

      {!isLoading && projects.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id}>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-lg text-ink" style={{ backgroundColor: project.color }}>
                    <FolderKanban size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{project.name}</h2>
                    <p className="text-sm text-muted">
                      {project.progress}% complete · {project.status === "DONE" ? "Termine" : project.status}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="h-9 px-3"
                    variant="ghost"
                    type="button"
                    onClick={() => void completeProject(project)}
                    disabled={project.status === "DONE"}
                  >
                    <CheckCircle2 size={15} />
                    Terminer
                  </Button>
                  {isAdmin && (
                    <Button className="h-9 px-3 text-coral" variant="ghost" type="button" onClick={() => void deleteProject(project)}>
                      <Trash2 size={15} />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm leading-6 text-muted">{project.description}</p>
              <div className="mt-6 h-2 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan to-brand" style={{ width: `${project.progress}%` }} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Priority, WorkItemKind, WorkStatus } from "@prisma/client";

type LocalUserSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type LocalProject = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  progress: number;
  status: string;
  createdAt: string;
  owner: LocalUserSummary;
};

type LocalWorkItem = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  kind: WorkItemKind;
  status: WorkStatus;
  priority: Priority;
  estimatedMinutes: number | null;
  spentMinutes: number;
  dueDate: string | null;
  tags: string[];
  assigneeId?: string | null;
  createdAt: string;
};

type LocalState = {
  projects: LocalProject[];
  workItems: LocalWorkItem[];
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(moduleDir, "../../../.data");
const dataFile = path.join(dataDir, "projects.json");
const authDataFile = path.join(dataDir, "dev-auth.json");

const defaultOwner: LocalUserSummary = {
  id: "local-admin",
  firstName: "Admin",
  lastName: "",
  email: "admin@qualis.local",
  role: "ADMIN"
};

async function readState(): Promise<LocalState> {
  try {
    return JSON.parse(await readFile(dataFile, "utf8")) as LocalState;
  } catch {
    return { projects: [], workItems: [] };
  }
}

async function writeState(state: LocalState) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2));
}

async function readUsers(): Promise<LocalUserSummary[]> {
  try {
    const store = JSON.parse(await readFile(authDataFile, "utf8")) as { users?: LocalUserSummary[] };
    return store.users ?? [];
  } catch {
    return [defaultOwner];
  }
}

function compareCreatedAtDesc<T extends { createdAt: string }>(left: T, right: T) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

async function withProject(item: LocalWorkItem, project: LocalProject, users?: LocalUserSummary[]) {
  const availableUsers = users ?? await readUsers();
  const assignee = item.assigneeId ? availableUsers.find((user) => user.id === item.assigneeId) ?? null : null;

  return {
    ...item,
    project: {
      id: project.id,
      name: project.name,
      color: project.color
    },
    assignee
  };
}

function updateProgress(state: LocalState, projectId: string) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) {
    return;
  }

  const projectItems = state.workItems.filter((item) => item.projectId === projectId);
  const doneItems = projectItems.filter((item) => item.status === WorkStatus.DONE);
  project.progress = projectItems.length === 0 ? 0 : Math.round((doneItems.length / projectItems.length) * 100);
}

export const localProjectsStore = {
  async listProjects() {
    const state = await readState();
    return state.projects.sort(compareCreatedAtDesc);
  },

  async createProject(input: { name: string; description?: string | undefined; color?: string | undefined }) {
    const state = await readState();
    const project: LocalProject = {
      id: randomUUID(),
      name: input.name,
      description: input.description ?? "",
      icon: "Sparkles",
      color: input.color ?? "#22D3EE",
      progress: 0,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      owner: defaultOwner
    };

    state.projects.unshift(project);
    await writeState(state);
    return project;
  },

  async completeProject(projectId: string) {
    const state = await readState();
    const project = state.projects.find((item) => item.id === projectId);

    if (!project) {
      const error = new Error("Projet introuvable.");
      Object.assign(error, { status: 404 });
      throw error;
    }

    project.status = "DONE";
    project.progress = 100;
    await writeState(state);
    return project;
  },

  async deleteProject(projectId: string) {
    const state = await readState();
    const projectExists = state.projects.some((item) => item.id === projectId);

    if (!projectExists) {
      const error = new Error("Projet introuvable.");
      Object.assign(error, { status: 404 });
      throw error;
    }

    state.projects = state.projects.filter((item) => item.id !== projectId);
    state.workItems = state.workItems.filter((item) => item.projectId !== projectId);
    await writeState(state);
  },

  async removeUserAssignments(userId: string) {
    const state = await readState();
    for (const item of state.workItems) {
      if (item.assigneeId === userId) {
        item.assigneeId = null;
      }
    }

    await writeState(state);
  },

  async listWorkItems(projectId: string) {
    const state = await readState();
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) {
      return [];
    }

    const users = await readUsers();
    const items = state.workItems
      .filter((item) => item.projectId === projectId)
      .sort(compareCreatedAtDesc);

    return Promise.all(items.map((item) => withProject(item, project, users)));
  },

  async listOverview() {
    const state = await readState();
    const users = await readUsers();
    const projectById = new Map(state.projects.map((project) => [project.id, project]));
    const items = state.workItems
      .filter((item) => projectById.has(item.projectId))
      .sort(compareCreatedAtDesc);

    return {
      projects: state.projects.sort(compareCreatedAtDesc),
      tasks: await Promise.all(items.map((item) => withProject(item, projectById.get(item.projectId)!, users)))
    };
  },

  async createWorkItem(projectId: string, input: {
    title: string;
    description?: string | undefined;
    status: WorkStatus;
    priority: Priority;
    kind: WorkItemKind;
    assigneeId?: string | null | undefined;
  }) {
    const state = await readState();
    const project = state.projects.find((item) => item.id === projectId);

    if (!project) {
      const error = new Error("Projet introuvable.");
      Object.assign(error, { status: 404 });
      throw error;
    }

    const item: LocalWorkItem = {
      id: randomUUID(),
      projectId,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      kind: input.kind,
      estimatedMinutes: null,
      spentMinutes: 0,
      dueDate: null,
      tags: [],
      assigneeId: input.assigneeId ?? null,
      createdAt: new Date().toISOString()
    };

    state.workItems.unshift(item);
    updateProgress(state, projectId);
    await writeState(state);

    return withProject(item, project);
  },

  async updateWorkItemStatus(projectId: string, workItemId: string, status: WorkStatus) {
    const state = await readState();
    const project = state.projects.find((item) => item.id === projectId);
    const workItem = state.workItems.find((item) => item.id === workItemId && item.projectId === projectId);

    if (!project || !workItem) {
      const error = new Error("Tache introuvable.");
      Object.assign(error, { status: 404 });
      throw error;
    }

    workItem.status = status;
    updateProgress(state, projectId);
    await writeState(state);

    return withProject(workItem, project);
  },

  async deleteWorkItem(projectId: string, workItemId: string) {
    const state = await readState();
    const workItemExists = state.workItems.some((item) => item.id === workItemId && item.projectId === projectId);

    if (!workItemExists) {
      const error = new Error("Tache introuvable.");
      Object.assign(error, { status: 404 });
      throw error;
    }

    state.workItems = state.workItems.filter((item) => item.id !== workItemId);
    updateProgress(state, projectId);
    await writeState(state);
  }
};

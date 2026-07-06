import { Router } from "express";
import type { Request } from "express";
import { Priority, Role, WorkItemKind, WorkStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/async.middleware.js";
import { readAuth, requireAdmin } from "../../middleware/auth.middleware.js";
import { localProjectsStore } from "./projects.local-store.js";

export const projectsRouter = Router();

const localFallbackDurationMs = 30_000;
let localFallbackUntil = 0;

function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isDatabaseUnavailable(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "PrismaClientInitializationError" || error.message.includes("Can't reach database server"))
  );
}

async function withLocalFallback<TDatabase, TLocal>(
  databaseAction: () => Promise<TDatabase>,
  localAction: () => Promise<TLocal>
): Promise<TDatabase | TLocal> {
  if (Date.now() < localFallbackUntil) {
    return localAction();
  }

  try {
    return await databaseAction();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      localFallbackUntil = Date.now() + localFallbackDurationMs;
      return localAction();
    }

    throw error;
  }
}

const projectSchema = z.object({
  name: z.string().trim().min(2, "Le nom du projet doit contenir au moins 2 caracteres.").max(120),
  description: z.string().trim().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

const taskSchema = z.object({
  title: z.string().trim().min(2, "Le titre de la tache doit contenir au moins 2 caracteres.").max(180),
  description: z.string().trim().max(800).optional(),
  status: z.nativeEnum(WorkStatus).default(WorkStatus.BACKLOG),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  kind: z.nativeEnum(WorkItemKind).default(WorkItemKind.TASK),
  assigneeId: z.string().nullable().optional()
});

const taskStatusSchema = z.object({
  status: z.nativeEnum(WorkStatus)
});

const projectSelect = {
  id: true,
  name: true,
  description: true,
  icon: true,
  color: true,
  progress: true,
  status: true,
  createdAt: true,
  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true
    }
  }
} as const;

const workItemSelect = {
  id: true,
  title: true,
  description: true,
  kind: true,
  status: true,
  priority: true,
  estimatedMinutes: true,
  spentMinutes: true,
  dueDate: true,
  tags: true,
  createdAt: true,
  project: {
    select: {
      id: true,
      name: true,
      color: true
    }
  },
  assignee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatarUrl: true,
      title: true,
      department: true
    }
  }
} as const;

function getTokenUserId(req: Request) {
  return readAuth(req)?.userId ?? null;
}

async function getProjectOwnerId(req: Request) {
  const tokenUserId = getTokenUserId(req);

  if (tokenUserId) {
    const user = await prisma.user.findUnique({ where: { id: tokenUserId }, select: { id: true } });
    if (user) {
      return user.id;
    }
  }

  const existingUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (existingUser) {
    return existingUser.id;
  }

  const fallbackUser = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "",
      email: process.env.ADMIN_EMAIL ?? `local-owner-${crypto.randomUUID()}@traceflow.local`,
      passwordHash: crypto.randomUUID(),
      role: Role.ADMIN
    },
    select: { id: true }
  });

  return fallbackUser.id;
}

async function getWorkspaceId() {
  const existingWorkspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (existingWorkspace) {
    return existingWorkspace.id;
  }

  const workspace = await prisma.workspace.create({
    data: { name: "Qualis Workspace" },
    select: { id: true }
  });

  return workspace.id;
}

async function updateProjectProgress(projectId: string) {
  const [total, done] = await Promise.all([
    prisma.workItem.count({ where: { projectId } }),
    prisma.workItem.count({ where: { projectId, status: WorkStatus.DONE } })
  ]);
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  await prisma.project.update({
    where: { id: projectId },
    data: { progress }
  });
}

function emitWorkspaceChange(req: Request, event: "projects:changed" | "work-items:changed", payload: Record<string, unknown>) {
  req.app.get("io")?.emit(event, payload);
}

projectsRouter.get("/", asyncHandler(async (_req, res) => {
  const projects = await withLocalFallback(
    () => prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      select: projectSelect
    }),
    () => localProjectsStore.listProjects()
  );

  res.json({ data: projects });
}));

projectsRouter.get("/overview", asyncHandler(async (_req, res) => {
  const data = await withLocalFallback(
    async () => {
      const [projects, tasks] = await Promise.all([
        prisma.project.findMany({
          orderBy: { createdAt: "desc" },
          select: projectSelect
        }),
        prisma.workItem.findMany({
          orderBy: { createdAt: "desc" },
          select: workItemSelect
        })
      ]);

      return { projects, tasks };
    },
    () => localProjectsStore.listOverview()
  );

  res.json({ data });
}));

projectsRouter.post("/", asyncHandler(async (req, res) => {
  const input = projectSchema.parse(req.body);
  const project = await withLocalFallback(
    async () => {
      const [ownerId, workspaceId] = await Promise.all([getProjectOwnerId(req), getWorkspaceId()]);

      return prisma.project.create({
        data: {
          name: input.name,
          description: input.description ?? "",
          color: input.color ?? "#22D3EE",
          ownerId,
          workspaceId
        },
        select: projectSelect
      });
    },
    () => localProjectsStore.createProject(input)
  );

  emitWorkspaceChange(req, "projects:changed", { projectId: project.id });
  res.status(201).json({ data: project });
}));

projectsRouter.patch("/:projectId", asyncHandler(async (req, res) => {
  const projectId = getRouteParam(req.params.projectId);
  const project = await withLocalFallback(
    async () => {
      const existingProject = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });

      if (!existingProject) {
        const error = new Error("Projet introuvable.");
        Object.assign(error, { status: 404 });
        throw error;
      }

      return prisma.project.update({
        where: { id: existingProject.id },
        data: {
          status: "DONE",
          progress: 100
        },
        select: projectSelect
      });
    },
    () => localProjectsStore.completeProject(projectId)
  );

  emitWorkspaceChange(req, "projects:changed", { projectId });
  emitWorkspaceChange(req, "work-items:changed", { projectId });
  res.json({ data: project });
}));

projectsRouter.delete("/:projectId", requireAdmin, asyncHandler(async (req, res) => {
  const projectId = getRouteParam(req.params.projectId);

  await withLocalFallback(
    async () => {
      const existingProject = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });

      if (!existingProject) {
        const error = new Error("Projet introuvable.");
        Object.assign(error, { status: 404 });
        throw error;
      }

      await prisma.project.delete({ where: { id: existingProject.id } });
    },
    () => localProjectsStore.deleteProject(projectId)
  );

  emitWorkspaceChange(req, "projects:changed", { projectId });
  emitWorkspaceChange(req, "work-items:changed", { projectId });
  res.status(204).send();
}));

projectsRouter.get("/:projectId/work-items", asyncHandler(async (req, res) => {
  const projectId = getRouteParam(req.params.projectId);
  const items = await withLocalFallback(
    () => prisma.workItem.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: workItemSelect
    }),
    () => localProjectsStore.listWorkItems(projectId)
  );

  res.json({ data: items });
}));

projectsRouter.post("/:projectId/work-items", asyncHandler(async (req, res) => {
  const input = taskSchema.parse(req.body);
  const projectId = getRouteParam(req.params.projectId);
  const item = await withLocalFallback(
    async () => {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });

      if (!project) {
        const error = new Error("Projet introuvable.");
        Object.assign(error, { status: 404 });
        throw error;
      }

      const createdItem = await prisma.workItem.create({
        data: {
          projectId: project.id,
          title: input.title,
          description: input.description ?? null,
          status: input.status,
          priority: input.priority,
          kind: input.kind,
          assigneeId: input.assigneeId ?? null
        },
        select: workItemSelect
      });

      await updateProjectProgress(project.id);
      return createdItem;
    },
    () => localProjectsStore.createWorkItem(projectId, input)
  );

  emitWorkspaceChange(req, "work-items:changed", { projectId, workItemId: item.id });
  emitWorkspaceChange(req, "projects:changed", { projectId });
  res.status(201).json({ data: item });
}));

projectsRouter.patch("/:projectId/work-items/:workItemId", asyncHandler(async (req, res) => {
  const input = taskStatusSchema.parse(req.body);
  const projectId = getRouteParam(req.params.projectId);
  const workItemId = getRouteParam(req.params.workItemId);
  const item = await withLocalFallback(
    async () => {
      const existingItem = await prisma.workItem.findFirst({
        where: { id: workItemId, projectId },
        select: { id: true, projectId: true }
      });

      if (!existingItem) {
        const error = new Error("Tache introuvable.");
        Object.assign(error, { status: 404 });
        throw error;
      }

      const updatedItem = await prisma.workItem.update({
        where: { id: existingItem.id },
        data: { status: input.status },
        select: workItemSelect
      });

      await updateProjectProgress(existingItem.projectId);
      return updatedItem;
    },
    () => localProjectsStore.updateWorkItemStatus(projectId, workItemId, input.status)
  );

  emitWorkspaceChange(req, "work-items:changed", { projectId, workItemId });
  emitWorkspaceChange(req, "projects:changed", { projectId });
  res.json({ data: item });
}));

projectsRouter.delete("/:projectId/work-items/:workItemId", requireAdmin, asyncHandler(async (req, res) => {
  const projectId = getRouteParam(req.params.projectId);
  const workItemId = getRouteParam(req.params.workItemId);

  await withLocalFallback(
    async () => {
      const existingItem = await prisma.workItem.findFirst({
        where: { id: workItemId, projectId },
        select: { id: true, projectId: true }
      });

      if (!existingItem) {
        const error = new Error("Tache introuvable.");
        Object.assign(error, { status: 404 });
        throw error;
      }

      await prisma.workItem.delete({ where: { id: existingItem.id } });
      await updateProjectProgress(existingItem.projectId);
    },
    () => localProjectsStore.deleteWorkItem(projectId, workItemId)
  );

  emitWorkspaceChange(req, "work-items:changed", { projectId, workItemId });
  emitWorkspaceChange(req, "projects:changed", { projectId });
  res.status(204).send();
}));

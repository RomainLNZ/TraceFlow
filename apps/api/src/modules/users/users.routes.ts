import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/async.middleware.js";
import { type AuthenticatedRequest, requireAdmin } from "../../middleware/auth.middleware.js";
import { localProjectsStore } from "../projects/projects.local-store.js";

export const usersRouter = Router();

const dataPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.data/dev-auth.json");
const localFallbackDurationMs = 30_000;
let localFallbackUntil = 0;

function isDatabaseUnavailable(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "PrismaClientInitializationError" || error.message.includes("Can't reach database server"))
  );
}

async function listLocalUsers() {
  await mkdir(path.dirname(dataPath), { recursive: true });

  try {
    const store = JSON.parse(await readFile(dataPath, "utf8")) as {
      users?: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        avatarUrl?: string | null;
        title?: string | null;
        department?: string | null;
      }>;
    };

    return (store.users ?? []).map(({ id, firstName, lastName, email, role, avatarUrl, title, department }) => ({
      id,
      firstName,
      lastName,
      email,
      role,
      avatarUrl: avatarUrl ?? null,
      title: title ?? null,
      department: department ?? null
    }));
  } catch {
    return [];
  }
}

async function deleteLocalUser(userId: string) {
  await mkdir(path.dirname(dataPath), { recursive: true });

  const store = JSON.parse(await readFile(dataPath, "utf8")) as {
    users?: Array<{ id: string }>;
    refreshTokens?: Array<{ userId: string }>;
  };
  const userExists = (store.users ?? []).some((user) => user.id === userId);

  if (!userExists) {
    const error = new Error("Utilisateur introuvable.");
    Object.assign(error, { status: 404 });
    throw error;
  }

  store.users = (store.users ?? []).filter((user) => user.id !== userId);
  store.refreshTokens = (store.refreshTokens ?? []).filter((token) => token.userId !== userId);
  await writeFile(dataPath, JSON.stringify(store, null, 2));
  await localProjectsStore.removeUserAssignments(userId);
}

usersRouter.get("/", asyncHandler(async (_req, res) => {
  if (Date.now() < localFallbackUntil) {
    return res.json({ data: await listLocalUsers() });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
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
    });

    res.json({ data: users });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }

    localFallbackUntil = Date.now() + localFallbackDurationMs;
    res.json({ data: await listLocalUsers() });
  }
}));

usersRouter.delete("/:userId", requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] ?? "" : req.params.userId;
  const actorId = req.auth?.userId;

  if (!userId) {
    return res.status(400).json({ message: "Utilisateur invalide." });
  }

  if (userId === actorId) {
    return res.status(400).json({ message: "Impossible de supprimer le compte administrateur connecte." });
  }

  if (Date.now() < localFallbackUntil) {
    await deleteLocalUser(userId);
    return res.status(204).send();
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    if (!user) {
      const error = new Error("Utilisateur introuvable.");
      Object.assign(error, { status: 404 });
      throw error;
    }

    await prisma.$transaction(async (tx) => {
      await tx.workItem.updateMany({ where: { assigneeId: user.id }, data: { assigneeId: null } });
      await tx.activityLog.updateMany({ where: { actorId: user.id }, data: { actorId: null } });
      await tx.comment.deleteMany({ where: { authorId: user.id } });
      await tx.refreshToken.deleteMany({ where: { userId: user.id } });

      if (actorId) {
        await tx.project.updateMany({ where: { ownerId: user.id }, data: { ownerId: actorId } });
      }

      await tx.user.delete({ where: { id: user.id } });
    });

    res.status(204).send();
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }

    localFallbackUntil = Date.now() + localFallbackDurationMs;
    await deleteLocalUser(userId);
    res.status(204).send();
  }
}));

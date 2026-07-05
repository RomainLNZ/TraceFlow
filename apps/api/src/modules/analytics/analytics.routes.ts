import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/async.middleware.js";

export const analyticsRouter = Router();

analyticsRouter.get("/overview", asyncHandler(async (_req, res) => {
  const [users, projects, sprints, stories, tasks, comments, blockedItems] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.sprint.count(),
    prisma.workItem.count({ where: { kind: "STORY" } }),
    prisma.workItem.count({ where: { kind: "TASK" } }),
    prisma.comment.count(),
    prisma.workItem.count({ where: { status: "BLOCKED" } })
  ]);

  res.json({
    users,
    projects,
    sprints,
    stories,
    tasks,
    comments,
    velocity: 0,
    delays: blockedItems,
    workload: 0
  });
}));

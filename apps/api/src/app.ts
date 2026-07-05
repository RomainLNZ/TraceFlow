import compression from "compression";
import express from "express";
import morgan from "morgan";
import { agileRouter } from "./modules/agile/agile.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { apiLimiter, corsMiddleware, helmetMiddleware } from "./middleware/security.middleware.js";

export function createApp() {
  const app = express();

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(apiLimiter);
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("tiny"));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/agile", agileRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use(errorMiddleware);

  return app;
}

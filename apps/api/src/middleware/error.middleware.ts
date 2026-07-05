import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(422).json({
      message: "Validation failed",
      issues: error.flatten()
    });
  }

  if (error?.name === "PrismaClientInitializationError") {
    return res.status(503).json({
      message: "Base de donnees indisponible. Lance PostgreSQL sur localhost:5432 puis reessaie."
    });
  }

  const status = typeof error.status === "number" ? error.status : 500;

  return res.status(status).json({
    message: status === 500 ? "Internal server error" : error.message
  });
};

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthenticatedRequest = Request & {
  auth?: {
    userId: string;
    role: string;
    email?: string;
  };
};

export function readAuth(req: Request) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof payload !== "object" || typeof payload.sub !== "string" || typeof payload.role !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
      role: payload.role,
      ...(typeof payload.email === "string" ? { email: payload.email } : {})
    };
  } catch {
    return null;
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const auth = readAuth(req);

  if (!auth) {
    return res.status(401).json({ message: "Authentification requise." });
  }

  if (auth.role !== "ADMIN") {
    return res.status(403).json({ message: "Compte administrateur requis." });
  }

  req.auth = auth;
  return next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const auth = readAuth(req);

  if (!auth) {
    return res.status(401).json({ message: "Authentification requise." });
  }

  req.auth = auth;
  return next();
}

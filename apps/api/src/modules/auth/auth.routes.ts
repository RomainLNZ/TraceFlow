import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/async.middleware.js";
import { authLimiter } from "../../middleware/security.middleware.js";
import { AuthController } from "./auth.controller.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";

const repository = new AuthRepository(prisma);
const service = new AuthService(repository);
const controller = new AuthController(service);

export const authRouter = Router();

authRouter.post("/register", authLimiter, asyncHandler(controller.register));
authRouter.post("/login", authLimiter, asyncHandler(controller.login));
authRouter.post("/refresh", authLimiter, (_req, res) => res.status(501).json({ message: "Refresh flow planned for milestone 2" }));
authRouter.post("/logout", (_req, res) => res.status(204).send());

import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { loginSchema, registerSchema } from "./auth.validation.js";
import type { AuthService } from "./auth.service.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    if (!env.ALLOW_PUBLIC_REGISTRATION) {
      return res.status(403).json({ message: "Inscription publique desactivee." });
    }

    const input = registerSchema.parse(req.body);
    const result = await this.authService.register(input);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response) => {
    const input = loginSchema.parse(req.body);
    const result = await this.authService.login(input.email, input.password);
    res.json(result);
  };
}

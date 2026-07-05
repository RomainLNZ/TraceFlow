import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { signAccessToken, signRefreshToken } from "../../lib/tokens.js";
import type { AuthRepository, AuthUser } from "./auth.repository.js";

function toSummary(user: AuthUser) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    title: user.title,
    department: user.department
  };
}

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async register(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string | undefined;
    title?: string | undefined;
    department?: string | undefined;
  }) {
    const existing = await this.authRepository.findUserByEmail(input.email);
    if (existing) {
      const error = new Error("Email already registered");
      Object.assign(error, { status: 409 });
      throw error;
    }

    const { password, ...profile } = input;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.authRepository.createUser({ ...profile, passwordHash });
    return this.issueSession(user);
  }

  async login(email: string, password: string) {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      const error = new Error("Invalid credentials");
      Object.assign(error, { status: 401 });
      throw error;
    }

    return this.issueSession(user);
  }

  private async issueSession(user: AuthUser) {
    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.authRepository.storeRefreshToken(user.id, tokenHash, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: toSummary(user)
    };
  }
}

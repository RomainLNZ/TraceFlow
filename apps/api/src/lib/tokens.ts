import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface TokenPayload {
  sub: string;
  role: string;
  email: string;
}

type JwtExpiresIn = NonNullable<SignOptions["expiresIn"]>;

export function signAccessToken(payload: TokenPayload) {
  const options: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as JwtExpiresIn };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: TokenPayload) {
  const options: SignOptions = { expiresIn: env.REFRESH_TOKEN_TTL as JwtExpiresIn };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

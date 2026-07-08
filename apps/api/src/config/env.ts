import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config();

const rootEnvPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
  ".env"
);

dotenv.config({ path: rootEnvPath });

const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  ACCESS_TOKEN_TTL: z.string().default("30d"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  PORT: z.coerce.number().default(4000)
});

export const env = schema.parse(process.env);

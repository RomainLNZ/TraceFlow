import bcrypt from "bcryptjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Role, type PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: string;
  avatarUrl: string | null;
  title: string | null;
  department: string | null;
}

type DevRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
};

type DevAuthStore = {
  users: AuthUser[];
  refreshTokens: DevRefreshToken[];
};

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.data");
const dataPath = path.join(dataDir, "dev-auth.json");
const localFallbackDurationMs = 5 * 60_000;
let localFallbackUntil = 0;

function getLocalAdminCredentials() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL doit etre defini pour utiliser le mode local.");
  }

  if (!adminPassword || adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD doit etre defini avec au moins 12 caracteres pour utiliser le mode local.");
  }

  return { adminEmail, adminPassword };
}

function isDatabaseUnavailable(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "PrismaClientInitializationError" || error.message.includes("Can't reach database server"))
  );
}

async function readStore(): Promise<DevAuthStore> {
  await mkdir(dataDir, { recursive: true });

  try {
    const raw = await readFile(dataPath, "utf8");
    return JSON.parse(raw) as DevAuthStore;
  } catch {
    const { adminEmail, adminPassword } = getLocalAdminCredentials();
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const store: DevAuthStore = {
      users: [
        {
          id: "local-admin",
          firstName: "Admin",
          lastName: "",
          email: adminEmail,
          passwordHash,
          role: Role.ADMIN,
          avatarUrl: null,
          title: "Administrateur",
          department: "Administration"
        }
      ],
      refreshTokens: []
    };

    await writeStore(store);
    return store;
  }
}

async function writeStore(store: DevAuthStore) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataPath, JSON.stringify(store, null, 2));
}

async function canReachLocalDatabase() {
  const databaseUrl = new URL(env.DATABASE_URL);
  const isLocalHost = databaseUrl.hostname === "localhost" || databaseUrl.hostname === "127.0.0.1";

  if (!isLocalHost) {
    return true;
  }

  const port = Number(databaseUrl.port || 5432);

  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host: databaseUrl.hostname, port, timeout: 250 });
    const finish = (isReachable: boolean) => {
      socket.destroy();
      resolve(isReachable);
    };

    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function shouldUseLocalFallback() {
  if (Date.now() < localFallbackUntil) {
    return true;
  }

  if (!(await canReachLocalDatabase())) {
    localFallbackUntil = Date.now() + localFallbackDurationMs;
    return true;
  }

  return false;
}

export class AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    if (await shouldUseLocalFallback()) {
      const store = await readStore();
      return store.users.find((user) => user.email === email) ?? null;
    }

    try {
      return await this.db.user.findUnique({ where: { email } });
    } catch (error) {
      if (!isDatabaseUnavailable(error)) {
        throw error;
      }

      localFallbackUntil = Date.now() + localFallbackDurationMs;
      const store = await readStore();
      return store.users.find((user) => user.email === email) ?? null;
    }
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    phone?: string | undefined;
    title?: string | undefined;
    department?: string | undefined;
  }): Promise<AuthUser> {
    if (await shouldUseLocalFallback()) {
      const store = await readStore();
      const user: AuthUser = {
        id: crypto.randomUUID(),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash: data.passwordHash,
        role: Role.DEVELOPER,
        avatarUrl: null,
        title: data.title ?? null,
        department: data.department ?? null
      };

      store.users.push(user);
      await writeStore(store);
      return user;
    }

    try {
      return await this.db.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          passwordHash: data.passwordHash,
          phone: data.phone ?? null,
          title: data.title ?? null,
          department: data.department ?? null
        }
      });
    } catch (error) {
      if (!isDatabaseUnavailable(error)) {
        throw error;
      }

      localFallbackUntil = Date.now() + localFallbackDurationMs;
      const store = await readStore();
      const user: AuthUser = {
        id: crypto.randomUUID(),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash: data.passwordHash,
        role: Role.DEVELOPER,
        avatarUrl: null,
        title: data.title ?? null,
        department: data.department ?? null
      };

      store.users.push(user);
      await writeStore(store);
      return user;
    }
  }

  async storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    if (await shouldUseLocalFallback()) {
      const store = await readStore();
      store.refreshTokens.push({
        id: crypto.randomUUID(),
        userId,
        tokenHash,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      });
      await writeStore(store);
      return;
    }

    try {
      await this.db.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
    } catch (error) {
      if (!isDatabaseUnavailable(error)) {
        throw error;
      }

      localFallbackUntil = Date.now() + localFallbackDurationMs;
      const store = await readStore();
      store.refreshTokens.push({
        id: crypto.randomUUID(),
        userId,
        tokenHash,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      });
      await writeStore(store);
    }
  }
}

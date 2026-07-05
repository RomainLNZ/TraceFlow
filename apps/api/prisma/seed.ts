import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, Role } from "@prisma/client";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..", ".env")
});

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL doit etre defini avant de lancer le seed.");
  }

  if (!adminPassword || adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD doit etre defini avec au moins 12 caracteres avant de lancer le seed.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.refreshToken.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.project.deleteMany();
  await prisma.team.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        not: adminEmail
      }
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: "Admin",
      lastName: "",
      passwordHash,
      role: Role.ADMIN,
      title: "Administrateur",
      department: "Administration",
      skills: [],
      availability: "Disponible",
      emailVerifiedAt: new Date()
    },
    create: {
      firstName: "Admin",
      lastName: "",
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      title: "Administrateur",
      department: "Administration",
      skills: [],
      availability: "Disponible",
      emailVerifiedAt: new Date()
    }
  });

  console.log(`Admin pret: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

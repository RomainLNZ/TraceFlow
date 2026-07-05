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
  const passwordHash = await bcrypt.hash("Admin123!", 12);

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
        not: "admin@qualis.local"
      }
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@qualis.local" },
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
      email: "admin@qualis.local",
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

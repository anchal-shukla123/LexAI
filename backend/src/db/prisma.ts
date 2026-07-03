import { prisma } from "../config/prisma.js";

export { prisma };

export function getPrismaClient() {
  return prisma;
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}

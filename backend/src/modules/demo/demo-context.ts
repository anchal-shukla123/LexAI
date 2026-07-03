import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";

export const DEMO_USER_EMAIL = "anchal@example.com";
export const DEMO_WORKSPACE_SLUG = "apex-workspace";
const DEMO_SEED_MESSAGE = "Demo workspace is not seeded. Run npm.cmd run db:seed --workspace backend.";

export async function getDemoContext() {
  const [user, workspace] = await Promise.all([
    prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.workspace.findUnique({
      where: { slug: DEMO_WORKSPACE_SLUG },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true
      }
    })
  ]);

  if (!user || !workspace) {
    throw new AppError("NOT_FOUND", DEMO_SEED_MESSAGE);
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id
      }
    },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!membership) {
    throw new AppError("NOT_FOUND", DEMO_SEED_MESSAGE);
  }

  return {
    user,
    workspace,
    membership
  };
}


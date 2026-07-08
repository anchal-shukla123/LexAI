import type { Request } from "express";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { getDemoContext } from "../demo/demo-context.js";

type BaseContext = Awaited<ReturnType<typeof getDemoContext>>;

export type RequestContext = BaseContext & {
  mode: "auth" | "demo";
};

async function getAuthenticatedContext(userId: string): Promise<RequestContext> {
  const [user, memberships] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        settings: {
          select: {
            defaultWorkspaceId: true
          }
        }
      }
    }),
    prisma.workspaceMember.findMany({
      where: {
        userId,
        workspace: {
          deletedAt: null
        }
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        createdAt: true,
        updatedAt: true,
        workspaceId: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    })
  ]);

  if (!user) {
    throw new AppError("UNAUTHORIZED", "Invalid or expired access token.");
  }

  const resolvedMembership =
    memberships.find((membership) => membership.workspaceId === user.settings?.defaultWorkspaceId) ?? memberships[0];
  if (!resolvedMembership) {
    throw new AppError("CONFLICT", "No workspace found for authenticated user.");
  }

  const { workspace, ...membershipWithoutWorkspace } = resolvedMembership;
  const { settings: _settings, ...userWithoutSettings } = user;
  void _settings;

  return {
    mode: "auth",
    user: userWithoutSettings,
    workspace,
    membership: membershipWithoutWorkspace
  };
}

export async function getRequestContext(req: Request): Promise<RequestContext> {
  if (req.auth?.user) {
    return getAuthenticatedContext(req.auth.user.id);
  }

  const context = await getDemoContext();
  return {
    mode: "demo",
    ...context
  };
}

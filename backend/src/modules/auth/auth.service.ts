import { randomBytes } from "node:crypto";

import { Prisma, type UserRole } from "@prisma/client";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { signAccessToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password.js";

type SignupInput = {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
};

type LoginInput = {
  email: string;
  password: string;
};

const invalidCredentialsError = new AppError("UNAUTHORIZED", "Invalid email or password.");

const workspaceSettingsDefaults = {
  allowedUploadTypes: ["pdf", "docx", "png", "jpg", "jpeg"],
  maxUploadSizeBytes: 20 * 1024 * 1024,
  defaultRiskThreshold: "MEDIUM" as const,
  aiPreferences: {
    analysisDepth: "balanced",
    tone: "legal-professional",
    includeRecommendations: true,
    showConfidenceScores: true,
    highlightRiskyClauses: true
  }
};

function userSelect() {
  return {
    id: true,
    name: true,
    email: true
  } satisfies Prisma.UserSelect;
}

function normalizeSlugBase(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "workspace"
  );
}

async function generateUniqueWorkspaceSlug(workspaceName: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const baseSlug = normalizeSlugBase(workspaceName);
  const existingWorkspace = await client.workspace.findUnique({
    where: { slug: baseSlug },
    select: { id: true }
  });

  if (!existingWorkspace) {
    return baseSlug;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = randomBytes(3).toString("hex");
    const candidate = `${baseSlug}-${suffix}`;
    const existingCandidate = await client.workspace.findUnique({
      where: { slug: candidate },
      select: { id: true }
    });

    if (!existingCandidate) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

function issueToken(user: { id: string; email: string }) {
  return signAccessToken({
    sub: user.id,
    email: user.email
  });
}

async function firstWorkspaceForUser(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspace: {
        deletedAt: null
      }
    },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  if (!membership) {
    throw new AppError("NOT_FOUND", "Workspace membership not found.");
  }

  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    slug: membership.workspace.slug,
    role: membership.role
  };
}

export async function signup(input: SignupInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true }
  });

  if (existingUser) {
    throw new AppError("CONFLICT", "Email is already registered.");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: input.email },
        select: { id: true }
      });

      if (existingUser) {
        throw new AppError("CONFLICT", "Email is already registered.");
      }

      const workspaceSlug = await generateUniqueWorkspaceSlug(input.workspaceName, tx);

      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash
        },
        select: userSelect()
      });

      const workspace = await tx.workspace.create({
        data: {
          name: input.workspaceName,
          slug: workspaceSlug,
          createdById: user.id
        },
        select: {
          id: true,
          name: true,
          slug: true
        }
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
          joinedAt: new Date()
        }
      });

      await tx.userSettings.create({
        data: {
          userId: user.id,
          defaultWorkspaceId: workspace.id,
          emailNotificationsEnabled: true
        }
      });

      await tx.workspaceSettings.create({
        data: {
          workspaceId: workspace.id,
          ...workspaceSettingsDefaults
        }
      });

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          actorUserId: user.id,
          action: "USER_SIGNED_UP",
          entityType: "User",
          entityId: user.id
        }
      });

      return {
        user,
        workspace,
        token: issueToken(user)
      };
    }, {
      maxWait: 10_000,
      timeout: 15_000
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("email")
    ) {
      throw new AppError("CONFLICT", "Email is already registered.");
    }

    throw error;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: {
      email: input.email,
      deletedAt: null
    },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true
    }
  });

  if (!user?.passwordHash) {
    throw invalidCredentialsError;
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw invalidCredentialsError;
  }

  const [updatedUser, workspace] = await prisma.$transaction(async (tx) => {
    const savedUser = await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      select: userSelect()
    });

    const membership = await tx.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspace: {
          deletedAt: null
        }
      },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!membership) {
      throw new AppError("NOT_FOUND", "Workspace membership not found.");
    }

    const currentWorkspace = {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role
    };

    await tx.auditLog.create({
      data: {
        workspaceId: currentWorkspace.id,
        actorUserId: user.id,
        action: "USER_LOGGED_IN",
        entityType: "User",
        entityId: user.id
      }
    });

    return [savedUser, currentWorkspace] as const;
  });

  return {
    user: updatedUser,
    currentWorkspaceId: workspace.id,
    workspace,
    token: issueToken(updatedUser)
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null
    },
    select: userSelect()
  });

  if (!user) {
    throw new AppError("UNAUTHORIZED", "Invalid or expired access token.");
  }

  const workspace = await firstWorkspaceForUser(user.id);

  return {
    user,
    workspace
  };
}

export function logout() {
  return {
    loggedOut: true
  };
}

export type AuthWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: UserRole;
};

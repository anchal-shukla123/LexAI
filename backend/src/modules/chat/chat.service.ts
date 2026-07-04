import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import type { RequestContext } from "../shared/request-context.js";

export async function getChatSessionDetail(context: RequestContext, sessionId: string) {
  const { workspace } = context;

  const session = await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      workspaceId: workspace.id
    },
    select: {
      id: true,
      workspaceId: true,
      documentId: true,
      createdById: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      document: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          riskScore: true,
          summary: true
        }
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdById: true,
          citations: true,
          metadata: true,
          createdAt: true
        }
      }
    }
  });

  if (!session) {
    throw new AppError("NOT_FOUND", "Chat session not found.");
  }

  return session;
}

CREATE TYPE "ClauseRewriteStatus" AS ENUM ('DRAFT', 'SAVED', 'ACCEPTED', 'REJECTED');

CREATE TABLE "ClauseRewrite" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "clauseFindingId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT,
    "goal" TEXT NOT NULL,
    "userInstruction" TEXT,
    "originalClause" TEXT NOT NULL,
    "rewrittenClause" TEXT NOT NULL,
    "rewriteStrategy" TEXT NOT NULL,
    "keyChanges" JSONB NOT NULL,
    "negotiationPoints" JSONB NOT NULL,
    "riskReductionNotes" JSONB NOT NULL,
    "status" "ClauseRewriteStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClauseRewrite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClauseRewrite_documentId_idx" ON "ClauseRewrite"("documentId");
CREATE INDEX "ClauseRewrite_clauseFindingId_idx" ON "ClauseRewrite"("clauseFindingId");
CREATE INDEX "ClauseRewrite_workspaceId_idx" ON "ClauseRewrite"("workspaceId");
CREATE INDEX "ClauseRewrite_createdById_idx" ON "ClauseRewrite"("createdById");
CREATE INDEX "ClauseRewrite_status_idx" ON "ClauseRewrite"("status");
CREATE INDEX "ClauseRewrite_createdAt_idx" ON "ClauseRewrite"("createdAt");

ALTER TABLE "ClauseRewrite" ADD CONSTRAINT "ClauseRewrite_clauseFindingId_fkey" FOREIGN KEY ("clauseFindingId") REFERENCES "ClauseFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClauseRewrite" ADD CONSTRAINT "ClauseRewrite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClauseRewrite" ADD CONSTRAINT "ClauseRewrite_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClauseRewrite" ADD CONSTRAINT "ClauseRewrite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

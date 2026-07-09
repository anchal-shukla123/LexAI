ALTER TABLE "User" ADD COLUMN "provider" TEXT;
ALTER TABLE "User" ADD COLUMN "providerAccountId" TEXT;

CREATE INDEX "User_provider_providerAccountId_idx" ON "User"("provider", "providerAccountId");

CREATE TYPE "RiskDetectionMethod" AS ENUM ('RULE_BASED', 'MOCK');

ALTER TABLE "RiskFinding"
ADD COLUMN "detectionMethod" "RiskDetectionMethod" NOT NULL DEFAULT 'MOCK',
ADD COLUMN "ruleId" TEXT,
ADD COLUMN "category" "ClauseCategory",
ADD COLUMN "recommendationHint" TEXT;

CREATE INDEX "RiskFinding_detectionMethod_idx" ON "RiskFinding"("detectionMethod");
CREATE INDEX "RiskFinding_ruleId_idx" ON "RiskFinding"("ruleId");

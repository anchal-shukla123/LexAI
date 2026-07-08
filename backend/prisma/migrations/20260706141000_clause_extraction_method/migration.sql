CREATE TYPE "ClauseExtractionMethod" AS ENUM ('RULE_BASED', 'MOCK');

ALTER TABLE "ClauseFinding"
ADD COLUMN "extractionMethod" "ClauseExtractionMethod" NOT NULL DEFAULT 'MOCK';

CREATE INDEX "ClauseFinding_extractionMethod_idx" ON "ClauseFinding"("extractionMethod");

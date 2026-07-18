-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ELECTION_COMMITTEE';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "votes" DROP COLUMN "timestamp",
ADD COLUMN     "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "referenceNumber" TEXT NOT NULL,
ADD COLUMN     "voterId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "votes_electionId_idx" ON "votes"("electionId");

-- CreateIndex
CREATE INDEX "votes_referenceNumber_idx" ON "votes"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "votes_voterId_positionId_candidateId_key" ON "votes"("voterId", "positionId", "candidateId");

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "voters"("id") ON DELETE CASCADE ON UPDATE CASCADE;


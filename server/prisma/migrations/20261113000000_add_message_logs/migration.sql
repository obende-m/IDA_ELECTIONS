-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "tokenId" TEXT,
    "channel" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "providerSid" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_logs_providerSid_key" ON "message_logs"("providerSid");

-- CreateIndex
CREATE INDEX "message_logs_electionId_voterId_idx" ON "message_logs"("electionId", "voterId");

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "voters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "voting_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


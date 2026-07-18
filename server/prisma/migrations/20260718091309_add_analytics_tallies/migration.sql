-- CreateTable
CREATE TABLE "candidate_tallies" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_tallies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_tallies" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "ballotsCast" INTEGER NOT NULL DEFAULT 0,
    "lastVoteAt" TIMESTAMP(3),

    CONSTRAINT "election_tallies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_buckets" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "hourBucket" TIMESTAMP(3) NOT NULL,
    "ballotsCast" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "activity_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_result_snapshots" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "certifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certifiedById" TEXT,

    CONSTRAINT "election_result_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_tallies_candidateId_key" ON "candidate_tallies"("candidateId");

-- CreateIndex
CREATE INDEX "candidate_tallies_electionId_idx" ON "candidate_tallies"("electionId");

-- CreateIndex
CREATE INDEX "candidate_tallies_positionId_idx" ON "candidate_tallies"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "election_tallies_electionId_key" ON "election_tallies"("electionId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_buckets_electionId_hourBucket_key" ON "activity_buckets"("electionId", "hourBucket");

-- CreateIndex
CREATE UNIQUE INDEX "election_result_snapshots_electionId_key" ON "election_result_snapshots"("electionId");

-- AddForeignKey
ALTER TABLE "candidate_tallies" ADD CONSTRAINT "candidate_tallies_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_tallies" ADD CONSTRAINT "candidate_tallies_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_tallies" ADD CONSTRAINT "election_tallies_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_buckets" ADD CONSTRAINT "activity_buckets_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_result_snapshots" ADD CONSTRAINT "election_result_snapshots_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one candidate_tallies row per existing candidate (including zero-vote candidates),
-- counting raw vote rows per candidate (one Vote row = one candidate selection, so COUNT(*) is correct here).
INSERT INTO "candidate_tallies" ("id", "electionId", "candidateId", "positionId", "voteCount", "updatedAt")
SELECT gen_random_uuid(), c."electionId", c."id", c."positionId", COALESCE(v.cnt, 0), NOW()
FROM "candidates" c
LEFT JOIN (
    SELECT "candidateId", COUNT(*) AS cnt FROM "votes" GROUP BY "candidateId"
) v ON v."candidateId" = c."id";

-- Backfill: one election_tallies row per existing election (including zero-vote elections).
-- ballotsCast counts distinct referenceNumber (one ballot submission), not raw vote rows.
INSERT INTO "election_tallies" ("id", "electionId", "ballotsCast", "lastVoteAt")
SELECT gen_random_uuid(), e."id", COALESCE(b.ballots, 0), b.last_vote
FROM "elections" e
LEFT JOIN (
    SELECT "electionId", COUNT(DISTINCT "referenceNumber") AS ballots, MAX("castAt") AS last_vote
    FROM "votes"
    GROUP BY "electionId"
) b ON b."electionId" = e."id";

-- Backfill: hourly activity buckets, one row per ballot (grouped by referenceNumber first, taking
-- the earliest castAt in that ballot) rather than per raw vote row, then bucketed by hour.
INSERT INTO "activity_buckets" ("id", "electionId", "hourBucket", "ballotsCast")
SELECT gen_random_uuid(), ballot."electionId", date_trunc('hour', ballot."minCastAt"), COUNT(*)
FROM (
    SELECT "electionId", "referenceNumber", MIN("castAt") AS "minCastAt"
    FROM "votes"
    GROUP BY "electionId", "referenceNumber"
) ballot
GROUP BY ballot."electionId", date_trunc('hour', ballot."minCastAt");

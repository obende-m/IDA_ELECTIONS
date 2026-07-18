-- CreateTable
CREATE TABLE "position_tallies" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "abstentions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "position_tallies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "position_tallies_positionId_key" ON "position_tallies"("positionId");

-- AddForeignKey
ALTER TABLE "position_tallies" ADD CONSTRAINT "position_tallies_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_tallies" ADD CONSTRAINT "position_tallies_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one position_tallies row per existing position (including zero-vote positions).
-- True abstention counting requires knowing intent (a voter explicitly leaving a position blank),
-- which was never recorded for historical votes cast before this table existed. It's only
-- reconstructable for maxSelections = 1 positions, where abstentions = ballots cast for the
-- election minus votes recorded for that position. Multi-select positions default to 0 here since
-- partial-vs-full abstention can't be distinguished retroactively from existing vote rows alone;
-- abstentions are tracked correctly for all positions going forward via the castVote transaction.
INSERT INTO "position_tallies" ("id", "electionId", "positionId", "abstentions")
SELECT
    gen_random_uuid(),
    p."electionId",
    p."id",
    CASE
        WHEN p."maxSelections" = 1 THEN GREATEST(COALESCE(et.ballots, 0) - COALESCE(pv.cnt, 0), 0)
        ELSE 0
    END
FROM "positions" p
LEFT JOIN (
    SELECT "electionId", COUNT(DISTINCT "referenceNumber") AS ballots FROM "votes" GROUP BY "electionId"
) et ON et."electionId" = p."electionId"
LEFT JOIN (
    SELECT "positionId", COUNT(*) AS cnt FROM "votes" GROUP BY "positionId"
) pv ON pv."positionId" = p."id";

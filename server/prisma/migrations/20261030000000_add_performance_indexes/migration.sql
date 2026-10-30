-- Indexes for the hot read paths (vote-record search, audit viewer, voter lists, tally rollups).
CREATE INDEX IF NOT EXISTS "votes_positionId_idx" ON "votes"("positionId");
CREATE INDEX IF NOT EXISTS "votes_candidateId_idx" ON "votes"("candidateId");
CREATE INDEX IF NOT EXISTS "votes_electionId_castAt_idx" ON "votes"("electionId", "castAt");
CREATE INDEX IF NOT EXISTS "audit_logs_electionId_timestamp_idx" ON "audit_logs"("electionId", "timestamp");
CREATE INDEX IF NOT EXISTS "audit_logs_electionId_action_idx" ON "audit_logs"("electionId", "action");
CREATE INDEX IF NOT EXISTS "voters_electionId_votingStatus_idx" ON "voters"("electionId", "votingStatus");
CREATE INDEX IF NOT EXISTS "voting_tokens_electionId_status_idx" ON "voting_tokens"("electionId", "status");
CREATE INDEX IF NOT EXISTS "candidates_positionId_idx" ON "candidates"("positionId");
CREATE INDEX IF NOT EXISTS "positions_electionId_idx" ON "positions"("electionId");

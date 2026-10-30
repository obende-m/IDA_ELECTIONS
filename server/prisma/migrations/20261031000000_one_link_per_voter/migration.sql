-- One voter, one live link, one ballot: enforced by the database, not just by application code.

-- 1) Tidy any existing data so the unique indexes below can be created safely.
--    Keep only the newest outstanding (ISSUED) link per voter; void the rest.
UPDATE "voting_tokens" t
SET "status" = 'REVOKED', "revokedAt" = NOW()
WHERE t."status" = 'ISSUED'
  AND EXISTS (
    SELECT 1 FROM "voting_tokens" n
    WHERE n."voterId" = t."voterId" AND n."status" = 'ISSUED'
      AND (n."issuedAt" > t."issuedAt" OR (n."issuedAt" = t."issuedAt" AND n."id" > t."id"))
  );

--    Any link still outstanding for a voter who has already voted is void.
UPDATE "voting_tokens" t
SET "status" = 'REVOKED', "revokedAt" = NOW()
WHERE t."status" = 'ISSUED'
  AND EXISTS (SELECT 1 FROM "voting_tokens" c WHERE c."voterId" = t."voterId" AND c."status" = 'CONSUMED');

-- 2) At most one live (ISSUED) link per voter.
CREATE UNIQUE INDEX IF NOT EXISTS "voting_tokens_one_issued_per_voter"
  ON "voting_tokens" ("voterId") WHERE "status" = 'ISSUED';

-- 3) At most one used (CONSUMED) link per voter, i.e. one ballot per voter.
--    If historical data already contains a double vote, do not block the deploy: raise a notice so it can be investigated.
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "voting_tokens_one_consumed_per_voter"
    ON "voting_tokens" ("voterId") WHERE "status" = 'CONSUMED';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'voting_tokens_one_consumed_per_voter NOT created: some voters already have more than one consumed link. Investigate before the election.';
END $$;

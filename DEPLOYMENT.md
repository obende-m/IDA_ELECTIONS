# Deployment

Stack: **Vercel** (frontend), **Render** (backend), **Supabase** (Postgres + Storage). No custom
domain yet — deploying on default `*.vercel.app` / `*.onrender.com` domains, which are cross-site
from each other. That's handled by `COOKIE_SAME_SITE=none` (see `server/.env.example` and
`server/src/middleware/csrfOrigin.ts`) — no further action needed unless you later move to a custom
domain (see the last section).

## One-time prerequisites

1. A Supabase project with:
   - A Postgres database — copy the pooled connection string (`DATABASE_URL`) and direct connection
     string (`DIRECT_URL`) from Supabase's connection settings.
   - A **public-read** Storage bucket named `candidate-photos` (or your own name — see
     `SUPABASE_PHOTOS_BUCKET`), plus the project's `SUPABASE_URL` and **service role** key (not the
     anon key — this is server-only and must never reach the client).
2. Generate two secrets: `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` — commands for both are in
   `server/.env.example`.

## Backend — Render

1. Connect this repo in Render and use the **Blueprint** flow (`server/render.yaml` is already
   checked in — it sets the root directory, build/start commands, and health check for you).
2. Render will prompt for every env var listed in `render.yaml` (all `sync: false`, i.e. secrets).
   Fill in the values from the prerequisites above. Set `CLIENT_URL` and `VOTING_LINK_BASE_URL` to
   your Vercel URL once you know it (step below) — `CLIENT_URL` is also what CORS and
   `requireTrustedOrigin` check every request's `Origin` header against, so it must match exactly.
3. First deploy runs `prisma migrate deploy` automatically (via `startCommand`) before the server
   starts — this applies the schema to your Supabase database. It's idempotent, safe on every
   subsequent deploy too.
4. Note the deployed URL (e.g. `https://ida-voting-server.onrender.com`) for the next step.

## Frontend — Vercel

1. Import this repo as a Vercel project. **This repo is a monorepo** — in the project's Settings →
   General, set **Root Directory** to `client`. (This is a one-time dashboard setting; there's no
   file-based equivalent for monorepo root selection.)
2. `client/vercel.json` is already checked in and handles client-side routing (React Router) —
   without it, refreshing on any deep link like `/vote/verify` would 404.
3. Set the environment variable `VITE_API_URL` to your Render URL + `/api`, e.g.
   `https://ida-voting-server.onrender.com/api`.
4. Deploy. Then go back to Render and set `CLIENT_URL`/`VOTING_LINK_BASE_URL` to this Vercel URL if
   you hadn't already, and redeploy the backend so CORS/cookies/voting links all point at the right
   place.

## After first deploy

- Log in with the `SEED_ADMIN_*` credentials and **change the password immediately**.
- Create the `candidate-photos` bucket in Supabase before uploading any candidate photos (Module 1)
  — the backend expects it to already exist.

## Upgrading to a custom domain later

If you register a domain (e.g. `igarra-da.org`) and deploy the frontend/backend as subdomains of it
(`app.igarra-da.org` + `api.igarra-da.org`), they become "same-site" for cookie purposes. At that
point:
1. Set `COOKIE_SAME_SITE=strict` on Render (back to the stricter default).
2. Point DNS for both subdomains.
3. Update `CLIENT_URL`/`VOTING_LINK_BASE_URL` (Render) and `VITE_API_URL` (Vercel) to the new URLs.

No code changes required either way.

## Operations runbook (election day)

**Before opening the election**
1. Render: move the service off the free plan (`plan: starter` in `server/render.yaml`) — free instances sleep after ~15 min and take 30–60 s to wake. If that is not possible, re-enable the schedule in `.github/workflows/keep-alive.yml` *and* add an external uptime monitor.
2. Uptime monitoring: point UptimeRobot / BetterStack (free tiers are fine) at `https://<render-url>/api/health/ready` every 1–5 min with e-mail/SMS alerts. `/api/health/ready` also proves the database connection works; `/api/health` is the lightweight check Render itself uses.
3. Supabase → Database → Backups: confirm daily backups are on (Pro plan adds point-in-time recovery). Take a manual backup immediately before opening and again right after closing: `pg_dump "$DIRECT_URL" -Fc -f ida-$(date +%F-%H%M).dump`.
4. Restore drill (do this once, on a *separate* scratch database, never on production): `createdb ida_restore && pg_restore -d ida_restore --no-owner ida-<date>.dump`, then start the server against it and open the dashboard.
5. Do a dry run with fake voters in a separate election/database before using real data (import → issue links → vote → results → close).
6. Rotate the seeded admin password; keep at least two active SUPER_ADMIN accounts. Password-reset e-mails are not wired up in production — a locked-out admin is reset by another SUPER_ADMIN under *Admin Accounts*.

**Rollback**
- Frontend: Vercel → Deployments → "Promote to Production" on the previous deployment (instant).
- Backend: Render → Deploys → "Rollback" to the previous deploy. Migrations are additive (new indexes only in the latest one), so rolling the code back is safe without touching the database.
- Never run `prisma migrate reset` or `db push --force-reset` against the production database.

**During the election**
- Use *Pause Election* (not close) for any interruption; use *Emergency Lock* only for suspected tampering.
- Opening/closing/schedule edits require the Election Committee or Super Admin role.
- The ballot structure (positions, candidates, seat counts) freezes once the first ballot is cast.

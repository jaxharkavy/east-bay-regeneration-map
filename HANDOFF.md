# Handoff for the next builder / AI assistant

## Goal and constraints
Build and deploy the East Bay Regeneration Map MVP. User is a beginner. Handle routine technical work. Infrastructure must remain $0: GitHub, Supabase Free, Netlify Free; no purchases or paid upgrades without approval. Automated email is a separate future setup step and currently OFF.

## Accounts and source
- GitHub: https://github.com/jaxharkavy/east-bay-regeneration-map
- Supabase organization: Aura Farmers (Free plan verified).
- Supabase project: Farming Gang, ref `uznbvkuxfhdriiqdotsr`.
- Supabase API: `https://uznbvkuxfhdriiqdotsr.supabase.co`.
- Edge Function: `regeneration-api`.
- Netlify team slug: `axel-axel-harkavy`; team display name Aura Farmers.
- Netlify deployment is being configured; update this file with the final URL when complete.

Public project IDs and URLs are not credentials. Each collaborator must authorize their own access to the services. Never put secret keys, attendee data, passwords, auth cookies, or private setup links in the repo or AI handoff.

## Implemented
Map/list discovery, filters, detail pages, public event submission, private Guild approval, basic text editing, event hide/cancel, guest registrations, protected attendee roster and CSV, calendar download, token-based cancellation, private support requests, and one-time Guild owner setup.

The five seeded listings are explicitly fictional demo events. Real registration is disabled for demos. Live submissions are saved as pending; only Guild administrators can publish them. All tables have RLS and revoked access for public browser roles. Server-only functions have execute privileges restricted to the service role.

## Stack
React 19 + Vite 8 + Leaflet. Supabase Postgres/Auth/Edge Functions. Netlify static frontend, `/api/*` proxy, and `event-page.mjs` for server-rendered event information. The Edge Function uses built-in Supabase secrets; no service key is required in Netlify.

`server/api.mjs` is the shared API implementation. `scripts/edge-files.mjs SITE_URL` emits the exact files for a Supabase Edge Function deployment. Always explicitly pass `import_map_path: "deno.json"` when updating the deployed function; leaving it out caused the tool to reuse a stale absolute path.

Supabase passes function request paths with a different prefix in some environments; the handler supports both `/functions/v1/regeneration-api/...` and `/regeneration-api/...`.

## Verification already completed
- Six automated tests pass (`pnpm test`), including SQL in embedded Postgres, access denial, approval gates, case-insensitive duplicate registration, cancellation, validation, calendar line folding and HTML escaping.
- Live Supabase integration tests passed: one-time admin setup, authorized login, pending event privacy, approval, two simultaneous identical signups yielding one success and one conflict, protected roster, calendar, private cancellation token, idempotent cancellation, support inbox privacy, and rejecting cancelled/demo events.
- Production build succeeds.
- Supabase security advisor reports informational `rls_enabled_no_policy` notices only. This is intentional: no public database access; service-role API owns operations. Do not add permissive public policies just to silence these notices.

## Work in progress / next steps
1. Finish browser QA. The local proxy initially copied compressed Content-Length headers after decompressing upstream data, truncating responses. Fixed by removing length/encoding/transfer headers in `scripts/dev.mjs`.
2. Upload reviewed source to GitHub; configure Netlify free hosting and deploy.
3. Update the Edge Function's allowed SITE_URL to the final HTTPS Netlify origin, using `scripts/edge-files.mjs` and redeploy. All writes enforce exact Origin matching. Test through the real Netlify API proxy, including HttpOnly cookie sign-in and calendar links.
4. Provide the user a private one-time Guild setup link. Store only the token hash in `guild_setup`, with a short expiry; never commit the link.
5. Remove the temporary QA auth account and its synthetic data. QA event is hidden. All QA data is fictional and disposable. There is no real attendee data yet.
6. Save final deployment details and beginner handoff instructions, then update this file.

## Current limitations
No automated email or password-reset email; no calendar sync; no organizer login; no capacity limits or waitlists. Guild text edits are supported; time/location changes require hiding and replacing the event plus contacting registered attendees. Data retention cleanup is manual. Free Supabase may pause after inactivity; Netlify has capped free credits.

## Commands
`pnpm install`, `pnpm test`, `pnpm build`, `pnpm dev`.
Without `.env`, local preview is read-only demo mode. With `API_UPSTREAM`, it proxies the live backend; the API's allowed SITE_URL must match the local origin. Use a separate backend for ongoing development after launch.

Read README.md for the operating guide, replication, privacy, and free-plan maintenance.

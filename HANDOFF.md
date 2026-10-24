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
- Live site: https://east-bay-regeneration-map.netlify.app
- Netlify dashboard: https://app.netlify.com/projects/east-bay-regeneration-map
- Netlify Free confirmed, no payment method, no paid upgrades. Production is public; deploy previews remain private.

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

## Deployment and handoff status — October 24, 2026
The MVP is deployed and publicly accessible. The complete live integration suite also passed through the production Netlify proxy: Guild cookie login, private pending submissions, approval, simultaneous duplicate protection, roster privacy, calendar download, cancellation, and support inbox. Public event HTML includes event-specific metadata. Browser checks confirmed category filtering, map pins, event details, and disabled demo signups.

Supabase Edge Function version 3 enforces `SITE_URL=https://east-bay-regeneration-map.netlify.app`. Its source matches this repository. The temporary QA account and synthetic records were removed. Five fictional demo events remain. A private one-time Guild setup link was given to the owner separately; it expires October 26, 2026. Owner must choose their own email/password before reviewing submissions. Never ask them to paste passwords into an AI chat.

The local proxy's compressed-response header issue is fixed in `scripts/dev.mjs`. Local live writes are intentionally rejected once the backend origin is set to production. Use read-only local demo mode or a separate Supabase project for development.

## Continue with a friend's AI account
1. Give the friend this repository URL or the source ZIP, and tell their AI to read this file and README.md first. They can clone or fork it and make local changes using their own AI subscription.
2. Keep production accounts under the owner's control. For direct production collaboration, the owner must invite the friend's own account through the service's supported access controls and check whether that adds a paid seat. Never upgrade or share an owner password/API key to enable this. Alternatively, have the friend prepare a GitHub pull request for the owner to merge.
3. A change to `main` automatically builds and deploys the frontend on Netlify. Backend changes also require redeploying the Edge Function; SQL changes require a migration. Do not assume a GitHub push updates Supabase.
4. Preserve the $0 requirement and private attendee data. The handoff contains source and public identifiers only, no database dump, credentials, or owner setup link.

## Optional improvements after the MVP
The owner can now create their Guild account, submit and approve a real event, then share the site. Automated email remains a separate setup decision: choose a free provider, verify sender/domain requirements, implement delivery and retries, and test actual receipt before telling users email works. Other later work can include organizer accounts, capacity/waitlists, automated retention, and accessibility refinements.

## Current limitations
No automated email or password-reset email; no calendar sync; no organizer login; no capacity limits or waitlists. Guild text edits are supported; time/location changes require hiding and replacing the event plus contacting registered attendees. Data retention cleanup is manual. Free Supabase may pause after inactivity; Netlify has capped free credits.

## Commands
`pnpm install`, `pnpm test`, `pnpm build`, `pnpm dev`.
Without `.env`, local preview is read-only demo mode. With `API_UPSTREAM`, it proxies the live backend; the API's allowed SITE_URL must match the local origin. Use a separate backend for ongoing development after launch.

Read README.md for the operating guide, replication, privacy, and free-plan maintenance.

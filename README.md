# East Bay Regeneration Map

A small community-owned volunteer-event map, built for an East Bay hackathon pilot.

**Live:** https://east-bay-regeneration-map.netlify.app · **Continue with another builder:** [HANDOFF.md](HANDOFF.md)

Deployed October 24, 2026 on verified Supabase Free and Netlify Free plans. Production signup, moderation, privacy, calendar, and cancellation checks passed. The site owner must complete their separate private Guild setup link before approving real events.

## What works

- Map and list discovery with city, category, keyword, and date filters.
- Organization submissions with a public meeting-place pin and private contact details.
- Guild approval, editing of event text, hiding/cancelling events, and private attendee CSV exports.
- Real guest registrations, concurrent duplicate protection, on-screen confirmation, downloadable `.ics` calendar entries, private cancellation links, and a private `.txt` confirmation to keep offline.
- A private support inbox for corrections, removal requests, and lost signup links.
- Clearly marked fictional demo events that cannot accept registrations.
- Public event pages with server-rendered titles, descriptions, and event information.

**Automated email is OFF.** Confirmation is shown on screen. Volunteers should download their private confirmation (event details and cancellation link) before closing the tab, and optionally save a calendar file. Keep the confirmation private: anyone with its link can cancel the registration. Guild administrators must contact attendees themselves about changes. Calendar downloads do not update automatically.

This is a prototype awaiting Guild adoption. Demo events are not real bookings or claims of affiliation.

## Architecture

React + Vite and Leaflet on Netlify. Supabase Postgres stores persistent data; a Supabase Edge Function handles all form submissions and private reads. Supabase Auth protects Guild accounts. Netlify proxies `/api/*` to the Edge Function and serves individual event pages through a small server function.

No secret database key is shipped to the browser or stored in this repository. The Edge Function uses Supabase's built-in server secrets. Public database roles have no access to tables or private functions; all tables have RLS enabled. Private responses are not cached.

## Run locally

Use Node 22.12+ (Node 24 was used during development) and pnpm 11.25.

```sh
pnpm install
pnpm dev
```

Without environment configuration, the preview is read-only demo mode and refuses writes. To connect your own development backend, copy `.env.example` to `.env` and set `API_UPSTREAM`. The Edge Function's allowed `SITE_URL` must match your local origin. Do not use another community's production backend for development.

```sh
pnpm test
pnpm build
```

The test suite exercises the SQL schema in embedded Postgres, public/private access, approval rules, duplicate registrations, cancellation state, input validation, calendar formatting, and HTML escaping.

## Replicate for your community

1. Create your own Supabase Free project and apply the SQL files in `supabase/migrations/` in filename order.
2. Optionally run `supabase/seed.sql` once for fictional examples. Adjust dates if they have passed.
3. Replace the project address in `netlify.toml` and `netlify/functions/event-page.mjs` with your own project's address.
4. Run `node scripts/edge-files.mjs https://YOUR-SITE.netlify.app` to generate the exact Edge Function source package. Deploy the files as `regeneration-api`, with `index.ts` as entrypoint and `deno.json` as import map. Gateway JWT verification is off because the handler performs its own Guild authentication and allows public discovery/registration routes.
5. In Netlify Free, import your repository, use `pnpm build`, and publish `dist`. `netlify.toml` configures the API proxy and headers.
6. Generate a random 32-byte hexadecimal setup token. Insert **only its SHA-256 hash** into `guild_setup` with a short expiry. Open `/guild/setup#TOKEN` privately to choose your Guild email and password. The token can be used once. Never commit or publish it.
7. Update the map area, city/category choices, descriptions, privacy notice, and community identity. The current event validation bounds are intentionally limited to the East Bay.

The project ID and backend URL in this repository are public identifiers, not credentials. Forks must use their own backend. Never add service-role keys, auth tokens, attendee lists, or private setup links to GitHub.

## Guild operating guide

- Visit `/guild` and sign in. Sessions last up to an hour; sign in again when prompted.
- Review pending event descriptions, location pins, dates, organizer identity, accessibility, and authorization to publish the location. Approve only verified submissions.
- Use **Edit details** to change title, description, accessibility, or what to bring. To change a date or location in this MVP, hide the old event, submit a corrected replacement, and contact existing attendees before moving them.
- Use **Cancel event** for cancellations: the public page remains available with a cancellation notice. **Hide** removes the event from public access.
- Attendee CSV files contain private information. Share only with the relevant organizer, and remove local exports when no longer needed.
- Review the private requests inbox. Verify a requester's identity before disclosing, changing, or deleting their attendee information.
- Review and remove attendee contact information within 90 days after an event. Automatic retention cleanup is not configured in this pilot.
- Password-reset email and organizer self-service accounts are not configured. A project owner can recover Guild access through Supabase.

## Free-plan limits and maintenance

No paid services, purchased domains, automated emails, or AI calls are required. Stay on Free plans. Free Supabase projects may pause after inactivity; Netlify's monthly free credits are capped. Check both dashboards before a demo or public launch. Limits and provider terms can change.

Map tiles use the standard OpenStreetMap service with attribution. This is appropriate for a small interactive pilot under its usage policy, not bulk/offline downloading. Arrange a tile provider if traffic grows.

A Guild handover should include ownership/access to GitHub, Supabase, and Netlify, a real support owner, a backup/export routine, and a decision on email delivery. Service accounts currently belong to the pilot creator.

## License

MIT. Demo content is fictional. Map data © OpenStreetMap contributors, subject to its separate license and tile usage policy.

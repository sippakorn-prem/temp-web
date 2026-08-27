# SafeDeal Web

Next.js 16 (App Router) · React 19 · Tailwind v4 · Clerk · next-intl (TH/EN) ·
`@getsafedeal/design-system`.

**Before writing code, read [CONVENTIONS.md](./CONVENTIONS.md).** The design docs are in the sibling `../`
folder — `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN-BRIEFS.md`.

## Quick start

The design system is a **private GitHub Packages** package, so npm needs a token
with `read:packages` before install. Easiest via the GitHub CLI:

```bash
gh auth refresh -h github.com -s read:packages   # one-time: add the scope
export NODE_AUTH_TOKEN=$(gh auth token)           # .npmrc reads this
cp .env.example .env.local                        # fill Clerk keys
npm install
npm run dev                                        # http://localhost:3005
```

`.npmrc` maps `@getsafedeal` to `npm.pkg.github.com` and reads `${NODE_AUTH_TOKEN}`.

## Environment

Clerk keys come from the dashboard (same app as the backend). `.env.local` is
gitignored; `.env.example` is the template.

Identity requests use same-origin BFF routes so Clerk cookies never cross into
browser-to-backend requests directly:

| Route | Backend target | Purpose |
|---|---|---|
| `GET /api/me` | `GET /v1/me` | Verify the active Clerk session end-to-end |
| `POST /api/consents` | `POST /v1/consents` | Record signup consent evidence |

Set `BACKEND_URL=http://localhost:8090` for the server-side BFF target. The
signup flow writes the accepted consent to Clerk metadata first, then records
it immediately through the BFF. Clerk `user.*` webhooks provide an idempotent
backfill if the projection and browser request arrive out of order. Both paths
forward the same `acceptedAt` value, so the backend records exactly three rows
for one acceptance and can hydrate missing request evidence without changing
the consent facts.

In production, keep the Go API private to the web/reverse-proxy network and
configure that network in backend `TRUSTED_PROXIES`. The edge proxy must replace,
not blindly preserve, public `X-Forwarded-For` input before consent evidence is
accepted. Set web `TRUSTED_CLIENT_IP_HEADER` to the edge-controlled header that
contains exactly one IP address. Leave it empty when no such trusted edge exists;
the BFF then ignores all browser-supplied client-IP headers.

## Design system integration notes

Consuming `@getsafedeal/design-system` needs two things the package doesn't yet
provide itself:

1. **`tw-animate-css`** — the DS `globals.css` imports it but doesn't declare it,
   so the consumer must install it (`npm i tw-animate-css`).
2. **`"use client"` shim** — the published bundle drops the client directive, so
   importing context-using DS components into a Server Component throws. Import
   them through `src/components/ds.ts` (a `"use client"` re-export) instead.

`globals.css` also `@source`s the DS `dist` so Tailwind scans the component class
names. `<Button asChild>` can't slot a `<Link>` across the RSC/client boundary —
use a styled `<Link>` or a client component.

## Layout

```
src/app            App Router (landing, signed-in screens, auth, legal, API BFF)
src/app/(signed-in) Client signed-out boundary; server resources enforce their own auth
src/components/ds  "use client" re-export of the design system
src/i18n           next-intl request config (locale from cookie, TH/EN)
src/proxy.ts        Clerk request context and signed-in credential-route redirects
messages/          en.json · th.json
```

# SafeDeal Web — Code Conventions

> Team standard for the SafeDeal **Next.js web app**. **Canonical source of truth for how we write frontend code.**
> The backend repo has its own: [backend/CONVENTIONS.md](../backend/CONVENTIONS.md).
> Companion docs: [CLAUDE.md](../CLAUDE.md) · [ARCHITECTURE.md](../ARCHITECTURE.md) · [DESIGN-BRIEFS.md](../DESIGN-BRIEFS.md)

## How to use these docs (source-of-truth order)

When guidance appears to conflict, the **later** doc in this list wins for its topic — flag the conflict,
don't silently pick one:

1. `web/CONVENTIONS.md` (this file) — how we write frontend code.
2. `ARCHITECTURE.md` — the system shape and boundaries.
3. `CLAUDE.md` — the mental model, invariants, and vendor split.

`AGENTS.md` is generated and rewritten by `next dev`; it is authoritative for *this version of Next* and
nothing else. Commit it alongside your work rather than deleting it — removing it only re-creates the change.

Keep this document compact: add only durable rules that prevent security, correctness, privacy, or
maintainability failures. History belongs in changelogs, design reasoning in ADRs, and procedures in runbooks.

## Working principles

- **Think before coding** — state assumptions; ask when requirements are unclear rather than guessing.
- **Simplicity first** — smallest solution that satisfies the task.
- **Surgical changes only** — do not refactor unrelated code in a feature change.
- **Reviewable changes** — repository-wide formatter output belongs in a mechanical-only commit; never mix it
  with behavior, dependency, or architecture changes.
- **Earn abstractions** — extract shared code only when behavior and semantics are genuinely the same. Do not
  wrap a single property check or replace a clear primitive with a configurable imitation.
- **Verify before done** — run the verification cheat-sheet at the end of this document.
- **The design is the spec.** Screens come from Claude Design handoffs. Match the *visual output*; don't copy
  the prototype's internal structure. Where we deviate, say so and say why.

---

## App structure

### Route groups

A route group earns its place when it has **its own layout or its own guard**. Not its own feature.

Test: if two groups would end up with an identical `layout.tsx` *and* identical signed-out treatment, they
are one group. Grouping by domain — `(deals)`, `(account)` — buys nothing: same chrome, same session check,
URL unchanged. That's a comment with a directory around it.

| Group | Holds | Layout | Guard |
|---|---|---|---|
| `(auth)` | `sign-in`, `sign-up`, `reset-password`, `sso-callback` | `AuthShell` — centred card | none (public) |
| `(signed-in)` | `dashboard`, `deals/*`, `account`, `verify` | signed-out boundary; pages own `AppLayout` | resource checks |
| `(marketing)` | `/`, legal, pricing | own header/footer, SSR, indexable | none (public) |
| `(admin)` | dispute queue and resolution | denser, table-first | **admin role** |

Create a planned group only when its first real route lands. Route groups do not change URLs. Enforce access
at every server resource; Proxy may improve redirect UX but is never the authorization boundary.

### Layouts own chrome; pages own their header

Layouts own shared chrome; pages render their own page header. Each group owns context-appropriate
`loading.tsx`, `error.tsx`, and `not-found.tsx` boundaries.

### Not a group

`src/app/api/*` — BFF proxy routes and the SSE proxy. Route handlers, no layout.

---

## Outside `app/`

### Components — three tiers, one-way dependencies

| Tier | Where | Rule |
|---|---|---|
| **DS boundary** | `components/ds.ts`, `lib/ds-utils.ts`, `components/ui/*` | Client components and server-safe utilities enter through separate boundaries. |
| **Shared** | `components/*.tsx` — `app-layout`, `brand`, `icon`, `user-avatar`, `account-menu`, `providers` | May import the DS boundary. **Never** imports a feature. |
| **Feature** | `components/<feature>/` — `dashboard/`, `deal/`, `settings/`, `verification/`, `auth/` | May import shared and the DS boundary. Should not import another feature. |

The dependency direction is the whole value; the folder names are secondary. The day `app-layout.tsx` imports
from `components/dashboard/`, the tiers are gone and it's a ball of mud with tidy folder names.

### `lib/` — transport, rules, utilities

| Path | Holds |
|---|---|
| `lib/api/` | Transport only. One module per domain. `client.ts` owns `ApiError`; authenticated browser calls use explicit BFF routes. |
| `lib/domain/` | SafeDeal's business rules — the deal state machine mirror, money, who acts next. **No React, no imports from `components/`.** |
| `lib/*.ts` | Everything else pure: `mask`, `clerk-errors`, `verification`, `ui` (class recipes). |

Anything decidable without React lives in `lib/`. Critical money, permission, state, and redirect rules ship
with focused tests; if a component holds one of those rules, the rule is in the wrong file.

`lib/domain/` is specifically the rules a *backend* engineer would recognise. Known drift to fix: `money.ts`
and `phone.ts` sit in `lib/` but are domain by that definition.

### Hooks

`hooks/use-<domain>.ts` — one React Query module per domain, exporting both queries and mutations for it.
Components don't call `lib/api/` directly.

Runtime browser operations go through those domain hooks, including mutations and uploads. Type-only imports
from transport DTO modules are acceptable when moving the type would create a worse dependency. Hooks preserve
meaningful HTTP status and terminal errors rather than flattening them into generic success/failure state.

---

## Naming

| Area | Style | Example |
|---|---|---|
| File | kebab-case | `deal-row.tsx`, `use-deals.ts`, `setting-row.tsx` |
| Component | PascalCase | `DealRow`, `SettingRow`, `EscrowSummary` |
| Hook | `use` + camelCase | `useDeals`, `usePayout` |
| Route segment | kebab-case | `reset-password`, `sso-callback` |
| Route group | `(lowercase)` | `(auth)`, `(signed-in)` |
| React Query key | array, domain first | `["deals"]`, `["deal", code]`, `["payout"]` |
| Message key | camelCase, nested by screen | `dashboard.escrow.heldAsBuyer` |
| Public env var | `NEXT_PUBLIC_` + SCREAMING_SNAKE; never secrets or backend URLs | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| Money in code | always `…Satang` | `amountSatang`, never `amount` |

---

## SafeDeal invariants, as they bind the web

The invariants live in [backend/CONVENTIONS.md](../backend/CONVENTIONS.md) and
[CLAUDE.md](../CLAUDE.md). These are the ones a frontend can violate on its own.

### 1. Money is integer satang — never float

Satang integers everywhere; `lib/money.ts` is the only place they become a string. No arithmetic on formatted
values, no `parseFloat` on an amount.

Fee and net calculations always receive an explicit authoritative policy or deal snapshot. Never hide a
missing fee, limit, or other backend-controlled policy behind a hard-coded/default fallback. If required
policy data is unavailable, show a retryable error and fail closed before the dependent write.

```bash
grep -rn "parseFloat\|toFixed" src/ --include="*.ts*" | grep -iE "amount|fee|price|satang|money"   # must be empty
```

### 2. The client never decides anything about money or state

`lib/domain/` mirrors the deal state machine so the UI knows **what to show**. It never decides what is
*allowed* — the backend is the only authority. A disabled button is a courtesy, not a control.

### 3. Re-check authorization against the live session

Never derive permission from a cached role, a URL, or a prop passed down three levels. Read it from Clerk or
from the server's response for that resource, at the point of use. UI guards are presentation only; the
backend remains authoritative and fails closed.

### 4. Consent is explicit

No pre-ticked boxes, no auto-accept, no "by continuing you agree". Record the policy, version, explicit choice,
server timestamp, and source evidence (`lib/api/consent.ts`).

### 5. PII is masked in the UI by default

Contact details are shown back to their owner in enough shape to be recognised and no more — `lib/mask.ts`.
Assume every screen may end up in a screenshot, a support thread or a screen-share.

---

## Security, privacy & BFF boundaries

- Treat browser input, provider responses, and external events as untrusted. Enforce schema and request-size
  limits, and return stable public errors without internal, vendor, or authorization details.
- Tokens stay server-side and are forwarded only by BFF routes to the configured backend. Never decode a JWT
  as proof, expose it to client JavaScript, or put it in a non-httpOnly cookie.
- Request, return, render, cache, and log only required data. Authenticated or sensitive responses must never
  be publicly cached; logs contain no tokens, secrets, cookies, raw provider payloads, or PII.
- BFF calls are bounded by timeouts and limited retries. Retry only transient failures; never retry permanent
  validation or authorization failures. Critical writes must report terminal failure—no silent success. When
  an outcome is uncertain, refetch authoritative server state instead of inventing client state.
- SSE is the explicit long-lived exception to the ordinary BFF timeout: proxy it without buffering, keep its
  server lifetime bounded, and refetch authoritative state on connect, reconnect, focus, and every event.
- Apply security headers centrally. Do not weaken them per route without a documented, reviewed reason.

---

## Data & errors

- **Dates stay data until rendering.** Transport modules preserve ISO timestamps; they do not call
  `toLocaleString()` or return pre-formatted dates. Format at the component boundary with the active next-intl
  locale. SafeDeal uses the Gregorian calendar in English and Thai and the viewer's timezone for ordinary UI
  timestamps. Sort and calculate deadlines from timestamps, never formatted strings.
- **One error convention.** `apiFetch` throws `ApiError` carrying the HTTP `status`. Do **not** flatten
  statuses into toast strings — components need to tell "not your deal" (403) from "gone" (404) from "we
  broke" (5xx). The old client's mistake was forcing callers to bypass the wrapper with raw `axios` to get a
  real status code.
- **Don't retry what the server refused.** The shared `QueryClient` already skips retries on 4xx; don't
  override it per-query without a reason.
- **Clerk errors go through `clerkErrorMessage()`.** It prefers Clerk's user-facing `longMessage` and falls
  back to our copy. Never render a raw exception.
- **Match on shape, not `instanceof`,** when classifying a vendor error (`codeFailureKind`). Duplicate copies
  of a package in the graph silently break `instanceof`, and the failure mode is every error rendering as
  generic.
- **Mock providers stay server-side.** Browser fixtures must not replace authoritative deal, payment, or payout state.

## Forms

React Hook Form + Zod for anything with more than one field or any cross-field rule. A single controlled input
with one validation (the phone field in the verification centre) does not need a form library — don't reach for
one out of habit.

`FormField` renders label + control + hint/error wired for accessibility. It renders its own control; it does
not take children.

## i18n

- **Every** user-facing string goes through next-intl. No literals in JSX, including `aria-label`, `title` and
  placeholder text.
- `messages/en.json` and `messages/th.json` stay in sync — `npm run check:i18n` gates it.
- **A key is either a string or an object, never both.** JSON silently keeps the last one, and the symptom is
  a raw key rendering on screen (`verify.change`). If a section needs both a label and a sub-namespace, name
  them apart: `change` and `changePhone`.
- **Two locale surfaces.** The public **marketing** landing is locale-**path-prefixed** (`/en`, `/th`) for
  SEO — distinct indexable URLs, correct `<html lang>`, canonical + hreflang. Everywhere else (the signed-in
  app, auth) stays **cookie**-based and non-prefixed. `src/i18n/request.ts` resolves the locale from the URL
  prefix first (via the `x-pathname` header set in `src/proxy.ts`), then the `locale` cookie, then the
  default. Constants live in `src/i18n/config.ts`.
- **Switching locale:** in the app, write the `locale` cookie and `router.refresh()` (never a full reload).
  On the marketing landing, navigate between `/en` and `/th` (a soft `next/link` nav) *and* write the cookie
  so the app stays in sync. The marketing sections are server components (they re-render on the soft nav);
  any client component there must not depend on the root messages provider, which a soft nav does not refresh.
- Thai and English are both first-class. Layouts must survive Thai's longer strings and no-uppercase — never
  size a container to the English copy.

## Design system

- **Use the two explicit boundaries.** React components come through the `"use client"`
  `components/ds.ts` barrel. Pure `cn` and variant helpers come through `lib/ds-utils.ts`, which imports the
  package's server-safe `/utils` entry. Application code never imports the package directly.
- **`<Button asChild>` slots a `<Link>`** — `<Button asChild variant="…"><Link href="…">…</Link></Button>`.
  Fixed in `@getsafedeal/design-system@0.2.0`: `Button` now renders a Radix `Slot` and passes its child
  through unwrapped, so a single `<Link>` merges cleanly. Prefer this over `buttonVariants({...})` on a styled
  `<Link>` — reach for `buttonVariants` only when there is no element to slot onto.
- **Compose framework parts in product adapters.** Shared mechanics such as `AppShell` remain content-free;
  `AppLayout` supplies SafeDeal routing, identity, navigation, badges and translations.
- **Don't re-implement a primitive.** If the DS is missing something, vendor it in `components/ui/` with a
  comment naming the release that will replace it, and swap it out through `components/ds.ts` when that release
  lands (as `FormField` and `EmptyState` were, in 0.2.0).
- Prefer a DS affordance over restyling from outside. `InputOTPSlot` already reddens on `aria-invalid`; pass
  the attribute rather than writing a descendant selector.
- **The published design-system theme is authoritative.** Do not redefine its brand or semantic tokens in
  web CSS. Make theme changes in `design-system`, verify them there, publish a release, then update the web
  dependency.

## Styling

- **Tokens, not hex.** `bg-warning-bg`, `text-muted-foreground`, `border-error-border`. A raw colour needs a
  comment saying why. Use `brand` for identity marks and restrained accents, and `primary` for actions and
  selected controls. Shared chrome uses the design system's semantic sidebar tokens in both themes.
- **Tint over a surface, not with alpha.** Rows sit on the page background, so a translucent amber picks up
  whatever is behind it. Use `color-mix(in srgb, var(--color-warning-bg) 42%, var(--color-card))`.
- `cn()` for conditional classnames. Recurring recipes live in `lib/ui.ts` — one definition of `card`, `note`,
  `money`, `code`.
- The **content column** is what gets a max width, never the frame. Chrome goes edge to edge.

### Responsive acceptance

- Build mobile-first. The default Tailwind transitions are the acceptance set: base `<640`, `sm` `640`,
  `md` `768`, `lg` `1024`, `xl` `1280`, and `2xl` `1536` CSS pixels. Update this list if the theme changes.
- For every changed screen, resize continuously from `320` through `1536` and inspect immediately below and
  at each transition: `639/640`, `767/768`, `1023/1024`, `1279/1280`, and `1535/1536`. Also check any
  component-specific breakpoint. `375×812`, `768×1024`, and `1440×900` are smoke checks, not full acceptance.
- No unintended horizontal scrolling, clipping, overlap, unusably narrow text, or controls escaping their
  container. Navigation, forms, dialogs, tables/cards, validation messages, and primary actions remain
  readable, reachable, and operable at every width; page-level overflow alone is not proof of responsiveness.
- Do not hide required information or actions merely to make a smaller layout fit. Reflow or provide an
  equivalent accessible presentation, and verify both Thai and English copy.

## Auth

Clerk is the engine; **all auth UI is ours** — headless, built on the design system, not `<SignIn/>`. Clerk
7.x uses the signals API: `useSignIn()` returns `{ signIn, errors, fetchStatus }` and methods return
`{ error }` rather than throwing.

## Honesty about what isn't built

- **No dead controls.** A button that silently does nothing is worse than no button. Render it disabled with
  the reason attached (tooltip, or a `Coming soon` badge in the DS's terminal tone).
- **`TODO(backend):` marks a real stub**, with a sentence describing the missing endpoint and visible UI state.
  Remove it when the endpoint is wired; never report a stubbed write as successful.
- **Don't fake a destructive action.** Deleting a Clerk user from the browser while our database still holds
  their deals and audit trail orphans exactly the records a regulator would ask for. Disable it and say why.

## Comments

Comments are a liability if they drift. Write them only where the code can't tell the reader **why**.

- **Necessary:** a non-obvious constraint, a vendor quirk and its workaround, a design decision a reader would
  otherwise "fix", a business rule that would surprise someone, a footgun.
- **Unnecessary:** restating what obvious code already says — delete it.
- Update or remove a stale comment in the same change. A stale comment is worse than none.
- Long explanations belong in a design doc, with the comment pointing there.

## Testing

Vitest is reserved for critical pure money, permission, state, and redirect rules. Tests sit beside their
source: `deal.ts` → `deal.test.ts`.

- Rules that are decidable without React belong in `lib/domain/` or a pure helper and receive a focused test.
- A costly correctness or security bug gets a regression test that pins the distinction.
- Do not require component, layout, responsive, or snapshot tests. Verify UI and responsive behavior manually
  in the browser. Existing component tests may remain, but do not use them as the default pattern.

---

## Verification cheat-sheet

Run before marking a change done:

```bash
npm run check          # check:i18n → typecheck → test → build
npm run dev            # http://localhost:3005
```

Then sweep changed screens across every responsive transition defined above in Thai and English. The console
must be clean: no missing-message, hydration, or Radix accessibility warnings.

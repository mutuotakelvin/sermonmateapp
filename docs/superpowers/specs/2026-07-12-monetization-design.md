# SermonMate: Monetization — Freemium + AI Cost Control

**Date:** 2026-07-12
**Status:** Approved (pending spec review)

## Context

SermonMate needs revenue and, just as importantly, a **hard ceiling on AI cost** so free
usage can't run up an unbounded Claude bill. The model is **freemium subscription**
("SermonMate Pro"): the app stays fully useful for free (daily verse, mood, verse cards),
AI is the paid engine. Billing goes through **RevenueCat** over **Google Play Billing**
(Apple StoreKit later) — the only policy-compliant way to sell in-app digital
subscriptions. Google is the merchant of record; in Kenya the Play sheet offers **M-Pesa**
and cards, so local and diaspora users are both covered (and the one-time **Lifetime**
product is M-Pesa-friendly since it needs no recurring billing).

Today the AI Cloud Functions (`generateSermon`, `generateMoodSermon`) do **no** metering,
and the user doc's `credits`/`role` fields are unused, unenforced, and **client-writable**.
This spec fixes that: entitlement + usage limits move **server-side**, enforced before any
Claude call, with the client locked out of the fields that grant access.

## Decisions (locked during brainstorming)

- **Free tier:** all non-AI features + **1 AI reflection per day**. Hitting the cap opens
  the paywall (an upgrade moment, not an error).
- **Pro tier:** unlimited AI (reflections, encouragement, future pray-with-AI /
  ask-a-question), with a **soft cap of 50/day** as a scripted-abuse backstop.
- **Reset window:** per **UTC** calendar day (simple, predictable).
- **Entitlement identifier:** `sermonmate Pro`. **Products:** `lifetime`, `yearly`,
  `monthly` (configured in Play Console + RevenueCat, not in code).
- **Infra:** RevenueCat `react-native-purchases` + `react-native-purchases-ui`, using the
  **hosted Paywall** and **Customer Center** (no hand-built paywall screen).
- **Metering counts a *successful* generation only** — a Claude error must not burn quota.
- **New-account farming** is accepted for MVP (per-account daily cap keeps farmed cost
  tiny); revisit with email-verification gating only if abused at scale.

## Architecture

### Entitlement: source of truth + sync
- **RevenueCat is the source of truth.** The app configures RevenueCat with the **public
  SDK key** and calls `Purchases.logIn(firebaseUid)` so the RevenueCat `app_user_id`
  equals the Firebase `uid` — this is what lets the server map a purchase back to a user.
- The **server's** trusted copy is `users/{uid}.pro` (boolean), written **only** by the
  backend. Two writers keep it fresh:
  - **`syncEntitlement` callable** (Cloud Function): calls the RevenueCat REST API
    (`GET /subscribers/{uid}`, using the RevenueCat **secret** key) and sets `pro` from the
    live `sermonmate Pro` entitlement. The client calls this **immediately after a
    purchase/restore** and on app launch — so the buyer is never blocked by webhook lag.
  - **`revenuecatWebhook` HTTP function:** verifies a shared `Authorization` secret, then
    updates `users/{uid}.pro` on background lifecycle events (renewal, cancellation, billing
    issue, refund, expiration).

### Server-side AI metering (the cost ceiling)
- A shared **`enforceAiQuota(uid)`** helper runs at the top of every AI-generating function
  (`generateSermon`, `generateMoodSermon`, and any future AI callable), inside a Firestore
  transaction on `usage/{uid}` (`{ day: 'YYYY-MM-DD' UTC, count }`, reset when `day`
  rolls over):
  - Read `users/{uid}.pro`. Limit = **50** if Pro, else **1**.
  - If `count >= limit` → throw `HttpsError('resource-exhausted', <code>)` where `<code>`
    is `FREE_LIMIT_REACHED` (free) or `PRO_SOFT_LIMIT` (pro). No Claude call happens.
  - Otherwise increment `count` (transactionally) and proceed. On a subsequent Claude
    error, best-effort **decrement** so the failed call doesn't cost the user a quota unit.
- The transactional check-then-increment closes the client-bypass and double-spend races.

### Firestore rules (close the hole)
- `users/{uid}`: client may read its own doc but **may not write** `pro` or `role`
  (field-level deny). `usage/{uid}`: **no client access at all** — server-only.
- The Admin SDK in Cloud Functions bypasses rules, so the backend still writes freely.

### Client
- **`lib/purchases.ts`** — RevenueCat wrapper: `configurePurchases()` (public key),
  `identify(uid)` / `logout()`, `getIsPro()`, `presentPaywall(): Promise<boolean>`
  (wraps `RevenueCatUI.presentPaywall()`), `presentCustomerCenter()`, `restore()`, and a
  `customerInfo` listener that updates entitlement state.
- **`lib/stores/purchases.ts`** — small Zustand store `{ isPro, refresh() }`, updated by the
  RevenueCat listener; UI reads it to unlock features and show/hide upgrade prompts.
- **Init:** configure RevenueCat at startup; on auth login/register/session-restore call
  `identify(uid)` (+ `syncEntitlement`); on logout call `logout()`.
- **Gating points:**
  - Generate flow (home) + mood: when the server returns `FREE_LIMIT_REACHED`, call
    `presentPaywall()`; on a `true` (purchased/restored) result, call `syncEntitlement` and
    **retry** the generation.
  - **Profile screen:** an "Upgrade to Pro" row (hidden when `isPro`) → `presentPaywall()`;
    a "Manage subscription" row → `presentCustomerCenter()`.

## Data flow

Tap Upgrade (or hit the free cap) → RevenueCat Paywall → Google Play (M-Pesa/card) purchase
→ `sermonmate Pro` entitlement active → UI unlocks instantly via the SDK; client calls
`syncEntitlement` → `users/{uid}.pro = true`. Next generation: `enforceAiQuota` sees Pro →
allows up to 50/day. Renewals/cancellations later flow through `revenuecatWebhook`.

## Error handling

- **Purchase cancelled/failed:** `presentPaywall()` returns false → stay free, no error noise.
- **Restore:** re-runs `syncEntitlement`; if no active entitlement, a gentle "nothing to
  restore" message.
- **Webhook lag:** irrelevant to the buyer (client-triggered `syncEntitlement` writes `pro`
  right after purchase); the webhook only backstops background events.
- **`syncEntitlement` / RC REST failure:** log + leave `pro` unchanged; the SDK still gates
  the UI, and the next launch retries the sync.
- **Quota exhausted:** a clean, non-scary result that routes to the paywall (free) or a
  "you've hit today's high limit" note (pro soft cap).

## Secrets

- **RevenueCat public SDK key** — safe in the client (app config `extra`). Use the
  **production** `goog_…` key for release builds; the pasted `test_…` key is dev-only.
- **RevenueCat secret API key** and the **webhook auth secret** — Firebase secrets,
  server-only (never shipped in the app), same handling as the Anthropic key.

## Testing

No automated test framework (established; none added). Per file: `npx tsc --noEmit` +
`npm run lint` with no new problems; functions build with `tsc`. RevenueCat adds a native
module → a **dev rebuild** is required. Human/on-device verification (with Play **license
testers** in sandbox):
1. Free account: 1st reflection works; 2nd same day → paywall appears.
2. Purchase (sandbox) → paywall closes → generation is immediately unlimited (no relaunch).
3. Firestore `users/{uid}.pro` flips to `true`; client cannot write `pro`/`usage` (rules
   reject).
4. Customer Center opens and can manage/cancel; cancellation → webhook → `pro` back to
   `false`.
5. Pro soft cap: the 51st generation in a day is blocked with `PRO_SOFT_LIMIT`.

## Human / business setup (outside code)

Play Console: create the `monthly`/`yearly` subscriptions + `lifetime` one-time product, a
Google Payments merchant profile, and confirm M-Pesa (incl. recurring for KE — else the
Lifetime/period option covers M-Pesa users). RevenueCat: project, entitlement
`sermonmate Pro`, offering with the three products, the hosted Paywall, Customer Center, and
the webhook → the `revenuecatWebhook` URL with the auth secret. Set prices in the dashboard
(e.g. ballpark Monthly ~$4.99 · Yearly ~$29.99 · Lifetime ~$59.99, with lower localized KE
pricing) — pricing is not in code.

## Out of scope (v1)

Apple/iOS billing, promo/gift codes, family plans, web checkout, premium card themes behind
Pro, and any per-feature gating beyond the AI quota (all non-AI features stay free).

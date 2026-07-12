# Monetization (Freemium + AI Cost Control) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate AI generation behind a server-enforced daily quota (free 1/day, Pro unlimited w/ 50/day backstop) and sell "SermonMate Pro" via RevenueCat.

**Architecture:** Cloud Functions enforce the quota and own the entitlement flag (`users/{uid}.pro`), synced from RevenueCat via a client-triggered `syncEntitlement` callable + a background webhook. The app uses `react-native-purchases` (+ `-ui` hosted Paywall/Customer Center) for purchases and reads entitlement for UI. Firestore rules lock the client out of `pro`/`role`/`usage`.

**Tech Stack:** Expo SDK 54, expo-router 6, RN 0.81, TypeScript strict; Firebase Functions v2 (`onCall`/`onRequest`) + `firebase-admin`; Anthropic (existing); RevenueCat `react-native-purchases` + `react-native-purchases-ui`.

## Global Constraints

- **Quota:** free = **1 AI generation / day**, Pro = **50 / day** (soft abuse cap). Reset per **UTC** day (`YYYY-MM-DD`). Count a **successful** generation only — **refund** (decrement) if the Claude call fails.
- **Enforcement is server-side**, keyed to `request.auth.uid`, in a Firestore transaction on `usage/{uid}`. Applies to `generateSermon` AND `generateMoodSermon` (and any future AI callable).
- **Entitlement identifier:** `sermonmate Pro` (note the space). **Products** (`lifetime`/`yearly`/`monthly`) are configured in the RevenueCat/Play dashboards, **not** in code.
- **Error codes (server → client):** `HttpsError('resource-exhausted', 'FREE_LIMIT_REACHED')` for free, `'PRO_SOFT_LIMIT'` for Pro. The client maps `FREE_LIMIT_REACHED` → paywall.
- **Secrets:** RevenueCat **public SDK key** lives in the client (`app.config.js` → `extra.revenueCatAndroidKey`; dev value is the `test_…` key, swap `goog_…` for release). RevenueCat **secret key** + **webhook auth secret** are **Firebase secrets** (`REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`) — never shipped in the app.
- **Firestore rules** must deny the client any write to `users/{uid}.pro` / `.role` and any access to `usage/{uid}`.
- **No new AI limits on non-AI features** — verse, mood tracking, cards all stay free and unmetered.
- **No test framework** (project has none; do not add). Verify: client `npx tsc --noEmit` (0) + `npm run lint` (baseline **14**, no new); functions `cd functions && npm run build` (compiles clean). RevenueCat adds native modules → a **dev rebuild** is required (human, on-device) — not checkable by tsc/lint.

---

### Task 1: Server — AI quota metering

**Files:**
- Modify: `functions/package.json` (add `firebase-admin`)
- Modify: `functions/src/index.ts`

**Interfaces:**
- Produces (server-internal): `enforceAiQuota(uid: string): Promise<void>`, `refundAiQuota(uid: string): Promise<void>`, `utcDay(): string`. Both AI callables now throw `HttpsError('resource-exhausted', 'FREE_LIMIT_REACHED' | 'PRO_SOFT_LIMIT')` when over quota.

- [ ] **Step 1: Add firebase-admin**

Run: `cd functions && npm install firebase-admin && cd ..`
Expected: `firebase-admin` appears under `functions/package.json` dependencies.

- [ ] **Step 2: Initialize admin + add quota helpers**

In `functions/src/index.ts`, add these imports below the existing imports:
```ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
```
Immediately after the imports (before `const ANTHROPIC_API_KEY`), add:
```ts
if (!getApps().length) initializeApp();

const FREE_DAILY_LIMIT = 1;
const PRO_DAILY_LIMIT = 50;

function utcDay(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

// Atomically enforce + reserve one AI generation for the day. Throws
// resource-exhausted when over the caller's limit (free vs Pro).
async function enforceAiQuota(uid: string): Promise<void> {
  const db = getFirestore();
  const userSnap = await db.doc(`users/${uid}`).get();
  const isPro = userSnap.exists && userSnap.get("pro") === true;
  const limit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const day = utcDay();
  const ref = db.doc(`usage/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() ?? {} : {};
    const count = data.day === day ? (data.count ?? 0) : 0;
    if (count >= limit) {
      throw new HttpsError("resource-exhausted", isPro ? "PRO_SOFT_LIMIT" : "FREE_LIMIT_REACHED");
    }
    tx.set(ref, { day, count: count + 1 }, { merge: true });
  });
}

// Best-effort: give back the reserved unit when the Claude call fails.
async function refundAiQuota(uid: string): Promise<void> {
  try {
    const db = getFirestore();
    const day = utcDay();
    const ref = db.doc(`usage/${uid}`);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data() ?? {};
      if (data.day === day && (data.count ?? 0) > 0) {
        tx.update(ref, { count: data.count - 1 });
      }
    });
  } catch (err) {
    console.error("Quota refund failed:", err);
  }
}
```

- [ ] **Step 3: Wire the quota into `generateSermon`**

Replace the body of the `generateSermon` handler:
```ts
    requireAuth(request);
    const topic = String(request.data?.topic ?? "").trim();
    if (!topic) {
      throw new HttpsError("invalid-argument", "A topic is required.");
    }
    return generate(`Create sermon content about: "${topic}".`);
```
with:
```ts
    requireAuth(request);
    const uid = request.auth!.uid;
    const topic = String(request.data?.topic ?? "").trim();
    if (!topic) {
      throw new HttpsError("invalid-argument", "A topic is required.");
    }
    await enforceAiQuota(uid);
    try {
      return await generate(`Create sermon content about: "${topic}".`);
    } catch (err) {
      await refundAiQuota(uid);
      throw err;
    }
```

- [ ] **Step 4: Wire the quota into `generateMoodSermon`**

In the `generateMoodSermon` handler, replace:
```ts
    requireAuth(request);
    const mood = String(request.data?.mood ?? "");
```
with:
```ts
    requireAuth(request);
    const uid = request.auth!.uid;
    const mood = String(request.data?.mood ?? "");
```
and replace its trailing `return generate(...)` block:
```ts
    return generate(
      `Create a biblical sermon and encouragement for someone who is ${moodContext} ` +
        `because of: ${reasonText || "unspecified reasons"}. The interpretation should ` +
        `address their emotional state, and the story should relate to their situation.`
    );
```
with:
```ts
    await enforceAiQuota(uid);
    try {
      return await generate(
        `Create a biblical sermon and encouragement for someone who is ${moodContext} ` +
          `because of: ${reasonText || "unspecified reasons"}. The interpretation should ` +
          `address their emotional state, and the story should relate to their situation.`
      );
    } catch (err) {
      await refundAiQuota(uid);
      throw err;
    }
```

- [ ] **Step 5: Build the functions**

Run: `cd functions && npm run build && cd ..`
Expected: TypeScript compiles with no errors.

- [ ] **Step 6: Commit**
```bash
git add functions/package.json functions/package-lock.json functions/src/index.ts
git commit -m "feat(functions): server-side AI daily quota (free 1/day, pro 50/day)"
```

---

### Task 2: Server — RevenueCat entitlement sync

**Files:**
- Modify: `functions/src/index.ts`

**Interfaces:**
- Consumes: `getFirestore` (Task 1), `defineSecret`, `onCall`, `onRequest`, `requireAuth`.
- Produces: `refreshProFromRevenueCat(uid: string): Promise<boolean>`; exported functions `syncEntitlement` (callable, returns `{ pro: boolean }`) and `revenuecatWebhook` (HTTP).

- [ ] **Step 1: Add the RevenueCat secrets + entitlement constant**

In `functions/src/index.ts`, add the import for `onRequest` by changing:
```ts
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
```
to:
```ts
import { onCall, onRequest, HttpsError, CallableRequest } from "firebase-functions/v2/https";
```
Below `const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");` add:
```ts
const REVENUECAT_SECRET_KEY = defineSecret("REVENUECAT_SECRET_KEY");
const REVENUECAT_WEBHOOK_AUTH = defineSecret("REVENUECAT_WEBHOOK_AUTH");
const RC_ENTITLEMENT = "sermonmate Pro";
```

- [ ] **Step 2: Add `refreshProFromRevenueCat`**

Add near the quota helpers (Node 20 has global `fetch`):
```ts
// Read the user's live entitlement from RevenueCat's REST API and mirror it
// into users/{uid}.pro (the server's trusted flag). Returns the new value.
async function refreshProFromRevenueCat(uid: string): Promise<boolean> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${REVENUECAT_SECRET_KEY.value()}` },
  });
  if (!res.ok) {
    console.error("RevenueCat subscriber fetch failed:", res.status);
    throw new HttpsError("unavailable", "Could not verify your subscription. Please try again.");
  }
  const body = (await res.json()) as {
    subscriber?: { entitlements?: Record<string, { expires_date?: string | null }> };
  };
  const ent = body.subscriber?.entitlements?.[RC_ENTITLEMENT];
  const isPro = !!ent && (ent.expires_date == null || new Date(ent.expires_date).getTime() > Date.now());
  await getFirestore().doc(`users/${uid}`).set({ pro: isPro }, { merge: true });
  return isPro;
}
```

- [ ] **Step 3: Add the `syncEntitlement` callable and `revenuecatWebhook`**

Append at the end of the file:
```ts
// Client calls this right after a purchase/restore and on app launch, so a
// buyer is never gated by webhook lag.
export const syncEntitlement = onCall(
  { secrets: [REVENUECAT_SECRET_KEY] },
  async (request) => {
    requireAuth(request);
    const pro = await refreshProFromRevenueCat(request.auth!.uid);
    return { pro };
  }
);

// Background lifecycle events (renewal, cancellation, billing issue, refund).
// Verified with a shared secret set as the webhook's Authorization header.
export const revenuecatWebhook = onRequest(
  { secrets: [REVENUECAT_SECRET_KEY, REVENUECAT_WEBHOOK_AUTH] },
  async (req, res) => {
    if (req.header("Authorization") !== REVENUECAT_WEBHOOK_AUTH.value()) {
      res.status(401).send("unauthorized");
      return;
    }
    const uid = req.body?.event?.app_user_id;
    if (!uid || typeof uid !== "string") {
      res.status(400).send("missing app_user_id");
      return;
    }
    try {
      await refreshProFromRevenueCat(uid);
      res.status(200).send("ok");
    } catch (err) {
      console.error("Webhook processing failed:", err);
      res.status(500).send("error");
    }
  }
);
```

- [ ] **Step 4: Build the functions**

Run: `cd functions && npm run build && cd ..`
Expected: compiles clean.

- [ ] **Step 5: Commit**
```bash
git add functions/src/index.ts
git commit -m "feat(functions): RevenueCat entitlement sync (syncEntitlement + webhook)"
```

- [ ] **Step 6: Human note (record in report)**

These require, before deploy: `firebase functions:secrets:set REVENUECAT_SECRET_KEY` and `REVENUECAT_WEBHOOK_AUTH`; `firebase deploy --only functions`; then set the RevenueCat webhook URL to the deployed `revenuecatWebhook` URL with a matching `Authorization` header value.

---

### Task 3: Firestore rules lockdown

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Replace the rules**

Replace the entire contents of `firestore.rules` with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    match /users/{uid} {
      allow read: if isOwner(uid);
      // A new user may create their own doc but cannot self-grant Pro.
      allow create: if isOwner(uid) && request.resource.data.get('pro', false) == false;
      // Owner may edit their profile but never the server-owned fields.
      allow update: if isOwner(uid)
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['pro', 'role']);
      allow delete: if false;

      match /sermons/{sermonId} {
        allow read, write: if isOwner(uid);
      }
    }

    // Server (Admin SDK) only — the AI usage counter is never client-accessible.
    match /usage/{uid} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add firestore.rules
git commit -m "feat(rules): lock pro/role and usage counter to server-only writes"
```

- [ ] **Step 3: Human note (record in report)**

`firebase deploy --only firestore:rules` is required for these to take effect. Existing user docs without a `pro` field are treated as free until synced (correct).

---

### Task 4: Client — RevenueCat wrapper, store, deps, config

**Files:**
- Modify: `package.json` / lockfile (via `npx expo install`)
- Modify: `app.config.js` (add `extra.revenueCatAndroidKey`)
- Create: `lib/purchases.ts`
- Create: `lib/stores/purchases.ts`

**Interfaces:**
- Produces: from `lib/purchases.ts` — `configurePurchases(): void`, `identifyPurchaser(uid: string): Promise<void>`, `logoutPurchaser(): Promise<void>`, `getIsPro(): Promise<boolean>`, `presentPaywall(): Promise<boolean>`, `presentCustomerCenter(): Promise<void>`, `restorePurchases(): Promise<boolean>`, `addProListener(cb: (isPro: boolean) => void): () => void`, `syncEntitlement(): Promise<boolean>`. From `lib/stores/purchases.ts` — `usePurchasesStore` (Zustand) with `{ isPro: boolean; setPro(v: boolean): void; refresh(): Promise<void> }`.

- [ ] **Step 1: Install the RevenueCat SDKs**

Run: `npx expo install react-native-purchases react-native-purchases-ui`
Expected: both added to `package.json` at SDK-54-compatible versions.

- [ ] **Step 2: Add the public SDK key to app config**

In `app.config.js`, inside the `extra` object, add the key after `router: {},`:
```js
      router: {},
      // RevenueCat PUBLIC SDK key (safe to embed). Dev = test key; swap the
      // production `goog_…` Android key for release builds.
      revenueCatAndroidKey: "test_mjRkcgiEYcLDcfMeljRIjuuhTvd",
```

- [ ] **Step 3: Create `lib/purchases.ts`**

```ts
import Constants from 'expo-constants';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const RC_ENTITLEMENT = 'sermonmate Pro';
const API_KEY = Constants.expoConfig?.extra?.revenueCatAndroidKey as string | undefined;

let configured = false;

export function configurePurchases(): void {
  if (configured) return;
  if (!API_KEY) {
    console.warn('RevenueCat key missing from app config extra; skipping configure.');
    return;
  }
  Purchases.configure({ apiKey: API_KEY });
  configured = true;
}

export async function identifyPurchaser(uid: string): Promise<void> {
  configurePurchases();
  if (!configured) return;
  await Purchases.logIn(uid);
}

export async function logoutPurchaser(): Promise<void> {
  if (!configured) return;
  await Purchases.logOut();
}

export function isProFromInfo(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[RC_ENTITLEMENT] !== 'undefined';
}

export async function getIsPro(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.getCustomerInfo();
  return isProFromInfo(info);
}

export async function presentPaywall(): Promise<boolean> {
  const result = await RevenueCatUI.presentPaywall();
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function presentCustomerCenter(): Promise<void> {
  await RevenueCatUI.presentCustomerCenter();
}

export async function restorePurchases(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return isProFromInfo(info);
}

export function addProListener(cb: (isPro: boolean) => void): () => void {
  const listener = (info: CustomerInfo) => cb(isProFromInfo(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

// Ask the backend to mirror the live RevenueCat entitlement into Firestore.
export async function syncEntitlement(): Promise<boolean> {
  const call = httpsCallable<undefined, { pro: boolean }>(functions, 'syncEntitlement');
  const res = await call();
  return res.data.pro;
}
```

- [ ] **Step 4: Create `lib/stores/purchases.ts`**

```ts
import { create } from 'zustand';
import { getIsPro } from '@/lib/purchases';

interface PurchasesState {
  isPro: boolean;
  setPro: (v: boolean) => void;
  refresh: () => Promise<void>;
}

export const usePurchasesStore = create<PurchasesState>((set) => ({
  isPro: false,
  setPro: (v) => set({ isPro: v }),
  refresh: async () => {
    try {
      set({ isPro: await getIsPro() });
    } catch (err) {
      console.warn('Failed to refresh Pro status', err);
    }
  },
}));
```

- [ ] **Step 5: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: 0 errors.
Run: `npm run lint`
Expected: no new problems beyond the 14 baseline.

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json app.config.js lib/purchases.ts lib/stores/purchases.ts
git commit -m "feat: RevenueCat wrapper + purchases store + config"
```

- [ ] **Step 7: Human note (record in report)**

RevenueCat adds native modules → a dev rebuild (`npx expo run:android` / EAS dev build) is required before this runs on device. Also configure the hosted Paywall + Customer Center in the RevenueCat dashboard, and an offering containing `lifetime`/`yearly`/`monthly` with entitlement `sermonmate Pro`.

---

### Task 5: Client — app init, auth wiring, AiLimitError

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `lib/sermonAi.ts`

**Interfaces:**
- Consumes: `configurePurchases`, `identifyPurchaser`, `logoutPurchaser`, `addProListener`, `syncEntitlement` (Task 4); `usePurchasesStore` (Task 4); `useAuthStore` (existing, `user.id` = Firebase uid).
- Produces: `AiLimitError` (exported class from `lib/sermonAi.ts`) with `kind: 'free' | 'pro'`. `generateSermon`/`generateMoodSermon` now throw `AiLimitError` on `functions/resource-exhausted`.

- [ ] **Step 1: Throw a typed limit error from the AI client**

In `lib/sermonAi.ts`, add below the imports:
```ts
export class AiLimitError extends Error {
  constructor(public kind: 'free' | 'pro') {
    super('AI_LIMIT_REACHED');
    this.name = 'AiLimitError';
  }
}

function toAiError(error: any): Error {
  if (error?.code === 'functions/resource-exhausted') {
    return new AiLimitError(error?.message === 'PRO_SOFT_LIMIT' ? 'pro' : 'free');
  }
  return new Error(error?.message || 'Failed to generate. Please try again.');
}
```
Then in `generateSermon`, replace its catch body:
```ts
  } catch (error: any) {
    console.error('Error generating sermon:', error?.code, error?.message);
    throw new Error(error?.message || 'Failed to generate sermon. Please try again.');
  }
```
with:
```ts
  } catch (error: any) {
    console.error('Error generating sermon:', error?.code, error?.message);
    throw toAiError(error);
  }
```
And in `generateMoodSermon`, replace its catch body:
```ts
  } catch (error: any) {
    console.error('Error generating mood sermon:', error?.code, error?.message);
    throw new Error(error?.message || 'Failed to generate sermon. Please try again.');
  }
```
with:
```ts
  } catch (error: any) {
    console.error('Error generating mood sermon:', error?.code, error?.message);
    throw toAiError(error);
  }
```

- [ ] **Step 2: Configure RevenueCat at startup + wire auth**

In `app/_layout.tsx`, add these imports with the others:
```tsx
import { configurePurchases, identifyPurchaser, logoutPurchaser, addProListener, syncEntitlement } from '@/lib/purchases';
import { usePurchasesStore } from '@/lib/stores/purchases';
import { useAuthStore } from '@/lib/stores/auth';
```
Next to the existing `configureNotifications();` module-load call, add:
```tsx
configurePurchases();
```
Inside `RootLayout`, after the existing hooks (e.g. after `const handledResponseId = useRef...`), add:
```tsx
  const authUserId = useAuthStore((s) => s.user?.id);
  const setPro = usePurchasesStore((s) => s.setPro);

  // Keep the Pro flag live from RevenueCat's SDK.
  useEffect(() => {
    const remove = addProListener((isPro) => setPro(isPro));
    return remove;
  }, [setPro]);

  // On sign-in: identify the purchaser + sync entitlement. On sign-out: clear.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authUserId) {
        try {
          await identifyPurchaser(authUserId);
          await syncEntitlement();
        } catch (err) {
          console.warn('Entitlement sync failed', err);
        }
        if (!cancelled) await usePurchasesStore.getState().refresh();
      } else {
        try { await logoutPurchaser(); } catch { /* not configured yet */ }
        setPro(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authUserId, setPro]);
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: 0 errors.
Run: `npm run lint`
Expected: no new problems beyond the 14 baseline.

- [ ] **Step 4: Commit**
```bash
git add app/_layout.tsx lib/sermonAi.ts
git commit -m "feat: configure RevenueCat, sync entitlement on auth, typed AI limit error"
```

---

### Task 6: Client — paywall gating + profile Pro rows

**Files:**
- Modify: `app/(protected)/(tabs)/home.tsx`
- Modify: `components/MoodModal.tsx`
- Modify: `app/(protected)/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: `AiLimitError` (Task 5); `presentPaywall`, `presentCustomerCenter`, `syncEntitlement` (Task 4); `usePurchasesStore` (Task 4).

- [ ] **Step 1: Home — paywall on free limit, retry after purchase**

In `app/(protected)/(tabs)/home.tsx`, update the AI import and add the purchases imports:
```tsx
import { generateSermon, AiLimitError } from "@/lib/sermonAi";
import { presentPaywall, syncEntitlement } from "@/lib/purchases";
import { usePurchasesStore } from "@/lib/stores/purchases";
```
Replace the whole `handleGenerate` function with a no-arg entry point + a guarded runner (so `onPress`/`onSubmitEditing` never pass an event as the retry flag):
```tsx
  const handleGenerate = () => runGenerate(false);

  const runGenerate = async (isRetry: boolean) => {
    if (!topic.trim()) return;
    setSermon(null);
    setEditingSermon(null);
    setGenerating(true);
    setLoading(true);
    setModalVisible(true); // open the reading view immediately in its loading state
    try {
      const result = await generateSermon(topic.trim());
      setSermon(result);
      showSuccess('Reflection ready', 'Your reflection is ready to read');
    } catch (error) {
      setModalVisible(false);
      if (error instanceof AiLimitError) {
        if (error.kind === 'free' && !isRetry) {
          const bought = await presentPaywall();
          if (bought) {
            try { await syncEntitlement(); } catch { /* webhook will backstop */ }
            await usePurchasesStore.getState().refresh();
            await runGenerate(true);
            return;
          }
        } else if (error.kind === 'pro') {
          showError('Daily limit reached', "You've hit today's high usage limit. Try again tomorrow.");
        }
        return;
      }
      console.error('Error generating sermon:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        showError('Network Error', 'Could not reach the reflection service. Please check your internet connection.');
      } else {
        showError('Generation failed', errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage);
      }
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };
```
(Leave every `handleGenerate` call site as-is — they call it with no args.)

- [ ] **Step 2: Mood — paywall on free limit, retry after purchase**

In `components/MoodModal.tsx`, add imports:
```tsx
import { AiLimitError } from '@/lib/sermonAi';
import { presentPaywall, syncEntitlement } from '@/lib/purchases';
import { usePurchasesStore } from '@/lib/stores/purchases';
```
Replace the `handleGenerateSermon` function with a no-arg entry + guarded runner:
```tsx
  const handleGenerateSermon = () => runGenerateMood(false);

  const runGenerateMood = async (isRetry: boolean) => {
    if (!selectedMood) return;

    setLoading(true);
    setStep(3);

    try {
      const sermon = await generateMoodSermon(
        selectedMood,
        selectedReasons,
        customReason.trim() || undefined
      );

      setGeneratedSermon(sermon);

      const entry: MoodEntry = {
        id: `mood-${Date.now()}-${Math.random()}`,
        mood: selectedMood,
        reason: selectedReasons,
        customReason: customReason.trim() || undefined,
        date: new Date().toISOString(),
        sermon,
        aiAdvice: sermon.interpretation,
      };

      await addMoodEntry(entry);
      setMoodEntry(entry);

      setSermonModalVisible(true);
      showSuccess('Mood recorded', 'Your encouragement is ready');
    } catch (error) {
      if (error instanceof AiLimitError) {
        setStep(2);
        setLoading(false);
        if (error.kind === 'free' && !isRetry) {
          const bought = await presentPaywall();
          if (bought) {
            try { await syncEntitlement(); } catch { /* webhook will backstop */ }
            await usePurchasesStore.getState().refresh();
            await runGenerateMood(true);
            return;
          }
        } else if (error.kind === 'pro') {
          showError('Daily limit reached', "You've hit today's high usage limit. Try again tomorrow.");
        }
        return;
      }
      console.error('Error generating mood sermon:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate encouragement';
      showError('Generation failed', errorMessage);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };
```
(Leave every `handleGenerateSermon` call site as-is.)

- [ ] **Step 3: Profile — Upgrade / Manage rows**

In `app/(protected)/(tabs)/profile.tsx`, add imports:
```tsx
import { useToast } from '@/components/ToastProvider';
import { presentPaywall, presentCustomerCenter, syncEntitlement } from '@/lib/purchases';
import { usePurchasesStore } from '@/lib/stores/purchases';
```
Inside `Profile()`, after `const { user, logout } = useAuthStore();`, add:
```tsx
  const isPro = usePurchasesStore((s) => s.isPro);
  const refreshPro = usePurchasesStore((s) => s.refresh);
  const { showInfo } = useToast();

  const handleUpgrade = async () => {
    const bought = await presentPaywall();
    if (bought) {
      try { await syncEntitlement(); } catch { /* webhook will backstop */ }
      await refreshPro();
    }
  };

  const handleManageSubscription = async () => {
    try {
      await presentCustomerCenter();
      await refreshPro();
    } catch {
      showInfo('Unavailable', 'Subscription management is not available right now.');
    }
  };
```
Then, directly **above** the `{/* Account Actions */}` card, insert a Pro card:
```tsx
        {/* SermonMate Pro */}
        <Card style={styles.actionsCard}>
          {isPro ? (
            <TouchableOpacity style={styles.actionRow} onPress={handleManageSubscription} activeOpacity={0.7}>
              <Ionicons name="sparkles" size={20} color={theme.color.accent} />
              <AppText variant="body" style={styles.actionText}>SermonMate Pro · Active</AppText>
              <AppText variant="caption" style={styles.manageLink}>Manage</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionRow} onPress={handleUpgrade} activeOpacity={0.7}>
              <Ionicons name="sparkles-outline" size={20} color={theme.color.accent} />
              <AppText variant="body" style={styles.upgradeText}>Upgrade to SermonMate Pro</AppText>
              <Ionicons name="chevron-forward" size={16} color={theme.color.accent} />
            </TouchableOpacity>
          )}
        </Card>
```
Add these style keys to the `StyleSheet.create({ ... })` block (next to `actionText`):
```tsx
  upgradeText: {
    flex: 1,
    color: theme.color.accent,
    fontFamily: theme.font.sansSemibold,
  },
  manageLink: {
    color: theme.color.accent,
  },
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: 0 errors.
Run: `npm run lint`
Expected: no new problems beyond the 14 baseline.

- [ ] **Step 5: Commit**
```bash
git add app/\(protected\)/\(tabs\)/home.tsx components/MoodModal.tsx app/\(protected\)/\(tabs\)/profile.tsx
git commit -m "feat: paywall gating on AI limit + Pro upgrade/manage in profile"
```

---

## Notes for the implementer

- **No test framework** — verification is client `tsc`/`lint` + `cd functions && npm run build`, plus a human on-device pass after a dev rebuild (RevenueCat is native). Do not scaffold a test runner.
- **Confirm "already imported/defined" claims** before assuming (e.g. `Ionicons`, `theme`, `Card`, `AppText`, `TouchableOpacity` already in `profile.tsx`; `useToast`, `showError`, `showSuccess` in `home.tsx`/`MoodModal.tsx`). Add a minimal import if genuinely missing and note it.
- **Do not change** the non-AI features (verse, mood tracking, cards) — they remain free and unmetered. The only server change to generation is the quota gate.
- The dev `test_…` RevenueCat key is fine to commit (public SDK key). The RevenueCat **secret** key and webhook auth secret must ONLY be Firebase secrets — never place them in the app or `app.config.js`.

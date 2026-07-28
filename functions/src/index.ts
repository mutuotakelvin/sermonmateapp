import { onCall, onRequest, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { timingSafeEqual } from "crypto";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// The Anthropic API key is a secret — it is stored by Firebase, injected into
// the function at runtime, and NEVER shipped in the mobile app. Set it once with:
//   firebase functions:secrets:set ANTHROPIC_API_KEY
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const REVENUECAT_SECRET_KEY = defineSecret("REVENUECAT_SECRET_KEY");
const REVENUECAT_WEBHOOK_AUTH = defineSecret("REVENUECAT_WEBHOOK_AUTH");
const RC_ENTITLEMENT = "sermonmate Pro";

if (!getApps().length) initializeApp();

// Daily caps per quota kind. "generation" is a full reflection; "followUp" is a
// story or prayer riffing on one the user already has.
//
// Pro is capped rather than unlimited because generations cost real Anthropic
// spend: at the Kenyan price the plan nets ~$2.26/month, and a reflection runs
// ~$0.01, so an uncapped heavy user costs more than they pay. 12/day is well
// beyond a daily-devotional habit while keeping the margin positive. Follow-ups
// use half the max_tokens, so they get a looser cap on their own counter.
type QuotaKind = "generation" | "followUp";

const DAILY_LIMITS: Record<QuotaKind, { free: number; pro: number }> = {
  generation: { free: 1, pro: 12 },
  followUp: { free: 4, pro: 30 },
};

// Field in usage/{uid} backing each kind. Generations keep the original "count"
// field so live counters keep their meaning across this deploy.
const USAGE_FIELD: Record<QuotaKind, string> = {
  generation: "count",
  followUp: "followUpCount",
};

function utcDay(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

// Atomically enforce + reserve one AI generation for the day. Throws
// resource-exhausted when over the caller's limit (free vs Pro).
async function enforceAiQuota(uid: string, kind: QuotaKind = "generation"): Promise<void> {
  const db = getFirestore();
  const day = utcDay();
  const userRef = db.doc(`users/${uid}`);
  const usageRef = db.doc(`usage/${uid}`);
  const field = USAGE_FIELD[kind];
  await db.runTransaction(async (tx) => {
    const [userSnap, usageSnap] = await Promise.all([tx.get(userRef), tx.get(usageRef)]);
    const isPro = userSnap.exists && userSnap.get("pro") === true;
    const limit = isPro ? DAILY_LIMITS[kind].pro : DAILY_LIMITS[kind].free;
    const data = usageSnap.exists ? usageSnap.data() ?? {} : {};
    const sameDay = data.day === day;
    const count = sameDay ? (data[field] ?? 0) : 0;
    if (count >= limit) {
      // Follow-up limits surface straight to the user as a message, so they get
      // their own code rather than reusing the paywall-triggering ones.
      if (kind === "followUp") {
        throw new HttpsError("resource-exhausted", "FOLLOW_UP_LIMIT_REACHED");
      }
      throw new HttpsError("resource-exhausted", isPro ? "PRO_SOFT_LIMIT" : "FREE_LIMIT_REACHED");
    }
    // Rolling onto a new day resets every counter, not just the one being spent.
    const next = sameDay ? { [field]: count + 1 } : { count: 0, followUpCount: 0, [field]: 1 };
    tx.set(usageRef, { day, ...next }, { merge: true });
  });
}

// Best-effort: give back the reserved unit when the Claude call fails.
async function refundAiQuota(uid: string, kind: QuotaKind = "generation"): Promise<void> {
  try {
    const db = getFirestore();
    const day = utcDay();
    const ref = db.doc(`usage/${uid}`);
    const field = USAGE_FIELD[kind];
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data() ?? {};
      if (data.day === day && (data[field] ?? 0) > 0) {
        tx.update(ref, { [field]: data[field] - 1 });
      }
    });
  } catch (err) {
    console.error("Quota refund failed:", err);
  }
}

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

// Cheapest capable Claude model — a sermon costs a fraction of a cent here.
const MODEL = "claude-haiku-4-5";

interface Sermon {
  verses: string[];
  interpretation: string;
}

const MOOD_CONTEXT: Record<string, string> = {
  Happy: "celebrating joy and gratitude",
  Grateful: "feeling thankful and blessed",
  Hopeful: "seeking hope and encouragement",
  Peaceful: "experiencing peace and contentment",
  Anxious: "feeling anxious and needing peace",
  Sad: "feeling sad and needing comfort",
  Overwhelmed: "feeling overwhelmed and needing strength",
  Angry: "feeling angry and needing guidance",
};

const SYSTEM_PROMPT =
  "You are a compassionate Christian assistant that writes short, encouraging " +
  "reflection content. Reply with ONLY valid minified JSON — no markdown, no code " +
  "fences, no commentary — using exactly these keys: verses (an array of 2 " +
  "strings, each a Bible verse reference followed by its text), interpretation " +
  "(a string). Example: " +
  '{"verses":["John 3:16 - For God so loved...","..."],"interpretation":"..."}';

// Shared: call Claude with a user prompt and parse the sermon JSON out of the reply.
async function generate(userPrompt: string): Promise<Sermon> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("Anthropic request failed:", err);
    throw new HttpsError("unavailable", "The sermon service is temporarily unavailable. Please try again.");
  }

  if (response.stop_reason === "refusal") {
    throw new HttpsError("failed-precondition", "That request could not be completed. Try a different topic.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new HttpsError("internal", "No sermon content was returned. Please try again.");
  }

  // Defensively strip any code fences before parsing.
  const trimmed = textBlock.text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();

  let sermon: Sermon;
  try {
    sermon = JSON.parse(trimmed) as Sermon;
  } catch {
    console.error("Failed to parse sermon JSON:", trimmed.slice(0, 500));
    throw new HttpsError("internal", "The generated sermon was malformed. Please try again.");
  }

  if (!Array.isArray(sermon.verses) || sermon.verses.length < 1 || !sermon.interpretation) {
    console.error("Sermon failed validation:", JSON.stringify(sermon));
    throw new HttpsError("internal", "The generated sermon was incomplete. Please try again.");
  }

  return {
    verses: sermon.verses,
    interpretation: sermon.interpretation,
  };
}

// Plain-text generation (no JSON schema) — used by story/prayer follow-ups.
async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err: unknown) {
    console.error("Anthropic request failed:", err);
    throw new HttpsError("unavailable", "The service is temporarily unavailable. Please try again.");
  }

  if (response.stop_reason === "refusal") {
    throw new HttpsError("failed-precondition", "That request could not be completed. Try again.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new HttpsError("internal", "No content was returned. Please try again.");
  }

  return textBlock.text.trim();
}

const STORY_SYSTEM_PROMPT =
  "You are a compassionate Christian assistant. Write a short, vivid story of 2-3 short " +
  "paragraphs that illustrates the heart of the reflection the user shares. Reply with " +
  "ONLY the story text — no title, no preamble, no markdown, no code fences.";

const PRAYER_SYSTEM_PROMPT =
  "You are a compassionate Christian assistant. Write a short, heartfelt prayer of a few " +
  "sentences that responds to the reflection the user shares. Reply with ONLY the prayer " +
  "text — no title, no preamble, no markdown, no code fences.";

// Callable functions verify the Firebase Auth token automatically, so only
// signed-in users of the app can invoke these (caps abuse of the paid API).
function requireAuth(request: CallableRequest): void {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to generate a sermon.");
  }
}

// Follow-ups take the reflection text back from the client, which makes it the
// one part of these prompts a caller fully controls. Cap it: an unbounded string
// is an unbounded Anthropic bill, and a long one is room to smuggle in
// instructions of the caller's own.
const MAX_CONTEXT_CHARS = 2000;

function readContext(request: CallableRequest): string {
  const context = String(request.data?.context ?? "").trim();
  if (!context) {
    throw new HttpsError("invalid-argument", "Context is required.");
  }
  if (context.length > MAX_CONTEXT_CHARS) {
    throw new HttpsError("invalid-argument", "That reflection is too long to work from.");
  }
  return context;
}

export const generateSermon = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
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
  }
);

export const generateMoodSermon = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    requireAuth(request);
    const uid = request.auth!.uid;
    const mood = String(request.data?.mood ?? "");
    const reason: string[] = Array.isArray(request.data?.reason)
      ? request.data.reason.map((r: unknown) => String(r))
      : [];
    const customReason = request.data?.customReason ? String(request.data.customReason) : undefined;

    const moodContext = MOOD_CONTEXT[mood] ?? "seeking encouragement";
    const reasonText = customReason ? [...reason, customReason].join(", ") : reason.join(", ");

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
  }
);

// Follow-up: a short story illustrating a reflection the user already generated.
// Metered on its own looser counter so asking for a story never eats the day's
// reflection.
export const generateStory = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    requireAuth(request);
    const uid = request.auth!.uid;
    const context = readContext(request);
    await enforceAiQuota(uid, "followUp");
    try {
      const story = await generateText(
        STORY_SYSTEM_PROMPT,
        `Reflection: "${context}". Write a short story that illustrates it.`
      );
      return { story };
    } catch (err) {
      await refundAiQuota(uid, "followUp");
      throw err;
    }
  }
);

// Follow-up: a short prayer responding to a reflection the user already
// generated. Shares the follow-up counter with generateStory.
export const generatePrayer = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    requireAuth(request);
    const uid = request.auth!.uid;
    const context = readContext(request);
    await enforceAiQuota(uid, "followUp");
    try {
      const prayer = await generateText(
        PRAYER_SYSTEM_PROMPT,
        `Reflection: "${context}". Write a short prayer responding to it.`
      );
      return { prayer };
    } catch (err) {
      await refundAiQuota(uid, "followUp");
      throw err;
    }
  }
);

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
    // The RevenueCat dashboard must send this EXACT secret as the Authorization
    // header VALUE (no "Bearer " prefix). Constant-time compare to avoid leaking
    // the secret via response timing.
    const providedBuf = Buffer.from(req.header("Authorization") ?? "");
    const expectedBuf = Buffer.from(REVENUECAT_WEBHOOK_AUTH.value());
    if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
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

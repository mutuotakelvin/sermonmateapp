import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";

// The Anthropic API key is a secret — it is stored by Firebase, injected into
// the function at runtime, and NEVER shipped in the mobile app. Set it once with:
//   firebase functions:secrets:set ANTHROPIC_API_KEY
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// Cheapest capable Claude model — a sermon costs a fraction of a cent here.
const MODEL = "claude-haiku-4-5";

interface Sermon {
  verses: string[];
  interpretation: string;
  story: string;
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
  "sermon content. Reply with ONLY valid minified JSON — no markdown, no code " +
  "fences, no commentary — using exactly these keys: verses (an array of 2 " +
  "strings, each a Bible verse reference followed by its text), interpretation " +
  "(a string), story (a string). Example: " +
  '{"verses":["John 3:16 - For God so loved...","..."],"interpretation":"...","story":"..."}';

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

  if (!Array.isArray(sermon.verses) || sermon.verses.length < 1 || !sermon.interpretation || !sermon.story) {
    console.error("Sermon failed validation:", JSON.stringify(sermon));
    throw new HttpsError("internal", "The generated sermon was incomplete. Please try again.");
  }

  return {
    verses: sermon.verses,
    interpretation: sermon.interpretation,
    story: sermon.story,
  };
}

// Callable functions verify the Firebase Auth token automatically, so only
// signed-in users of the app can invoke these (caps abuse of the paid API).
function requireAuth(request: CallableRequest): void {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to generate a sermon.");
  }
}

export const generateSermon = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    requireAuth(request);
    const topic = String(request.data?.topic ?? "").trim();
    if (!topic) {
      throw new HttpsError("invalid-argument", "A topic is required.");
    }
    return generate(`Create sermon content about: "${topic}".`);
  }
);

export const generateMoodSermon = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    requireAuth(request);
    const mood = String(request.data?.mood ?? "");
    const reason: string[] = Array.isArray(request.data?.reason)
      ? request.data.reason.map((r: unknown) => String(r))
      : [];
    const customReason = request.data?.customReason ? String(request.data.customReason) : undefined;

    const moodContext = MOOD_CONTEXT[mood] ?? "seeking encouragement";
    const reasonText = customReason ? [...reason, customReason].join(", ") : reason.join(", ");

    return generate(
      `Create a biblical sermon and encouragement for someone who is ${moodContext} ` +
        `because of: ${reasonText || "unspecified reasons"}. The interpretation should ` +
        `address their emotional state, and the story should relate to their situation.`
    );
  }
);

# On-Demand Story + Prayer Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slim the reflection generation to Scripture + Message, and add two on-demand, quota-free inline sections in the reflection reader — "Add a story" and "Pray about this".

**Architecture:** The Cloud Function that generates a reflection stops bundling the story. Two new quota-free callables (`generateStory`, `generatePrayer`) produce plain text on demand. `SermonModal` gains two buttons that render the result inline, styled like the existing "A Story" section. The story is saved with the reflection (reusing the existing `story` field); the prayer is ephemeral.

**Tech Stack:** Firebase Cloud Functions (`@anthropic-ai/sdk`, `claude-haiku-4-5`), React Native + Expo, TypeScript, `firebase/functions` httpsCallable.

## Global Constraints

- **No client test runner.** Verify client tasks with `npx tsc --noEmit` (exit 0) and `npx eslint <files>` (exit 0 on touched files). Do not add a test framework. Pre-existing eslint issues in untouched files are not this work's concern.
- **Functions verification:** `cd functions && npm run build` (runs tsc) must exit 0.
- **Quota-free:** `generateStory` and `generatePrayer` call `requireAuth(request)` but **must NOT call `enforceAiQuota`/`refundAiQuota`** — they are free follow-ups. Only `generateSermon`/`generateMoodSermon` stay quota-gated.
- **Model + secret:** reuse the existing `MODEL` constant (`claude-haiku-4-5`), the `ANTHROPIC_API_KEY` secret, and the `requireAuth` helper already in `functions/src/index.ts`.
- **Story is saved** with the reflection (reuse the existing `story` field); **prayer is ephemeral** — never saved, never included in share.
- **`story` is optional** on `Sermon` and `SavedSermon` after this change.
- **Design tokens only** in UI (`theme.color/space/radius/font`).
- Branch: `feature/prayer-story-generation` (already created from `main`, spec already committed).

## File Structure

| File | Responsibility |
|---|---|
| `functions/src/index.ts` (modify) | slim reflection prompt (drop story); add `generateStory` + `generatePrayer` quota-free callables + a plain-text `generateText` helper |
| `lib/types.ts` (modify) | make `Sermon.story` / `SavedSermon.story` optional |
| `lib/sermonAi.ts` (modify) | add `generateStory(context)` callable wrapper |
| `lib/prayerAi.ts` (new) | `generatePrayer(context)` callable wrapper |
| `components/SermonModal.tsx` (modify) | on-demand "Add a story" + new "A Prayer" section; save/share wiring |

---

### Task 1: Server — slim reflection + add story/prayer functions

**Files:**
- Modify: `functions/src/index.ts`

**Interfaces:**
- Consumes: existing `MODEL`, `ANTHROPIC_API_KEY`, `requireAuth`, `Anthropic`, `onCall`, `HttpsError`.
- Produces (callable contracts the client relies on):
  - `generateStory`: input `{ context: string }` → output `{ story: string }`
  - `generatePrayer`: input `{ context: string }` → output `{ prayer: string }`
  - `generateSermon`/`generateMoodSermon` now return `{ verses: string[]; interpretation: string }` (no `story`).

- [ ] **Step 1: Slim the reflection system prompt**

In `functions/src/index.ts`, replace the `SYSTEM_PROMPT` constant with:
```ts
const SYSTEM_PROMPT =
  "You are a compassionate Christian assistant that writes short, encouraging " +
  "reflection content. Reply with ONLY valid minified JSON — no markdown, no code " +
  "fences, no commentary — using exactly these keys: verses (an array of 2 " +
  "strings, each a Bible verse reference followed by its text), interpretation " +
  "(a string). Example: " +
  '{"verses":["John 3:16 - For God so loved...","..."],"interpretation":"..."}';
```

- [ ] **Step 2: Drop `story` from the Sermon interface, return, and validation**

Replace the `Sermon` interface:
```ts
interface Sermon {
  verses: string[];
  interpretation: string;
}
```

In `generate()`, change the validation line so it no longer requires `story`:
```ts
  if (!Array.isArray(sermon.verses) || sermon.verses.length < 1 || !sermon.interpretation) {
    console.error("Sermon failed validation:", JSON.stringify(sermon));
    throw new HttpsError("internal", "The generated sermon was incomplete. Please try again.");
  }
```
and change the `generate()` return to:
```ts
  return {
    verses: sermon.verses,
    interpretation: sermon.interpretation,
  };
```

- [ ] **Step 3: Add a plain-text helper and the two quota-free callables**

Add, immediately after the `generate()` function (before `requireAuth`):
```ts
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
```

Then add, after the `generateMoodSermon` export (both bypass `enforceAiQuota` — they are quota-free follow-ups):
```ts
// Quota-free follow-up: a short story illustrating a reflection the user already generated.
export const generateStory = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    requireAuth(request);
    const context = String(request.data?.context ?? "").trim();
    if (!context) {
      throw new HttpsError("invalid-argument", "Context is required.");
    }
    const story = await generateText(
      STORY_SYSTEM_PROMPT,
      `Reflection: "${context}". Write a short story that illustrates it.`
    );
    return { story };
  }
);

// Quota-free follow-up: a short prayer responding to a reflection the user already generated.
export const generatePrayer = onCall(
  { secrets: [ANTHROPIC_API_KEY] },
  async (request) => {
    requireAuth(request);
    const context = String(request.data?.context ?? "").trim();
    if (!context) {
      throw new HttpsError("invalid-argument", "Context is required.");
    }
    const prayer = await generateText(
      PRAYER_SYSTEM_PROMPT,
      `Reflection: "${context}". Write a short prayer responding to it.`
    );
    return { prayer };
  }
);
```

- [ ] **Step 4: Build the functions**

Run: `cd functions && npm run build`
Expected: exit 0, no TypeScript errors. (`response.content.find((b) => b.type === "text")` and the `stop_reason === "refusal"` guard mirror the existing `generate()` — the SDK types already compile there.)

- [ ] **Step 5: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add functions/src/index.ts
git commit -m "feat(functions): slim reflection prompt; add quota-free generateStory + generatePrayer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Client — optional story type + generateStory/generatePrayer wrappers

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/sermonAi.ts`
- Create: `lib/prayerAi.ts`

**Interfaces:**
- Consumes: the Task 1 callable contracts (`generateStory` → `{story}`, `generatePrayer` → `{prayer}`).
- Produces:
  - `generateStory(context: string): Promise<string>` (from `lib/sermonAi.ts`)
  - `generatePrayer(context: string): Promise<string>` (from `lib/prayerAi.ts`)
  - `Sermon.story?: string`, `SavedSermon.story?: string`

- [ ] **Step 1: Make `story` optional on the types**

In `lib/types.ts`, change the `Sermon` type's `story` line and the `SavedSermon` type's `story` line to optional:
```ts
export type Sermon = {
  verses: string[]
  interpretation: string
  story?: string
}
```
```ts
export type SavedSermon = {
  id: string
  title: string
  verses: string[]
  interpretation: string
  story?: string
  date: string
  color: string
  is_public?: boolean // Optional for future web use
}
```

- [ ] **Step 2: Add `generateStory` to `lib/sermonAi.ts`**

In `lib/sermonAi.ts`, add after the `generateMoodSermon` function:
```ts
/**
 * Generate a short story illustrating a reflection. Quota-free follow-up —
 * calls the `generateStory` Cloud Function.
 */
export async function generateStory(context: string): Promise<string> {
  const callable = httpsCallable<{ context: string }, { story: string }>(functions, 'generateStory');
  try {
    const result = await callable({ context });
    return result.data.story;
  } catch (error: any) {
    console.error('Error generating story:', error?.code, error?.message);
    throw toAiError(error);
  }
}
```

- [ ] **Step 3: Create `lib/prayerAi.ts`**

Create `lib/prayerAi.ts` with:
```ts
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Generate a short prayer responding to a reflection. Quota-free follow-up —
 * calls the `generatePrayer` Cloud Function. The generated prayer is ephemeral
 * (not persisted anywhere).
 */
export async function generatePrayer(context: string): Promise<string> {
  const callable = httpsCallable<{ context: string }, { prayer: string }>(functions, 'generatePrayer');
  try {
    const result = await callable({ context });
    return result.data.prayer;
  } catch (error: any) {
    console.error('Error generating prayer:', error?.code, error?.message);
    throw new Error(error?.message || 'Failed to generate. Please try again.');
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. (Making `story` optional keeps existing readers compiling: `sermonApi.ts` uses `sermon.story || ''`, and `SermonModal.tsx` still compiles until Task 3.)

- [ ] **Step 5: Lint the touched/new files**

Run: `npx eslint lib/types.ts lib/sermonAi.ts lib/prayerAi.ts`
Expected: exit 0, no output.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/sermonAi.ts lib/prayerAi.ts
git commit -m "feat: optional story type + generateStory/generatePrayer client wrappers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: SermonModal — on-demand story + prayer sections

**Files:**
- Modify: `components/SermonModal.tsx`

**Interfaces:**
- Consumes: `generateStory` (from `@/lib/sermonAi`), `generatePrayer` (from `@/lib/prayerAi`).
- Produces: no new exports.

- [ ] **Step 1: Add imports**

In `components/SermonModal.tsx`, change the sermonApi/AI imports. The file currently imports `saveSermon as saveSermonApi, updateSermon` from `@/lib/sermonApi`. Add a `generateStory` import from `@/lib/sermonAi` and a `generatePrayer` import from `@/lib/prayerAi`. Insert after the existing `import { saveSermon as saveSermonApi, updateSermon } from '@/lib/sermonApi';` line:
```ts
import { generateStory } from '@/lib/sermonAi';
import { generatePrayer } from '@/lib/prayerAi';
```

- [ ] **Step 2: Add local state**

After the existing `const [saving, setSaving] = useState(false);` line, add:
```ts
  const [story, setStory] = useState('');
  const [prayer, setPrayer] = useState('');
  const [storyLoading, setStoryLoading] = useState(false);
  const [prayerLoading, setPrayerLoading] = useState(false);
```

- [ ] **Step 3: Seed story/prayer state on open**

In the existing `useLayoutEffect` (the one guarded by `if (!visible) return;`), add these lines inside the effect body, after the `if (savedSermon) { ... } else { ... }` block (still inside the effect):
```ts
    setStory(savedSermon?.story ?? sermon?.story ?? '');
    setPrayer('');
    setStoryLoading(false);
    setPrayerLoading(false);
```
The effect's dependency array stays `[visible, topic, savedSermon]` — add `sermon` is not required (seeding reads it but the reset is keyed on open/savedSermon; a fresh `sermon` prop always arrives with a fresh open). Leave deps as `[visible, topic, savedSermon]`.

- [ ] **Step 4: Add the generate handlers**

Add after the `handleSave` function:
```ts
  const handleGenerateStory = async () => {
    if (!displaySermon) return;
    setStoryLoading(true);
    try {
      const result = await generateStory(displaySermon.interpretation);
      setStory(result);
    } catch (error: any) {
      showError('Could not add a story', error?.message || 'Please try again.');
    } finally {
      setStoryLoading(false);
    }
  };

  const handleGeneratePrayer = async () => {
    if (!displaySermon) return;
    setPrayerLoading(true);
    try {
      const result = await generatePrayer(displaySermon.interpretation);
      setPrayer(result);
    } catch (error: any) {
      showError('Could not create a prayer', error?.message || 'Please try again.');
    } finally {
      setPrayerLoading(false);
    }
  };
```

- [ ] **Step 5: Use local `story` in save + share**

In `handleShare`, change the story line in the `body` array from `displaySermon.story` to `story`:
```ts
    const body = [
      title,
      '',
      displaySermon.interpretation,
      '',
      displaySermon.verses.join('\n'),
      '',
      story,
    ].join('\n');
```

In `handleSave`, change both story references to the local `story` state:
- in the `updateSermon({ ... })` call: `story: story,`
- in the `saveSermonApi({ ... })` call: `story: story,`

(Both replace the previous `displaySermon.story` / `displaySermon.story || ''`.)

- [ ] **Step 6: Replace the "A Story" section and add "A Prayer"**

Replace the current "A Story" block (the `{/* A STORY */}` section head row + its `AppText` body) with this on-demand version, and add the prayer section immediately after it (this whole block sits where "A Story" currently is, before the "Card color row"):
```tsx
              {/* A STORY — on-demand, saved with the reflection */}
              {story ? (
                <>
                  <View style={styles.sectionHeadRow}>
                    <AppText variant="label">A Story</AppText>
                    <Pressable onPress={() => handleCopy(story, 'Story')} hitSlop={8}>
                      <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                    </Pressable>
                  </View>
                  <AppText variant="body" style={styles.messageBody}>{story}</AppText>
                </>
              ) : (
                <Pressable
                  style={styles.generateBtn}
                  onPress={handleGenerateStory}
                  disabled={storyLoading}
                >
                  {storyLoading ? (
                    <ActivityIndicator color={theme.color.accent} />
                  ) : (
                    <>
                      <Ionicons name="book-outline" size={18} color={theme.color.accent} />
                      <AppText variant="label" style={styles.generateBtnText}>Add a story</AppText>
                    </>
                  )}
                </Pressable>
              )}

              {/* A PRAYER — on-demand, ephemeral (not saved) */}
              {prayer ? (
                <>
                  <View style={styles.sectionHeadRow}>
                    <AppText variant="label">A Prayer</AppText>
                    <Pressable onPress={() => handleCopy(prayer, 'Prayer')} hitSlop={8}>
                      <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                    </Pressable>
                  </View>
                  <AppText variant="body" style={styles.messageBody}>{prayer}</AppText>
                </>
              ) : (
                <Pressable
                  style={styles.generateBtn}
                  onPress={handleGeneratePrayer}
                  disabled={prayerLoading}
                >
                  {prayerLoading ? (
                    <ActivityIndicator color={theme.color.accent} />
                  ) : (
                    <>
                      <Ionicons name="heart-outline" size={18} color={theme.color.accent} />
                      <AppText variant="label" style={styles.generateBtnText}>Pray about this</AppText>
                    </>
                  )}
                </Pressable>
              )}
```

- [ ] **Step 7: Add button styles**

In the `StyleSheet.create` block, add after the `messageBody` style:
```ts
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.space.sm, marginTop: theme.space.xl,
    minHeight: 48, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.color.border, backgroundColor: theme.color.surface,
  },
  generateBtnText: { color: theme.color.accent },
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. Confirm no unused-symbol or missing-import errors, and that `story`/`prayer` are used in both render and save/share.

- [ ] **Step 9: Lint**

Run: `npx eslint "components/SermonModal.tsx"`
Expected: exit 0 (no new errors/warnings).

- [ ] **Step 10: Commit**

```bash
git add "components/SermonModal.tsx"
git commit -m "feat: on-demand story + prayer sections in the reflection reader

Story generates on demand and saves with the reflection; prayer is ephemeral.
Both render inline styled like the existing story section.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (behavioral — needs deployed functions + rebuilt/reloaded client)

Not a task with its own commit — run after Task 3, then report.

- [ ] `npx tsc --noEmit` clean; `npx eslint` clean on all touched files; `cd functions && npm run build` clean.
- [ ] **Deploy note (human):** the two new callables must be deployed (`firebase deploy --only functions`) before the buttons work on-device; the client change is JS-only (no native rebuild).
- [ ] Drive: a fresh reflection shows Message + Scripture, no story, with "Add a story" and "Pray about this" buttons. "Add a story" fills the story inline; "Pray about this" fills a prayer inline; copy works on both.
- [ ] Save a reflection after generating a story → reopen from the list → the story is still there. The prayer is gone on reopen (ephemeral).
- [ ] A legacy saved reflection (created before this change, with a stored story) still shows its story with no button.

## Self-review notes

- **Spec coverage:** slim prompt + generateStory + generatePrayer (quota-free) → Task 1. Optional story types + client wrappers → Task 2. On-demand story (saved) + ephemeral prayer sections + save/share wiring → Task 3. All spec sections mapped.
- **Type consistency:** `{ context }` → `{ story }` / `{ prayer }` callable contracts match across Task 1 (server) and Task 2 (client). `generateStory`/`generatePrayer` signatures `(context: string): Promise<string>` match their Task 3 call sites. `Sermon.story?`/`SavedSermon.story?` optional is consumed correctly by the `savedSermon?.story ?? sermon?.story ?? ''` seed.
- **No placeholders:** every code step is literal.

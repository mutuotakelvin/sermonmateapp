/**
 * Rewrites the punctuation habits that make generated prose read as machine-written.
 *
 * The em dash is the giveaway: Claude reaches for it where a person would have typed a
 * comma or started a new sentence. Swapping every dash for a comma is not enough, since
 * a dash joining two complete sentences would leave a comma splice. So we look at what
 * follows the dash and choose.
 *
 * Punctuation only — no rewording. Applied to generated prose in sermonAi.ts, and
 * deliberately NOT to the `verses` array, which is quoted scripture.
 */

// Following a dash, these continue the same sentence, so the dash becomes a comma.
const SUBORDINATORS = new Set([
  'for', 'because', 'since', 'so', 'but', 'and', 'or', 'yet', 'nor',
  'which', 'who', 'whom', 'whose', 'that', 'where', 'when', 'while',
  'if', 'though', 'although', 'unless', 'until', 'as', 'after', 'before',
  'even', 'not', 'a', 'an',
]);

// Following a dash, these typically open a clause that can stand alone, so the dash
// becomes a sentence break.
const CLAUSE_OPENERS = new Set([
  'he', 'she', 'it', 'they', 'we', 'you', 'i', 'this', 'these', 'those',
  'there', 'here', 'god', 'jesus', 'christ', 'the', 'his', 'her', 'their',
  'our', 'my', 'your', 'its', 'one', 'love', 'peace', 'hope', 'grace',
]);

// When the sentence OPENS with one of these, the text before the dash is a dependent
// clause. Splitting there would strand it as a fragment ("When the weight feels
// unbearable."), so such a dash always becomes a comma.
const LEADING_SUBORDINATORS = new Set([
  'when', 'whenever', 'while', 'if', 'though', 'although', 'unless', 'until',
  'because', 'since', 'as', 'after', 'before', 'wherever', 'whether', 'once',
]);

/** True when the dash sits between two digits, e.g. "verses 3–4". */
function isNumericRange(text: string, start: number, end: number): boolean {
  return /\d\s*$/.test(text.slice(0, start)) && /^\s*\d/.test(text.slice(end));
}

function rewriteDashes(sentence: string): string {
  const hits: { start: number; end: number }[] = [];
  for (const match of sentence.matchAll(/\s*[—–]\s*/g)) {
    const start = match.index!;
    const end = start + match[0].length;
    if (!isNumericRange(sentence, start, end)) hits.push({ start, end });
  }
  if (hits.length === 0) return sentence;

  // Two dashes in one sentence bracket an aside, which takes a pair of commas.
  const isAside = hits.length >= 2;

  const opener = (sentence.match(/^\s*([A-Za-z']+)/)?.[1] ?? '').toLowerCase();
  const startsDependent = LEADING_SUBORDINATORS.has(opener);

  let out = '';
  let cursor = 0;
  for (const { start, end } of hits) {
    out += sentence.slice(cursor, start);
    const rest = sentence.slice(end);
    const nextWord = (rest.match(/^([A-Za-z']+)/)?.[1] ?? '').toLowerCase();

    const splits =
      !isAside &&
      !startsDependent &&
      rest.length > 0 &&
      CLAUSE_OPENERS.has(nextWord) &&
      !SUBORDINATORS.has(nextWord);

    if (splits) {
      out += '. ' + rest.charAt(0).toUpperCase();
      cursor = end + 1;
    } else {
      out += ', ';
      cursor = end;
    }
  }
  return out + sentence.slice(cursor);
}

/** Applies fn to each sentence, leaving the separators between them intact. */
function perSentence(text: string, fn: (sentence: string) => string): string {
  return text
    .split(/(\n+|(?<=[.!?])[ \t]+)/)
    .map((part) => (/^(\n+|[ \t]+)$/.test(part) ? part : fn(part)))
    .join('');
}

export function sanitizeAiText(text: string): string {
  if (!text) return '';

  let out = text;

  // Stray markdown. The prompts forbid it, but models slip, and the app renders plain
  // text — so it would otherwise show up as literal asterisks and hashes.
  out = out.replace(/```[a-z]*\n?/gi, '');
  out = out.replace(/^#{1,6}[ \t]*/gm, '');
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
  out = out.replace(/__([^_]+)__/g, '$1');
  out = out.replace(/\*([^*\n]+)\*/g, '$1');

  out = perSentence(out, rewriteDashes);

  // Typographic characters a person typing into a phone would not produce.
  out = out
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...');

  out = out.replace(/[ \t]{2,}/g, ' ');
  out = out.replace(/[ \t]+\n/g, '\n');
  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

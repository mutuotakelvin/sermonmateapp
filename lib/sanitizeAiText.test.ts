import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeAiText } from './sanitizeAiText.ts';

// Run with: npm test
//
// Claude's prose carries punctuation habits that read as machine-written — em dashes
// above all. We rewrite them the way a person would have typed instead.

test('an aside set off by a pair of dashes becomes a pair of commas', () => {
  assert.equal(
    sanitizeAiText('His mercy — new every morning — never fails.'),
    'His mercy, new every morning, never fails.',
  );
});

test('a dash joining two complete sentences becomes a period', () => {
  assert.equal(
    sanitizeAiText('God does not forget you — he holds you.'),
    'God does not forget you. He holds you.',
  );
});

test('a dash before a subordinator becomes a comma, not a period', () => {
  assert.equal(
    sanitizeAiText('Take heart — for he is near.'),
    'Take heart, for he is near.',
  );
});

// "When the weight feels unbearable" cannot stand on its own, so splitting here would
// leave a fragment — no matter that "he does not turn away" could stand alone.
test('a leading dependent clause is never split off as a fragment', () => {
  assert.equal(
    sanitizeAiText('When the weight feels unbearable — he does not turn away.'),
    'When the weight feels unbearable, he does not turn away.',
  );
  assert.equal(
    sanitizeAiText('Although you feel alone — you are held.'),
    'Although you feel alone, you are held.',
  );
});

test('an unspaced dash is handled too', () => {
  assert.equal(sanitizeAiText('Be still—he is God.'), 'Be still. He is God.');
});

test('en dashes used as em dashes are rewritten', () => {
  assert.equal(sanitizeAiText('Rest now – you are held.'), 'Rest now. You are held.');
});

// The system prompt formats verses as "John 3:16 - For God so loved...". A rule that
// touched ASCII hyphens would corrupt every scripture reference in the app.
test('ASCII hyphens are never touched', () => {
  const verse = 'John 3:16 - For God so loved the world';
  assert.equal(sanitizeAiText(verse), verse);
});

test('hyphenated words survive', () => {
  assert.equal(sanitizeAiText('a well-worn path'), 'a well-worn path');
});

test('numeric ranges keep their dash', () => {
  assert.equal(sanitizeAiText('Read verses 3–4 today.'), 'Read verses 3–4 today.');
});

test('stray markdown emphasis is stripped', () => {
  assert.equal(sanitizeAiText('**Hope** is *near*.'), 'Hope is near.');
});

test('stray headings and code fences are stripped', () => {
  assert.equal(sanitizeAiText('## Reflection\nGod is good.'), 'Reflection\nGod is good.');
  assert.equal(sanitizeAiText('```\nGod is good.\n```'), 'God is good.');
});

test('smart quotes and ellipses become plain characters', () => {
  assert.equal(sanitizeAiText('“Peace,” he said…'), '"Peace," he said...');
  assert.equal(sanitizeAiText('It’s well.'), "It's well.");
});

test('doubled spaces collapse and edges are trimmed', () => {
  assert.equal(sanitizeAiText('  He  is near.  '), 'He is near.');
});

test('paragraph breaks are preserved', () => {
  assert.equal(sanitizeAiText('One.\n\nTwo.'), 'One.\n\nTwo.');
});

test('text with nothing to fix is returned unchanged', () => {
  const clean = 'God is near to the brokenhearted. He saves the crushed in spirit.';
  assert.equal(sanitizeAiText(clean), clean);
});

test('is idempotent', () => {
  const input = 'His mercy — new every morning — never fails. Rest — he holds you.';
  assert.equal(sanitizeAiText(sanitizeAiText(input)), sanitizeAiText(input));
});

test('handles empty and whitespace-only input', () => {
  assert.equal(sanitizeAiText(''), '');
  assert.equal(sanitizeAiText('   '), '');
});

test('handles multiple sentences each with their own dash', () => {
  assert.equal(
    sanitizeAiText('Rest — he is near. Trust — for he is faithful.'),
    'Rest. He is near. Trust, for he is faithful.',
  );
});

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveEdges } from './screenEdges.ts';

test('inside the tabs, the bottom edge is dropped', () => {
  // The tab bar already adds insets.bottom to its own height. Padding for it again
  // leaves a dead strip between the content and the tab bar.
  assert.deepEqual(resolveEdges(true), ['top', 'right', 'left']);
});

test('outside the tabs, every edge is padded', () => {
  // Nothing else covers the bottom inset here, so content would run under Android's
  // navigation bar.
  assert.deepEqual(resolveEdges(false), ['top', 'right', 'bottom', 'left']);
});

test('an explicit override wins in both cases', () => {
  assert.deepEqual(resolveEdges(true, ['top']), ['top']);
  assert.deepEqual(resolveEdges(false, ['top']), ['top']);
  assert.deepEqual(resolveEdges(true, []), []);
});

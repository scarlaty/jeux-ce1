// Calculs des graphiques SVG (sans DOM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { niceStep, integerTicks, labelIndices, lineSegments } from '../js/core/ui/chart.js';

test('pas « ronds » pour les graduations', () => {
  assert.equal(niceStep(4), 1);
  assert.equal(niceStep(10), 5);
  assert.equal(niceStep(37), 10);
  assert.equal(niceStep(0), 1);
});

test('graduations entières jusqu\'à un maximum arrondi', () => {
  assert.deepEqual(integerTicks(0), { top: 1, ticks: [0, 1] });
  assert.deepEqual(integerTicks(3), { top: 3, ticks: [0, 1, 2, 3] });
  assert.deepEqual(integerTicks(7), { top: 8, ticks: [0, 2, 4, 6, 8] });
  assert.deepEqual(integerTicks(23), { top: 30, ticks: [0, 10, 20, 30] });
  for (let max = 0; max < 200; max++) {
    const { top, ticks } = integerTicks(max);
    assert.ok(top >= max && ticks.at(-1) === top && ticks.every(Number.isInteger));
  }
});

test('libellés horizontaux : premier et dernier toujours, sans chevauchement', () => {
  assert.deepEqual(labelIndices(4, 8), [0, 1, 2, 3]);
  for (const [count, max] of [[12, 4], [30, 6], [53, 8], [9, 3]]) {
    const idx = labelIndices(count, max);
    assert.equal(idx[0], 0);
    assert.equal(idx.at(-1), count - 1);
    assert.ok(idx.length <= max, `${count}/${max} → ${idx}`);
  }
});

test('courbe coupée aux semaines sans partie', () => {
  assert.deepEqual(lineSegments([50, 60, null, 70, null, null, 80, 90]), [[0, 1], [3], [6, 7]]);
  assert.deepEqual(lineSegments([null, null]), []);
});

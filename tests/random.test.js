import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, mulberry32, randomSeed } from '../js/core/random.js';

test('mulberry32 est déterministe et reste dans [0, 1[', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 1000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test('int couvre toutes les valeurs, bornes incluses', () => {
  const rng = createRng(7);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const n = rng.int(3, 8);
    assert.ok(Number.isInteger(n) && n >= 3 && n <= 8);
    seen.add(n);
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5, 6, 7, 8]);
  assert.throws(() => rng.int(5, 2), RangeError);
});

test('pick renvoie un élément de la liste', () => {
  const rng = createRng(1);
  const list = ['a', 'b', 'c'];
  for (let i = 0; i < 100; i++) assert.ok(list.includes(rng.pick(list)));
  assert.throws(() => rng.pick([]), RangeError);
});

test('shuffle renvoie une permutation sans modifier la liste', () => {
  const rng = createRng(3);
  const list = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = [...list];
  const out = rng.shuffle(list);
  assert.deepEqual(list, copy);
  assert.deepEqual([...out].sort((x, y) => x - y), list);
  // Sur 200 mélanges, on doit obtenir plusieurs ordres différents.
  const orders = new Set(Array.from({ length: 200 }, () => rng.shuffle(list).join()));
  assert.ok(orders.size > 100);
});

test('sample tire sans remise', () => {
  const rng = createRng(9);
  for (let i = 0; i < 200; i++) {
    const s = rng.sample([1, 2, 3, 4, 5], 3);
    assert.equal(s.length, 3);
    assert.equal(new Set(s).size, 3);
  }
  assert.throws(() => rng.sample([1], 2), RangeError);
});

test('même graine, même suite de tirages', () => {
  const run = (seed) => {
    const rng = createRng(seed);
    return [rng.int(0, 100), rng.pick(['x', 'y', 'z']), rng.shuffle([1, 2, 3, 4]).join(), rng.chance()];
  };
  assert.deepEqual(run(123), run(123));
  assert.ok(Number.isInteger(randomSeed()));
});

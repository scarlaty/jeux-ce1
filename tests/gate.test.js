import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GATE_FACTORS, makeGateChallenge, checkGate } from '../js/core/gate.js';
import { createRng } from '../js/core/random.js';

test('le contrôle est toujours une multiplication hors du programme de CE1', () => {
  const rng = createRng(42);
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const c = makeGateChallenge(rng.next);
    assert.ok(GATE_FACTORS.includes(c.a) && GATE_FACTORS.includes(c.b), `facteurs ${c.a}×${c.b}`);
    assert.equal(c.answer, c.a * c.b);
    assert.equal(c.text, `${c.a} × ${c.b}`);
    assert.ok(c.answer >= 36, 'un résultat trop petit serait à la portée d\'un CE1');
    seen.add(c.text);
  }
  assert.ok(seen.size >= 10, 'le calcul doit varier d\'une ouverture à l\'autre');
});

test('seule la bonne réponse, en chiffres, ouvre l\'espace parents', () => {
  const c = { a: 7, b: 8, answer: 56, text: '7 × 8' };
  assert.equal(checkGate(c, 56), true);
  assert.equal(checkGate(c, '56'), true);
  assert.equal(checkGate(c, '  56 '), true);
  for (const wrong of ['', ' ', null, undefined, '55', 57, '56 ans', 'cinquante-six', '0056x', NaN, '5.6e1']) {
    assert.equal(checkGate(c, wrong), false, `aurait dû être refusé : ${String(wrong)}`);
  }
});

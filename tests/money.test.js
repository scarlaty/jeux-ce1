import test from 'node:test';
import assert from 'node:assert/strict';
import { artErrors, artLabel } from '../js/core/ui/art/index.js';
import { label, layout, money, moneySpoken, pieceWords, sorted } from '../js/core/ui/art/money.js';
import { fewestPieces } from '../js/core/amount.js';
import { validateQuestion } from '../js/core/validate.js';
import { speakableText } from '../js/core/audio.js';

const NB = ' ';

test('le nom accessible décrit les pièces sans jamais donner la somme', () => {
  assert.equal(label({ pieces: [500, 500, 200, 50] }), `Argent : 2 billets de 5${NB}€, 1 pièce de 2${NB}€ et 1 pièce de 50${NB}c.`);
  assert.equal(pieceWords({ pieces: [1000] }), `1 billet de 10${NB}€`);
  assert.doesNotMatch(label({ pieces: [500, 500, 200, 50] }), /12|1250/);
  // Deux dessins qui montrent les mêmes pièces ont le même nom : ce sont deux choix identiques.
  assert.equal(artLabel({ kind: 'money', pieces: [200, 500] }), artLabel({ kind: 'money', pieces: [500, 200] }));
});

test('un dessin d\'argent mal formé est refusé', () => {
  assert.deepEqual(artErrors({ kind: 'money', pieces: [500, 20] }), []);
  assert.ok(artErrors({ kind: 'money', pieces: [] }).length > 0);
  assert.ok(artErrors({ kind: 'money', pieces: [300] }).length > 0);
  assert.ok(artErrors({ kind: 'money' }).length > 0);
  assert.ok(artErrors({ kind: 'money', pieces: new Array(13).fill(100) }).length > 0);
});

test('les billets passent avant les pièces, du plus grand au plus petit', () => {
  assert.deepEqual(sorted([50, 200, 500, 100, 2000]), [2000, 500, 200, 100, 50]);
});

test('la disposition : rangées de 290 mm au plus, tailles réelles (pièces agrandies), rien ne se chevauche', () => {
  const { width, height, items } = layout({ pieces: [2000, 2000, 1000, 500, 200, 100, 50] });
  assert.ok(width <= 290 + 1e-9);
  assert.equal(items.length, 7);
  const note20 = items.find((i) => i.value === 2000);
  const coin2 = items.find((i) => i.value === 200);
  assert.ok(note20.w > coin2.w * 2.5, 'un billet de 20 € est bien plus grand qu\'une pièce');
  assert.ok(items.find((i) => i.value === 200).w > items.find((i) => i.value === 100).w, '2 € plus grand que 1 €');
  for (const a of items) {
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= width + 1e-9 && a.y + a.h <= height + 1e-9);
    for (const b of items) {
      if (a === b) continue;
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(apart, `${a.value} chevauche ${b.value}`);
    }
  }
});

test('écriture des sommes : euros entiers, centimes, et les deux', () => {
  assert.equal(money(1300), `13${NB}€`);
  assert.equal(money(250), `2${NB}€ et 50${NB}c`);
  assert.equal(money(70), `70${NB}c`);
  assert.equal(moneySpoken(100), '1 euro');
  assert.equal(moneySpoken(250), '2 euros et 50 centimes');
  assert.equal(moneySpoken(70), '70 centimes');
});

test('la voix lit « € » et « c » avec des mots', () => {
  assert.equal(speakableText(`Tu paies 20${NB}€ pour 13${NB}€.`), 'Tu paies 20 euros pour 13 euros.');
  assert.equal(speakableText(`1${NB}€ et 50${NB}c`), '1 euro et 50 centimes');
  assert.equal(speakableText(`21${NB}€`), '21 euros');
  assert.equal(speakableText('Un c\'est 5 c\'est tout'), 'Un c\'est 5 c\'est tout');
});

test('composer une somme : le plus petit nombre de pièces, ou null si impossible', () => {
  assert.deepEqual(fewestPieces(37, [1, 2, 5, 10, 20, 50]), [20, 10, 5, 2]);
  assert.deepEqual(fewestPieces(100, [10, 20, 50]), [50, 50]);
  assert.equal(fewestPieces(7, [5, 10]), null);
  assert.deepEqual(fewestPieces(0, [5]), []);
});

test('le type « amount » est vérifié : somme réalisable, options distinctes', () => {
  const option = (v) => ({ value: v, art: { kind: 'money', pieces: [v * 100] } });
  const base = { key: 'k', prompt: 'Compose.', type: 'amount', answer: 37, display: { options: [1, 2, 5, 10, 20].map(option) } };
  assert.deepEqual(validateQuestion(base), []);
  assert.ok(validateQuestion({ ...base, answer: 3, display: { options: [option(5), option(10)] } }).length > 0, 'impossible');
  assert.ok(validateQuestion({ ...base, display: { options: [option(5), option(5)] } }).length > 0, 'doublon');
  assert.ok(validateQuestion({ ...base, answer: 0 }).length > 0);
  assert.ok(validateQuestion({ ...base, answer: 40, display: { options: [option(1), option(2)], maxPieces: 10 } }).length > 0, 'trop de pièces');
});

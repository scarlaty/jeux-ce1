import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestion } from '../js/core/validate.js';

const base = { key: 'k', prompt: 'Touche.', explain: '' };

test('QCM : réponse présente une seule fois, pas de doublon', () => {
  assert.deepEqual(validateQuestion({ ...base, type: 'choice', display: { choices: ['a', 'b'] }, answer: 'a' }), []);
  assert.ok(validateQuestion({ ...base, type: 'choice', display: { choices: ['a', 'b'] }, answer: 'c' }).length);
  assert.ok(validateQuestion({ ...base, type: 'choice', display: { choices: ['a', 'a', 'b'] }, answer: 'b' }).length);
  assert.ok(validateQuestion({ ...base, type: 'choice', display: { choices: [1, 2] }, answer: 3 }).length);
});

test('pavé numérique, ordre, glisser-déposer, lettres', () => {
  assert.deepEqual(validateQuestion({ ...base, type: 'keypad', display: {}, answer: 12 }), []);
  assert.ok(validateQuestion({ ...base, type: 'keypad', display: { maxLength: 1 }, answer: 12 }).length);
  assert.deepEqual(validateQuestion({ ...base, type: 'order', display: { items: [2, 1] }, answer: [1, 2] }), []);
  assert.ok(validateQuestion({ ...base, type: 'order', display: { items: [1, 2] }, answer: [1, 2] }).length);
  assert.ok(validateQuestion({ ...base, type: 'order', display: { items: [1, 3] }, answer: [1, 2] }).length);
  const drag = {
    ...base, type: 'drag',
    display: { items: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }], targets: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }] },
    answer: { a: 'x', b: 'y' },
  };
  assert.deepEqual(validateQuestion(drag), []);
  assert.ok(validateQuestion({ ...drag, answer: { a: 'x' } }).length);
  assert.ok(validateQuestion({ ...drag, answer: { a: 'x', b: 'z' } }).length);
  assert.deepEqual(validateQuestion({ ...base, type: 'letters', display: {}, answer: 'fée' }), []);
  assert.ok(validateQuestion({ ...base, type: 'letters', display: { accents: false }, answer: 'fée' }).length);
  assert.ok(validateQuestion({ ...base, type: 'letters', display: {}, answer: 'Paris' }).length);
});

test('type personnalisé avec sa propre vérification', () => {
  const q = { ...base, type: 'clock', display: {}, answer: '3:00' };
  assert.ok(validateQuestion(q).length);
  assert.deepEqual(validateQuestion(q, { checks: { clock: () => {} } }), []);
});

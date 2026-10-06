import test from 'node:test';
import assert from 'node:assert/strict';
import { artErrors, artKinds, artLabel, registerArt } from '../js/core/ui/art/index.js';
import { handAngles, label } from '../js/core/ui/art/clock.js';
import { validateQuestion } from '../js/core/validate.js';

// Les dessins sont décrits par les jeux et dessinés par le socle : la partie « description »
// doit rester pure, donc testable sans navigateur.

test('les angles des aiguilles suivent l\'heure', () => {
  assert.deepEqual(handAngles({ hours: 12, minutes: 0 }), { hour: 0, minute: 0 });
  assert.deepEqual(handAngles({ hours: 3, minutes: 0 }), { hour: 90, minute: 0 });
  assert.deepEqual(handAngles({ hours: 6, minutes: 30 }), { hour: 195, minute: 180 });
  // La petite aiguille avance avec les minutes : à 3 h 30 elle est entre le 3 et le 4.
  assert.deepEqual(handAngles({ hours: 3, minutes: 30 }), { hour: 105, minute: 180 });
  // Après-midi : 15 h s'affiche comme 3 h sur un cadran.
  assert.deepEqual(handAngles({ hours: 15, minutes: 0 }), handAngles({ hours: 3, minutes: 0 }));
});

test('le nom accessible décrit les aiguilles sans donner l\'heure', () => {
  const spoken = label({ hours: 3, minutes: 30 });
  assert.match(spoken, /petite aiguille entre le 3 et le 4/);
  assert.match(spoken, /grande aiguille sur le 6/);
  assert.doesNotMatch(spoken, /3 h 30|trois heures/i);
  assert.match(label({ hours: 12, minutes: 0 }), /petite aiguille sur le 12, la grande aiguille sur le 12/);
  assert.match(label({ hours: 1, minutes: 45 }), /grande aiguille sur le 9/);
});

test('un dessin inconnu ou mal formé est signalé', () => {
  assert.deepEqual(artErrors({ kind: 'licorne' }), ['dessin inconnu : licorne']);
  assert.deepEqual(artErrors(null), ['art doit être un objet']);
  assert.deepEqual(artErrors({ kind: 'clock', hours: 3, minutes: 30 }), []);
  assert.deepEqual(artErrors({ kind: 'clock', hours: 25, minutes: 0 }), ['clock.hours : entier de 0 à 23']);
  assert.deepEqual(artErrors({ kind: 'clock', hours: 3, minutes: 60 }), ['clock.minutes : entier de 0 à 59']);
  assert.deepEqual(artErrors({ kind: 'clock', hours: 3 }), ['clock.minutes : entier de 0 à 59']);
});

test('artLabel ne lève jamais, même sur un genre inconnu', () => {
  assert.equal(artLabel({ kind: 'licorne' }), '');
  assert.ok(artKinds().includes('clock'));
});

test('registerArt ajoute un dessin', () => {
  registerArt('carre', { label: (s) => `Carré de ${s.side}`, draw: () => null });
  assert.equal(artLabel({ kind: 'carre', side: 4 }), 'Carré de 4');
  assert.deepEqual(artErrors({ kind: 'carre', side: 4 }), []);
});

// La validation des questions doit voir les dessins : un choix peut n'être QUE du dessin,
// et deux dessins identiques sont indiscernables pour l'enfant.
const clockQuestion = (overrides = {}) => ({
  key: 'heure:1',
  type: 'choice',
  prompt: 'Touche l\'horloge qui montre 3 h 30.',
  display: {
    choices: [
      { value: 'a', art: { kind: 'clock', hours: 3, minutes: 30 } },
      { value: 'b', art: { kind: 'clock', hours: 4, minutes: 30 } },
    ],
  },
  answer: 'a',
  ...overrides,
});

test('un choix fait d\'un seul dessin est valide', () => {
  assert.deepEqual(validateQuestion(clockQuestion()), []);
});

test('deux dessins identiques s\'affichent pareil', () => {
  const q = clockQuestion();
  q.display.choices[1].art = { kind: 'clock', hours: 3, minutes: 30 };
  assert.deepEqual(validateQuestion(q), ['deux choix s\'affichent pareil']);
});

test('un dessin mal formé invalide la question', () => {
  const q = clockQuestion();
  q.display.choices[1].art = { kind: 'clock', hours: 99, minutes: 0 };
  assert.deepEqual(validateQuestion(q), ['clock.hours : entier de 0 à 23']);
});

test('display.show peut être un dessin seul', () => {
  const q = clockQuestion();
  q.display.show = { art: { kind: 'clock', hours: 7, minutes: 15 } };
  assert.deepEqual(validateQuestion(q), []);
  q.display.show = { art: { kind: 'clock', hours: 7 } };
  assert.deepEqual(validateQuestion(q), ['clock.minutes : entier de 0 à 59']);
});

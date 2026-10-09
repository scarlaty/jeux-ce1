import test from 'node:test';
import assert from 'node:assert/strict';
import { artErrors, artKinds, artLabel, registerArt } from '../js/core/ui/art/index.js';
import { handAngles, label } from '../js/core/ui/art/clock.js';
import { label as baseTenLabel, layout, pieceWords } from '../js/core/ui/art/base-ten.js';
import { label as coloredLabel } from '../js/core/ui/art/colored.js';
import { COLORS } from '../js/data/anglais.js';
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

// --- Matériel de numération (base-ten) ---------------------------------------------------------

test('le nom accessible compte les pièces, sans jamais donner le nombre', () => {
  assert.equal(baseTenLabel({ hundreds: 2, tens: 3, units: 4 }),
    'Matériel : 2 plaques de cent, 3 barres de dix et 4 cubes.');
  // 234 n'apparaît nulle part : l'enfant doit compter.
  assert.doesNotMatch(baseTenLabel({ hundreds: 2, tens: 3, units: 4 }), /234/);
  // Singulier, et les tas vides ne sont pas annoncés (c'est tout l'intérêt de 405).
  assert.equal(pieceWords({ hundreds: 1, tens: 1, units: 1 }), '1 plaque de cent, 1 barre de dix et 1 cube');
  assert.equal(pieceWords({ hundreds: 4, tens: 0, units: 5 }), '4 plaques de cent et 5 cubes');
  assert.equal(pieceWords({ tens: 3 }), '3 barres de dix');
  assert.equal(pieceWords({}), '');
  assert.equal(baseTenLabel({}), 'Matériel : rien du tout.');
});

test('le matériel est posé sur une ligne, les tas côte à côte', () => {
  const { width, height, pieces } = layout({ hundreds: 2, tens: 3, units: 4 });
  assert.equal(pieces.length, 9);
  assert.deepEqual(pieces.map((p) => p.kind),
    ['plate', 'plate', 'bar', 'bar', 'bar', 'cube', 'cube', 'cube', 'cube']);
  // Une plaque fait 10 × 10 cubes : elle donne sa hauteur au dessin.
  assert.equal(height, 50);
  // Les tas se suivent de la gauche vers la droite, sans se chevaucher.
  const lefts = ['plate', 'bar', 'cube'].map((k) => Math.min(...pieces.filter((p) => p.kind === k).map((p) => p.x)));
  assert.deepEqual(lefts, [...lefts].sort((a, b) => a - b));
  assert.ok(width > 0 && pieces.every((p) => p.x >= 0 && p.y >= 0));
  // Tout est posé sur la même ligne du bas.
  assert.equal(Math.max(...pieces.map((p) => p.y + (p.kind === 'cube' ? 5 : 50))), height);
});

test('un tas trop grand passe à la rangée du dessus', () => {
  const { pieces, height } = layout({ hundreds: 7 });
  assert.equal(pieces.length, 7);
  assert.equal(new Set(pieces.map((p) => p.y)).size, 3, '7 plaques tiennent sur 3 rangées');
  assert.equal(height, 3 * 50 + 2 * 4);
});

test('un matériel impossible est refusé', () => {
  assert.deepEqual(artErrors({ kind: 'base-ten', hundreds: 2, tens: 3, units: 4 }), []);
  assert.deepEqual(artErrors({ kind: 'base-ten', tens: 3 }), []);
  assert.deepEqual(artErrors({ kind: 'base-ten' }), ['base-ten : au moins une pièce']);
  assert.deepEqual(artErrors({ kind: 'base-ten', hundreds: 0, tens: 0, units: 0 }), ['base-ten : au moins une pièce']);
  assert.deepEqual(artErrors({ kind: 'base-ten', units: 10 }), ['base-ten.units : entier de 0 à 9']);
  assert.deepEqual(artErrors({ kind: 'base-ten', tens: -1, units: 2 }), ['base-ten.tens : entier de 0 à 9']);
  assert.deepEqual(artErrors({ kind: 'base-ten', hundreds: 1.5 }), ['base-ten.hundreds : entier de 0 à 9']);
  assert.deepEqual(artErrors({ kind: 'base-ten', tens: '3' }), ['base-ten.tens : entier de 0 à 9']);
});

test('deux matériels différents ne portent pas le même nom', () => {
  assert.notEqual(artLabel({ kind: 'base-ten', tens: 4, units: 0 }), artLabel({ kind: 'base-ten', tens: 0, units: 4 }));
  assert.ok(artKinds().includes('base-ten'));
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

/* Le nom accessible est lu par la synthèse vocale, dans un jeu de langue : « Pastille bleu »
   était fautif sur 6 des 11 couleurs, faute de l'option { feminine } (#113). */
test("le nom d'une pastille de couleur est accordé au féminin", () => {
  for (const color of COLORS) {
    const nom = coloredLabel({ shape: 'swatch', color: color.id });
    assert.equal(nom, `Pastille ${color.fr[1]}`, `couleur ${color.id}`);
  }
  // Témoins explicites : les six qui étaient faux.
  assert.equal(coloredLabel({ shape: 'swatch', color: 'blue' }), 'Pastille bleue');
  assert.equal(coloredLabel({ shape: 'swatch', color: 'white' }), 'Pastille blanche');
  assert.equal(coloredLabel({ shape: 'swatch', color: 'purple' }), 'Pastille violette');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLORS, THINGS, colorFr, colorsOf, thingsFr, thingsEn, numberEn, isKnownNumber, confusableNumber,
} from '../js/data/anglais.js';
import { artErrors, artLabel } from '../js/core/ui/art/index.js';
import { layout, starPoints, label } from '../js/core/ui/art/colored.js';

test('onze couleurs, avec leur nom français accordé', () => {
  assert.equal(COLORS.length, 11);
  assert.equal(colorFr('blue'), 'bleu');
  assert.equal(colorFr('blue', { feminine: true }), 'bleue');
  assert.equal(colorFr('green', { feminine: true, plural: true }), 'vertes');
  assert.equal(colorFr('purple', { feminine: true }), 'violette');
  assert.equal(colorFr('grey', { plural: true }), 'gris');
  assert.equal(colorFr('red', { plural: true }), 'rouges');
  assert.equal(colorFr('pink', { feminine: true, plural: true }), 'roses');
  // « orange » et « marron » sont invariables.
  assert.equal(colorFr('orange', { feminine: true, plural: true }), 'orange');
  assert.equal(colorFr('brown', { plural: true }), 'marron');
  assert.throws(() => colorFr('turquoise'));
});

test('phrases anglaises et françaises des objets', () => {
  assert.equal(thingsEn({ thing: 'apple', color: 'red', count: 3 }), 'three red apples');
  assert.equal(thingsEn({ thing: 'balloon', color: 'blue', count: 1 }), 'one blue balloon');
  assert.equal(thingsFr({ thing: 'apple', color: 'red', count: 3 }), '3 pommes rouges');
  assert.equal(thingsFr({ thing: 'balloon', color: 'blue', count: 1 }), '1 ballon bleu');
  assert.equal(thingsFr({ thing: 'flower', color: 'white', count: 2 }), '2 fleurs blanches');
  assert.equal(thingsFr({ thing: 'star', color: 'yellow', count: 5 }), '5 étoiles jaunes');
  assert.equal(thingsFr({ thing: 'balloon', color: 'orange', count: 2 }), '2 ballons orange');
  assert.equal(colorsOf('apple').length, 3);
  assert.equal(colorsOf('star').length, 11);
});

test('nombres anglais : 1 à 20, dizaines, cent', () => {
  assert.equal(numberEn(1), 'one');
  assert.equal(numberEn(12), 'twelve');
  assert.equal(numberEn(13), 'thirteen');
  assert.equal(numberEn(15), 'fifteen');
  assert.equal(numberEn(18), 'eighteen');
  assert.equal(numberEn(20), 'twenty');
  assert.equal(numberEn(40), 'forty');
  assert.equal(numberEn(100), 'one hundred');
  assert.equal(isKnownNumber(21), false);
  assert.equal(isKnownNumber(0), false);
  assert.throws(() => numberEn(21));
});

test('nombres confondus à l\'oreille', () => {
  assert.equal(confusableNumber(13), 30);
  assert.equal(confusableNumber(90), 19);
  assert.equal(confusableNumber(14), 40);
  assert.equal(confusableNumber(12), null);
  assert.equal(confusableNumber(20), null);
  assert.equal(confusableNumber(100), null);
});

test('dessin « colored » : nom accessible, contrôles, disposition', () => {
  assert.equal(artLabel({ kind: 'colored', shape: 'swatch', color: 'red' }), 'Pastille rouge');
  assert.equal(label({ shape: 'apple', color: 'green', count: 2 }), '2 pommes vertes');
  assert.deepEqual(artErrors({ kind: 'colored', shape: 'swatch', color: 'grey' }), []);
  assert.deepEqual(artErrors({ kind: 'colored', shape: 'star', color: 'pink', count: 10 }), []);
  assert.ok(artErrors({ kind: 'colored', shape: 'star', color: 'pink', count: 11 }).length);
  assert.ok(artErrors({ kind: 'colored', shape: 'star', color: 'pink' }).length);
  assert.ok(artErrors({ kind: 'colored', shape: 'cube', color: 'pink', count: 2 }).length);
  assert.ok(artErrors({ kind: 'colored', shape: 'swatch', color: 'cyan' }).length);
  for (const t of THINGS) assert.deepEqual(artErrors({ kind: 'colored', shape: t.id, color: colorsOf(t.id)[0], count: 4 }), []);
  // Une rangée jusqu'à 5, puis deux rangées dont la première est la plus longue.
  assert.equal(layout(5).cells.length, 5);
  assert.equal(layout(5).height, 44);
  assert.equal(layout(7).height, 88);
  assert.equal(layout(7).width, 160);
  assert.equal(layout(10).cells.length, 10);
  assert.deepEqual(layout(7).cells.filter((c) => c.y > 0).map((c) => c.x), [20, 60, 100]);
  assert.equal(starPoints(0, 0).split(' ').length, 10);
});

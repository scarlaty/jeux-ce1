import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/cdu.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';
import { artLabel } from '../../js/core/ui/art/index.js';

const MAX = { 1: 99, 2: 999, 3: 999 };
const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

/** Toutes les questions d'un niveau produites par un type de question donné (préfixe de clé). */
const kind = (level, prefix) => byLevel[level].filter((q) => q.key.startsWith(`cdu:${prefix}:`));

const valueOf = (spec) => 100 * (spec.hundreds || 0) + 10 * (spec.tens || 0) + (spec.units || 0);

/** Tous les dessins d'une question : illustration, choix et éléments à ranger. */
function arts(q) {
  const list = [q.display?.show, ...(q.display?.choices || []), ...(q.display?.items || [])];
  return list.filter((c) => c && typeof c === 'object' && c.art).map((c) => c.art);
}

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'cdu');
  assert.equal(game.island, 'nombres');
  assert.equal(game.subject, 'maths');
  assert.equal(game.issue, 47);
});

test('bien plus de 30 questions distinctes par niveau', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 150, `niveau ${level} : ${distinct}`);
  }
});

test('les bornes de chaque niveau sont respectées (jamais au-delà de 1000)', () => {
  for (const [level, q] of all()) {
    for (const spec of arts(q)) {
      assert.ok(valueOf(spec) >= 1 && valueOf(spec) <= MAX[level], `${q.key} : matériel hors bornes`);
    }
    for (const n of `${q.prompt} ${q.explain}`.match(/\d+/g) || []) {
      assert.ok(Number(n) <= 1000, `${q.key} : ${n}`);
    }
  }
});

test('le niveau 1 reste à 2 chiffres, les niveaux 2 et 3 vont jusqu\'aux centaines', () => {
  for (const q of byLevel[1]) {
    for (const spec of arts(q)) assert.equal(spec.hundreds, 0, `${q.key} : des plaques de cent au niveau 1`);
  }
  for (const level of [2, 3]) {
    assert.ok(byLevel[level].some((q) => arts(q).some((spec) => spec.hundreds > 0)), `niveau ${level}`);
  }
});

test('le niveau 3 travaille le zéro intercalé et la valeur des chiffres', () => {
  assert.ok(byLevel[3].some((q) => arts(q).some((s) => s.hundreds > 0 && s.tens === 0 && s.units > 0)),
    'aucun matériel sans barre de dix');
  assert.ok(kind(3, 'valeur').length > 0);
  assert.ok(kind(3, 'dizaines-en-tout').length > 0);
  // « 0 dizaine » doit être dit avec le bon singulier.
  assert.ok(byLevel[3].some((q) => q.prompt.includes('0 dizaine ')));
});

test('écrire le nombre représenté : la réponse est bien ce que montre le matériel', () => {
  for (const [, q] of all()) {
    if (!q.key.startsWith('cdu:écrire:') && !q.key.startsWith('cdu:compter:')) continue;
    assert.equal(valueOf(q.display.show.art), q.answer, q.key);
  }
});

test('choisir le matériel : un seul choix montre le bon nombre, et les dessins diffèrent', () => {
  for (const q of kind(1, 'matériel')) {
    const good = q.display.choices.filter((c) => valueOf(c.art) === q.answer);
    assert.equal(good.length, 1, q.key);
    const labels = q.display.choices.map((c) => artLabel(c.art));
    assert.equal(new Set(labels).size, labels.length, q.key);
    // Le nom accessible décrit le matériel, il ne souffle jamais le nombre.
    for (const label of labels) assert.doesNotMatch(label, new RegExp(`\\b${q.answer}\\b`), label);
  }
});

const UNIT = { hundreds: 100, tens: 10, units: 1 };

test('chiffre d\'une place : la bonne réponse est ce chiffre, sans ambiguïté possible', () => {
  for (const [, q] of all()) {
    const m = q.key.match(/^cdu:chiffre:(\w+):(\d+)$/);
    if (!m) continue;
    const [, place, text] = m;
    const n = Number(text);
    assert.equal(q.answer, Math.floor(n / UNIT[place]) % 10, q.key);
    assert.ok(q.answer >= 0 && q.answer <= 9, `${q.key} : un chiffre, pas une valeur`);
    assert.equal(q.display.choices.filter((c) => c === q.answer).length, 1, q.key);
    assert.equal(new Set(q.display.choices).size, q.display.choices.length, q.key);
    // Les chiffres du nombre sont tous différents : sinon deux choix seraient la même réponse.
    assert.equal(new Set(text).size, text.length, `${q.key} : chiffres répétés`);
    // Le piège « la valeur au lieu du chiffre » (30 pour 3) est proposé quand il existe.
    if (UNIT[place] > 1 && q.answer > 0) assert.ok(q.display.choices.includes(q.answer * UNIT[place]), q.key);
  }
});

test('valeur d\'un chiffre : 4 vaut 400 aux centaines, et le chiffre n\'apparaît qu\'une fois', () => {
  for (const q of kind(3, 'valeur')) {
    const [, , place, text] = q.key.split(':');
    const n = Number(text);
    const digit = Number(q.prompt.match(/chiffre (\d+)/)[1]);
    assert.equal([...text].filter((c) => Number(c) === digit).length, 1, `${q.key} : chiffre ambigu`);
    assert.equal(q.answer, digit * UNIT[place], q.key);
    assert.equal(Math.floor(n / UNIT[place]) % 10, digit, q.key);
    assert.deepEqual([...q.display.choices].sort((a, b) => a - b), [digit, digit * 10, digit * 100]);
  }
});

test('« combien de dizaines en tout » ≠ « chiffre des dizaines »', () => {
  const qs = kind(3, 'dizaines-en-tout');
  for (const q of qs) {
    const n = Number(q.key.split(':').pop());
    assert.equal(q.answer, Math.floor(n / 10), q.key);
    assert.match(q.prompt, /combien y a-t-il de dizaines en tout/, q.key);
  }
  // Le piège est bien présent : la réponse ne vaut jamais le chiffre des dizaines.
  assert.ok(qs.every((q) => q.answer !== Math.floor(Number(q.key.split(':').pop()) / 10) % 10));
});

test('décomposer et recomposer : les sommes proposées sont exactes', () => {
  const sum = (text) => text.split(' + ').reduce((a, b) => a + Number(b), 0);
  for (const [, q] of all()) {
    if (q.key.startsWith('cdu:décomposition:')) {
      const n = Number(q.key.split(':').pop());
      assert.equal(sum(q.answer), n, q.key);
      const right = q.display.choices.filter((c) => sum(c) === n);
      assert.deepEqual(right, [q.answer], `${q.key} : ${q.display.choices.join(' | ')}`);
      assert.ok(q.display.choices.length >= 3, q.key);
    }
    if (q.key.startsWith('cdu:recomposer:')) {
      assert.equal(sum(q.display.show.text.replace(' = ?', '')), q.answer, q.key);
      assert.ok(q.display.show.math, q.key);
    }
  }
});

test('ranger dans les colonnes : chaque étiquette va dans la colonne de sa place', () => {
  for (const [level, q] of all()) {
    if (!q.key.startsWith('cdu:ranger:')) continue;
    for (const item of q.display.items) {
      const target = q.answer[item.id];
      const value = Number(item.text);
      // 70 va dans « Dizaines » : c'est 7 dizaines entières, donc un chiffre fois 10.
      assert.equal(value % UNIT[target], 0, `${q.key} : ${value} dans ${target}`);
      assert.ok(value / UNIT[target] >= 1 && value / UNIT[target] <= 9, `${q.key} : ${value}`);
    }
    assert.equal(q.display.targets.length, level === 1 ? 2 : 3, q.key);
    const texts = q.display.items.map((i) => i.text);
    assert.equal(new Set(texts).size, texts.length, `${q.key} : deux étiquettes identiques`);
  }
});

test('chaque question explique la correction, courtement et sans faute de signe', () => {
  for (const [, q] of all()) {
    assert.ok(q.explain && q.explain.length >= 10, q.key);
    assert.ok(q.explain.length <= 120, `explication trop longue : ${q.explain}`);
    assert.ok(q.skill, q.key);
    assert.doesNotMatch(q.prompt, /\d -|- \d/, q.key);
    // « 0 dizaine », « 1 unité » : le singulier après 0 et 1.
    assert.doesNotMatch(`${q.prompt} ${q.explain}`, /\b[01] (centaines|dizaines|unités|cubes)\b/, q.key);
  }
});

test('chaque niveau couvre ses notions, et une partie les mélange', () => {
  const expected = {
    1: ['lire le matériel de numération', 'reconnaître le matériel d\'un nombre',
      'chiffre des unités, des dizaines, des centaines', 'écrire un nombre à partir de ses chiffres',
      'décomposer un nombre', 'recomposer un nombre', 'unités, dizaines et centaines'],
    2: ['lire le matériel de numération', 'chiffre des unités, des dizaines, des centaines',
      'écrire un nombre à partir de ses chiffres', 'décomposer un nombre', 'recomposer un nombre',
      'unités, dizaines et centaines'],
    3: ['lire le matériel de numération', 'chiffre des unités, des dizaines, des centaines',
      'valeur d\'un chiffre selon sa place', 'nombre de dizaines dans un nombre',
      'écrire un nombre à partir de ses chiffres', 'décomposer un nombre', 'recomposer un nombre',
      'unités, dizaines et centaines'],
  };
  for (const [level, qs] of Object.entries(byLevel)) {
    assert.deepEqual([...new Set(qs.map((q) => q.skill))].sort(), [...expected[level]].sort(), `niveau ${level}`);
  }
  for (const level of [1, 2, 3]) {
    for (let seed = 1; seed <= 50; seed++) {
      const qs = buildQuestions(game, level, createRng(seed), 10);
      assert.equal(new Set(qs.map((q) => q.key)).size, 10, 'pas de doublon dans une partie');
      assert.ok(new Set(qs.map((q) => q.skill)).size >= 6, `niveau ${level}`);
      assert.ok(new Set(qs.map((q) => q.type)).size >= 3, `niveau ${level} : types trop semblables`);
    }
  }
});

test('une même graine redonne la même partie', () => {
  const keys = (seed) => buildQuestions(game, 3, createRng(seed), 10).map((q) => q.key);
  assert.deepEqual(keys(42), keys(42));
});

test('sans `seen`, makeQuestion renvoie quand même une question valide', () => {
  const q = game.makeQuestion(2, createRng(7));
  assert.ok(q.key.startsWith('cdu:'));
  assert.ok(q.answer !== undefined);
});

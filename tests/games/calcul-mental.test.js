import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/calcul-mental.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';
import { speakableText } from '../../js/core/audio.js';

const MINUS = '−';
const MAX = { 1: 20, 2: 100, 3: 1000 };
const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

/** Recalcule une opération sans passer par le jeu. */
function compute(a, op, b) {
  if (op === '+') return a + b;
  if (op === MINUS) return a - b;
  throw new Error(`signe inattendu : ${op}`);
}

/** « 7 + ? = 15 » → { a: '7', op: '+', b: '?', c: '15' }. */
function parseShow(text) {
  const m = text.match(/^(\d+|\?) ([+−]) (\d+|\?) = (\d+|\?)$/);
  assert.ok(m, `calcul mal écrit : « ${text} »`);
  return { a: m[1], op: m[2], b: m[3], c: m[4] };
}

/** Toutes les égalités « a + b = c » et « a − b = c » d'un texte. */
function equalities(text) {
  return [...text.matchAll(/(\d+) ([+−]) (\d+) = (\d+)/g)].map((m) => m.slice(1));
}

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'calcul-mental');
  assert.equal(game.island, 'nombres');
  assert.equal(game.subject, 'maths');
  assert.equal(game.issue, 52);
});

test('bien plus de 30 calculs distincts par niveau', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 150, `niveau ${level} : ${distinct}`);
  }
});

test('la réponse attendue est exacte (recalculée)', () => {
  for (const [, q] of all()) {
    assert.equal(q.type, 'keypad');
    const { a, op, b, c } = parseShow(q.display.show.text);
    const holes = [a, b, c].filter((x) => x === '?').length;
    if (holes === 2) {
      // Moitié : « ? + ? = 46 ».
      assert.equal(q.key, `calcul-mental:moitié:${c}`);
      assert.equal(op, '+');
      assert.equal(2 * q.answer, Number(c), q.key);
      continue;
    }
    assert.equal(holes, 1, q.key);
    const [x, y, z] = [a, b, c].map((v) => (v === '?' ? q.answer : Number(v)));
    assert.equal(compute(x, op, y), z, q.key);
  }
});

test('jamais de nombre négatif, bornes de chaque niveau respectées', () => {
  for (const [level, q] of all()) {
    assert.ok(Number.isInteger(q.answer) && q.answer > 0, q.key);
    const numbers = q.display.show.text.match(/\d+/g).map(Number).concat(q.answer);
    for (const n of numbers) assert.ok(n >= 0 && n <= MAX[level], `niveau ${level} : ${q.key} (${n})`);
    for (const [, , , r] of equalities(q.explain)) assert.ok(Number(r) <= MAX[level], `${q.key} : ${q.explain}`);
  }
});

test('le niveau 3 utilise des nombres au-delà de 100', () => {
  assert.ok(byLevel[3].some((q) => q.answer > 100));
  assert.ok(byLevel[2].some((q) => q.answer > 20));
});

test('vrais signes : « − » (U+2212), jamais le trait d\'union', () => {
  for (const [, q] of all()) {
    assert.doesNotMatch(q.display.show.text, /-/, q.key);
    assert.doesNotMatch(q.explain, /\d -|- \d/, q.key);
  }
});

test('les explications contiennent des calculs justes et la bonne réponse', () => {
  for (const [, q] of all()) {
    const found = equalities(q.explain);
    assert.ok(found.length >= 1, `aucun calcul dans l'explication : ${q.key}`);
    for (const [a, op, b, c] of found) {
      assert.equal(compute(Number(a), op, Number(b)), Number(c), `${q.key} : « ${a} ${op} ${b} = ${c} »`);
    }
    assert.match(q.explain, new RegExp(`(^|\\D)${q.answer}(\\D|$)`), `réponse absente : ${q.key} → ${q.explain}`);
    assert.ok(q.explain.length <= 110, `explication trop longue : ${q.explain}`);
  }
});

/** Cherche une question précise dans beaucoup de parties. */
function find(level, text) {
  for (let seed = 1; seed < 5000; seed++) {
    const q = buildQuestions(game, level, createRng(seed), 10).find((x) => x.display.show.text === text);
    if (q) return q;
  }
  throw new Error(`« ${text} » introuvable`);
}

test('des stratégies concrètes, adaptées au calcul', () => {
  assert.equal(find(2, '38 + 7 = ?').explain, '38 + 7 : 38 + 2 = 40, puis 40 + 5 = 45.');
  assert.equal(find(1, '9 + 6 = ?').explain, '9 + 6 : 9 + 1 = 10, puis 10 + 5 = 15.');
  assert.equal(find(1, '6 + 9 = ?').explain, '6 + 9, c\'est comme 9 + 6 : 9 + 1 = 10, puis 10 + 5 = 15.');
  assert.equal(find(1, `15 ${MINUS} 8 = ?`).explain, `15 ${MINUS} 8 : 15 ${MINUS} 5 = 10, puis 10 ${MINUS} 3 = 7.`);
  assert.equal(find(1, '6 + 7 = ?').explain, '6 + 7 : 6 + 6 = 12, puis 12 + 1 = 13.');
  assert.equal(find(2, '34 + 20 = ?').explain, '34 + 20 : 30 + 20 = 50, puis 50 + 4 = 54.');
  assert.equal(find(2, '25 + 25 = ?').explain, '25 + 25 : 20 + 20 = 40, 5 + 5 = 10, puis 40 + 10 = 50.');
  assert.equal(find(3, '340 + 200 = ?').explain, '340 + 200 : 300 + 200 = 500, donc 540.');
  assert.equal(find(3, `560 ${MINUS} 30 = ?`).explain, `560 ${MINUS} 30 : 60 ${MINUS} 30 = 30, donc 530.`);
  assert.equal(find(3, '65 + ? = 100').explain, '65 + 5 = 70, puis 70 + 30 = 100. J\'ai ajouté 5 + 30 = 35.');
  assert.equal(find(3, '7 + ? = 15').explain, `Je calcule 15 ${MINUS} 7 = 8. Je vérifie : 7 + 8 = 15.`);
});

test('chaque notion a son nom (statistiques), et chaque niveau couvre ses notions', () => {
  const expected = {
    1: ['compléments à 10', 'doubles', 'presque-doubles', 'ajouter ou retirer 1', 'ajouter ou retirer 10',
      'calculer sans passer la dizaine', 'additions avec passage de la dizaine', 'soustractions avec passage de la dizaine'],
    2: ['ajouter ou retirer des dizaines', 'calculer sans passer la dizaine', 'compléments à la dizaine supérieure',
      'doubles', 'moitiés', 'additions avec passage de la dizaine', 'soustractions avec passage de la dizaine'],
    3: ['ajouter ou retirer des dizaines', 'ajouter ou retirer des centaines', 'additionner deux nombres à 2 chiffres',
      'soustraire deux nombres à 2 chiffres', 'compléments à 100', 'calculs à trou'],
  };
  for (const [level, qs] of Object.entries(byLevel)) {
    assert.deepEqual([...new Set(qs.map((q) => q.skill))].sort(), [...expected[level]].sort(), `niveau ${level}`);
  }
});

test('une partie est équilibrée : toutes les notions, additions et soustractions', () => {
  for (const level of [1, 2, 3]) {
    for (let seed = 1; seed <= 50; seed++) {
      const qs = buildQuestions(game, level, createRng(seed), 10);
      const counts = {};
      for (const q of qs) counts[q.skill] = (counts[q.skill] || 0) + 1;
      assert.ok(Math.max(...Object.values(counts)) <= 2, `niveau ${level} : ${JSON.stringify(counts)}`);
      assert.ok(Object.keys(counts).length >= 6, `niveau ${level} : ${JSON.stringify(counts)}`);
      const texts = qs.map((q) => q.display.show.text);
      assert.ok(texts.some((t) => t.includes(MINUS)) && texts.some((t) => t.includes('+')));
      assert.equal(new Set(qs.map((q) => q.key)).size, 10, 'pas de doublon dans une partie');
    }
  }
});

test('niveau 1 : le passage de la dizaine arrive en fin de partie', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const qs = buildQuestions(game, 1, createRng(seed), 10);
    const late = qs.slice(6).map((q) => q.skill);
    assert.ok(late.every((s) => s.includes('passage de la dizaine')), late.join());
    assert.ok(qs.slice(0, 6).every((q) => !q.skill.includes('passage')));
  }
});

test('la voix lit le calcul avec des mots', () => {
  for (const [, q] of all()) {
    assert.ok(q.speak, q.key);
    assert.doesNotMatch(q.speak, /[+−=]/, q.speak);
    for (const n of q.display.show.text.match(/\d+/g)) assert.ok(q.speak.includes(n), `${q.key} : ${q.speak}`);
  }
  assert.equal(find(2, '38 + 7 = ?').speak, 'Combien font 38 plus 7 ?');
  assert.equal(find(3, '7 + ? = 15').speak, '7 plus combien égale 15 ?');
  // L'explication lue à voix haute : les signes deviennent des mots.
  assert.equal(speakableText(find(1, `15 ${MINUS} 8 = ?`).explain),
    '15 moins 8 : 15 moins 5 égale 10, puis 10 moins 3 égale 7.');
});

test('une même graine redonne la même partie', () => {
  const keys = (seed) => buildQuestions(game, 2, createRng(seed), 10).map((q) => q.key);
  assert.deepEqual(keys(42), keys(42));
});

test('sans `seen`, makeQuestion renvoie quand même un calcul valide', () => {
  const q = game.makeQuestion(3, createRng(5));
  assert.equal(q.type, 'keypad');
  assert.ok(Number.isInteger(q.answer));
});

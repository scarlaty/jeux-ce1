import { test } from 'node:test';
import assert from 'node:assert/strict';
import game, { ENTRIES, PAIRS, LEVEL_PAIRS } from '../../js/games/lettres-soeurs.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { SYLLABLE_WORDS, findSyllableWord } from '../../js/data/syllabes.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';
import { WORDS } from '../../js/data/mots-illustres.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const forms = (level) => byLevel[level].map((q) => q.key.split(':')[1]);
const pairOf = (q) => q.key.split(':')[2];

// Vrais mots français proches d'un faux mot : ils ne doivent jamais servir de distracteur.
// (Liste de garde ; la relecture des faux mots a été faite à la main, mot par mot.)
const REAL_NEIGHBOURS = [
  'douche', 'bouge', 'dos', 'bois', 'dois', 'balle', 'dalle', 'bon', 'don', 'nain', 'train', 'drain',
  'meuf', 'pond', 'fâche', 'fourni', 'bondon', 'bédé', 'crade', 'rode', 'tend', 'tende', 'jâteau',
];

const realWords = new Set([
  ...WORDS.map((w) => w.word), ...SYLLABLE_WORDS.map((w) => w.word), ...REAL_NEIGHBOURS,
]);

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'lettres-soeurs');
  assert.equal(game.title, 'Lettres sœurs');
  assert.equal(game.island, 'mots');
  assert.equal(game.subject, 'français');
  assert.equal(game.issue, 24);
  assert.ok(game.skills.length >= 1);
});

test('chaque mot est dans la banque illustrée, avec une image', () => {
  for (const e of ENTRIES) {
    const w = findSyllableWord(e.word);
    assert.ok(w && w.emoji, `${e.word} : mot illustré inconnu`);
    assert.equal(e.before + e.right + e.after, e.word);
    assert.ok(PAIRS[e.pair].includes(e.right), `${e.word} : lettre hors du couple ${e.pair}`);
    assert.notEqual(e.wrong, e.right);
    assert.ok(PAIRS[e.pair].includes(e.wrong));
  }
});

test('aucun faux mot n\'est un vrai mot (banque ou liste de garde)', () => {
  for (const e of ENTRIES) {
    assert.ok(!realWords.has(e.wrongWord), `${e.wrongWord} (faux mot de ${e.word}) est un vrai mot`);
    assert.notEqual(e.wrongWord, e.word);
  }
});

test('un seul mot juste par entrée : le trou ne se remplit bien que d\'une façon', () => {
  for (const e of ENTRIES) {
    const filled = PAIRS[e.pair].map((l) => e.gap.replace('_', l));
    assert.equal(filled.filter((w) => realWords.has(w)).length, 1, e.gap);
    assert.ok(filled.includes(e.word));
  }
});

test('assez de mots par couple et par niveau', () => {
  for (const pair of Object.keys(PAIRS)) {
    assert.ok(ENTRIES.filter((e) => e.pair === pair).length >= 12, pair);
  }
  for (const level of [1, 2, 3]) {
    const distinct = new Set(byLevel[level].map((q) => q.key)).size;
    assert.ok(distinct >= 30, `niveau ${level} : ${distinct}`);
  }
});

test('les niveaux sont progressifs : couples de lettres et formes de questions', () => {
  const pairs = (level) => new Set(byLevel[level].map(pairOf));
  assert.deepEqual([...pairs(1)].sort(), ['bd', 'pq']);
  assert.deepEqual([...pairs(2)].sort(), ['bd', 'fv', 'mn', 'pq']);
  assert.deepEqual([...pairs(3)].sort(), ['bd', 'chj', 'fv', 'mn', 'pq', 'td']);
  for (const level of [1, 2, 3]) {
    for (const p of pairs(level)) assert.ok(LEVEL_PAIRS[level].includes(p));
  }
  assert.deepEqual([...new Set(forms(1))], ['trou']);
  assert.deepEqual([...new Set(forms(2))].sort(), ['ecrit', 'trou']);
  assert.deepEqual([...new Set(forms(3))].sort(), ['ecrit', 'trou']);
});

test('trou : deux lettres du couple, la bonne parmi elles, une image', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    for (const q of qs.filter((x) => x.key.includes(':trou:'))) {
      assert.deepEqual([...q.display.choices].sort(), [...PAIRS[pairOf(q)]].sort(), q.key);
      assert.ok(q.display.choices.includes(q.answer));
      assert.ok(q.display.show.emoji, q.key);
      assert.match(q.display.show.text, /_/);
      // Niveau 1 : toujours en script ; la cursive arrive au niveau 2.
      if (level === '1') assert.ok(!q.display.cursive, q.key);
    }
  }
  assert.ok(byLevel[2].some((q) => q.display.cursive && q.key.includes(':trou:')));
});

test('écrit : le bon mot, 2 ou 3 écritures, aucun faux mot qui soit un vrai mot', () => {
  const sizes = new Set();
  for (const level of [2, 3]) {
    for (const q of byLevel[level].filter((x) => x.key.includes(':ecrit:'))) {
      const choices = q.display.choices;
      assert.ok(choices.length >= 2 && choices.length <= 3, q.key);
      sizes.add(choices.length);
      assert.ok(realWords.has(q.answer), q.key);
      assert.equal(choices.filter((c) => realWords.has(c)).length, 1, `${q.key} : ${choices}`);
      assert.ok(q.display.show.emoji && q.display.show.speak === q.answer);
    }
  }
  assert.deepEqual([...sizes].sort(), [2, 3]);
  assert.ok(byLevel[2].some((q) => q.key.includes(':ecrit:') && q.display.cursive));
  assert.ok(byLevel[2].some((q) => q.key.includes(':ecrit:') && !q.display.cursive));
});

test('niveau 3 : la voix lit le mot à trouver', () => {
  for (const q of byLevel[3].filter((x) => x.key.includes(':ecrit:'))) {
    assert.ok(q.speak.includes(q.answer), q.key);
  }
});

test('la correction donne une astuce de mémorisation', () => {
  for (const qs of Object.values(byLevel)) {
    for (const q of qs) {
      assert.match(q.explain, / : /, q.key);
      assert.ok(q.explain.includes(q.key.includes(':trou:') ? ' s\'écrit avec ' : ' s\'écrit ainsi'), q.key);
      assert.doesNotMatch(q.explain, /bfauxb|erreur|raté/i);
    }
  }
  const sample = byLevel[1].find((q) => q.key === 'lettres-soeurs:trou:bd:bateau');
  assert.ok(sample.explain.includes('ventre'));
});

test('une partie de 10 questions est sans doublon', () => {
  for (let seed = 1; seed <= 50; seed++) {
    for (const level of [1, 2, 3]) {
      const keys = buildQuestions(game, level, createRng(seed), 10).map((q) => q.key);
      assert.equal(new Set(keys).size, 10, `niveau ${level}, graine ${seed}`);
    }
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/syllabes.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';
import {
  findSyllableWord, isTransparent, endsWithQuietE, onsetSound,
} from '../../js/data/syllabes.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

/** « syllabes:ordre:tomate » → { form: 'ordre', word: 'tomate' } ; « syllabes:image:3:lapin » aussi. */
function parseKey(key) {
  const parts = key.split(':');
  assert.equal(parts[0], 'syllabes', key);
  const entry = findSyllableWord(parts.at(-1));
  assert.ok(entry, `${key} : mot inconnu`);
  return { form: parts[1], entry, target: parts.length === 4 ? Number(parts[2]) : null };
}

const size = (entry) => entry.syllables.length;

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'syllabes');
  assert.equal(game.title, 'Syllabes en folie');
  assert.equal(game.island, 'mots');
  assert.equal(game.subject, 'français');
  assert.equal(game.issue, 23);
  assert.ok(game.skills.length >= 1);
});

test('bien plus de 30 questions distinctes par niveau', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 100, `niveau ${level} : ${distinct}`);
  }
});

test('les cinq formes sont utilisées, la dernière syllabe à partir du niveau 2', () => {
  const forms = (level) => new Set(byLevel[level].map((q) => parseKey(q.key).form));
  assert.deepEqual([...forms(1)].sort(), ['compter', 'debut', 'image', 'ordre']);
  assert.deepEqual([...forms(2)].sort(), ['compter', 'debut', 'fin', 'image', 'ordre']);
  assert.deepEqual([...forms(3)].sort(), ['compter', 'debut', 'fin', 'image', 'ordre']);
});

test('les niveaux sont progressifs : des mots de plus en plus longs', () => {
  const longest = (level, form) => Math.max(...byLevel[level]
    .filter((q) => parseKey(q.key).form === form).map((q) => size(parseKey(q.key).entry)));
  const shortest = (level, form) => Math.min(...byLevel[level]
    .filter((q) => parseKey(q.key).form === form).map((q) => size(parseKey(q.key).entry)));
  assert.equal(longest(1, 'ordre'), 2);
  assert.equal(shortest(2, 'ordre'), 3);
  assert.ok(longest(3, 'ordre') >= 4);
  assert.ok(longest(3, 'compter') === 4 && shortest(3, 'compter') === 2);
  assert.ok(longest(1, 'compter') <= 3);
  // Au niveau 1, aucun « e » muet : la convention de l'écrit n'arrive qu'ensuite.
  for (const q of byLevel[1]) assert.ok(isTransparent(parseKey(q.key).entry), q.key);
});

test('« compter » : seulement des mots où l\'on entend les syllabes écrites', () => {
  for (const [level, q] of all()) {
    const { form, entry } = parseKey(q.key);
    if (form !== 'compter') continue;
    assert.ok(isTransparent(entry), `${q.key} : « e » muet, le compte serait discutable`);
    assert.equal(q.answer, size(entry));
    assert.ok(q.display.choices.includes(q.answer));
    assert.deepEqual(q.display.choices, Array.from({ length: level + 2 }, (_, i) => i + 1));
    assert.equal(q.display.show.text, entry.word);
    assert.equal(q.display.show.speak, entry.word, 'le mot doit pouvoir être écouté');
  }
});

test('« image » : un seul mot a le nombre de syllabes demandé', () => {
  for (const [, q] of all()) {
    const { form, entry, target } = parseKey(q.key);
    if (form !== 'image') continue;
    assert.equal(size(entry), target);
    assert.match(q.prompt, new RegExp(`${target} syllabes?\\.$`));
    assert.equal(q.display.choices.length, 4);
    for (const c of q.display.choices) {
      const w = findSyllableWord(c.value);
      assert.ok(w.emoji && c.emoji === w.emoji && c.text === w.word, `${q.key} : image et mot`);
      assert.ok(isTransparent(w), `${q.key} : « ${w.word} » a un « e » muet`);
      assert.equal(size(w) === target, c.value === q.answer, `${q.key} : « ${w.word} »`);
    }
  }
});

test('« ordre » : les syllabes données refont le mot, dans un seul ordre', () => {
  for (const [, q] of all()) {
    const { form, entry } = parseKey(q.key);
    if (form !== 'ordre') continue;
    assert.deepEqual(q.answer, [...entry.syllables]);
    assert.equal(q.answer.join(''), entry.word);
    assert.equal(new Set(q.display.items).size, q.display.items.length, `${q.key} : syllabe répétée`);
    assert.ok(q.display.show.emoji, `${q.key} : il faut l'image`);
    assert.equal(q.display.show.text, undefined, `${q.key} : le mot écrit donnerait la réponse`);
    assert.equal(q.display.cursive, true);
    if (endsWithQuietE(entry.syllables.at(-1))) assert.match(q.explain, /le e de la fin/i, q.key);
  }
});

test('« début » et « fin » : une seule syllabe proposée s\'entend au bon endroit', () => {
  for (const [, q] of all()) {
    const { form, entry } = parseKey(q.key);
    if (form !== 'debut' && form !== 'fin') continue;
    const right = form === 'debut' ? entry.syllables[0] : entry.syllables.at(-1);
    assert.equal(q.answer, right);
    assert.ok(size(entry) >= 2, q.key);
    assert.ok(!endsWithQuietE(right), `${q.key} : « ${right} » ne s'entend pas comme il s'écrit`);
    assert.equal(q.display.choices.length, 4);
    // Les autres syllabes commencent toutes par un son différent : aucune confusion possible.
    const onsets = q.display.choices.map(onsetSound);
    assert.equal(new Set(onsets).size, 4, `${q.key} : ${q.display.choices.join(', ')}`);
    assert.match(q.prompt, form === 'debut' ? /première/ : /dernière/);
  }
});

test('chaque erreur est expliquée avec le découpage du mot', () => {
  for (const [, q] of all()) {
    const { entry } = parseKey(q.key);
    assert.ok(q.explain.includes(`« ${entry.word} »`), q.key);
    assert.ok(q.explain.includes(entry.syllables.join('-')), `${q.key} : ${q.explain}`);
    assert.match(q.explain, /\.$/, q.key);
    assert.ok(q.explain.length <= 160, `${q.key} : ${q.explain.length}`);
    assert.ok(q.skill, q.key);
    assert.ok(q.speak && !/[«»[\]]/.test(q.speak), `${q.key} : ${q.speak}`);
    assert.match(q.prompt, /^(Touche|Range|Combien) /, q.key);
  }
});

test('une partie est variée et sans doublon', () => {
  for (const level of [1, 2, 3]) {
    for (let seed = 1; seed <= 50; seed++) {
      const qs = buildQuestions(game, level, createRng(seed), 10);
      assert.equal(new Set(qs.map((q) => q.key)).size, 10, `niveau ${level} : doublon`);
      assert.ok(new Set(qs.map((q) => parseKey(q.key).form)).size >= 4, `niveau ${level}`);
      assert.ok(qs.some((q) => q.type === 'order'), `niveau ${level} : pas de syllabes à ranger`);
    }
  }
});

test('une même graine redonne la même partie ; sans `seen`, une question valide', () => {
  const keys = (seed) => buildQuestions(game, 2, createRng(seed), 10).map((q) => q.key);
  assert.deepEqual(keys(42), keys(42));
  assert.notDeepEqual(keys(42), keys(43));
  for (let seed = 1; seed <= 50; seed++) assert.ok(game.makeQuestion(3, createRng(seed)).answer);
});

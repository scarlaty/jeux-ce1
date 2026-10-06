import { test } from 'node:test';
import assert from 'node:assert/strict';
import game, {
  SOUND_ENTRIES, GAP_ENTRIES, REFS, soundOf, soundOfS,
} from '../../js/games/lettres-qui-changent.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { SYLLABLE_WORDS, findSyllableWord } from '../../js/data/syllabes.js';
import { WORDS } from '../../js/data/mots-illustres.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const part = (q, i) => q.key.split(':')[i];
const form = (q) => part(q, 1);
const kindOf = (q) => part(q, 2);

// Vrais mots français proches d'une mauvaise graphie : aucun ne doit jamais être le « faux » mot.
// Écartés pour cette raison : poison (poisson), cousin (coussin), croisant (croissant), rosse (rose).
const REAL_NEIGHBOURS = ['poison', 'cousin', 'croisant', 'rosse', 'lange', 'rosé', 'jambon', 'tombe', 'banc'];
const realWords = new Set([
  ...WORDS.map((w) => w.word), ...SYLLABLE_WORDS.map((w) => w.word), ...REAL_NEIGHBOURS,
]);

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'lettres-qui-changent');
  assert.equal(game.island, 'mots');
  assert.equal(game.subject, 'français');
  assert.equal(game.issue, 25);
  assert.ok(game.skills.length >= 1);
});

test('les règles du c, du g et du s', () => {
  for (const next of ['a', 'o', 'u', 'r', 't']) assert.equal(soundOf('c', next), 'k');
  for (const next of ['e', 'i', 'y', 'é']) assert.equal(soundOf('c', next), 's');
  for (const next of ['a', 'o', 'u', 'r', 'l']) assert.equal(soundOf('g', next), 'g');
  for (const next of ['e', 'i', 'y']) assert.equal(soundOf('g', next), 'j');
  assert.equal(soundOfS('', 'o'), 's');
  assert.equal(soundOfS('a', 'o'), 'z');
  assert.equal(soundOfS('n', 'e'), 's');
});

test('chaque mot de son : illustré, une seule fois la lettre, son conforme à la règle', () => {
  for (const e of SOUND_ENTRIES) {
    const w = e.word;
    assert.ok(e.emoji, `${w} : pas d'image`);
    assert.ok(findSyllableWord(w) || WORDS.some((x) => x.word === w), w);
    assert.ok(e.at >= 0, w);
    if (e.letter === 'ss') {
      assert.equal(w.split('ss').length, 2, `${w} : un seul « ss »`);
      assert.equal(soundOfS(w[e.at - 1], w[e.at + 2]), 'z', 'sans doublement, ce serait le son de zèbre');
      assert.equal(e.sound, 's');
      continue;
    }
    assert.equal([...w].filter((ch) => ch === e.letter).length, 1, `${w} : « ${e.letter} » une seule fois`);
    const next = w[e.at + 1];
    if (e.letter === 'c') assert.notEqual(next, 'h', `${w} : « ch »`);
    if (e.letter === 'g') assert.ok(!'nu'.includes(next), `${w} : « gn » ou « gu »`);
    if (e.letter === 's') {
      assert.ok(!w.includes('ss') && next !== 'h', w);
      assert.equal(soundOfS(w[e.at - 1] || '', next), e.sound, w);
    } else {
      assert.equal(soundOf(e.letter, next), e.sound, w);
    }
  }
});

test('assez de mots pour chaque son, et des mots-repères qui ne servent pas de contre-exemple', () => {
  for (const [letter, sound] of [['c', 'k'], ['c', 's'], ['g', 'g'], ['g', 'j'], ['s', 's'], ['s', 'z'], ['ss', 's']]) {
    const n = SOUND_ENTRIES.filter((e) => e.letter === letter && e.sound === sound).length;
    assert.ok(n >= 4, `${letter} → ${sound} : ${n}`);
  }
  for (const sound of Object.keys(REFS)) {
    assert.ok(REFS[sound].emoji && REFS[sound].word);
    assert.ok(!SOUND_ENTRIES.some((e) => e.word === REFS[sound].word));
  }
});

test('trous : une seule graphie juste, l\'autre ne fait pas un vrai mot', () => {
  for (const e of GAP_ENTRIES) {
    assert.notEqual(e.wrongWord, e.word);
    assert.ok(!realWords.has(e.wrongWord), `${e.wrongWord} (autre graphie de ${e.word}) est un vrai mot`);
    assert.ok(e.emoji || e.clue, `${e.word} : ni image ni devinette`);
    assert.ok(!e.clue || !e.clue.toLowerCase().includes(e.word.toLowerCase()), `${e.word} : la devinette donne le mot`);
    assert.equal(e.gap.split('_').length, 2);
  }
});

test('trous : la graphie juste suit la règle', () => {
  const vowel = (c) => Boolean(c) && 'aeiouyâêéèîôûœ'.includes(c);
  for (const e of GAP_ENTRIES) {
    const next = e.after[0];
    const prev = e.before.slice(-1);
    if (e.kind === 'cedille') {
      assert.equal(e.right, 'ç');
      assert.ok('aou'.includes(next), e.word);
    } else if (e.kind === 'gu') {
      assert.equal(e.right, 'gu');
      assert.ok('eiéêè'.includes(next), e.word);
    } else if (e.kind === 'ge') {
      assert.equal(e.right, 'ge');
      assert.ok('aou'.includes(next), e.word);
    } else if (e.kind === 'm') {
      assert.equal(e.right, 'm');
      assert.ok('mbp'.includes(next), e.word);
    } else {
      assert.ok(vowel(prev) && vowel(next), `${e.word} : entre deux voyelles`);
    }
  }
  const kinds = [...new Set(GAP_ENTRIES.map((e) => e.kind))].sort();
  assert.deepEqual(kinds, ['cedille', 'ge', 'gu', 'm', 's']);
  for (const k of kinds) assert.ok(GAP_ENTRIES.filter((e) => e.kind === k).length >= 4, k);
  assert.ok(GAP_ENTRIES.some((e) => e.right === 'ss') && GAP_ENTRIES.some((e) => e.right === 's'));
});

test('niveaux progressifs : formes et lettres', () => {
  const forms = (l) => [...new Set(byLevel[l].map(form))].sort();
  assert.deepEqual(forms(1), ['find', 'same']);
  assert.deepEqual(forms(2), ['find', 'gap', 'same']);
  assert.deepEqual(forms(3), ['ecrit', 'find', 'gap', 'same']);
  const letters = (l) => [...new Set(byLevel[l].filter((q) => ['same', 'find'].includes(form(q))).map(kindOf))].sort();
  assert.deepEqual(letters(1), ['c', 'g']);
  assert.deepEqual(letters(2), ['c', 'g']);
  assert.deepEqual(letters(3), ['c', 'g', 's', 'ss']);
  const kinds = (l) => [...new Set(byLevel[l].filter((q) => ['gap', 'ecrit'].includes(form(q))).map(kindOf))].sort();
  assert.deepEqual(kinds(2), ['cedille', 'ge', 'gu', 'm']);
  assert.deepEqual(kinds(3), ['cedille', 'ge', 'gu', 'm', 's']);
});

test('same : deux mots-repères, la bonne réponse est le son de la règle', () => {
  const pairs = { c: ['k', 's'], g: ['g', 'j'], s: ['s', 'z'], ss: ['s', 'z'] };
  for (const qs of Object.values(byLevel)) {
    for (const q of qs.filter((x) => form(x) === 'same')) {
      const e = SOUND_ENTRIES.find((x) => x.word === part(q, 3) && x.letter === kindOf(q));
      assert.ok(e, q.key);
      assert.equal(q.answer, e.sound);
      assert.deepEqual(q.display.choices.map((c) => c.value).sort(), pairs[e.letter].slice().sort());
      assert.ok(q.explain.includes(REFS[e.sound].word), q.key);
    }
  }
});

test('find : un seul mot du bon son parmi trois, mot-repère jamais proposé', () => {
  for (const qs of Object.values(byLevel)) {
    for (const q of qs.filter((x) => form(x) === 'find')) {
      const entries = q.display.choices.map((c) => SOUND_ENTRIES.find((x) => x.word === c.value && x.letter === kindOf(q)));
      assert.ok(entries.every(Boolean), q.key);
      assert.equal(entries.length, 3);
      const target = entries.find((e) => e.word === q.answer);
      assert.equal(entries.filter((e) => e.sound === target.sound).length, 1, q.key);
      assert.ok(q.prompt.includes(REFS[target.sound].word), q.key);
    }
  }
});

test('gap et écrit : les deux graphies, l\'image ou la devinette', () => {
  for (const qs of Object.values(byLevel)) {
    for (const q of qs.filter((x) => ['gap', 'ecrit'].includes(form(x)))) {
      const e = GAP_ENTRIES.find((x) => x.word === part(q, 3) && x.kind === kindOf(q));
      assert.ok(e, q.key);
      if (e.clue) assert.ok(q.prompt.includes(e.clue), q.key);
      if (form(q) === 'gap') {
        assert.deepEqual([...q.display.choices].sort(), [e.right, e.wrong].sort());
        assert.equal(q.answer, e.right);
        assert.equal(q.display.show.text, e.gap);
        assert.ok(q.display.large);
      } else {
        assert.deepEqual([...q.display.choices].sort(), [e.word, e.wrongWord].sort());
        assert.equal(q.answer, e.word);
      }
      assert.equal(q.display.show.speak, e.word);
    }
  }
});

test('la correction rappelle la règle, sans reproche ni symbole phonétique', () => {
  for (const qs of Object.values(byLevel)) {
    for (const q of qs) {
      assert.ok(q.explain.length > 30, q.key);
      assert.doesNotMatch(q.explain, /erreur|raté|tort/i);
      assert.doesNotMatch(`${q.speak} ${q.prompt}`, /[[\]ʒ]/);
    }
  }
  const garcon = byLevel[2].find((q) => q.key.endsWith(':cedille:garçon') && form(q) === 'gap');
  assert.match(garcon.explain, /cédille/);
});

test('une partie de 10 questions ne repose jamais deux fois le même mot', () => {
  for (let seed = 1; seed <= 50; seed++) {
    for (const level of [1, 2, 3]) {
      const words = buildQuestions(game, level, createRng(seed), 10).map((q) => q.key.split(':').at(-1));
      assert.equal(new Set(words).size, 10, `niveau ${level}, graine ${seed}`);
    }
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../js/games/sons.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { createRng } from '../../js/core/random.js';
import { buildQuestions } from '../../js/core/engine.js';
import { findWord, getSound, blockedSounds, SOUNDS, EXTRA_SOUNDS } from '../../js/data/mots-illustres.js';

// Les sons attendus à chaque niveau (critères de l'issue #22), écrits ici indépendamment du jeu.
const LEVEL_SOUNDS = {
  1: ['ou', 'on', 'an', 'oi', 'ch'],
  2: ['ou', 'on', 'an', 'oi', 'ch', 'in', 'eu'],
  3: ['ou', 'on', 'an', 'oi', 'ch', 'in', 'eu', 'gn', 'ill', 'ail', 'eil'],
};

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });
const all = () => Object.entries(byLevel).flatMap(([level, qs]) => qs.map((q) => [Number(level), q]));

/** « sons:ou:image:loup » → { sound: 'ou', form: 'image', detail: 'loup' }. */
function parseKey(key) {
  const [prefix, sound, form, detail] = key.split(':');
  assert.equal(prefix, 'sons', key);
  assert.ok(form && detail, key);
  return { sound, form, detail };
}

/** Les mots proposés dans un QCM de mots ou d'images. */
function choiceWords(q) {
  return q.display.choices.map((c) => (typeof c === 'string' ? c : c.label));
}

/** Tous les mots qu'une question met sous les yeux de l'enfant. */
function shownWords(q) {
  if (q.type === 'drag') return q.display.items.map((i) => i.label);
  if (q.display.show) return [q.display.show.text];
  return choiceWords(q);
}

/** Vrai si l'on entend `sound` (ou un son qui s'entend pareil) dans ce mot. */
function soundsLike(word, sound) {
  const entry = findWord(word);
  assert.ok(entry, `mot hors banque : ${word}`);
  const blocked = blockedSounds([sound]);
  return entry.sounds.some((s) => blocked.has(s));
}

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'sons');
  assert.equal(game.title, 'Les sons');
  assert.equal(game.island, 'mots');
  assert.equal(game.subject, 'français');
  assert.equal(game.issue, 22);
  assert.ok(game.skills.length >= 1);
  assert.deepEqual(game.levels.map((l) => l.hint), [
    '[ou], [on], [an], [oi], [ch]',
    '+ [in], [eu]',
    '+ [gn], [ill], [ail], [eil]',
  ]);
});

test('bien plus de 30 questions distinctes par niveau', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const distinct = new Set(qs.map((q) => q.key)).size;
    assert.ok(distinct >= 150, `niveau ${level} : ${distinct}`);
  }
});

test('chaque niveau travaille ses sons, et seulement les siens', () => {
  for (const [level, qs] of Object.entries(byLevel)) {
    const used = new Set();
    for (const q of qs) {
      for (const sound of parseKey(q.key).sound.split('+')) {
        assert.ok(LEVEL_SOUNDS[level].includes(sound), `niveau ${level} : son ${sound} hors programme`);
        used.add(sound);
      }
    }
    assert.deepEqual([...used].sort(), [...LEVEL_SOUNDS[level]].sort(), `niveau ${level}`);
  }
  // Les sons nouveaux d'un niveau tombent plus souvent que les anciens.
  const count = (level, sound) => byLevel[level].filter((q) => parseKey(q.key).sound.includes(sound)).length;
  assert.ok(count(2, 'in') > count(2, 'oi'), 'niveau 2 : [in] devrait dominer');
  assert.ok(count(3, 'ill') > count(3, 'oi'), 'niveau 3 : [ill] devrait dominer');
});

test('un niveau ne montre que des mots dont les sons sont déjà connus', () => {
  // Les sons « en plus » ne sont jamais enseignés : ils servent à écarter les mots dangereux,
  // et n'empêchent donc pas un mot d'être montré dès le niveau 1 (« avion » porte [on] et [yod]).
  const known = (level) => new Set([...LEVEL_SOUNDS[level], ...EXTRA_SOUNDS.map((s) => s.id)]);
  for (const [level, q] of all()) {
    for (const word of shownWords(q)) {
      for (const s of findWord(word).sounds) {
        assert.ok(known(level).has(s), `niveau ${level} : « ${word} » contient ${s}, pas encore vu`);
      }
    }
  }
  // Les mots des sons avancés n'apparaissent donc qu'au niveau 3.
  const shown = (level) => new Set(byLevel[level].flatMap(shownWords));
  for (const word of ['corbeille', 'champignon', 'écureuil']) {
    assert.ok(!shown(1).has(word) && !shown(2).has(word), word);
    assert.ok(shown(3).has(word), `${word} devrait apparaître au niveau 3`);
  }
});

test('les cinq formes de questions sont utilisées', () => {
  const forms = new Set(all().map(([, q]) => parseKey(q.key).form));
  assert.deepEqual([...forms].sort(), ['image', 'intrus', 'intrus-mot', 'mot', 'quel', 'tri']);
  assert.ok(new Set(byLevel[1].map((q) => parseKey(q.key).form)).size >= 4, 'niveau 1 trop monotone');
});

test('« image » et « mot » : un seul choix contient le son visé', () => {
  for (const [, q] of all()) {
    const { sound, form, detail } = parseKey(q.key);
    if (!['image', 'mot'].includes(form)) continue;
    assert.equal(q.answer, detail);
    assert.equal(q.display.choices.length, 4);
    const words = choiceWords(q);
    assert.ok(soundsLike(q.answer, sound), `${q.key} : la réponse n'a pas le son`);
    for (const word of words.filter((w) => w !== q.answer)) {
      assert.ok(!soundsLike(word, sound), `${q.key} : « ${word} » contient aussi ${sound}`);
    }
    assert.equal(new Set(words).size, 4, `${q.key} : mot en double`);
  }
});

test('« intrus » : trois mots avec le son, un seul sans', () => {
  for (const [, q] of all()) {
    const { sound, form } = parseKey(q.key);
    if (!form.startsWith('intrus')) continue;
    const words = choiceWords(q);
    assert.equal(words.length, 4);
    assert.ok(!soundsLike(q.answer, sound), `${q.key} : l'intrus contient ${sound}`);
    for (const word of words.filter((w) => w !== q.answer)) {
      assert.ok(findWord(word).sounds.includes(sound), `${q.key} : « ${word} » n'a pas ${sound}`);
    }
    assert.match(q.prompt, /n'entends pas/);
  }
});

test('les images sont des émojis nommés, les mots écrits sont en cursive', () => {
  for (const [, q] of all()) {
    const { form } = parseKey(q.key);
    if (form === 'image' || form === 'intrus') {
      for (const c of q.display.choices) {
        assert.ok(c.emoji, `${q.key} : choix sans émoji`);
        assert.equal(c.emoji, findWord(c.label).emoji);
        assert.equal(c.value, c.label);
        assert.equal(c.text, undefined, `${q.key} : une image ne montre pas le mot`);
      }
    } else if (form === 'mot' || form === 'intrus-mot') {
      assert.equal(q.display.cursive, true, q.key);
      for (const c of q.display.choices) assert.equal(typeof c, 'string', q.key);
    }
  }
});

test('« quel son ? » : un seul son proposé s\'entend dans le mot', () => {
  for (const [level, q] of all()) {
    const { sound, form, detail } = parseKey(q.key);
    if (form !== 'quel') continue;
    const entry = findWord(detail);
    assert.equal(q.display.show.text, entry.word);
    assert.equal(q.display.show.cursive, true);
    assert.equal(q.display.show.speak, entry.word, 'le mot doit pouvoir être écouté');
    assert.equal(q.answer, sound);
    assert.ok(entry.sounds.includes(sound), `${q.key} : son absent du mot`);
    assert.ok(q.display.choices.length >= 3, q.key);
    for (const c of q.display.choices) {
      assert.ok(LEVEL_SOUNDS[level].includes(c.value), `${q.key} : ${c.value} hors programme`);
      assert.equal(c.text, getSound(c.value).label);
      if (c.value === sound) continue;
      assert.ok(!soundsLike(entry.word, c.value), `${q.key} : on entend aussi ${c.value}`);
    }
  }
});

test('« tri » : chaque image ne va que dans une seule boîte', () => {
  for (const [level, q] of all()) {
    const { sound, form } = parseKey(q.key);
    if (form !== 'tri') continue;
    const [a, b] = sound.split('+');
    assert.notEqual(a, b);
    assert.ok(!blockedSounds([a]).has(b), `${q.key} : deux sons qui s'entendent pareil`);
    assert.deepEqual(q.display.targets.map((t) => t.id), [a, b]);
    assert.deepEqual(q.display.targets.map((t) => t.label), [getSound(a).label, getSound(b).label]);
    assert.equal(q.display.items.length, 4);
    assert.ok(LEVEL_SOUNDS[level].includes(a) && LEVEL_SOUNDS[level].includes(b));
    const boxes = { [a]: 0, [b]: 0 };
    for (const item of q.display.items) {
      const entry = findWord(item.label);
      assert.ok(entry && item.emoji === entry.emoji, `${q.key} : image inconnue`);
      const box = q.answer[item.id];
      const other = box === a ? b : a;
      assert.ok(entry.sounds.includes(box), `${q.key} : « ${entry.word} » n'a pas ${box}`);
      assert.ok(!soundsLike(entry.word, other), `${q.key} : « ${entry.word} » contient aussi ${other}`);
      boxes[box] += 1;
    }
    assert.deepEqual(boxes, { [a]: 2, [b]: 2 }, `${q.key} : boîtes déséquilibrées`);
  }
});

test('chaque erreur est expliquée, avec le mot et le son', () => {
  for (const [, q] of all()) {
    const { sound, form } = parseKey(q.key);
    assert.ok(q.explain && q.explain.length <= 140, `${q.key} : « ${q.explain} »`);
    assert.match(q.explain, /\.$/, q.key);
    if (form === 'tri') {
      assert.ok(q.explain.includes(getSound(sound.split('+')[0]).label), q.key);
      continue;
    }
    const word = form === 'quel' ? q.display.show.text : q.answer;
    assert.ok(q.explain.includes(`« ${word} »`), `${q.key} : le mot manque dans l'explication`);
    assert.ok(q.explain.includes(getSound(sound).label), `${q.key} : le son manque dans l'explication`);
  }
});

test('la voix dit les sons avec des syllabes, jamais entre crochets', () => {
  const says = new Set(SOUNDS.map((s) => s.say));
  for (const [, q] of all()) {
    assert.ok(q.speak, q.key);
    assert.doesNotMatch(q.speak, /[[\]]/, `${q.key} : ${q.speak}`);
    assert.match(q.prompt, /^(Touche|Lis|Range) /, q.key);
  }
  assert.ok(says.has('che') && says.has('ille') && says.has('aille'));
});

test('une partie est variée : plusieurs formes, plusieurs sons, aucun doublon', () => {
  for (const level of [1, 2, 3]) {
    for (let seed = 1; seed <= 50; seed++) {
      const qs = buildQuestions(game, level, createRng(seed), 10);
      assert.equal(new Set(qs.map((q) => q.key)).size, 10, `niveau ${level} : doublon`);
      const forms = new Set(qs.map((q) => parseKey(q.key).form));
      assert.ok(forms.size >= 3, `niveau ${level} : ${[...forms].join()}`);
      const sounds = new Set(qs.flatMap((q) => parseKey(q.key).sound.split('+')));
      assert.ok(sounds.size >= 3, `niveau ${level} : ${[...sounds].join()}`);
      assert.ok(qs.some((q) => q.type === 'drag'), `niveau ${level} : pas de tri`);
    }
  }
});

test('une même graine redonne la même partie', () => {
  const keys = (seed) => buildQuestions(game, 3, createRng(seed), 10).map((q) => q.key);
  assert.deepEqual(keys(42), keys(42));
  assert.notDeepEqual(keys(42), keys(43));
});

test('sans `seen`, makeQuestion renvoie quand même une question valide', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const q = game.makeQuestion(2, createRng(seed));
    assert.ok(['choice', 'drag'].includes(q.type), q.key);
    assert.ok(q.answer);
  }
});

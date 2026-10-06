import { test } from 'node:test';
import assert from 'node:assert/strict';
import game, {
  SOUNDS, hasSound, lacksSound, soundCount, gapFor, findGraphemes,
} from '../../js/games/sons.js';
import { WORDS, PHONEMES, findWord, soundPositions } from '../../js/data/mots-illustres.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
import { toChoice } from '../../js/core/validate.js';

const word = (w) => {
  const entry = findWord(w);
  assert.ok(entry, `mot absent de la banque : ${w}`);
  return entry;
};

// --- Banque de mots ----------------------------------------------------------------------------

test('banque : au moins 120 mots, sans doublon de mot ni d\'émoji', () => {
  assert.ok(WORDS.length >= 120, `${WORDS.length} mots`);
  assert.equal(new Set(WORDS.map((e) => e.word)).size, WORDS.length, 'mot en double');
  const emojis = WORDS.map((e) => e.emoji);
  const dup = emojis.filter((e, i) => emojis.indexOf(e) !== i);
  assert.deepEqual(dup, [], 'émoji en double');
});

test('banque : mots en minuscules (NFC), phonèmes connus, syllabes qui redonnent le mot', () => {
  for (const e of WORDS) {
    assert.equal(e.word, e.word.normalize('NFC').toLowerCase(), e.word);
    assert.ok(e.sounds.length > 0, e.word);
    for (const s of e.sounds) assert.ok(s in PHONEMES, `${e.word} : phonème inconnu « ${s} »`);
    if (e.syllables) {
      assert.equal(e.syllables.join(''), e.word, `${e.word} : syllabes ${e.syllables.join('-')}`);
      assert.ok(e.syllables.every((s) => s.length > 0), e.word);
    }
  }
});

// Émojis ajoutés après Unicode 13 (mal affichés sur les tablettes un peu anciennes).
const RECENT = [
  [0x1f6dc, 0x1f6df], [0x1f7f0, 0x1f7f0], [0x1f979, 0x1f979], [0x1f9cc, 0x1f9cc],
  [0x1fa75, 0x1fa77], [0x1fa7b, 0x1fa7c], [0x1fa87, 0x1fa88], [0x1faa9, 0x1faaf],
  [0x1fab7, 0x1fabf], [0x1fac3, 0x1facf], [0x1fad7, 0x1fadf], [0x1fae0, 0x1faff],
];

test('banque : émojis simples d\'Unicode 13 au plus (ni récents, ni combinés)', () => {
  for (const e of WORDS) {
    const points = [...e.emoji].map((c) => c.codePointAt(0));
    assert.ok(!points.includes(0x200d), `${e.word} : émoji combiné (ZWJ)`);
    for (const p of points) {
      assert.ok(!RECENT.some(([a, b]) => p >= a && p <= b), `${e.word} : émoji trop récent U+${p.toString(16)}`);
    }
  }
});

test('banque : sons exacts sur les mots repères (phonèmes, pas lettres)', () => {
  assert.deepEqual(word('oiseau').sounds, ['w', 'a', 'z', 'o']);
  assert.deepEqual(word('banane').sounds, ['b', 'a', 'n', 'a', 'n']);
  assert.deepEqual(word('chien').sounds, ['ch', 'ill', 'in']);
  assert.deepEqual(word('pingouin').sounds, ['p', 'in', 'g', 'w', 'in']);
  assert.equal(findWord('femme'), null);
  assert.equal(findWord('oignon'), null);
});

test('soundPositions : suites de phonèmes, sans chevauchement', () => {
  assert.deepEqual(soundPositions(['b', 'on', 'b', 'on'], ['on']), [1, 3]);
  assert.deepEqual(soundPositions(['w', 'a', 'z', 'o'], ['w', 'a']), [0]);
  assert.deepEqual(soundPositions(['ill', 'o', 'ill', 'o'], ['ill', 'o']), [0, 2]);
  assert.deepEqual(soundPositions(['a'], ['a', 'ill']), []);
});

// --- Analyse des mots ------------------------------------------------------------------------

test('les mots-pièges ne sont ni bonne réponse ni distracteur', () => {
  const traps = [
    ['banane', 'an'], ['ananas', 'an'], ['chien', 'an'], ['renard', 'an'], ['canard', 'an'],
    ['pomme', 'on'], ['téléphone', 'on'], ['couronne', 'on'],
    ['lune', 'in'], ['aimant', 'in'], ['poing', 'in'], ['fontaine', 'in'],
    ['chien', 'ill'], ['pied', 'ill'], ['cygne', 'ill'], ['fil', 'ill'],
    ['cheval', 'eu'], ['loup', 'o'], ['crayon', 'eil'], ['pingouin', 'ou'],
  ];
  for (const [w, id] of traps) {
    assert.equal(hasSound(word(w), id), false, `${w} n'est pas une bonne réponse pour [${id}]`);
    assert.equal(lacksSound(word(w), id), false, `${w} n'est pas un distracteur pour [${id}]`);
  }
});

test('bonnes réponses attendues', () => {
  const ok = [
    ['loup', 'ou'], ['dent', 'an'], ['oiseau', 'oi'], ['oiseau', 'o'], ['main', 'in'], ['pingouin', 'in'],
    ['cœur', 'eu'], ['bateau', 'o'], ['champignon', 'gn'], ['crayon', 'ill'], ['médaille', 'ail'],
    ['médaille', 'ill'], ['soleil', 'eil'], ['poing', 'oin'], ['pingouin', 'oin'], ['vache', 'ch'],
  ];
  for (const [w, id] of ok) assert.ok(hasSound(word(w), id), `${w} contient [${id}]`);
});

test('compter un son : seulement quand l\'oral et l\'écrit concordent', () => {
  assert.equal(soundCount(word('bonbon'), 'on'), 2);
  assert.equal(soundCount(word('kangourou'), 'ou'), 2);
  assert.equal(soundCount(word('chocolat'), 'o'), 2);
  assert.equal(soundCount(word('cochon'), 'o'), null);       // deux « o » écrits, un seul [o]
  assert.equal(soundCount(word('pingouin'), 'in'), null);    // le [in] de « ouin »
  assert.equal(soundCount(word('lapin'), 'ou'), null);
});

test('écritures repérées et trous', () => {
  assert.deepEqual(findGraphemes('bateau', 'o'), [{ index: 3, text: 'eau' }]);
  assert.deepEqual(gapFor(word('dent'), 'an'), { index: 1, text: 'en' });
  assert.equal(gapFor(word('oiseau'), 'o'), null);   // le « o » de « oi » rendrait le trou ambigu
  assert.equal(gapFor(word('ail'), 'ail'), null);    // le mot entier
  assert.equal(gapFor(word('fille'), 'ill'), null);  // pas de trou pour [ill]
});

test('chaque son du jeu a des bonnes réponses et des distracteurs', () => {
  for (const id of Object.keys(SOUNDS)) {
    assert.ok(WORDS.filter((e) => hasSound(e, id)).length >= 2, `[${id}] : bonnes réponses`);
    assert.ok(WORDS.filter((e) => lacksSound(e, id)).length >= 30, `[${id}] : distracteurs`);
    assert.ok(!/[[\]]/.test(SOUNDS[id].say), `[${id}] : say sans crochets`);
  }
});

test('les mots d\'exemple lus par la voix ne sont pas dans la banque (pas de réponse soufflée)', () => {
  for (const { say } of Object.values(SOUNDS)) {
    const example = say.split('comme dans ')[1];
    assert.equal(findWord(example), null, example);
  }
});

// --- Générateur --------------------------------------------------------------------------------

test('le jeu respecte le contrat', () => {
  checkGameShape(game);
  assert.equal(game.id, 'sons');
  assert.equal(game.island, 'mots');
  assert.equal(game.issue, 22);
});

const byLevel = checkGenerator(game, { draws: 500, minDistinct: 30 });

test('500 tirages par niveau : questions valides et variées', () => {
  for (const [level, questions] of Object.entries(byLevel)) {
    const distinct = new Set(questions.map((q) => q.key)).size;
    assert.ok(distinct >= 60, `niveau ${level} : ${distinct} questions distinctes`);
    const formats = new Set(questions.map((q) => q.key.split(':')[1]));
    assert.deepEqual([...formats].sort(), level === '3' ? ['compte', 'image', 'son', 'trou'] : ['image', 'son', 'trou']);
  }
});

test('une partie mélange les formats et les sons', () => {
  for (const questions of Object.values(byLevel)) {
    const game1 = questions.slice(0, 10);
    assert.ok(new Set(game1.map((q) => q.key.split(':')[1])).size >= 3);
    assert.ok(new Set(game1.map((q) => q.skill)).size >= 3);
  }
});

test('chaque niveau n\'utilise que ses sons', () => {
  const allowed = { 1: ['ou', 'on', 'an', 'oi', 'ch'], 2: ['in', 'eu', 'o'], 3: ['gn', 'ill', 'ail', 'eil', 'oin'] };
  for (const [level, questions] of Object.entries(byLevel)) {
    const ok = Object.entries(allowed).filter(([l]) => l <= level).flatMap(([, ids]) => ids);
    for (const q of questions) assert.ok(ok.includes(q.key.split(':')[2]), q.key);
  }
  // Les sons nouveaux de chaque niveau apparaissent bien.
  for (const level of [2, 3]) {
    const ids = new Set(byLevel[level].map((q) => q.key.split(':')[2]));
    for (const id of allowed[level]) assert.ok(ids.has(id), `niveau ${level} : [${id}]`);
  }
});

test('« Touche l\'image » : un seul mot contient le son, jamais un distracteur', () => {
  for (const [level, questions] of Object.entries(byLevel)) {
    for (const q of questions.filter((x) => x.key.startsWith('sons:image:'))) {
      const id = q.key.split(':')[2];
      const choices = q.display.choices.map(toChoice);
      assert.equal(choices.length, level === '1' ? 3 : 4, q.key);
      assert.equal(new Set(choices.map((c) => c.emoji)).size, choices.length, `${q.key} : émojis`);
      for (const c of choices) {
        const entry = word(c.value);
        assert.equal(c.emoji, entry.emoji);
        if (c.value === q.answer) assert.ok(hasSound(entry, id), `${q.key} : ${c.value}`);
        else assert.ok(lacksSound(entry, id), `${q.key} : le distracteur ${c.value} contient [${id}]`);
      }
    }
  }
});

test('« Quel son entends-tu ? » : le mot ne contient qu\'un des sons proposés', () => {
  for (const questions of Object.values(byLevel)) {
    for (const q of questions.filter((x) => x.key.startsWith('sons:son:'))) {
      const entry = word(q.display.show.text);
      for (const c of q.display.choices) {
        if (c.value === q.answer) assert.ok(hasSound(entry, c.value), q.key);
        else assert.ok(lacksSound(entry, c.value), `${q.key} : [${c.value}] est aussi dans le mot`);
      }
    }
  }
});

test('« Complète le mot » : la bonne écriture redonne le mot, les autres sont d\'autres sons', () => {
  for (const questions of Object.values(byLevel)) {
    for (const q of questions.filter((x) => x.key.startsWith('sons:trou:'))) {
      const [, , id, w] = q.key.split(':');
      const entry = word(w);
      assert.equal(q.display.show.text.replace('___', q.answer), w, q.key);
      assert.equal(q.display.show.text.split('___').length, 2, q.key);
      assert.ok(SOUNDS[id].graphemes.includes(q.answer), q.key);
      assert.equal(q.display.choices.length, 3, q.key);
      for (const c of q.display.choices.filter((x) => x !== q.answer)) {
        // Une mauvaise écriture n'est jamais une autre écriture du même son.
        assert.ok(!SOUNDS[id].graphemes.includes(c), `${q.key} : ${c}`);
        assert.notEqual(q.display.show.text.replace('___', c), w, q.key);
      }
      assert.equal(q.display.show.speak, entry.word);
    }
  }
});

test('« Combien de fois ? » : la réponse est le nombre de fois où l\'on entend le son', () => {
  const questions = byLevel[3].filter((x) => x.key.startsWith('sons:compte:'));
  assert.ok(questions.length > 0);
  for (const q of questions) {
    const [, , id, w] = q.key.split(':');
    assert.equal(q.answer, soundCount(word(w), id), q.key);
  }
  assert.ok(questions.some((q) => q.answer === 2), 'des mots où le son revient');
});

test('textes : consigne, voix, explication et notion', () => {
  for (const questions of Object.values(byLevel)) {
    for (const q of questions) {
      const id = q.key.split(':')[2];
      assert.equal(q.skill, `son [${id}]`);
      assert.ok(q.explain.startsWith('Dans « '), q.key);
      assert.ok(q.explain.includes(`[${id}]`), q.key);
      assert.ok(q.speak && !/[[\]_]/.test(q.speak), `${q.key} : voix « ${q.speak} »`);
      if (q.display.show) assert.ok(findWord(q.display.show.speak), q.key);
    }
  }
});

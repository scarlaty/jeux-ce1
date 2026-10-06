import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOUNDS, EXTRA_SOUNDS, WORDS, getSound, findWord, conflictsOf, blockedSounds,
  wordsWithSound, wordsWithout, wordsOnlyWith,
} from '../../js/data/mots-illustres.js';

const IDS = SOUNDS.map((s) => s.id);
const ALL_IDS = [...IDS, ...EXTRA_SOUNDS.map((s) => s.id)];

// Les lettres qui écrivent chaque son. Sert à relire la banque : un mot marqué « on » doit
// contenir « on » ou « om », et un mot qui contient « on » sans entendre [on] doit figurer
// dans EXCEPTIONS (c'est là que se cachent les pièges : « couronne », « chameau »…).
const SPELLINGS = {
  ou: /ou/,
  on: /on|om/,
  an: /an|am|en|em/,
  oi: /oi|oî/,
  ch: /ch/,
  in: /ain|ein|aim|ien|in|im|ym/,
  eu: /eu|œu/,
  gn: /gn/,
  ill: /ill|euil|ouil/,
  ail: /ail/,
  eil: /eil/,
  eau: /eau|au/,
  yod: /i[aeou]|^y/,   // le [j] écrit sans « ill » : « lion », « chien », « yeux »
};

/** Mots où les lettres du son sont présentes mais où l'on n'entend pas ce son. */
const EXCEPTIONS = {
  on: ['couronne', 'sommeil'],
  an: ['camion', 'chameau', 'chemise', 'chenille', 'chien', 'famille', 'genou', 'grenouille'],
  in: ['ordinateur'],
};

test('chaque son a un identifiant, une étiquette et une forme prononçable', () => {
  assert.deepEqual(IDS, ['ou', 'on', 'an', 'oi', 'ch', 'in', 'eu', 'gn', 'ill', 'ail', 'eil']);
  assert.equal(new Set(ALL_IDS).size, ALL_IDS.length);
  for (const sound of [...SOUNDS, ...EXTRA_SOUNDS]) {
    assert.match(sound.label, /^\[[a-zœ]+\]$/, sound.id);
    assert.match(sound.say, /^[a-zœ]+$/, sound.id);
    assert.equal(getSound(sound.id), sound);
  }
  assert.throws(() => getSound('zz'), RangeError);
});

test('la banque est propre : mots uniques, émojis uniques, sons connus', () => {
  const words = WORDS.map((w) => w.word);
  assert.equal(new Set(words).size, words.length, 'mot en double');
  assert.deepEqual([...words], [...words].sort((a, b) => a.localeCompare(b, 'fr')), 'banque non triée');
  const emojis = WORDS.map((w) => w.emoji).filter(Boolean);
  assert.equal(new Set(emojis).size, emojis.length, 'émoji en double');
  for (const w of WORDS) {
    assert.match(w.word, /^[a-zàâçéèêëîïôûùüœ'-]+$/, `mot mal écrit : ${w.word}`);
    assert.ok(w.sounds.length >= 1, `aucun son noté pour ${w.word}`);
    assert.equal(new Set(w.sounds).size, w.sounds.length, `son en double : ${w.word}`);
    for (const s of w.sounds) assert.ok(ALL_IDS.includes(s), `son inconnu : ${w.word} → ${s}`);
  }
});

test('les sons notés sont bien ceux que les lettres écrivent', () => {
  for (const w of WORDS) {
    for (const sound of w.sounds) {
      if (sound === 'e') continue;   // le « e » discret ne s'écrit pas avec des lettres à part
      assert.match(w.word, SPELLINGS[sound], `${w.word} : son ${sound} annoncé, lettres absentes`);
    }
  }
});

test('aucun son oublié : les lettres présentes sont toutes expliquées', () => {
  for (const [sound, spelling] of Object.entries(SPELLINGS)) {
    for (const w of WORDS) {
      if (w.sounds.includes(sound)) continue;
      // « médaille », « abeille » : le « ill » est déjà pris en compte par [ail] / [eil].
      if (sound === 'ill' && (w.sounds.includes('ail') || w.sounds.includes('eil'))) continue;
      if (!spelling.test(w.word)) continue;
      assert.ok((EXCEPTIONS[sound] || []).includes(w.word),
        `${w.word} contient les lettres de ${sound} : son oublié, ou exception à déclarer`);
    }
  }
});

test('les exceptions déclarées existent et sont utiles', () => {
  for (const [sound, words] of Object.entries(EXCEPTIONS)) {
    for (const word of words) {
      const entry = findWord(word);
      assert.ok(entry, `exception inconnue : ${word}`);
      assert.ok(!entry.sounds.includes(sound), `${word} porte pourtant le son ${sound}`);
      assert.match(word, SPELLINGS[sound], `${word} n'a pas les lettres de ${sound}`);
    }
  }
});

test('chaque son a de quoi faire des questions, avec et sans image', () => {
  for (const id of IDS) {
    assert.ok(wordsWithSound(id).length >= 8, `${id} : ${wordsWithSound(id).length} mots`);
    const images = wordsWithSound(id, { emoji: true });
    assert.ok(images.length >= 3, `${id} : ${images.length} mots illustrés`);
    assert.ok(images.every((w) => w.emoji));
  }
});

test('les sons qui s\'entendent pareil ne peuvent pas servir d\'intrus l\'un pour l\'autre', () => {
  const glide = ['ail', 'eil', 'ill', 'yod'];
  for (const id of glide) assert.deepEqual([...conflictsOf(id)].sort(), glide);
  assert.deepEqual([...conflictsOf('eu')].sort(), ['e', 'eu']);
  assert.deepEqual(conflictsOf('ou'), ['ou']);
  assert.deepEqual([...blockedSounds(['ou', 'ail'])].sort(), ['ail', 'eil', 'ill', 'ou', 'yod']);
});

// « lion » et « chien » s'écrivent sans « ill » mais on y entend le même [j] que dans « fille » :
// les proposer comme mauvaise réponse à une question sur [ill] donnerait deux bonnes réponses.
test('les mots en [j] sans « ill » ne servent jamais d\'intrus aux sons de cette famille', () => {
  for (const word of ['lion', 'chien', 'avion', 'camion', 'yeux']) {
    assert.ok(findWord(word).sounds.includes('yod'), `${word} devrait porter le son yod`);
  }
  for (const id of ['ill', 'ail', 'eil']) {
    const safe = wordsWithout(blockedSounds([id])).map((w) => w.word);
    for (const word of ['lion', 'chien', 'avion', 'camion', 'yeux']) {
      assert.ok(!safe.includes(word), `${word} ne peut pas être intrus de ${id}`);
    }
  }
  // Mais ils restent de bons intrus pour les sons d'une autre famille.
  assert.ok(wordsWithout(blockedSounds(['ou'])).some((w) => w.word === 'lion'));
});

test('un intrus ne contient jamais le son visé ni un son voisin', () => {
  for (const id of IDS) {
    const blocked = blockedSounds([id]);
    const safe = wordsWithout(blocked);
    assert.ok(safe.length >= 40, `${id} : ${safe.length} intrus possibles`);
    for (const w of safe) {
      for (const s of w.sounds) assert.ok(!blocked.has(s), `${w.word} ne peut pas être intrus de ${id}`);
    }
    assert.ok(wordsWithout(blocked, { emoji: true }).every((w) => w.emoji));
    // Aucun mot ne peut être à la fois porteur du son et intrus.
    const bearers = new Set(wordsWithSound(id).map((w) => w.word));
    assert.ok(safe.every((w) => !bearers.has(w.word)));
  }
});

test('wordsOnlyWith borne la banque aux sons autorisés', () => {
  const simple = wordsOnlyWith(['ou', 'on', 'an', 'oi', 'ch', 'e', 'eau']);
  assert.ok(simple.length >= 60, `${simple.length} mots`);
  const late = ['in', 'eu', 'gn', 'ill', 'ail', 'eil'];
  for (const w of simple) assert.ok(!w.sounds.some((s) => late.includes(s)), w.word);
  assert.ok(simple.some((w) => w.word === 'mouton'), 'mouton devrait rester');
  assert.ok(!simple.some((w) => w.word === 'citrouille'), 'citrouille devrait sortir');
  assert.equal(wordsOnlyWith(ALL_IDS).length, WORDS.length);
  // `from` permet d'enchaîner les filtres : « chien » sort de la liste simple ([in]).
  assert.deepEqual(wordsWithSound('ch', { from: simple }).filter((w) => w.word === 'chien'), []);
});

test('les pièges connus sont bien notés', () => {
  const sounds = (word) => [...findWord(word).sounds].sort();
  assert.deepEqual(sounds('oiseau'), ['eau', 'oi']);
  assert.deepEqual(sounds('chien'), ['ch', 'in', 'yod']);
  assert.deepEqual(sounds('montagne'), ['gn', 'on']);
  assert.deepEqual(sounds('feuille'), ['eu', 'ill']);
  assert.deepEqual(sounds('chou'), ['ch', 'ou']);
  assert.deepEqual(sounds('champignon'), ['an', 'ch', 'gn', 'on']);
  assert.deepEqual(sounds('grenouille'), ['e', 'ill', 'ou']);
  assert.deepEqual(sounds('cheval'), ['ch', 'e']);
  assert.deepEqual(sounds('pain'), ['in']);
  assert.deepEqual(sounds('main'), ['in']);
  // Mots écartés de la banque : les lettres y mentent sur le son.
  for (const word of ['banane', 'oignon', 'chouette', 'ville']) {
    assert.equal(findWord(word), null, `${word} ne devrait pas être dans la banque`);
  }
});

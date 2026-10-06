import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SYLLABLE_WORDS, findSyllableWord, endsWithQuietE, isTransparent, onsetSound, cutOf,
} from '../../js/data/syllabes.js';
import { WORDS, findWord } from '../../js/data/mots-illustres.js';

const cut = (word) => cutOf(findSyllableWord(word));

test('chaque découpage réécrit exactement le mot', () => {
  for (const w of SYLLABLE_WORDS) {
    assert.equal(w.syllables.join(''), w.word, w.word);
    for (const s of w.syllables) assert.match(s, /[aeiouyàâéèêëîïôûùœ]/, `${w.word} : « ${s} » sans voyelle`);
  }
});

test('la banque est propre : mots uniques, triés, émojis uniques et cohérents', () => {
  const words = SYLLABLE_WORDS.map((w) => w.word);
  assert.equal(new Set(words).size, words.length, 'mot en double');
  assert.deepEqual(words, [...words].sort((a, b) => a.localeCompare(b, 'fr')));
  // Les émojis ne doivent pas non plus doubler ceux de la banque des sons.
  const emojis = [...SYLLABLE_WORDS.map((w) => w.emoji), ...WORDS.filter((w) => !findSyllableWord(w.word)).map((w) => w.emoji)]
    .filter(Boolean);
  assert.equal(new Set(emojis).size, emojis.length, 'émoji en double');
  for (const w of SYLLABLE_WORDS) {
    const source = findWord(w.word);
    if (source) assert.equal(w.emoji, source.emoji, `${w.word} : même image que dans la banque des sons`);
  }
  assert.ok(SYLLABLE_WORDS.length >= 140, `${SYLLABLE_WORDS.length} mots`);
});

test('aucun découpage discutable : ni consonne double, ni « ill », ni diérèse', () => {
  for (const w of SYLLABLE_WORDS) {
    for (let i = 1; i < w.syllables.length; i++) {
      assert.notEqual(w.syllables[i - 1].at(-1), w.syllables[i][0], `${w.word} : lettre doublée à la coupe`);
    }
    assert.doesNotMatch(w.word, /ill/, `${w.word} : découpage de « ill » variable`);
  }
  for (const word of ['ballon', 'famille', 'lion', 'avion', 'camion', 'poisson']) {
    assert.equal(findSyllableWord(word), null, `${word} ne devrait pas être découpé`);
  }
});

test('la convention des manuels : le e muet de la fin forme une syllabe écrite', () => {
  assert.equal(cut('tomate'), 'to-ma-te');
  assert.equal(cut('voiture'), 'voi-tu-re');
  assert.equal(cut('moustique'), 'mous-ti-que');
  assert.equal(cut('chocolat'), 'cho-co-lat');
  assert.equal(cut('hélicoptère'), 'hé-li-cop-tè-re');
  assert.equal(cut('champignon'), 'cham-pi-gnon');
});

test('endsWithQuietE repère le e qu\'on n\'entend pas, et seulement lui', () => {
  for (const s of ['te', 'che', 'que', 'gne', 're', 'bre', 'ces', 'ne']) assert.ok(endsWithQuietE(s), s);
  for (const s of ['gnée', 'sée', 'fée', 'tue', 'pluie', 'teau', 'lon', 'é', 'veux', 'leil']) {
    assert.ok(!endsWithQuietE(s), s);
  }
});

test('un mot transparent se compte à l\'oreille comme à l\'écrit', () => {
  for (const word of ['lapin', 'chocolat', 'araignée', 'fusée', 'parapluie', 'ordinateur', 'tortue']) {
    assert.ok(isTransparent(findSyllableWord(word)), word);
  }
  for (const word of ['tomate', 'cheval', 'melon', 'poule', 'moustique', 'requin']) {
    assert.ok(!isTransparent(findSyllableWord(word)), word);
  }
});

test('onsetSound : deux syllabes qui commencent pareil à l\'oreille ont le même premier son', () => {
  const same = [['ca', 'ko'], ['ca', 'quet'], ['ci', 'sa'], ['ceau', 'sou'], ['ge', 'jam'], ['gui', 'gant'],
    ['hi', 'a'], ['é', 'or'], ['rhi', 'ro'], ['cha', 'che'], ['phin', 'four']];
  for (const [a, b] of same) assert.equal(onsetSound(a), onsetSound(b), `${a} / ${b}`);
  const different = [['ca', 'ci'], ['ga', 'ge'], ['cha', 'ca'], ['gnon', 'non'], ['pa', 'ba']];
  for (const [a, b] of different) assert.notEqual(onsetSound(a), onsetSound(b), `${a} / ${b}`);
});

test('assez de mots de chaque longueur pour trois niveaux', () => {
  const clear = SYLLABLE_WORDS.filter(isTransparent);
  const bySize = (n, list) => list.filter((w) => w.syllables.length === n).length;
  assert.ok(bySize(1, clear) >= 20);
  assert.ok(bySize(2, clear) >= 40);
  assert.ok(bySize(3, clear) >= 10);
  assert.ok(bySize(4, clear) >= 2);
  assert.ok(SYLLABLE_WORDS.filter((w) => w.emoji && w.syllables.length >= 3).length >= 30);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import game, { POOLS, lookalikes } from '../../js/games/lecture-eclair.js';
import { MOTS_FREQUENTS, HOMOPHONES, sameSound } from '../../js/data/mots-frequents.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';

const draws = () => checkGenerator(game, { draws: 500, minDistinct: 30 });

test('contrat', () => checkGameShape(game));
test('500 tirages par niveau, 30 questions distinctes', draws);

test('une seule bonne réponse : pas de choix identiques ni d\'homophones quand la voix lit', () => {
  const byLevel = draws();
  for (const q of Object.values(byLevel).flat()) {
    const values = q.display.choices.map((c) => c.value);
    assert.equal(new Set(values).size, values.length, q.key);
    assert.ok(values.includes(q.answer), q.key);
    const emojis = q.display.choices.map((c) => c.emoji).filter(Boolean);
    assert.equal(new Set(emojis).size, emojis.length, `émojis en double : ${q.key}`);
    if (q.display.show.speak) {
      for (const a of values) {
        for (const b of values) if (a !== b) assert.ok(!sameSound(a, b), `homophones ${a}/${b} : ${q.key}`);
      }
      assert.ok(!q.prompt.toLowerCase().split(/[^\p{L}]+/u).includes(q.answer), 'la consigne ne donne pas le mot');
    }
  }
});

test('niveaux : nombre de choix et forme', () => {
  const byLevel = draws();
  assert.ok(byLevel[1].every((q) => q.display.choices.length === 3 && !q.display.show.cursive));
  assert.ok(byLevel[2].every((q) => q.display.choices.length === (q.display.show.speak ? 3 : 4)));
  assert.ok(byLevel[2].some((q) => q.display.show.cursive) && byLevel[2].some((q) => q.display.show.speak));
  assert.ok(byLevel[3].every((q) => q.display.choices.length === 4 && q.display.show.flash === 1200 && !q.display.show.speak));
  for (const q of byLevel[3]) {
    const texts = q.display.choices.map((c) => c.text);
    assert.equal(new Set(texts).size, 4, q.key);
    assert.ok(q.display.choices.some((c) => c.value === q.answer && c.text === q.display.show.text), q.key);
  }
});

test('mots fréquents : sans doublon, minuscules, assez nombreux', () => {
  const words = MOTS_FREQUENTS.map((m) => m.word);
  assert.equal(new Set(words).size, words.length);
  assert.ok(words.length >= 60);
  for (const m of MOTS_FREQUENTS) assert.equal(m.word, m.word.normalize('NFC').toLowerCase());
  for (const w of ['avec', 'dans', 'pour', 'toujours', 'beaucoup', 'maintenant', 'parce-que']) assert.ok(words.includes(w), w);
});

test('homophones : « vert / verre / ver » et « dans / dent » vont ensemble', () => {
  assert.ok(sameSound('vert', 'verre') && sameSound('verre', 'ver') && sameSound('dans', 'dent'));
  assert.ok(!sameSound('chat', 'chou'));
  for (const g of HOMOPHONES) assert.ok(g.length >= 2);
});

test('mots voisins : « chat / chou / chaud », jamais le mot lui-même', () => {
  const pool = [{ word: 'chat' }, { word: 'chou' }, { word: 'chaud' }, { word: 'loup' }];
  const near = lookalikes('chat', pool).map((w) => w.word);
  assert.deepEqual(near.slice(0, 2).sort(), ['chaud', 'chou']);
  assert.ok(!near.includes('chat'));
  assert.ok(POOLS[1].length >= 30, `niveau 1 : ${POOLS[1].length} mots`);
  assert.ok(POOLS[3].length >= 30, `niveau 3 : ${POOLS[3].length} mots`);
});

// Mascottes sur les écrans (#89) : le choix de l'expression est pur et ne rend jamais triste.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasMascot, endFace, answerReaction, islandFace, albumFace } from '../js/core/ui/mascot.js';
import { FACES, ONE_SHOTS } from '../js/core/ui/art/kawaii.js';
import { ISLANDS } from '../js/games/registry.js';

test('chaque île de la carte a sa mascotte, pas le défi du jour', () => {
  for (const island of ISLANDS) assert.ok(hasMascot(island.id), island.id);
  assert.equal(hasMascot('defi'), false);
  assert.equal(hasMascot(undefined), false);
  assert.equal(hasMascot('toString'), false);
});

test('fin de partie : très contente à 3 étoiles, contente à 2, encourageante sinon', () => {
  assert.equal(endFace(3), 'joyful');
  assert.equal(endFace(2), 'happy');
  assert.equal(endFace(1), 'cheering');
  assert.equal(endFace(0), 'cheering');
  for (const stars of [0, 1, 2, 3]) assert.ok(FACES.includes(endFace(stars)));
});

test('réaction à une réponse : saut de joie ou encouragement, jamais triste', () => {
  assert.deepEqual(answerReaction(true), { face: 'joyful', motion: 'jump' });
  assert.deepEqual(answerReaction(false), { face: 'cheering', motion: 'wiggle' });
  for (const r of [answerReaction(true), answerReaction(false)]) {
    assert.ok(FACES.includes(r.face));
    assert.ok(ONE_SHOTS.includes(r.motion));
  }
});

test('album : très contente quand la collection de l\'île est complète', () => {
  assert.equal(albumFace(10, 10), 'joyful');
  assert.equal(albumFace(3, 10), 'happy');
  assert.equal(albumFace(0, 10), 'happy');
  assert.equal(albumFace(0, 0), 'happy');
});

test('carte : la mascotte dort tant que son île est fermée', () => {
  assert.equal(islandFace(true), 'happy');
  assert.equal(islandFace(false), 'sleepy');
});

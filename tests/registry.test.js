import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, ISLANDS, loadGame, getIsland } from '../js/games/registry.js';
import { checkGameShape } from './helpers/game-checks.js';

test('identifiants de jeux uniques', () => {
  assert.equal(new Set(GAMES.map((g) => g.id)).size, GAMES.length);
});

test('les métadonnées du registre sont celles du fichier du jeu', async () => {
  for (const entry of GAMES) {
    const game = await loadGame(entry.id);
    checkGameShape(game);
    for (const field of ['id', 'title', 'island', 'subject']) {
      assert.equal(entry[field], game[field], `${entry.id}.${field}`);
    }
    assert.equal(Boolean(entry.demo), Boolean(game.demo), `${entry.id}.demo`);
    assert.ok(getIsland(entry.island));
  }
});

test('cinq îles', () => {
  assert.deepEqual(ISLANDS.map((i) => i.id), ['mots', 'nombres', 'mesures', 'monde', 'ailleurs']);
});


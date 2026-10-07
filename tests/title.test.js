// Titre de la barre du haut (#89) : sa longueur décide de son ajustement sur téléphone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { titleLength } from '../js/core/ui/dom.js';
import { GAMES } from '../js/games/registry.js';

test('courts, moyens, très longs', () => {
  assert.equal(titleLength('Jeux CE1'), 'short');
  assert.equal(titleLength('Mon album'), 'long');
  assert.equal(titleLength('Écrire les nombres'), 'long');
  assert.equal(titleLength('Centaines, dizaines, unités'), 'xlong');
  assert.equal(titleLength('Les lettres qui changent de son'), 'xlong');
});

test('compte les caractères (accents, ligatures), ignore les espaces autour', () => {
  assert.equal(titleLength('  Œufs  '), 'short');
  assert.equal(titleLength('Lettres sœurs'), 'long');
  assert.equal(titleLength(''), 'short');
  assert.equal(titleLength(undefined), 'short');
});

test('tout titre de jeu reçoit une catégorie', () => {
  for (const game of GAMES) assert.ok(['short', 'long', 'xlong'].includes(titleLength(game.title)), game.title);
});

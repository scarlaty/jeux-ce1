// Titre de la barre du haut (#89) : sa longueur décide de son ajustement sur téléphone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { titleLength } from '../js/core/ui/dom.js';
import { GAMES } from '../js/games/registry.js';

test('courts, moyens, très longs', () => {
  assert.equal(titleLength('Jeux CE1'), 'short');
  assert.equal(titleLength('Mon album'), 'long');
  assert.equal(titleLength('Centaines, dizaines, unités'), 'xlong');
  assert.equal(titleLength('Les lettres qui changent de son'), 'xlong');
});

/* Mesuré à 360 px : la boîte du titre fait 82 px (4,88 em). Un mot de plus de 8 caractères y
   dépasse toujours, et `overflow-wrap: break-word` le coupait en plein milieu ; au-delà de 17
   caractères le titre ne tient plus dans les deux lignes et perdait un mot. Les deux cas vont
   en `xlong`, qui donne au titre sa propre ligne, pleine largeur (#115). */
test('un mot trop long prend sa propre ligne plutôt que d’être coupé', () => {
  assert.equal(titleLength('Devinettes'), 'xlong');       // « Devinette / s »
  assert.equal(titleLength('Démonstration'), 'xlong');    // « Démonstr / ation »
  assert.equal(titleLength('Les homophones'), 'xlong');   // « homophones » = 10 caractères
  assert.equal(titleLength('Mon compagnon'), 'xlong');    // « compagnon » = 9

  // Huit caractères tiennent encore : on ne renvoie pas tout le monde à la ligne.
  assert.equal(titleLength('Lettres soeurs'), 'long');
  assert.equal(titleLength('Calcul mental'), 'long');
});

test('un titre trop long dans l’ensemble n’est jamais tronqué en silence', () => {
  assert.equal(titleLength('Colors and numbers'), 'xlong');   // 18 : perdait « numbers »
  assert.equal(titleLength('Syllabes en folie'), 'long');     // 17 : tient en deux lignes
  assert.equal(titleLength('Les règles de vie'), 'long');
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

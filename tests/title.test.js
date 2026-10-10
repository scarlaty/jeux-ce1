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

/* Mesuré à 360 px sur un écran de jeu : la boîte du titre fait **72 px** une fois la pastille de
   profil à 56 px, et le texte y est limité à deux lignes. Deux défauts distincts s'y produisaient,
   qu'aucun seuil sur le nombre de caractères seul ne sépare : « Syllabes en folie » et « Besoins
   du vivant » font tous deux 17 caractères et 3 mots, et un seul tenait. Les deux vont donc en
   `xlong`, qui donne au titre sa propre ligne, pleine largeur (#115). */
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
  // Tous mesurés tronqués dans la boîte de 72 px avant correction.
  assert.equal(titleLength('Colors and numbers'), 'xlong');
  assert.equal(titleLength('Body and animals'), 'xlong');
  assert.equal(titleLength('Besoins du vivant'), 'xlong');
  assert.equal(titleLength('Les règles de vie'), 'xlong');
  assert.equal(titleLength('Syllabes en folie'), 'xlong');

  // Quatorze caractères tiennent en deux lignes.
  assert.equal(titleLength('Lecture éclair'), 'long');
  assert.equal(titleLength('Espace parents'), 'long');
});

/* Garde-fou de non-régression : la branche a bien failli faire PIRE que l'état précédent, en
   élargissant la pastille de profil (donc en rétrécissant la boîte du titre) sans rebaisser le
   seuil. Aucun titre du produit ne doit être classé `long` au-delà des bornes mesurées. */
test('aucun titre du produit ne dépasse les bornes mesurées quand il reste « long »', () => {
  const titres = [...GAMES.map((g) => g.title), 'Mon album', 'Mon compagnon', 'Espace parents', 'Défi du jour'];
  for (const titre of titres) {
    if (titleLength(titre) !== 'long') continue;
    const mots = titre.split(/\s+/);
    assert.ok([...titre].length <= 14, `${titre} : ${[...titre].length} caractères en « long »`);
    for (const mot of mots) assert.ok([...mot].length <= 8, `${titre} : le mot « ${mot} » dépasse 8 caractères`);
  }
});

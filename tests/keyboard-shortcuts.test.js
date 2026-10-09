// Un raccourci posé sur `document` ne doit pas voler Entrée à un bouton qui a le focus (#113) :
// `preventDefault` sur keydown annule le clic synthétisé, et la touche visée ne s'active jamais.
//
// La décision vit dans des fonctions PURES (`keyAction`, `dropKey`) et non dans une garde écrite
// au milieu du gestionnaire : une revue a montré qu'une telle garde pouvait être déplacée après
// `preventDefault` — texte identique, effet nul — sans qu'aucun test ne bronche.
import test from 'node:test';
import assert from 'node:assert/strict';
import { keyAction, dropKey, onControl, CONTROLS } from '../js/core/ui/dom.js';

// Faux élément : `closest` répond comme le DOM, sans jsdom (le projet n'a aucune dépendance).
const control = { closest: (sel) => (sel === CONTROLS ? control : null) };
const plain = { closest: () => null };
const ev = (key, target = plain, extra = {}) => ({ key, target, ...extra });

test('Entrée sur une touche du composant n\'est pas détournée', () => {
  assert.equal(keyAction(ev('Enter', control), { empty: false }), 'ignore');
  assert.equal(onControl(ev('Enter', control)), true);
});

test('Entrée valide quand aucune commande n\'a le focus', () => {
  assert.equal(keyAction(ev('Enter', plain), { empty: false }), 'validate');
});

test('Entrée ne valide jamais une saisie vide', () => {
  assert.equal(keyAction(ev('Enter', plain), { empty: true }), 'ignore');
  assert.equal(keyAction(ev('Enter', control), { empty: true }), 'ignore');
});

test('un composant verrouillé ou un raccourci système ne déclenche rien', () => {
  assert.equal(keyAction(ev('Enter', plain), { empty: false, locked: true }), 'ignore');
  for (const mod of ['altKey', 'ctrlKey', 'metaKey']) {
    assert.equal(keyAction(ev('5', plain, { [mod]: true }), { empty: false }), 'ignore', mod);
  }
});

test('Retour arrière efface, le reste est de la saisie', () => {
  assert.equal(keyAction(ev('Backspace', plain), { empty: false }), 'erase');
  assert.equal(keyAction(ev('7', plain), { empty: true }), 'input');
  assert.equal(keyAction(ev('é', plain), { empty: false }), 'input');
});

/* La zone de dépôt du glisser-déposer : elle ne doit répondre que pour elle-même. Si elle répond
   pour un jeton, son `preventDefault` tue la sélection et cinq jeux redeviennent injouables. */
test('la zone de dépôt ignore une touche venue d\'un jeton', () => {
  const zone = {};
  assert.equal(dropKey({ key: 'Enter', target: zone, currentTarget: zone }), true);
  assert.equal(dropKey({ key: ' ', target: zone, currentTarget: zone }), true);
  assert.equal(dropKey({ key: 'Enter', target: {}, currentTarget: zone }), false);
  assert.equal(dropKey({ key: 'a', target: zone, currentTarget: zone }), false);
  assert.equal(dropKey(null), false);
});

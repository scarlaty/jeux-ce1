// Un raccourci posé sur `document` ne doit pas voler Entrée à un bouton qui a le focus (#113) :
// `preventDefault` sur keydown annule le clic synthétisé, et la touche visée ne s'active jamais.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onControl, CONTROLS } from '../js/core/ui/dom.js';

// Faux élément : `closest` répond comme le DOM, sans jsdom (le projet n'a aucune dépendance).
const el = (matches) => ({ closest: (sel) => (sel === CONTROLS && matches ? el(true) : null) });

test('onControl reconnaît une commande focalisée', () => {
  assert.equal(onControl({ target: el(true) }), true);
});

test('onControl laisse passer le reste', () => {
  assert.equal(onControl({ target: el(false) }), false);
  assert.equal(onControl({ target: null }), false);
  assert.equal(onControl({}), false);
  assert.equal(onControl(null), false);
});

// Garde-fou de régression : les trois composants qui écoutent au-dessus de leurs boutons doivent
// tous renoncer quand la touche vient d'une commande. Sans cela, cinq jeux redeviennent injouables.
test('les composants à raccourci clavier gardent leur garde-fou', () => {
  for (const file of ['keypad', 'letters']) {
    const src = readFileSync(new URL(`../js/core/ui/${file}.js`, import.meta.url), 'utf8');
    assert.match(src, /if \(onControl\(e\)\) return;/,
      `${file}.js doit renoncer à Entrée quand une commande a le focus`);
  }
  const drag = readFileSync(new URL('../js/core/ui/drag.js', import.meta.url), 'utf8');
  assert.match(drag, /if \(e\.target !== e\.currentTarget\) return;/,
    'drag.js : la zone ne doit traiter la touche que pour elle-même');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath, matchRoute } from '../js/core/router.js';
import { SCREENS } from '../js/screens/index.js';

test('normalisation du hash', () => {
  assert.equal(normalizePath(''), '/');
  assert.equal(normalizePath('#'), '/');
  assert.equal(normalizePath('#/'), '/');
  assert.equal(normalizePath('#/jeu/demo/'), '/jeu/demo');
  assert.equal(normalizePath('#jeu/demo'), '/jeu/demo');
  assert.equal(normalizePath('#/jeu/d%C3%A9mo'), '/jeu/démo');
  assert.equal(normalizePath('#/jeu/%E0'), '/jeu/%E0');
});

test('correspondance des routes et paramètres', () => {
  const routes = [{ path: '/' }, { path: '/jeu/:id' }, { path: '/album' }];
  assert.equal(matchRoute(routes, '/').route.path, '/');
  assert.deepEqual(matchRoute(routes, '/jeu/sons').params, { id: 'sons' });
  assert.equal(matchRoute(routes, '/jeu'), null);
  assert.equal(matchRoute(routes, '/jeu/a/b'), null);
  assert.equal(matchRoute(routes, '/album').route.path, '/album');
});

test('les écrans prévus sont routés', () => {
  for (const path of ['/', '/jeu/demo', '/album', '/parents', '/profil']) {
    assert.ok(matchRoute(SCREENS, path), path);
  }
});

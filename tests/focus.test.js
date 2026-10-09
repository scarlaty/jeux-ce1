// Le focus clavier ne doit jamais retomber sur <body> (#113) : il le faisait dix fois par partie
// (chaque question), à chaque mot rangé, à chaque pièce retirée et à l'ouverture du coffre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// `dom.js` lit `document` : on le simule, le projet n'a aucune dépendance (pas de jsdom).
const body = { tag: 'body' };
function fakeDoc(active, contains = () => false) {
  return { activeElement: active, body, contains };
}
const node = (opts = {}) => ({
  focused: false,
  attrs: new Set(opts.attrs || []),
  contains: opts.contains || (() => false),
  hasAttribute(n) { return this.attrs.has(n); },
  setAttribute(n) { this.attrs.add(n); },
  matches(sel) { return Boolean(opts.matches) && sel.includes('button'); },
  focus() { this.focused = true; },
});

globalThis.document = fakeDoc(body);
const { keepFocus, focusedWithin, focusKeeper } = await import('../js/core/ui/dom.js');

test('focusedWithin ne voit rien quand le focus est sur <body>', () => {
  globalThis.document = fakeDoc(body);
  assert.equal(focusedWithin({ contains: () => true }), false);
  assert.equal(focusedWithin(null), false);
});

test('focusedWithin reconnaît un focus posé dans le composant', () => {
  const inside = { tag: 'button' };
  globalThis.document = fakeDoc(inside);
  assert.equal(focusedWithin({ contains: (el) => el === inside }), true);
  assert.equal(focusedWithin({ contains: () => false }), false);
});

test('keepFocus ne rend le focus que lorsqu\'il a été perdu', () => {
  globalThis.document = fakeDoc(body);
  const cible = node({ matches: true });
  keepFocus(cible);
  assert.equal(cible.focused, true, 'le focus perdu doit être rendu');

  // Au doigt et à la souris, quelque chose garde le focus : on n'y touche pas.
  globalThis.document = fakeDoc({ tag: 'autre' });
  const autre = node({ matches: true });
  keepFocus(autre);
  assert.equal(autre.focused, false, 'le focus de l\'utilisateur ne doit jamais être volé');
});

test('keepFocus rend focalisable un élément qui ne l\'est pas', () => {
  globalThis.document = fakeDoc(body);
  const texte = node();
  keepFocus(texte);
  assert.ok(texte.hasAttribute('tabindex'), 'un paragraphe doit recevoir tabindex="-1"');
  assert.equal(texte.focused, true);
});

/* Chrome garde un bouton `disabled` comme activeElement : mesuré en jouant une question
   « remettre dans l'ordre » au clavier, le focus restait sur le jeton masqué qu'on venait de
   poser. Pour l'enfant qui tabule, c'est aussi perdu que <body>. */
test('un élément désactivé ou détaché compte comme un focus perdu', () => {
  for (const mort of [{ tag: 'b', disabled: true }, { tag: 'b', isConnected: false }]) {
    globalThis.document = fakeDoc(mort);
    const cible = node({ matches: true });
    keepFocus(cible);
    assert.equal(cible.focused, true, `focus à rendre : ${JSON.stringify(mort)}`);
  }
});

/* `focusKeeper` porte ENSEMBLE le relevé et la garde : un composant ne peut plus « oublier » la
   condition, ce qui était le cas quand chacun écrivait son propre `if (hadFocus)`. Une revue a
   montré qu'en retirant cette garde, le vol de focus au doigt revenait sans faire rougir un test. */
test("focusKeeper ne rend rien si le focus n'était pas dans le composant", () => {
  globalThis.document = fakeDoc(body);
  const restore = focusKeeper({ contains: () => false });
  const cible = node({ matches: true });
  assert.equal(restore(cible), false, 'aucun focus ne doit être posé');
  assert.equal(cible.focused, false);
});

test("focusKeeper rend le focus quand il venait du composant et vient d'être perdu", () => {
  const dedans = { tag: 'button' };
  globalThis.document = fakeDoc(dedans, () => true);
  const restore = focusKeeper({ contains: (el) => el === dedans });
  // La mutation a eu lieu : l'élément focalisé est désormais détaché.
  globalThis.document = fakeDoc({ tag: 'button', isConnected: false });
  const cible = node({ matches: true });
  assert.equal(restore(cible), true);
  assert.equal(cible.focused, true);
});

test('focusKeeper accepte une cible calculée après la mutation', () => {
  const dedans = { tag: 'button' };
  globalThis.document = fakeDoc(dedans, () => true);
  const restore = focusKeeper({ contains: (el) => el === dedans });
  globalThis.document = fakeDoc(body);
  const cible = node({ matches: true });
  let appels = 0;
  restore(() => { appels += 1; return cible; });
  assert.equal(appels, 1, 'la cible doit être choisie APRÈS la mutation');
  assert.equal(cible.focused, true);
});

test('keepFocus refuse une cible désactivée', () => {
  globalThis.document = fakeDoc(body);
  const eteint = node({ matches: true });
  eteint.disabled = true;
  keepFocus(eteint);
  assert.equal(eteint.focused, false, "un bouton désactivé n'accepte pas le focus");
});

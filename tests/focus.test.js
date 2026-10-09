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
const { keepFocus, focusedWithin } = await import('../js/core/ui/dom.js');

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

/* Garde-fou de régression : les quatre endroits qui retiraient ou désactivaient l'élément focalisé
   doivent passer par ce geste. Sans cela, le défaut revient sans qu'aucun test ne bronche. */
test('les quatre points de perte de focus sont couverts', () => {
  const sources = {
    'js/screens/play.js': 'changement de question',
    'js/core/ui/order.js': 'mot rangé',
    'js/core/ui/amount.js': 'pièce retirée',
    'js/core/ui/chest.js': 'ouverture du coffre',
  };
  for (const [file, quoi] of Object.entries(sources)) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(src, /keepFocus\(/, `${file} (${quoi}) doit rendre le focus`);
  }
});

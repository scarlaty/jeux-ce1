// Un choix qui est une phrase entière était écrasé dans deux colonnes de 158 px à 360 px : trois
// choix de 46 à 61 caractères donnaient jusqu'à sept lignes de deux ou trois mots. Rien ne
// débordait, rien n'était tronqué — donc aucun test ne pouvait s'en apercevoir (#115, piège du
// § 4 de la grille visuelle). La grille passe à une seule colonne au-delà de LONG_CHOICE.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LONG_CHOICE, hasLongChoice, choiceListClass } from '../js/core/ui/choice.js';
import { toChoice } from '../js/core/validate.js';
import { GAMES } from '../js/games/registry.js';
import { createRng } from '../js/core/random.js';

test('hasLongChoice ne se déclenche que sur une vraie phrase', () => {
  assert.equal(hasLongChoice([{ text: 'Oui' }, { text: 'Non' }]), false);
  assert.equal(hasLongChoice([{ text: 'a'.repeat(LONG_CHOICE) }]), false, 'le seuil est exclusif');
  assert.equal(hasLongChoice([{ text: 'a'.repeat(LONG_CHOICE + 1) }]), true);
  assert.equal(hasLongChoice([{ text: 'court' }, { text: 'Pour que tout le monde ait sa chance de jouer.' }]), true);
  // Entrées hostiles : un choix illustré n'a pas de texte.
  assert.equal(hasLongChoice([]), false);
  assert.equal(hasLongChoice([null, { emoji: 'souris' }, { text: null }]), false);
  assert.equal(hasLongChoice(), false);
  assert.equal(hasLongChoice(null), false);
});

/* La classe doit être POSÉE, pas seulement calculable : une revue a retiré `choices--long` de la
   liste des classes sans faire rougir un seul test, parce que celui-ci cherchait un appel dans le
   texte du source. Il vérifie désormais ce que la fonction rend. */
test('une phrase reçoit sa colonne unique, et rien d’autre ne la reçoit', () => {
  const classes = (opts) => choiceListClass(opts).split(' ');
  assert.ok(classes({ long: true }).includes('choices--long'));
  assert.ok(!classes({}).includes('choices--long'));

  // Une grille déjà commandée par autre chose ne bascule pas.
  assert.ok(!classes({ long: true, withImages: true }).includes('choices--long'), 'choix illustrés');
  assert.ok(!classes({ long: true, row: true }).includes('choices--long'), 'signes < = > sur une ligne');

  // Les autres classes gardent leur comportement.
  assert.deepEqual(classes({}), ['choices']);
  assert.ok(classes({ many: true }).includes('choices--many'));
  assert.ok(classes({ large: true }).includes('choices--large'));
  assert.ok(classes({ withImages: true }).includes('choices--images'));
});

/* Le seuil doit correspondre à quelque chose de réel : s'il ne se déclenche jamais, la règle est
   morte et le défaut revient sans bruit. Les choix passent par `toChoice`, comme en production :
   28 couples jeu/niveau fournissent des chaînes nues, qu'une mesure sur les choix bruts rate. */
test('la règle vise de vraies questions du jeu', async () => {
  const touched = new Map();
  for (const entry of GAMES) {
    const game = (await import(`../js/games/${entry.id}.js`)).default;
    for (const level of [1, 2, 3]) {
      let count = 0;
      for (let i = 0; i < 120; i += 1) {
        const question = game.makeQuestion(level, createRng(i + 1), new Set());
        const choices = question.display && question.display.choices;
        if (question.type !== 'choice' || !choices) continue;
        if (hasLongChoice(choices.map(toChoice))) count += 1;
      }
      if (count) touched.set(`${entry.id}:${level}`, count);
    }
  }
  assert.ok(touched.size >= 4, `la règle ne vise rien : ${[...touched.keys()].join(', ')}`);
  assert.ok(touched.has('regles-de-vie:2'), 'le cas mesuré par l’audit doit être couvert');
  // Les choix de « La phrase » (28 à 35 caractères) restent sur deux colonnes : mesuré, la colonne
  // unique y allongeait la page de 108 px sans rendre le choix plus lisible.
  assert.ok(!touched.has('phrase:2'), 'un choix moyen ne doit pas basculer');
});

test('la classe existe et donne bien une seule colonne', () => {
  const css = readFileSync(new URL('../css/components.css', import.meta.url), 'utf8');
  const rule = css.match(/\.choices--long \{[^}]*\}/);
  assert.ok(rule, 'règle .choices--long introuvable');
  assert.match(rule[0], /grid-template-columns:\s*1fr/);
});

// Un choix qui est une phrase entière était écrasé dans deux colonnes de 158 px à 360 px : trois
// choix de 46 à 61 caractères donnaient cinq lignes de deux ou trois mots. Rien ne débordait, rien
// n'était tronqué — donc aucun test ne pouvait s'en apercevoir (#115, piège du § 4 de la grille
// visuelle). La grille passe désormais à une seule colonne au-delà de LONG_CHOICE caractères.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LONG_CHOICE, hasLongChoice } from '../js/core/ui/choice.js';
import { GAMES } from '../js/games/registry.js';
import { createRng } from '../js/core/random.js';

test('hasLongChoice ne se déclenche que sur une vraie phrase', () => {
  assert.equal(hasLongChoice([{ text: 'Oui' }, { text: 'Non' }]), false);
  assert.equal(hasLongChoice([{ text: 'a'.repeat(LONG_CHOICE) }]), false, 'le seuil est exclusif');
  assert.equal(hasLongChoice([{ text: 'a'.repeat(LONG_CHOICE + 1) }]), true);
  assert.equal(hasLongChoice([{ text: 'court' }, { text: 'Pour que tout le monde ait sa chance de jouer.' }]), true);
  // Entrées hostiles : un choix illustré n'a pas de texte.
  assert.equal(hasLongChoice([]), false);
  assert.equal(hasLongChoice([null, { emoji: '🐭' }, { text: null }]), false);
  assert.equal(hasLongChoice(), false);
});

/* Le seuil doit correspondre à quelque chose de réel : s'il ne se déclenche jamais, la règle est
   morte et le défaut revient sans bruit. Mesuré : quatre jeux posent des choix-phrases. */
test('la règle vise de vraies questions du jeu', async () => {
  const touched = new Map();
  for (const entry of GAMES) {
    const game = (await import(`../js/games/${entry.id}.js`)).default;
    for (const level of [1, 2, 3]) {
      let count = 0;
      for (let i = 0; i < 120; i += 1) {
        let question;
        try { question = game.makeQuestion(level, createRng(i + 1), new Set()); } catch { continue; }
        const choices = question.display && question.display.choices;
        if (question.type !== 'choice' || !choices) continue;
        if (hasLongChoice(choices)) count += 1;
      }
      if (count) touched.set(`${entry.id}:${level}`, count);
    }
  }
  assert.ok(touched.size >= 4, `la règle ne vise rien : ${[...touched.keys()].join(', ')}`);
  assert.ok(touched.has('regles-de-vie:2'), 'le cas mesuré par l’audit doit être couvert');
});

test('la classe existe et donne bien une seule colonne', () => {
  const css = readFileSync(new URL('../css/components.css', import.meta.url), 'utf8');
  const rule = css.match(/\.choices--long \{[^}]*\}/);
  assert.ok(rule, 'règle .choices--long introuvable');
  assert.match(rule[0], /grid-template-columns:\s*1fr/);

  const source = readFileSync(new URL('../js/core/ui/choice.js', import.meta.url), 'utf8');
  assert.match(source, /hasLongChoice\(choices\)/, 'le composant doit poser la classe');
});

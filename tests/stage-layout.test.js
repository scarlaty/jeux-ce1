// Garde-fous de mise en page de l'écran de question (issue #87), sans navigateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/components.css', import.meta.url), 'utf8');

/** Le corps de la première règle dont le sélecteur est exactement `selector`. */
function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `règle ${selector} introuvable`);
  return match[1];
}

test('la colonne de .stage ne dépasse jamais la page (pas de défilement horizontal, #87)', () => {
  // Une colonne « auto » prend la largeur minimale de ses réponses : deux choix de calculs
  // (185 px chacun) la rendaient plus large que l'écran d'un téléphone.
  assert.match(ruleBody('.stage'), /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

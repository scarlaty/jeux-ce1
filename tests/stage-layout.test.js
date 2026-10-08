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

test('le tampon « Bien joué ! » ne crée jamais de défilement horizontal sur téléphone (08/10)', () => {
  // Il apparaissait agrandi 1,8 fois et en taille fixe : 400 px de large sur un écran de 360 px.
  assert.match(ruleBody('.stage'), /overflow-x:\s*clip/);
  assert.match(ruleBody('.stamp--ok'), /font-size:\s*min\(.*\d+vw\)/);
  const from = css.match(/@keyframes stamp-in\s*\{\s*from\s*\{[^}]*scale\(([\d.]+)\)/);
  assert.ok(from, 'animation stamp-in introuvable');
  assert.ok(Number(from[1]) <= 1.3, `le tampon part de ×${from[1]} : trop grand pour un téléphone`);
});

test('le titre de fin (.stamp--static) ne crée pas de défilement horizontal pendant son animation', () => {
  const from = css.match(/@keyframes stamp-static-in\s*\{\s*from\s*\{[^}]*scale\(([\d.]+)\)/);
  assert.ok(from, 'animation stamp-static-in introuvable');
  assert.ok(Number(from[1]) <= 1.25, `le titre part de ×${from[1]}`);
  assert.match(ruleBody('.end__title'), /font-size:\s*min\(.*\d+vw\)/);
});

test('la colonne des réponses (.answer) ne grandit pas avec son contenu (08/10)', () => {
  // Une grille de 7 mots (« Le verbe et son sujet ») faisait 379 px dans une zone de 359 px :
  // la colonne « auto » de .answer prenait la largeur minimale de ses choix.
  assert.match(ruleBody('.answer'), /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

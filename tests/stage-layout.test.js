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

/* La pastille ✓/✗ est en `position: absolute` : son hôte doit être `position: relative`, sinon elle
   remonte au coin de la zone de jeu. `.amount__total` était le seul oublié, et le juste/faux du type
   « amount » n'était plus porté que par la couleur — ce que le projet interdit (#113). */
test('chaque hôte de pastille ✓/✗ est un repère de positionnement', () => {
  for (const selector of ['.answer-field', '.choice', '.token', '.order-slot', '.amount__total']) {
    const body = ruleBody(selector);
    assert.match(body, /position:\s*relative/, `${selector} doit être position: relative`);
  }
});

/* La pastille du total du type « amount » est dans le FLUX : en absolu elle mordait sur le montant
   (400 px² de recouvrement à toutes les largeurs), et le juste/faux redevenait une affaire de
   couleur. C'est un invariant de règle, pas une décision de code : le lire ici suffit (#113). */
test('la pastille du total reste dans le flux', () => {
  assert.match(ruleBody('.amount__total .badge'), /position:\s*static/);
});

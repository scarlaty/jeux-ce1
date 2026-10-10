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

/* Trois corrections de #115 ne tenaient à rien : une revue les a toutes annulées sans faire
   rougir un seul test. Ce sont des invariants de règle et d'ordre, pas des décisions de code :
   les lire ici suffit, et c'est le patron déjà employé pour #87 et #113. */
test('l’explication après une erreur garde la taille de la consigne', () => {
  // 1,2rem donnait 19,2 px sur tablette : le seul texte de l'écran de jeu sous les 22 px exigés,
  // et c'est celui que l'enfant doit lire après s'être trompé.
  assert.match(ruleBody('.bubble__explain'), /font-size:\s*var\(--text-prompt\)/);
});

test('la pastille de profil reste touchable sur téléphone', () => {
  const css = readFileSync(new URL('../css/profile.css', import.meta.url), 'utf8');
  const debut = css.indexOf('@media (max-width: 420px)');
  assert.ok(debut > 0, 'media query de la pastille introuvable');
  const bloc = css.slice(debut, css.indexOf(String.fromCharCode(10) + '}', debut));
  const regle = bloc.slice(bloc.indexOf('.profile-pill {'));
  assert.ok(regle.startsWith('.profile-pill {'), 'règle .profile-pill introuvable');
  assert.ok(regle.slice(0, regle.indexOf('}')).includes('min-width: var(--tap)'),
    'la pastille doit garder une largeur touchable');
});

test('la carte au trésor passe avant les tuiles de récompense', () => {
  const home = readFileSync(new URL('../js/screens/home.js', import.meta.url), 'utf8');
  // On ne lit que le corps du rendu : les définitions de `rewardBar` et `dailyCard` le précèdent.
  const rendu = home.slice(home.indexOf('view.append('));
  const carte = rendu.indexOf("class: 'map-page'");
  const defi = rendu.indexOf('dailyCard(');
  const grade = rendu.indexOf('rewardBar(');
  assert.ok(carte > 0 && defi > 0 && grade > 0, 'blocs de l’accueil introuvables');
  // Aucune île n'était visible sans défiler : les trois tuiles occupaient toute la hauteur.
  assert.ok(carte < grade, 'la carte doit venir avant le bandeau de grade');
  // Le défi est le seul point d'entrée vers #/defi : il reste juste sous la carte.
  assert.ok(defi < grade, 'le défi du jour doit rester au-dessus des autres tuiles');
});

// Vérifications communes à tous les générateurs de jeux (voir CLAUDE.md, « Contrat d'un jeu »).
// Usage dans tests/games/<id>.test.js :
//   import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
//   checkGameShape(game);  checkGenerator(game, { draws: 500, minDistinct: 30 });
import assert from 'node:assert/strict';
import { createRng } from '../../js/core/random.js';
import { validateQuestion } from '../../js/core/validate.js';
import { buildQuestions, renderFingerprint, QUESTIONS_PER_GAME } from '../../js/core/engine.js';

const ISLANDS = ['mots', 'nombres', 'mesures', 'monde', 'ailleurs'];

export function checkGameShape(game) {
  assert.match(game.id, /^[a-z0-9-]+$/);
  assert.ok(game.title, 'title');
  assert.ok(ISLANDS.includes(game.island), `île inconnue : ${game.island}`);
  assert.equal(game.levels.length, 3, 'exactement 3 niveaux');
  for (const l of game.levels) assert.ok(l.label, 'libellé de niveau');
  assert.equal(typeof game.makeQuestion, 'function');
}

// Nombre de parties simulées (graines déterministes) pour traquer un doublon d'écran rare :
// le bug de l'issue #92 (deux pastilles entendues différentes, écran strictement identique)
// n'apparaissait que dans ~1,7 % des parties. Avec 200 parties par niveau, il est débusqué dès
// la partie 62 pour la graine utilisée ici : une régression ne peut pas se glisser en silence.
const RENDER_PARTIES = 200;

/**
 * Tire `draws` questions par niveau (en simulant des parties, `seen` compris) et vérifie
 * chacune avec validateQuestion. Vérifie aussi, sur `RENDER_PARTIES` parties, que deux questions
 * d'UNE MÊME partie ne se ressemblent jamais à l'écran (voir `renderFingerprint`, issue #92) :
 * un générateur trop pauvre pour varier le rendu sur une partie entière doit être corrigé, pas
 * contourné. Renvoie, par niveau, les questions tirées (les `draws` premières).
 */
export function checkGenerator(game, { draws = 500, minDistinct = 30, checks } = {}) {
  const byLevel = {};
  const renderTarget = Math.max(draws, RENDER_PARTIES * QUESTIONS_PER_GAME);
  for (let level = 1; level <= game.levels.length; level++) {
    const rng = createRng(1000 + level);
    const questions = [];
    let checked = 0;
    while (checked < renderTarget) {
      const partie = buildQuestions(game, level, rng, QUESTIONS_PER_GAME);
      const renders = partie.map(renderFingerprint);
      assert.equal(new Set(renders).size, renders.length,
        `niveau ${level} : deux questions d'une même partie se ressemblent à l'écran parmi `
        + `${partie.map((q) => q.key).join(', ')}`);
      checked += partie.length;
      if (questions.length < draws) questions.push(...partie);
    }
    for (const q of questions) {
      const errors = validateQuestion(q, { checks });
      assert.deepEqual(errors, [], `niveau ${level}, ${q.key} : ${errors.join(' ; ')}`);
    }
    const distinct = new Set(questions.map((q) => q.key)).size;
    assert.ok(distinct >= minDistinct, `niveau ${level} : ${distinct} questions distinctes < ${minDistinct}`);
    byLevel[level] = questions;
  }
  return byLevel;
}

/**
 * Émojis écartés après vérification à l'écran : une enfant de 7 ans hésite à les nommer (issues #93, #106).
 * Une fois jugé illisible, un émoji ne revient dans AUCUN jeu. Comparés sans le sélecteur de variante U+FE0F.
 */
export const EMOJIS_ECARTES = ['🌬️', '⚖️', '💐', '🐔', '🧄', '🧈', '🍈'];
const bare = (e) => String(e).replace(/️/g, '');

/**
 * Affirmations fausses dans le monde réel, relevées par le juge pédagogie sur les devinettes (#97/#106) :
 * [chose, propriété] = on ne doit jamais dire « la chose n'est pas <propriété> » ni l'utiliser comme intrus
 * de cette propriété. Les choses multicolores le sont pour TOUTES les couleurs.
 */
const COULEURS = ['jaune', 'rouge', 'orange', 'vert', 'rose', 'marron', 'gris', 'blanc', 'noir', 'bleu', 'violet'];
export const AFFIRMATIONS_FAUSSES = [
  ['ours', 'blanc'], ['ours', 'gris'], ['chocolat', 'blanc'], ['chocolat', 'noir'],
  ...['bonbon', 'cuillère', 'chapeau', 'poisson', 'oiseau', 'serpent', 'couronne', 'ballon', 'chaussette', 'gant'].flatMap(
    (w) => COULEURS.map((c) => [w, c])),
  ['cerise', 'noir'], ['requin', 'blanc'], ['raisin', 'blanc'], ['raisin', 'noir'], ['mouton', 'noir'], ['lapin', 'noir'],
  ['chèvre', 'noir'], ['cochon', 'blanc'], ['cochon', 'noir'], ['cochon', 'marron'], ['hibou', 'blanc'], ['feu', 'vert'],
  ['avion', 'roues'], ['coccinelle', 'rond'], ['panda', 'rond'], ['abeille', 'rond'], ['kiwi', 'poils'], ['pêche', 'poils'],
  ['écureuil', 'bonds'], ['chien', 'bonds'], ['raisin', 'acide'], ['serpent', 'foret'],
  ['cheval', 'passagers'], ['chameau', 'passagers'], ['éléphant', 'passagers'], ['œuf', 'epluche'],
  ['moto', 'transporte'], ['vélo', 'transporte'],
  // Relevé du juge sur #108 : quatre familles revenues avec la règle « exclusif par défaut ».
  ['oiseau', 'aliment'],                                        // poulet, canard, dinde se mangent
  ['chocolat', 'boulangerie'], ['bonbon', 'boulangerie'], ['banane', 'boulangerie'],  // boulangerie-pâtisserie
  ['gâteau', 'vert'],                                           // pistache, glaçage d'anniversaire
  ['lion', 'blanc'],                                            // les lions blancs des zoos et des albums
  // « minuscule » est graduel : il est devenu un indice `ouvert`, ces trois phrases ne peuvent plus sortir.
  ['écureuil', 'minuscule'], ['cerise', 'minuscule'], ['chien', 'minuscule'],
];

/** Tous les émojis affichés par une question (choix, éléments à ranger, illustration). */
function emojisOf(q) {
  const d = q.display || {};
  const items = [...(d.choices || []), ...(d.items || []), ...(d.targets || [])];
  return [d.show && d.show.emoji, ...items.map((i) => i && i.emoji)].filter(Boolean);
}

/** Aucune question ne montre un émoji écarté. */
export function checkEmojis(questions, banned = EMOJIS_ECARTES) {
  const out = new Set(banned.map(bare));
  for (const q of questions) {
    for (const e of emojisOf(q)) assert.ok(!out.has(bare(e)), `émoji écarté ${e} dans ${q.key}`);
  }
}

/**
 * Mesure la NÉCESSITÉ des indices d'une devinette (issue #97) : le générateur vérifie qu'une seule chose
 * satisfait tous les indices, jamais qu'il les faille tous. Pour chaque question :
 *  - `constraintsOf(q)` : la liste des indices ; `choicesOf(q)` : les choix affichés ;
 *  - `couldHold(choice, indice)` : le choix PEUT-IL vérifier l'indice (au sens large : doute = oui) ;
 *  - `isAnswer(choice, q)`.
 * Renvoie des parts (0 à 1) : `single` (un seul indice suffit à désigner la réponse parmi les choix),
 * `eachSuffices` (chaque indice suffit séparément), `dispensable` (au moins un indice peut être retiré sans
 * rendre la réponse ambiguë), `lureNoShare` (intrus ne vérifiant AUCUN indice) et `lureMissesOne`
 * (intrus qui vérifient tous les indices sauf un).
 */
export function measureClues(questions, { constraintsOf, choicesOf, couldHold, isAnswer }) {
  const n = { single: 0, each: 0, dispensable: 0, lures: 0, noShare: 0, missOne: 0 };
  for (const q of questions) {
    const cons = constraintsOf(q);
    const lures = choicesOf(q).filter((c) => !isAnswer(c, q));
    const solvedBy = (subset) => !lures.some((l) => subset.every((c) => couldHold(l, c)));
    const alone = cons.map((c) => solvedBy([c]));
    if (alone.some(Boolean)) n.single++;
    if (alone.every(Boolean)) n.each++;
    if (cons.some((c) => solvedBy(cons.filter((o) => o !== c)))) n.dispensable++;
    for (const l of lures) {
      n.lures++;
      const ok = cons.filter((c) => couldHold(l, c)).length;
      if (ok === 0) n.noShare++;
      if (ok === cons.length - 1) n.missOne++;
    }
  }
  const part = (k, d) => (d ? k / d : 0);
  return {
    total: questions.length,
    single: part(n.single, questions.length),
    eachSuffices: part(n.each, questions.length),
    dispensable: part(n.dispensable, questions.length),
    lureNoShare: part(n.noShare, n.lures),
    lureMissesOne: part(n.missOne, n.lures),
  };
}

/** Seuils de la grille du juge pédagogie (docs/juges/pedagogie.md, §2) ; `maxDispensable` à 0 pour « tous nécessaires ». */
export function checkCluesNeeded(questions, accessors, {
  maxSingle = 0.5, maxEachSuffices = 0.25, maxLureNoShare = 0.2, maxDispensable = 1, minLureMissesOne = 0,
} = {}) {
  const m = measureClues(questions, accessors);
  const info = JSON.stringify(m);
  assert.ok(m.single <= maxSingle, `un seul indice suffit trop souvent : ${info}`);
  assert.ok(m.eachSuffices <= maxEachSuffices, `chaque indice suffit séparément trop souvent : ${info}`);
  assert.ok(m.lureNoShare <= maxLureNoShare, `intrus sans aucun indice commun : ${info}`);
  assert.ok(m.dispensable <= maxDispensable, `un indice est superflu : ${info}`);
  assert.ok(m.lureMissesOne >= minLureMissesOne, `intrus trop éloignés des indices : ${info}`);
  return m;
}

export { checkNoLengthShortcut, checkNoPromptEcho } from './shortcut-checks.js';

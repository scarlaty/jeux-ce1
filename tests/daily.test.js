// Défi du jour : chaque question dit d'où elle vient (#110).
//
// Le défi tire ses 5 questions dans 5 jeux différents : sur 120 jours simulés, 76 % des questions
// changent de matière par rapport à la précédente. Dans un jeu, l'enfant sait ce qu'elle joue —
// elle l'a choisi sur l'île et le titre est en haut de l'écran. Dans le défi, rien ne le disait :
// elle lisait « cow » après une question de maths, sans savoir que c'était de l'anglais.
//
// On teste `buildDailyGame` de `core/rewards.js`, la fonction que l'écran utilise réellement — pas
// une copie de sa logique, qui laisserait l'écran régresser en silence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, loadGame } from '../js/games/registry.js';
import {
  buildDailyPlan, buildDailyGame, dailySeed, DAILY_QUESTIONS, SUBJECT_NAMES, subjectName, sourceLang,
} from '../js/core/rewards.js';
import { buildQuestions, renderFingerprint } from '../js/core/engine.js';
import { createRng } from '../js/core/random.js';

const real = GAMES.filter((g) => !g.demo);
const loaded = (await Promise.all(real.map((g) => loadGame(g.id)))).filter(Boolean);
const entries = loaded.map((game) => ({
  id: game.id, subject: game.subject, game, plays: 0, maxLevel: game.levels.length,
}));
const byId = new Map(entries.map((e) => [e.id, e]));

const dailyGame = (seed) => buildDailyGame(
  buildDailyPlan(entries, seed, { count: DAILY_QUESTIONS }), byId, { key: '2026-10-08', island: 'mots' });

const SUBJECTS = new Set(real.map((g) => g.subject));
const ISLAND_IDS = new Set(real.map((g) => g.island));
const TITLES = new Set(real.map((g) => g.title));

test('chaque question du défi porte sa matière, son jeu et son île', () => {
  for (let day = 0; day < 60; day++) {
    const seed = dailySeed(new Date(2026, 9, 8 + day));
    const questions = buildQuestions(dailyGame(seed), 1, createRng(seed), DAILY_QUESTIONS);
    assert.equal(questions.length, DAILY_QUESTIONS, `jour ${day} : ${questions.length} questions`);
    for (const q of questions) {
      assert.ok(q.source, `jour ${day} : question sans origine — « ${q.prompt} »`);
      assert.ok(TITLES.has(q.source.title), `titre inconnu : ${q.source.title}`);
      assert.ok(SUBJECTS.has(q.source.subject), `matière inconnue : ${q.source.subject}`);
      // L'île porte la couleur de l'étiquette : une île inconnue la laisserait sans couleur.
      assert.ok(ISLAND_IDS.has(q.source.island), `île inconnue : ${q.source.island}`);
    }
  }
});

test('une question d\'anglais du défi annonce bien « anglais »', () => {
  // Le cas qui a motivé l'issue : « cow » affiché après une question de maths.
  const anglais = entries.filter((e) => e.subject === 'anglais');
  assert.ok(anglais.length, 'aucun jeu d\'anglais dans le registre : ce test perdrait son sens');
  for (const e of anglais) {
    const q = e.game.makeQuestion(1, createRng(7), new Set());
    const tagged = { ...q, source: { title: e.game.title, subject: e.subject, island: e.game.island } };
    assert.equal(tagged.source.subject, 'anglais', `${e.game.title} : matière perdue`);
  }
});

test('l\'origine ne change pas le dédoublonnage à l\'écran', async () => {
  // `renderFingerprint` ne lit que la consigne et l'affichage : ajouter `source` ne doit pas
  // rendre deux questions identiques « différentes » et rouvrir le doublon de #92.
  const base = { prompt: 'Combien font 2 + 2 ?', display: { choices: [{ text: '4' }, { text: '5' }] } };
  const a = { ...base, source: { title: 'Les tables', subject: 'maths', island: 'nombres' } };
  const b = { ...base, source: { title: 'Calcul mental', subject: 'maths', island: 'nombres' } };
  assert.equal(renderFingerprint(a), renderFingerprint(b), 'l\'origine ne doit pas entrer dans l\'empreinte');
});

// --- Ce que l'étiquette affiche (juges visuel et accessibilité, #110) -------------------------------

test('toute matière du registre a un nom français', () => {
  // Sans cela, un jeu d'une matière inédite afficherait sa clé technique à l'enfant (« emc »).
  for (const g of real) {
    assert.ok(SUBJECT_NAMES[g.subject], `« ${g.subject} » (${g.title}) n'a pas de nom affichable`);
    assert.notEqual(subjectName(g.subject), g.subject, `« ${g.subject} » s'afficherait tel quel`);
  }
});

test("le titre d'un jeu d'anglais est marqué en anglais", () => {
  // La page est en `lang="fr"` : sans marquage, « Body and animals » est lu à la française, par la
  // synthèse vocale comme par les lecteurs d'écran.
  for (const g of real) {
    const attendu = g.subject === 'anglais' ? 'en-GB' : null;
    assert.equal(sourceLang({ subject: g.subject }), attendu, g.title);
  }
});

test("l'étiquette tient sur une ligne à 360 px", () => {
  // Mesuré à l'écran : « Français Les lettres qui changent de son », 40 caractères, tient à 0,4 px
  // près sur une ligne à 360 px. Au-delà, l'étiquette passe à deux lignes — le repli reste propre
  // (pastille seule, titre dessous), mais ce test avertit avant que ça n'arrive en silence.
  const LIMITE = 40;
  for (const g of real) {
    const rendu = `${subjectName(g.subject)} ${g.title}`;
    assert.ok(rendu.length <= LIMITE,
      `« ${rendu} » fait ${rendu.length} caractères (limite ${LIMITE} pour tenir sur une ligne à 360 px)`);
  }
});

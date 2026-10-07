// Branchement des récompenses sur le moteur. Ce module est le SEUL endroit qui relie les calculs
// purs de core/rewards.js au profil : il s'abonne à `gameEvents` (sans modifier engine.js),
// cumule les points pendant la partie et écrit le résultat une seule fois, à la fin.
//
//   rewardEvents.on('points', ({ session, total, gain, bonus, label }) => …)   // compteur en direct
//   rewardSummary(session) → ce qui a été gagné à la fin de cette partie (points, gommettes, grade)
import { gameEvents, createEmitter } from './engine.js';
import {
  COMPLETION_POINTS, answerPoints, applyGameRewards, readRewards,
} from './rewards.js';

/** Bus des récompenses : 'points' pendant la partie, 'end' à la fin. */
export const rewardEvents = createEmitter();

let context = null;   // { store, profileId }
let run = null;       // partie en cours : { session, points, stored }
let last = null;      // dernier résultat calculé : { session, gained }
let installed = false;

function storedPoints() {
  if (!context) return 0;
  try {
    return readRewards(context.store.getProfile(context.profileId)).points;
  } catch (err) {
    console.error('[rewards] lecture du profil', err);
    return 0;
  }
}

function onStart({ session }) {
  run = { session, points: 0, stored: storedPoints() };
  rewardEvents.emit('points', { session, total: run.stored, gain: 0, bonus: 0, label: '' });
}

function onAnswer({ session, correct, streak }) {
  if (!run || run.session !== session) return;
  const gain = answerPoints({ correct, streak });
  run.points += gain.points;
  rewardEvents.emit('points', {
    session, total: run.stored + run.points, gain: gain.points, bonus: gain.bonus, label: gain.label,
  });
}

/** Île de la collection à remplir : le défi du jour désigne la sienne (`rewardIsland`). */
function islandOf(game) {
  return game.rewardIsland || game.island || null;
}

function onEnd({ session, result, extras }) {
  const earned = (run && run.session === session ? run.points : 0) + COMPLETION_POINTS;
  run = null;
  if (!context) return;
  let gained = null;
  try {
    context.store.updateProfile(context.profileId, (profile) => {
      const out = applyGameRewards(readRewards(profile), {
        island: islandOf(session.game),
        stars: result.stars,
        points: earned,
        daily: session.game.daily || null,
      });
      gained = out.gained;
      return { ...profile, rewards: out.rewards };
    });
  } catch (err) {
    console.error('[rewards] écriture du profil', err);
    return;
  }
  last = { session, gained };
  pushExtras(extras, gained);
  rewardEvents.emit('end', { session, result, gained });
}

/** Lignes ajoutées à l'écran de fin de partie (voir engine.js : `extras`). */
function pushExtras(extras, gained) {
  const points = gained.points - gained.dailyBonus;
  extras.push({ text: `+ ${points} points` });
  if (gained.dailyBonus) extras.push({ text: `+ ${gained.dailyBonus} points pour le défi du jour` });
}

/**
 * Installe les récompenses une fois pour toutes, au démarrage de l'appli.
 * `app` : le contexte de js/app.js (store, profileId — lu à chaque usage, donc suit les profils).
 */
export function installRewards(app, { events = gameEvents } = {}) {
  context = app;
  if (installed) return;
  installed = true;
  events.on('start', onStart);
  events.on('answer', onAnswer);
  events.on('end', onEnd);
}

/** Total affiché par le compteur : points du profil + points déjà gagnés dans la partie. */
export function liveTotal(session) {
  return run && run.session === session ? run.stored + run.points : storedPoints();
}

/** Ce qui a été gagné à la fin de `session` (null si la partie n'est pas terminée). */
export function rewardSummary(session) {
  return last && last.session === session ? last.gained : null;
}

/** Remise à zéro — pour les tests uniquement. */
export function resetRewardsForTests() {
  context = null;
  run = null;
  last = null;
  installed = false;
}

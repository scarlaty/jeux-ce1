// Branchement du compagnon sur le moteur (#90), sur le modèle de rewards-live.js : on s'abonne à
// `gameEvents` sans toucher à engine.js, et on écrit dans le profil une seule fois, à la fin.
//
//   companionSummary(session) → ce qui a changé à la fin de cette partie (ou null)
import { gameEvents } from './engine.js';
import { isTrialSession } from './trial.js';
import { totalStars } from './rewards.js';
import { addRun, readCompanion, saveCompanion } from './companion.js';
import { withAccessory } from './chest.js';

let context = null;   // { store, profileId }
let last = null;      // { session, change }
let installed = false;

function onEnd({ session, result, extras }) {
  if (!context || isTrialSession(session)) return;   // mode essai : le compagnon ne compte pas la partie
  let change = null;
  try {
    // `record` (app.js) a déjà écrit la partie dans `progress` : le total est celui de la carte des îles.
    const total = totalStars(context.store.getProfile(context.profileId)?.progress);
    saveCompanion(context.store, context.profileId, (companion) => {
      change = addRun(companion, { totalStars: total });
      return change.companion;
    }, { stored: true });
  } catch (err) {
    console.error('[companion] écriture du profil', err);
    return;
  }
  last = { session, change };
  const name = change.companion.name;
  if (change.ready) extras.push({ icon: '🥚', text: 'Ton œuf est prêt à éclore !' });
  else if (change.cracked) extras.push({ icon: '🥚', text: 'Ton œuf se fêle…' });
  else if (change.grew) extras.push({ icon: '🌟', text: `${name} a grandi !` });
}

/** Installe le compagnon une fois pour toutes. `app` : le contexte de js/app.js (store, profileId). */
export function installCompanion(app, { events = gameEvents } = {}) {
  context = app;
  if (installed) return;
  installed = true;
  events.on('end', onEnd);
}

/** Ce qui a changé pour le compagnon à la fin de `session` : `{ companion, stage, cracked, ready, grew }`. */
export function companionSummary(session) {
  return last && last.session === session ? last.change : null;
}

/** Compagnon actuel du profil actif, avec l'accessoire qu'il porte (`accessory`). */
export function currentCompanion() {
  if (!context) return readCompanion(null);
  try {
    const profile = context.store.getProfile(context.profileId);
    return withAccessory(readCompanion(profile), profile);
  } catch (err) {
    console.error('[companion] lecture du profil', err);
    return readCompanion(null);
  }
}

/** Remise à zéro — pour les tests uniquement. */
export function resetCompanionForTests() {
  context = null;
  last = null;
  installed = false;
}

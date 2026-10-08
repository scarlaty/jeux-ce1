// Branchement du coffre surprise sur le moteur (#91), sur le modèle de companion-live.js : on s'abonne à
// `gameEvents` (APRÈS les récompenses, qui disent si cette partie donne un coffre), on tire le contenu
// avec un rng à graine et on écrit dans le profil une seule fois, à la fin de la partie.
//
//   chestSummary(session) → { tier, rarity, prize } du coffre de cette partie (ou null : pas de coffre)
// Le contenu est rangé tout de suite : même si l'enfant quitte l'écran sans toucher le coffre,
// rien n'est perdu (il le retrouve dans l'album ou dans « Mon compagnon »).
import { gameEvents } from './engine.js';
import { isTrial } from './trial.js';
import { createRng } from './random.js';
import { rewardSummary } from './rewards-live.js';
import { readRewards } from './rewards.js';
import { collect, drawChest, readChest } from './chest.js';

let context = null;      // { store, profileId }
let last = null;         // { session, draw }
let installed = false;
let makeRng = () => createRng();

function onEnd({ session, result }) {
  if (!context || isTrial()) return;   // mode essai : pas de coffre
  const gained = rewardSummary(session);
  if (!gained?.chest) return;
  let draw = null;
  try {
    context.store.updateProfile(context.profileId, (profile) => {
      const rewards = readRewards(profile);
      const chest = readChest(profile);
      draw = drawChest({
        stars: result.stars,
        island: gained.chest.island,
        ownedStickers: rewards.stickers[gained.chest.island] || [],
        ownedAccessories: chest.accessories,
        rng: makeRng(),
      });
      if (!draw) return profile;
      const { prize } = draw;
      const stickers = prize.kind === 'sticker' && !prize.duplicate
        ? { ...rewards.stickers, [prize.island]: [...(rewards.stickers[prize.island] || []), prize.sticker.id] }
        : rewards.stickers;
      return { ...profile, rewards: { ...rewards, stickers }, chest: collect(chest, prize) };
    });
  } catch (err) {
    console.error('[chest] écriture du profil', err);
    return;
  }
  last = { session, draw };
}

/** Installe le coffre une fois pour toutes. `rng` : fabrique de générateur (graine fixe dans les tests). */
export function installChest(app, { events = gameEvents, rng } = {}) {
  context = app;
  if (rng) makeRng = rng;
  if (installed) return;
  installed = true;
  events.on('end', onEnd);
}

/** Le coffre gagné à la fin de `session`, ou null (0 étoile, défi du jour déjà récompensé). */
export function chestSummary(session) {
  return last && last.session === session ? last.draw : null;
}

/** Remise à zéro — pour les tests uniquement. */
export function resetChestForTests() {
  context = null;
  last = null;
  installed = false;
  makeRng = () => createRng();
}

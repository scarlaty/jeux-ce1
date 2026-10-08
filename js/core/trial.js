// Mode essai (#111) : un adulte essaie les jeux sans toucher à la progression de l'enfant.
//
// L'état vit UNIQUEMENT en mémoire (variable de module) : il ne survit ni au rechargement ni à la
// fermeture de l'onglet, et n'est jamais lu ni écrit dans localStorage/sessionStorage. Ce module n'a
// aucune dépendance : il peut être importé partout (stockage, abonnés, écrans) sans cycle.
//
// Règle de sécurité (voir CLAUDE.md « Mode essai ») : le magasin (`storage.js`) refuse d'écrire un
// profil tant que le mode est actif ; les abonnés à `gameEvents` s'y arrêtent aussi d'eux-mêmes.
let active = false;
const listeners = new Set();

/** Le mode essai est-il actif ? */
export function isTrial() {
  return active;
}

function change(next) {
  if (active === next) return;
  active = next;
  for (const fn of [...listeners]) {
    try { fn(active); } catch (err) { console.error('[trial]', err); }
  }
}

export function enterTrial() { change(true); }
export function exitTrial() { change(false); }

/** Point unique des décisions « c'est ouvert » (île, niveau, défi) : ouvert normalement, ou parce que le mode
 *  essai ouvre tout. N'écrit jamais rien dans le profil : la fermeture revient d'elle-même à la sortie. */
export function openOrTrial(open) {
  return active || Boolean(open);
}

/** S'abonne aux changements : fn(actif). Renvoie la fonction de désabonnement. */
export function onTrialChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Phrases affichées dans le bandeau et à l'écran de fin. */
export const TRIAL_BANNER_TEXT = 'Mode essai — rien n\'est enregistré';
export const TRIAL_END_TEXT = 'Mode essai : rien n\'a été enregistré.';

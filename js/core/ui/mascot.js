// Les mascottes des îles sur les écrans (#89) : accueil, choix du niveau, partie, fin, album.
// Le kit (art/kawaii.js) dessine ; ce module choisit l'expression et pose le dessin dans un
// conteneur (c'est le conteneur qui bouge : les pieds restent au sol). Toujours décoratif :
// à côté d'un texte qui dit déjà tout (nom de l'île, titre, correction).
import { h } from './dom.js';
import { draw, mascot, play, MASCOTS } from './art/kawaii.js';

/** L'île a-t-elle une mascotte ? (le défi du jour, île « defi », n'en a pas). Pure. */
export function hasMascot(island) {
  return Object.hasOwn(MASCOTS, island ?? '');
}

/** Expression de fin de partie : jamais triste, même avec 0 étoile. Pure. */
export function endFace(stars) {
  if (stars >= 3) return 'joyful';
  if (stars === 2) return 'happy';
  return 'cheering';
}

/** Réaction pendant la partie : saut de joie, ou petit balancement d'encouragement. Pure. */
export function answerReaction(correct) {
  return correct ? { face: 'joyful', motion: 'jump' } : { face: 'cheering', motion: 'wiggle' };
}

/** Expression d'une mascotte sur la carte : endormie tant que son île est fermée. Pure. */
export function islandFace(open) {
  return open ? 'happy' : 'sleepy';
}

/** Expression dans l'album : très contente quand toutes les gommettes de l'île sont gagnées. Pure. */
export function albumFace(owned, total) {
  return total > 0 && owned >= total ? 'joyful' : 'happy';
}

/**
 * Conteneur `<span class="mascot">` avec le dessin de la mascotte d'une île, ou null.
 * `loop` : 'bounce' | 'float' (accueil, fin de partie, album — jamais à côté d'une consigne).
 */
export function mascotSticker(island, { face = 'happy', loop = null, className = '', blink = true } = {}) {
  if (!hasMascot(island)) return null;
  const box = h('span', { class: ['mascot', loop && `kw-${loop}`, className].filter(Boolean).join(' '), 'aria-hidden': 'true' });
  box.append(draw(mascot(island, { face, decorative: true, ...(blink ? {} : { blink: false }) })));
  return box;
}

/** Change l'expression d'une mascotte déjà posée et rejoue un mouvement ponctuel. */
export function react(box, island, { face, motion }) {
  if (!box || !hasMascot(island)) return;
  box.replaceChildren(draw(mascot(island, { face, decorative: true, blink: false })));
  play(box, motion);
}

// Le compagnon sur les écrans (#90) : choisit l'expression et pose le dessin du kit dans un
// conteneur `.mascot` (c'est le conteneur qui bouge : les pieds restent au sol). Même principe
// que mascot.js ; la logique des stades est dans core/companion.js.
import { h } from './dom.js';
import { draw, companion as companionArt, play } from './art/kawaii.js';
import { endFace, answerReaction } from './mascot.js';
import { animalInfo, stageOf } from '../companion.js';

/** Description kawaii d'un compagnon (pure). `face` absent : l'expression naturelle du stade ; `stage` : montrer un autre stade (frise). */
export function companionSpec(companion, { face, decorative = false, stage = stageOf(companion) } = {}) {
  const info = animalInfo(companion.animal);
  const spec = companionArt({
    animal: info.id,
    stage,
    color: info.color,
    face,
    ...(companion.hatched && companion.name ? { name: companion.name } : {}),
  });
  return decorative ? { ...spec, decorative: true } : spec;
}

/**
 * Réaction pendant la partie (pure). Un compagnon éclos saute de joie ou encourage, comme les
 * mascottes. L'œuf, lui, frémit seulement aux bonnes réponses et ne change pas de visage ; une
 * erreur ne lui fait rien (il n'est jamais triste, jamais grondé).
 */
export function companionReaction(correct, companion) {
  if (companion.hatched) return answerReaction(correct);
  return correct ? { face: 'happy', motion: 'wiggle' } : null;
}

/** Expression de fin de partie : celle des mascottes ; l'œuf garde la sienne et frémit. Pure. */
export function companionEndFace(stars, companion) {
  return companion.hatched ? endFace(stars) : undefined;
}

/** Conteneur `<span class="mascot">` avec le compagnon. `loop` : 'bounce' | 'float' | 'wobble' | null. */
export function companionSticker(companion, { face, loop = null, className = '', blink = true, decorative = true, stage } = {}) {
  const box = h('span', {
    class: ['mascot', 'companion', loop && `kw-${loop}`, className].filter(Boolean).join(' '),
    ...(decorative ? { 'aria-hidden': 'true' } : {}),
  });
  box.append(draw({ ...companionSpec(companion, { face, decorative, stage }), ...(blink ? {} : { blink: false }) }));
  return box;
}

/** Change l'expression du compagnon déjà posé et rejoue un mouvement ponctuel (sans effet si `reaction` est null). */
export function reactCompanion(box, companion, reaction) {
  if (!box || !reaction) return;
  box.replaceChildren(draw({ ...companionSpec(companion, { face: reaction.face, decorative: true }), blink: false }));
  play(box, reaction.motion);
}

/** Remet l'expression naturelle du compagnon (entre deux questions). */
export function resetCompanion(box, companion) {
  if (!box) return;
  box.replaceChildren(draw({ ...companionSpec(companion, { decorative: true }), blink: false }));
}

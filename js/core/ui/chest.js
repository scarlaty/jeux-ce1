// Le coffre surprise à l'écran (#91) : le dessin du coffre (bois, argent, doré) et la scène d'ouverture.
// La logique du tirage est dans core/chest.js (pure) ; ici, seulement l'affichage.
//
//   chestArt(tier)                        → <svg> du coffre fermé (le couvercle se lève avec .is-open sur le parent)
//   chestScene(draw, { companion })       → { el, open(), destroy() } : l'enfant touche le coffre, il se secoue,
//                                            brille, s'ouvre et montre son contenu
//   prizeText(draw, companion)            → { title, name, link } les mots du contenu (pure, testée)
//   accessoryPreview(id, companion)       → le compagnon (ou un petit rond crème) qui porte l'accessoire
// « Réduire les animations » : pas de secousse ni de lueur, le coffre s'ouvre d'un coup et montre son contenu.
import { h } from './dom.js';
import { s } from './svg.js';
import { draw as drawKawaii } from './art/kawaii.js';
import { companionSticker } from './companion.js';
import { prefersReducedMotion } from './confetti.js';
import { TIER_LABELS } from '../chest.js';
import * as audio from '../audio.js';

const SHAKE_MS = 750;
const GLOW_MS = 550;

/** Coffre fermé : un SVG fait à la main, teintes par variables CSS (css/chest.css). */
export function chestArt(tier) {
  const label = TIER_LABELS[tier] || TIER_LABELS.bois;
  const star = 'M70 24l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8.1-7.2-3.8-7.2 3.8 1.4-8.1-5.9-5.7 8.1-1.2z';
  return s('svg', { viewBox: '0 0 140 120', class: `chest__art chest__art--${tier}`, role: 'img', 'aria-label': label, focusable: 'false' },
    s('ellipse', { cx: 70, cy: 112, rx: 54, ry: 6, class: 'chest__shadow' }),
    s('path', { d: 'M18 58h104v40a10 10 0 0 1-10 10H28a10 10 0 0 1-10-10z', class: 'chest__body' }),
    s('path', { d: 'M18 76h104M18 92h104', class: 'chest__plank' }),
    s('path', { d: 'M20 58h100l-6 12H26z', class: 'chest__inside' }),
    s('rect', { x: 32, y: 58, width: 12, height: 50, class: 'chest__band' }),
    s('rect', { x: 96, y: 58, width: 12, height: 50, class: 'chest__band' }),
    s('g', { class: 'chest__lid' },
      s('path', { d: 'M18 60V46C18 26 40 14 70 14s52 12 52 32v14z', class: 'chest__lid-shape' }),
      s('path', { d: 'M30 40C34 28 50 22 66 22', class: 'chest__shine' }),
      s('path', { d: 'M32 14c-3 6-4 14-4 22v24h14V22c-4-2-7-5-10-8zM98 14c3 6 4 14 4 22v24H88V22c4-2 7-5 10-8z', class: 'chest__band' }),
      tier === 'dore' && s('path', { d: star, class: 'chest__emblem' }),
      tier === 'argent' && s('circle', { cx: 70, cy: 36, r: 5.5, class: 'chest__emblem' })),
    s('circle', { cx: 38, cy: 66, r: 2.4, class: 'chest__rivet' }),
    s('circle', { cx: 102, cy: 66, r: 2.4, class: 'chest__rivet' }),
    s('rect', { x: 59, y: 54, width: 22, height: 24, rx: 5, class: 'chest__lock' }),
    s('circle', { cx: 70, cy: 63, r: 3.4, class: 'chest__keyhole' }),
    s('path', { d: 'M68.5 64h3l1 7h-5z', class: 'chest__keyhole' }));
}

/** Le compagnon (ou, sans compagnon éclos, un petit rond crème) qui porte l'accessoire. */
export function accessoryPreview(id, companion, { className = '' } = {}) {
  if (companion?.hatched) {
    return companionSticker({ ...companion, accessory: id }, { blink: false, className });
  }
  const box = h('span', { class: `mascot ${className}`.trim(), 'aria-hidden': 'true' });
  box.append(drawKawaii({ body: 'round', color: 'creme', face: 'joyful', accessory: id, blink: false, decorative: true }));
  return box;
}

/** Les mots du contenu : titre, nom, et vers où mène le bouton. Pure. */
export function prizeText(draw, companion = {}) {
  const { prize, rarity } = draw;
  if (prize.kind === 'accessory') {
    const name = prize.accessory.name;
    const where = companion.hatched ? 'Mets-le sur ton compagnon !' : 'Il t\'attend : fais éclore ton œuf !';
    return {
      title: rarity === 'rare' ? 'Un objet doré rare !' : 'Un accessoire !',
      name,
      hint: where,
      link: { href: '#/compagnon', text: 'Mon compagnon' },
    };
  }
  if (prize.kind === 'sticker') {
    return prize.duplicate
      ? { title: 'Bravo, tu as toutes les gommettes !', name: prize.sticker.name, hint: 'Ta collection de cette île est complète.', link: { href: '#/album', text: 'Mon album' } }
      : { title: 'Une gommette !', name: prize.sticker.name, hint: 'Elle est collée dans ton album.', link: { href: '#/album', text: 'Mon album' } };
  }
  return { title: 'Une pluie d\'étoiles !', name: 'Bravo !', hint: '', link: null };
}

function prizeArt(draw, companion) {
  const { prize } = draw;
  if (prize.kind === 'accessory') return accessoryPreview(prize.accessory.id, companion, { className: 'chest-prize__art' });
  const emoji = prize.kind === 'sticker' ? prize.sticker.emoji : '✨';
  const name = prize.kind === 'sticker' ? prize.sticker.name : 'Étoiles';
  return h('span', { class: 'emoji chest-prize__art chest-prize__emoji', role: 'img', 'aria-label': name, text: emoji });
}

/**
 * Scène d'ouverture. `draw` : le résultat de drawChest() (tier, rarity, prize).
 * Le contenu est déjà rangé dans le profil : la scène ne fait que le révéler.
 * `onOpen(draw)` est appelé une fois, quand le coffre est ouvert.
 */
export function chestScene(draw, { companion = {}, onOpen } = {}) {
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const label = TIER_LABELS[draw.tier] || TIER_LABELS.bois;
  let opened = false;

  const button = h('button', { type: 'button', class: 'chest__btn', 'aria-label': `${label} : touche pour l'ouvrir` },
    h('span', { class: 'chest__rays', 'aria-hidden': 'true' }),
    h('span', { class: 'chest__glow', 'aria-hidden': 'true' }),
    h('span', { class: 'chest__box' }, chestArt(draw.tier)));
  const hint = h('p', { class: 'chest__hint', text: `${label} : touche-le !` });
  const result = h('div', { class: 'chest-prize', 'aria-live': 'polite' });
  const el = h('div', { class: `chest chest--${draw.tier}`, dataset: { state: 'closed' } }, button, hint, result);

  function reveal() {
    const words = prizeText(draw, companion);
    el.dataset.state = 'open';
    el.classList.add('is-open');
    button.setAttribute('aria-label', `${label}, ouvert`);
    hint.hidden = true;
    result.append(
      prizeArt(draw, companion),
      h('p', { class: 'chest-prize__title', text: words.title }),
      h('p', { class: 'chest-prize__name', text: words.name }),
      words.hint && h('p', { class: 'chest-prize__hint', text: words.hint }),
      words.link && h('a', { class: 'btn btn--secondary btn--small chest-prize__link', href: words.link.href }, h('span', { text: words.link.text })));
    audio.playSound(draw.rarity === 'common' ? 'star' : 'finish');
    onOpen?.(draw);
  }

  function open() {
    if (opened) return;
    opened = true;
    button.disabled = true;
    audio.playSound('tap');
    if (prefersReducedMotion()) { reveal(); return; }
    el.dataset.state = 'shaking';
    later(() => { el.dataset.state = 'glowing'; }, SHAKE_MS);
    later(reveal, SHAKE_MS + GLOW_MS);
  }

  button.addEventListener('click', open);
  return {
    el,
    open,
    focus: () => button.focus({ preventScroll: true }),
    destroy: () => { for (const t of timers) clearTimeout(t); timers.clear(); },
  };
}

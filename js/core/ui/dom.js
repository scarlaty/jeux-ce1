// Petits utilitaires DOM partagés par les écrans et les composants.
// On construit les éléments avec textContent : jamais d'innerHTML avec du contenu variable.
import { drawArt } from './art/index.js';

/**
 * h('button', { class: 'btn', onclick: fn, 'aria-label': '…' }, enfant1, enfant2…)
 * Attributs : `class`, `text` (textContent), `dataset` (objet), `on<event>` (écouteur),
 * booléens (true → attribut vide, false/null/undefined → ignoré).
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
}

/**
 * Contenu d'un choix, d'un élément à ranger ou d'une illustration :
 * { art?, emoji?, text?, cursive?, lang?, math? }. L'émoji est une image de contenu : on lui donne
 * un nom accessible (`label` ou `text`). `math: true` affiche `text` comme un calcul (voir mathText).
 * `art` est un dessin décrit par le jeu (voir ui/art/index.js) : il porte son propre nom accessible.
 */
export function content(item, { cursive = false } = {}) {
  const parts = [];
  if (item.art) {
    const drawing = drawArt(item.art);
    if (drawing) parts.push(drawing);
  }
  if (item.emoji) {
    const label = item.label || item.text || '';
    // Plusieurs émojis côte à côte (« 🐱🐟 », « 👂👂 ») : `data-n` permet de les réduire pour qu'ils restent sur une ligne.
    const n = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter().segment(item.emoji)].length : 1;
    parts.push(h('span', { class: 'emoji', role: 'img', 'aria-label': label || null, 'aria-hidden': label ? null : 'true', 'data-n': n > 1 ? n : null, text: item.emoji }));
  }
  if (item.math && item.text) {
    parts.push(mathText(String(item.text)));
  } else if (item.text !== undefined && item.text !== null && item.text !== '') {
    parts.push(h('span', {
      class: `content-text${(item.cursive ?? cursive) ? ' cursive' : ''}${item.wrap ? ' wrap' : ''}`,
      lang: item.lang || null,
      // Longueur du texte : la feuille de style s'en sert pour qu'un mot long tienne sur sa ligne.
      style: `--text-len: ${[...String(item.text)].length}`,
      text: String(item.text),
    }));
  }
  return parts;
}

/**
 * Longueur d'un titre de la barre du haut, pour l'ajuster sur téléphone sans le tronquer :
 * 'short' (tient sur une ligne), 'long' (deux lignes, plus petit), 'xlong' (sa propre ligne
 * sous les boutons). Compte les caractères, pas les octets. Pure.
 */
export function titleLength(text) {
  const n = [...String(text ?? '').trim()].length;
  if (n <= 8) return 'short';
  if (n <= 18) return 'long';
  return 'xlong';
}

// Largeur approximative (en em, police des titres) de chaque morceau d'un calcul : la feuille
// de style s'en sert pour réduire le calcul jusqu'à ce qu'il tienne sur une ligne.
const MATH_EM = { digit: 0.53, sign: 0.56, hole: 1.2, gap: 0.3, letter: 0.36 };
const MATH_SIGNS = new Set(['+', '−', '×', ':', '=', '<', '>']);

/**
 * Un calcul dont les morceaux sont séparés par des espaces : « 45 + 8 = ? », « 7 + ? = 15 ».
 * Chiffres de même largeur, signes aérés et colorés, « ? » dans une case pointillée
 * (le nombre à trouver).
 */
export function mathText(text) {
  const tokens = text.trim().split(/\s+/);
  let em = MATH_EM.gap * (tokens.length - 1);
  const children = tokens.map((token) => {
    if (token === '?') {
      em += MATH_EM.hole;
      return h('span', { class: 'math__hole', text: '?' });
    }
    if (MATH_SIGNS.has(token)) {
      em += MATH_EM.sign;
      return h('span', { class: 'math__sign', text: token });
    }
    if (/^\p{L}/u.test(token)) {
      // Mot dans un calcul (« la moitié de 46 = ? ») : plus petit, pour que les nombres dominent.
      em += MATH_EM.letter * token.length;
      return h('span', { class: 'math__word', text: token });
    }
    em += MATH_EM.digit * token.length;
    return h('span', { class: 'math__number', text: token });
  });
  return h('span', { class: 'content-text math', style: `--math-em: ${em.toFixed(2)}` }, children);
}

/* Un raccourci clavier posé sur `document` ne doit jamais voler Entrée ou Espace à un bouton qui a le
   focus : `preventDefault` sur `keydown` annule le clic que le navigateur synthétise, et la commande
   visée ne s'exécute pas. C'est ce qui rendait le pavé et le clavier de lettres injouables (#113). */
export const CONTROLS = 'button, a[href], [role="button"]';
export function onControl(e) {
  const el = e && e.target;
  return typeof el?.closest === 'function' && !!el.closest(CONTROLS);
}

/* Quand on retire ou désactive l'élément qui avait le focus, le navigateur le rend à <body> et
   l'utilisateur au clavier repart du haut de la page. On ne replace le focus que dans ce cas :
   au doigt et à la souris, activeElement n'est pas <body> et rien ne bouge (#113). */
export function focusedWithin(root) {
  if (typeof document === 'undefined' || !root) return false;
  const el = document.activeElement;
  return !!el && el !== document.body && root.contains(el);
}

export function keepFocus(el) {
  if (!el || typeof document === 'undefined') return;
  // Deuxième garde : si quelque chose a déjà le focus, on n'y touche pas.
  if (document.activeElement && document.activeElement !== document.body) return;
  if (!el.hasAttribute('tabindex') && !el.matches('a[href], button, input, select, textarea')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus({ preventScroll: true });
}

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
/**
 * Classe de longueur d'un titre, pour la barre du haut. On regarde le TITRE ENTIER et le MOT LE
 * PLUS LONG : sous 520 px la boîte ne fait que 83 px, et `overflow-wrap: break-word` coupait en
 * plein milieu d'un mot (« Devinette / s », « Démonstr / ation ») ou tronquait en perdant un mot
 * (« Colors and… »). Un titre trop long, ou dont un mot dépasse, bascule donc en `xlong` : il prend
 * sa propre ligne, pleine largeur, où rien n'est ni coupé ni tronqué.
 *
 * Seuils mesurés à 360 px dans la boîte de 82 px : un mot de plus de 8 caractères dépasse
 * toujours la ligne (4,23 em contre 4,88 em de boîte), et au-delà de 17 caractères le titre
 * ne tient plus en deux lignes. Voir tests/title.test.js (#115).
 */
export function titleLength(text) {
  const s = String(text ?? '').trim();
  const n = [...s].length;
  const longest = s.split(/\s+/).reduce((max, word) => Math.max(max, [...word].length), 0);
  if (n <= 8) return 'short';
  if (n <= 17 && longest <= 8) return 'long';
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

/**
 * Ce qu'une touche doit déclencher dans un composant de saisie (pavé, clavier de lettres).
 * La décision est ici, pure et testée, et non dans le gestionnaire : une garde écrite sur place
 * peut être déplacée après `preventDefault` sans qu'aucun test ne bronche (#113).
 * → 'validate' | 'erase' | 'input' | 'ignore'
 */
export function keyAction(e, { empty = true, locked = false } = {}) {
  if (!e || locked || e.altKey || e.ctrlKey || e.metaKey) return 'ignore';
  if (e.key === 'Enter') {
    if (empty) return 'ignore';
    return onControl(e) ? 'ignore' : 'validate';
  }
  if (e.key === 'Backspace') return 'erase';
  return 'input';
}

/**
 * Vrai quand une touche de dépôt est pressée SUR la zone elle-même. Si l'événement remonte d'un
 * jeton, la zone doit se taire : sinon son `preventDefault` annule l'activation du jeton et plus
 * rien n'est sélectionnable au clavier (#113).
 */
export function dropKey(e) {
  if (!e || e.target !== e.currentTarget) return false;
  return e.key === 'Enter' || e.key === ' ';
}

/* Quand on retire ou désactive l'élément qui avait le focus, le navigateur le rend à <body> — ou,
   sur Chrome, le garde accroché à un bouton désactivé. L'utilisateur au clavier repart alors du haut
   de la page. On ne replace le focus que dans ce cas (#113). */
export function focusedWithin(root) {
  if (typeof document === 'undefined' || !root) return false;
  const el = document.activeElement;
  return !!el && el !== document.body && root.contains(el);
}

function focusLost() {
  const el = document.activeElement;
  if (!el || el === document.body) return true;
  if (el.disabled) return true;
  return el.isConnected === false;
}

export function keepFocus(el) {
  // Une cible désactivée n'accepte pas le focus : `focus()` échouerait en silence et l'enfant
  // resterait sur <body> en croyant la question couverte (#113).
  if (!el || el.disabled || typeof document === 'undefined') return;
  // Deuxième garde : si quelque chose de valide a le focus, on n'y touche pas.
  if (!focusLost()) return;
  if (!el.hasAttribute('tabindex') && !el.matches('a[href], button, input, select, textarea')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus({ preventScroll: true });
}

/**
 * Relève si le focus est dans `root`, et rend une fonction à rappeler APRèS la mutation.
 * Le relevé et la garde vivent ensemble ici : un appelant ne peut pas « oublier » la condition,
 * ce qui était le cas quand chaque composant écrivait son propre `if (hadFocus)`.
 */
export function focusKeeper(root) {
  const had = focusedWithin(root);
  return (pick) => {
    if (!had) return false;
    const el = typeof pick === 'function' ? pick() : pick;
    keepFocus(el);
    return true;
  };
}

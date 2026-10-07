// Pièces et billets en euros : { kind: 'money', pieces: [500, 500, 200, 50] }.
// Les valeurs sont en CENTIMES (un nombre entier : jamais de décimal à virgule dans le code).
// Pièces : 1, 2, 5, 10, 20, 50 centimes, 1 € (100) et 2 € (200). Billets : 5, 10, 20 et 50 €.
//
// Les tailles sont celles des vrais objets (en mm) : un billet est bien plus grand qu'une pièce, la
// pièce de 2 € plus grande que celle de 1 €. Les couleurs aussi : 5 € gris, 10 € rouge, 20 € bleu,
// 50 € orange ; cuivre, or nordique, et pièces bicolores (le 1 € et le 2 € sont inversés).
//
// Le nom accessible dit CE QU'ON VOIT (« 2 billets de 5 € et 1 pièce de 50 c »), jamais la somme :
// lu à voix haute, il ne doit pas répondre à « Combien d'argent y a-t-il ? ».
import { s, figure } from '../svg.js';

const NB = ' ';
const GAP = 8;        // entre deux pièces
const PAD = 2;        // marge pour que les contours ne soient pas rognés
const MAX_PIECES = 12;

// Pièces : diamètre réel (mm), teinte, chiffre et unité écrits dessus.
const COINS = {
  1: { d: 16.3, tone: 'copper', n: '1', u: 'c' },
  2: { d: 18.7, tone: 'copper', n: '2', u: 'c' },
  5: { d: 21.2, tone: 'copper', n: '5', u: 'c' },
  10: { d: 19.7, tone: 'gold', n: '10', u: 'c' },
  20: { d: 22.1, tone: 'gold', n: '20', u: 'c' },
  50: { d: 24.2, tone: 'gold', n: '50', u: 'c' },
  100: { d: 23.3, tone: 'euro1', n: '1', u: '€' },
  200: { d: 25.7, tone: 'euro2', n: '2', u: '€' },
};
// Billets : largeur et hauteur réelles (mm) et teinte.
const NOTES = {
  500: { w: 120, h: 62, tone: 'n5', n: '5' },
  1000: { w: 127, h: 67, tone: 'n10', n: '10' },
  2000: { w: 133, h: 72, tone: 'n20', n: '20' },
  5000: { w: 140, h: 77, tone: 'n50', n: '50' },
};

export const COIN_VALUES = Object.keys(COINS).map(Number);
export const NOTE_VALUES = Object.keys(NOTES).map(Number);
export const isNote = (cents) => cents in NOTES;

/** « 13 € », « 2 € et 50 c », « 70 c » (espaces insécables). Pure : sert aux jeux et aux tests. */
export function money(cents) {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (rest === 0) return `${euros}${NB}€`;
  if (euros === 0) return `${rest}${NB}c`;
  return `${euros}${NB}€ et ${rest}${NB}c`;
}

/** Même somme à lire à voix haute : « 2 euros et 50 centimes ». Pure. */
export function moneySpoken(cents) {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  const e = `${euros} euro${euros > 1 ? 's' : ''}`;
  const c = `${rest} centime${rest > 1 ? 's' : ''}`;
  if (rest === 0) return e;
  return euros === 0 ? c : `${e} et ${c}`;
}

const short = (cents) => (cents >= 100 ? `${cents / 100}${NB}€` : `${cents}${NB}c`);

/** Pièces et billets dans l'ordre d'affichage : billets d'abord, du plus grand au plus petit. */
export function sorted(pieces) {
  return [...pieces].sort((a, b) => (isNote(b) - isNote(a)) || (b - a));
}

/** « 2 billets de 5 € et 1 pièce de 50 c » (chaîne vide si rien). Pure. */
export function pieceWords(spec) {
  const counts = new Map();
  for (const v of sorted(spec?.pieces || [])) counts.set(v, (counts.get(v) || 0) + 1);
  const parts = [...counts].map(([v, n]) => {
    const what = isNote(v) ? (n > 1 ? 'billets' : 'billet') : (n > 1 ? 'pièces' : 'pièce');
    return `${n} ${what} de ${short(v)}`;
  });
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

export function label(spec) {
  return `Argent : ${pieceWords(spec) || 'rien du tout'}.`;
}

export function check(spec, errors) {
  const pieces = spec.pieces;
  if (!Array.isArray(pieces) || pieces.length === 0) { errors.push('money.pieces : liste non vide'); return; }
  if (pieces.length > MAX_PIECES) errors.push(`money.pieces : ${MAX_PIECES} pièces au plus`);
  for (const v of pieces) {
    if (!(v in COINS) && !(v in NOTES)) errors.push(`money.pieces : valeur inconnue (${v})`);
  }
}

const sizeOf = (v) => (isNote(v) ? { w: NOTES[v].w, h: NOTES[v].h } : { w: COINS[v].d, h: COINS[v].d });

/**
 * Range les pièces en rangées de `maxWidth` mm au plus, billets en premier, chaque rangée centrée.
 * Renvoie { width, height, items: [{ value, x, y, w, h }] }. Pure : testable sans navigateur.
 */
export function layout(spec, maxWidth = 290) {
  const rows = [];
  let row = null;
  for (const value of sorted(spec.pieces)) {
    const { w, h } = sizeOf(value);
    if (!row || (row.items.length > 0 && row.width + GAP + w > maxWidth)) {
      row = { items: [], width: 0, height: 0 };
      rows.push(row);
    }
    row.width += (row.items.length ? GAP : 0) + w;
    row.height = Math.max(row.height, h);
    row.items.push({ value, w, h });
  }
  const width = Math.max(0, ...rows.map((r) => r.width));
  const items = [];
  let y = 0;
  for (const r of rows) {
    let x = (width - r.width) / 2;
    for (const it of r.items) {
      items.push({ ...it, x, y: y + (r.height - it.h) / 2 });
      x += it.w + GAP;
    }
    y += r.height + GAP;
  }
  return { width, height: Math.max(0, y - GAP), items };
}

function coin({ value, x, y, w }) {
  const { tone, n, u } = COINS[value];
  const r = w / 2;
  const cx = x + r;
  const cy = y + r;
  const euro = value >= 100;
  const inner = euro ? s('circle', { cx, cy, r: r * 0.62, class: `money__inner money__inner--${tone}` }) : null;
  return s('g', { class: `money__coin money__coin--${tone}` },
    s('circle', { cx, cy, r: r - 0.4, class: 'money__body' }),
    inner,
    s('text', {
      x: cx, y: cy - r * (euro ? 0.04 : 0.1), class: 'money__value money__value--coin',
      'text-anchor': 'middle', 'dominant-baseline': 'central', style: `font-size:${(r * (euro ? 0.95 : 0.9)).toFixed(1)}px`, text: n,
    }),
    s('text', {
      x: cx, y: cy + r * (euro ? 0.5 : 0.52), class: 'money__unit',
      'text-anchor': 'middle', 'dominant-baseline': 'central', style: `font-size:${(r * 0.42).toFixed(1)}px`, text: u,
    }));
}

function note({ value, x, y, w, h }) {
  const { tone, n } = NOTES[value];
  return s('g', { class: `money__note money__note--${tone}` },
    s('rect', { x, y, width: w, height: h, rx: 3, class: 'money__body' }),
    s('rect', { x: x + 3, y: y + 3, width: w - 6, height: h - 6, rx: 1.5, class: 'money__frame' }),
    s('circle', { cx: x + w * 0.13, cy: y + h * 0.5, r: h * 0.15, class: 'money__frame' }),
    s('path', { d: `M${x + w * 0.79} ${y + h * 0.78}v${-h * 0.3}a${h * 0.14} ${h * 0.14} 0 0 1 ${h * 0.28} 0v${h * 0.3}z`, class: 'money__window' }),
    s('text', {
      x: x + w * 0.5, y: y + h * 0.46, class: 'money__value money__value--note',
      'text-anchor': 'middle', 'dominant-baseline': 'central', style: `font-size:${(h * 0.38).toFixed(1)}px`, text: `${n}${NB}€`,
    }),
    s('text', {
      x: x + w * 0.5, y: y + h * 0.82, class: 'money__unit money__unit--note',
      'text-anchor': 'middle', 'dominant-baseline': 'central', style: `font-size:${(h * 0.14).toFixed(1)}px`, text: 'EURO',
    }));
}

export function draw(spec) {
  const { width, height, items } = layout(spec);
  const svg = figure(`${-PAD} ${-PAD} ${width + 2 * PAD} ${height + 2 * PAD}`, label(spec),
    items.map((it) => (isNote(it.value) ? note(it) : coin(it))));
  // La feuille de style règle la largeur : `--mm` est la largeur du dessin en millimètres.
  // Quelques petites pièces seulement : la feuille de style peut les agrandir sans que ça déborde.
  svg.setAttribute('class', `art art--money${items.length === 1 ? ' art--money-single' : ''}${width <= 120 ? ' art--money-compact' : ''}`);
  svg.setAttribute('style', `--mm: ${(width + 2 * PAD).toFixed(1)}`);
  return svg;
}

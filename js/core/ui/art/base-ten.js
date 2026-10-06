// Matériel de numération en base dix : { kind: 'base-ten', hundreds?, tens?, units? }.
// Plaques de cent (10 × 10 cubes), barres de dix (10 cubes) et cubes isolés, posés côte à côte
// sur une même ligne de sol. Sert aux jeux de numération et de calcul.
//
// Le nom accessible décrit le MATÉRIEL VISIBLE, jamais le nombre : lu à voix haute, il ne doit
// pas donner la réponse à « Combien y a-t-il ? » — et il dit exactement ce qu'il faut compter.
import { s, figure } from '../svg.js';

const CELL = 5;            // côté d'un cube, dans le repère du dessin
const TEN = CELL * 10;     // longueur d'une barre de dix (et côté d'une plaque de cent)
const GAP = 4;             // entre deux pièces d'un même tas
const COLUMN_GAP = 16;     // entre les plaques, les barres et les cubes
const PAD = 2;             // marge pour que les contours ne soient pas rognés

// Un tas par sorte de pièce : largeur, hauteur et nombre de pièces par rangée.
const PIECE = {
  plate: { width: TEN, height: TEN, perRow: 3 },
  bar: { width: CELL, height: TEN, perRow: 9 },
  cube: { width: CELL, height: CELL, perRow: 3 },
};

// Champ de la description → sorte de pièce et mots du nom accessible.
const PIECES = [
  { field: 'hundreds', kind: 'plate', one: 'plaque de cent', many: 'plaques de cent' },
  { field: 'tens', kind: 'bar', one: 'barre de dix', many: 'barres de dix' },
  { field: 'units', kind: 'cube', one: 'cube', many: 'cubes' },
];

const count = (spec, field) => (spec && spec[field]) || 0;

/** « 2 plaques de cent, 3 barres de dix et 4 cubes » (chaîne vide si rien n'est posé). Pure. */
export function pieceWords(spec) {
  const parts = PIECES
    .filter((p) => count(spec, p.field) > 0)
    .map((p) => `${count(spec, p.field)} ${count(spec, p.field) > 1 ? p.many : p.one}`);
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}

export function label(spec) {
  return `Matériel : ${pieceWords(spec) || 'rien du tout'}.`;
}

export function check(spec, errors) {
  for (const { field } of PIECES) {
    const n = spec[field] ?? 0;
    if (!Number.isInteger(n) || n < 0 || n > 9) errors.push(`base-ten.${field} : entier de 0 à 9`);
  }
  if (!PIECES.some((p) => count(spec, p.field) > 0)) errors.push('base-ten : au moins une pièce');
}

/** Un tas de `n` pièces : rangées remplies de bas en haut, de gauche à droite. */
function pile(kind, n) {
  const { width: w, height: h, perRow } = PIECE[kind];
  const cols = Math.min(n, perRow);
  const rows = Math.ceil(n / perRow);
  const height = rows * h + (rows - 1) * GAP;
  const cells = Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / perRow);
    return { x: (i % perRow) * (w + GAP), y: height - (row + 1) * h - row * GAP };
  });
  return { kind, width: cols * w + (cols - 1) * GAP, height, cells };
}

/**
 * Place les trois tas côte à côte, posés sur la même ligne du bas.
 * Renvoie { width, height, pieces: [{ kind, x, y }] }. Fonction pure : testable sans navigateur.
 */
export function layout(spec) {
  const piles = PIECES
    .filter((p) => count(spec, p.field) > 0)
    .map((p) => pile(p.kind, count(spec, p.field)));
  const width = piles.reduce((w, p) => w + p.width, 0) + COLUMN_GAP * Math.max(0, piles.length - 1);
  const height = piles.reduce((hi, p) => Math.max(hi, p.height), 0);
  const pieces = [];
  let x = 0;
  for (const p of piles) {
    for (const cell of p.cells) pieces.push({ kind: p.kind, x: x + cell.x, y: height - p.height + cell.y });
    x += p.width + COLUMN_GAP;
  }
  return { width, height, pieces };
}

/** Les traits qui montrent les cubes d'une plaque ou d'une barre (rien sur un cube seul). */
function innerLines(kind, x, y) {
  if (kind === 'cube') return null;
  const parts = [];
  const across = kind === 'plate' ? TEN : CELL;
  for (let i = 1; i < 10; i += 1) parts.push(`M${x} ${y + i * CELL}h${across}`);
  if (kind === 'plate') for (let i = 1; i < 10; i += 1) parts.push(`M${x + i * CELL} ${y}v${TEN}`);
  return parts.join('');
}

function piece({ kind, x, y }) {
  const { width, height } = PIECE[kind];
  const lines = innerLines(kind, x, y);
  return s('g', { class: `base-ten__piece base-ten__piece--${kind}` },
    s('rect', { x, y, width, height, rx: 1, class: 'base-ten__block' }),
    lines && s('path', { d: lines, class: 'base-ten__grid' }));
}

export function draw(spec) {
  const { width, height, pieces } = layout(spec);
  const svg = figure(`${-PAD} ${-PAD} ${width + 2 * PAD} ${height + 2 * PAD}`, label(spec), pieces.map(piece));
  // Les cubes sont minuscules par construction : ce dessin réclame plus de largeur que les autres.
  svg.setAttribute('class', 'art art--base-ten');
  return svg;
}

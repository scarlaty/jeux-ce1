// Pastilles de couleur et objets colorés à compter : { kind: 'colored', shape, color, count? }.
//   shape : 'swatch' (une pastille ronde, `count` ignoré) | 'apple' | 'balloon' | 'star' | 'flower'
//   color : red, blue, yellow, green, orange, pink, purple, black, white, brown, grey
//   count : 1 à 10 objets (jamais pour la pastille)
// Les teintes sont les variables --swatch-<couleur> de tokens.css : identiques en clair et en sombre,
// car ici la couleur EST le contenu. Un contour d'encre garde le blanc et le noir visibles partout.
// Le nom accessible décrit ce qui est dessiné (« 3 pommes rouges ») : c'est le contenu à reconnaître.
import { s, figure } from '../svg.js';
import { getColor, getThing, colorFr, thingsFr } from '../../../data/anglais.js';

export const MAX_COUNT = 10;
const CELL_W = 40;
const CELL_H = 44;

const fill = (color) => `fill: var(--swatch-${color})`;

export function label(spec) {
  // Une description mal formée garde un nom : c'est `check` qui la signale.
  if (!getColor(spec.color)) return 'Dessin de couleur';
  if (spec.shape === 'swatch') return `Pastille ${colorFr(spec.color)}`;
  if (!getThing(spec.shape) || !Number.isInteger(spec.count)) return 'Dessin de couleur';
  return thingsFr({ thing: spec.shape, color: spec.color, count: spec.count });
}

export function check(spec, errors) {
  if (!getColor(spec.color)) errors.push(`colored.color inconnue : ${spec.color}`);
  if (spec.shape === 'swatch') return;
  if (!getThing(spec.shape)) errors.push(`colored.shape inconnue : ${spec.shape}`);
  if (!Number.isInteger(spec.count) || spec.count < 1 || spec.count > MAX_COUNT) errors.push(`colored.count : entier de 1 à ${MAX_COUNT}`);
}

/** Deux rangées au plus, la première la plus longue : 7 → 4 + 3. Renvoie les cases et la taille. Pure. */
export function layout(count) {
  const first = count <= 5 ? count : Math.ceil(count / 2);
  const rows = count <= 5 ? [count] : [first, count - first];
  const cells = [];
  rows.forEach((n, row) => {
    const offset = ((first - n) * CELL_W) / 2;
    for (let i = 0; i < n; i += 1) cells.push({ x: offset + i * CELL_W, y: row * CELL_H });
  });
  return { width: first * CELL_W, height: rows.length * CELL_H, cells };
}

/** Les sommets d'une étoile à 5 branches centrée en (cx, cy). Pure. */
export function starPoints(cx, cy, outer = 18, inner = 7.6) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(' ');
}

const DRAW = {
  apple: (x, y, color) => [
    s('path', { d: `M${x + 20} ${y + 15}q0-7 5-10`, class: 'colored__line', style: 'stroke: var(--swatch-brown)' }),
    s('ellipse', { cx: x + 28, cy: y + 8, rx: 5.5, ry: 2.8, transform: `rotate(-25 ${x + 28} ${y + 8})`, class: 'colored__shape', style: fill('green') }),
    s('circle', { cx: x + 20, cy: y + 28, r: 15, class: 'colored__shape', style: fill(color) }),
  ],
  balloon: (x, y, color) => [
    s('path', { d: `M${x + 20} ${y + 36}q-5 3 0 7`, class: 'colored__line' }),
    s('path', { d: `M${x + 20} ${y + 31}l-3.5 5h7z`, class: 'colored__shape', style: fill(color) }),
    s('ellipse', { cx: x + 20, cy: y + 17, rx: 13, ry: 16, class: 'colored__shape', style: fill(color) }),
  ],
  star: (x, y, color) => [
    s('polygon', { points: starPoints(x + 20, y + 24), class: 'colored__shape', style: fill(color) }),
  ],
  flower: (x, y, color) => [
    s('path', { d: `M${x + 20} ${y + 28}v15`, class: 'colored__line', style: 'stroke: var(--swatch-green)' }),
    ...[0, 72, 144, 216, 288].map((a) => s('circle', {
      cx: (x + 20 + 9 * Math.sin((a * Math.PI) / 180)).toFixed(1),
      cy: (y + 20 - 9 * Math.cos((a * Math.PI) / 180)).toFixed(1),
      r: 7.5,
      class: 'colored__shape',
      style: fill(color),
    })),
    s('circle', { cx: x + 20, cy: y + 20, r: 5, class: 'colored__shape', style: fill(color === 'yellow' ? 'orange' : 'yellow') }),
  ],
};

function drawSwatch(color) {
  const svg = figure('0 0 50 50', label({ shape: 'swatch', color }),
    s('circle', { cx: 25, cy: 25, r: 22, class: 'colored__shape', style: fill(color) }),
    s('path', { d: 'M13 21a13 13 0 0 1 10-9', class: 'colored__shine' }));
  svg.setAttribute('class', 'art art--swatch');
  return svg;
}

export function draw(spec) {
  if (spec.shape === 'swatch') return drawSwatch(spec.color);
  const { width, height, cells } = layout(spec.count);
  const svg = figure(`-2 -2 ${width + 4} ${height + 4}`, label(spec),
    cells.map(({ x, y }) => s('g', {}, DRAW[spec.shape](x, y, spec.color))));
  svg.setAttribute('class', 'art art--objects');
  return svg;
}

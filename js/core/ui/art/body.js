// Parties du corps que l'émoji montre mal : { kind: 'body', shape: 'foot', count?: 1 | 2 }.
// Le 🦶 de plusieurs systèmes ressemble à un petit nuage jaune (relevé à l'écran, #77) : on dessine donc
// un pied vu de dessous, cinq orteils. `count` = nombre d'exemplaires côte à côte (le 2e est inversé).
// Couleurs : tokens de la palette kawaii (peau pastel + contour), identiques d'une page à l'autre.
// Le nom accessible nomme ce qui est dessiné (« 2 pieds »), comme un émoji de pomme nomme la pomme.
import { s, figure } from '../svg.js';

export const SHAPES = { foot: { one: 'pied', many: 'pieds' } };
const W = 40;

export function label(spec) {
  const shape = SHAPES[spec.shape];
  if (!shape) return 'Dessin du corps';
  const count = Number.isInteger(spec.count) ? spec.count : 1;
  return `${count} ${count > 1 ? shape.many : shape.one}`;
}

export function check(spec, errors) {
  if (!SHAPES[spec.shape]) errors.push(`body.shape inconnue : ${spec.shape}`);
  if (spec.count !== undefined && ![1, 2].includes(spec.count)) errors.push('body.count : 1 ou 2');
}

const TOES = [[9, 16, 4.6], [17, 10.5, 3.8], [24.5, 9, 3.4], [31, 11, 3.2], [36, 16, 2.9]];

function foot(x, mirrored) {
  const transform = mirrored ? `translate(${x + W} 0) scale(-1 1)` : `translate(${x} 0)`;
  return s('g', { transform, class: 'body__foot' }, [
    s('path', { d: 'M8 28C6 18 34 16 36 28C37 34 33 38 32 43C31 52 17 52 16 43C15 38 9 35 8 28Z', class: 'body__shape' }),
    ...TOES.map(([cx, cy, r]) => s('circle', { cx, cy, r, class: 'body__shape' })),
  ]);
}

export function draw(spec) {
  const count = spec.count === 2 ? 2 : 1;
  const svg = figure(`0 0 ${W * count} 56`, label(spec),
    Array.from({ length: count }, (_, i) => foot(i * W, i === 1)));
  svg.setAttribute('class', 'art art--body');
  return svg;
}

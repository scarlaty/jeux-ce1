// Cadran à aiguilles : { kind: 'clock', hours: 0…23, minutes: 0…59 }.
// Sert aux jeux de l'heure, des durées et du calendrier.
//
// Le nom accessible décrit la POSITION DES AIGUILLES, pas l'heure : lu à voix haute, il ne doit
// pas donner la réponse à « Quelle heure est-il ? » — et il dit exactement ce qu'il faut regarder.
import { s, figure } from '../svg.js';

const R = 46;          // rayon du cadran dans un repère de 100 × 100
const CENTER = 50;

/** Angles des deux aiguilles, en degrés depuis midi, sens horaire. Fonction pure. */
export function handAngles({ hours = 0, minutes = 0 }) {
  const h12 = ((hours % 12) + 12) % 12;
  return { minute: minutes * 6, hour: h12 * 30 + minutes * 0.5 };
}

/** Numéro du cadran (1…12) vers lequel pointe une aiguille, et si elle est pile dessus. */
function pointsAt(angle) {
  const exact = angle / 30;
  const before = Math.floor(exact);
  return {
    on: Number.isInteger(exact) ? (before === 0 ? 12 : before) : null,
    between: [before === 0 ? 12 : before, before + 1 > 12 ? 1 : before + 1],
  };
}

const hand = (angle, name) => {
  const { on, between } = pointsAt(angle);
  return on ? `la ${name} aiguille sur le ${on}` : `la ${name} aiguille entre le ${between[0]} et le ${between[1]}`;
};

export function label(spec) {
  const { hour, minute } = handAngles(spec);
  return `Horloge : ${hand(hour, 'petite')}, ${hand(minute, 'grande')}.`;
}

export function check(spec, errors) {
  if (!Number.isInteger(spec.hours) || spec.hours < 0 || spec.hours > 23) errors.push('clock.hours : entier de 0 à 23');
  if (!Number.isInteger(spec.minutes) || spec.minutes < 0 || spec.minutes > 59) errors.push('clock.minutes : entier de 0 à 59');
}

/** Point du cadran à `angle` degrés depuis midi, à `distance` du centre. */
function at(angle, distance) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [CENTER + Math.cos(rad) * distance, CENTER + Math.sin(rad) * distance];
}

export function draw(spec) {
  const { hour, minute } = handAngles(spec);
  const marks = [];
  const numbers = [];
  for (let i = 0; i < 60; i += 1) {
    const big = i % 5 === 0;
    const [x1, y1] = at(i * 6, big ? R - 7 : R - 4);
    const [x2, y2] = at(i * 6, R - 1);
    marks.push(s('line', { x1, y1, x2, y2, class: big ? 'clock__tick clock__tick--hour' : 'clock__tick' }));
    if (big) {
      const [tx, ty] = at(i * 6, R - 15);
      numbers.push(s('text', { x: tx, y: ty, class: 'clock__number', 'dominant-baseline': 'central', 'text-anchor': 'middle', text: i === 0 ? 12 : i / 5 }));
    }
  }
  const [hx, hy] = at(hour, R - 20);
  const [mx, my] = at(minute, R - 8);
  return figure('0 0 100 100', label(spec),
    s('circle', { cx: CENTER, cy: CENTER, r: R, class: 'clock__face' }),
    marks, numbers,
    s('line', { x1: CENTER, y1: CENTER, x2: hx, y2: hy, class: 'clock__hand clock__hand--hour' }),
    s('line', { x1: CENTER, y1: CENTER, x2: mx, y2: my, class: 'clock__hand clock__hand--minute' }),
    s('circle', { cx: CENTER, cy: CENTER, r: 3, class: 'clock__pin' }));
}

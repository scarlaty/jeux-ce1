// Courbe d'évolution (#13) : SVG construit à la main, sans aucune bibliothèque.
// La géométrie est calculée par `chartGeometry` (core/stats.js, pur et testé) ; ici, on ne fait
// que poser les coordonnées.
//
// Accessibilité : le <svg> porte role="img" et un <title>/<desc> ; chaque point porte sa valeur
// écrite à côté de lui (l'information ne passe jamais par la seule couleur ni par la seule
// position) ; le même contenu est repris dans un vrai tableau sous la courbe, lisible au
// lecteur d'écran comme à l'œil. Aucune animation : rien à neutraliser pour reduced-motion.
import { h } from './dom.js';
import { chartGeometry } from '../stats.js';

const NS = 'http://www.w3.org/2000/svg';

function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    el.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

let serial = 0;   // identifiants uniques : plusieurs courbes peuvent coexister sur une page

const round = (n) => Math.round(n * 10) / 10;
const pathOf = (segment) => segment.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`).join(' ');

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** Texte de secours quand il n'y a pas encore de quoi tracer. */
function emptyNote(text) {
  return h('p', { class: 'chart__empty', text });
}

/**
 * `series` : sortie de `weeklySeries` (`{ week, label, games, score, total, rate }`).
 * Options : `title` (titre de la courbe), `caption` (phrase sous le tableau).
 * Renvoie un <figure> complet (courbe + tableau des valeurs).
 */
export function weeklyChart(series, { title = 'Réussite semaine après semaine', caption = '' } = {}) {
  const measured = series.filter((row) => row.rate !== null);
  const figure = h('figure', { class: 'chart' }, h('figcaption', { class: 'chart__title', text: title }));

  if (measured.length === 0) {
    figure.append(emptyNote('Pas encore de partie sur cette période.'));
    return figure;
  }

  const geo = chartGeometry(series);
  const { box, plot, points, segments, gridlines } = geo;

  const axes = s('g', { class: 'chart__grid' },
    gridlines.map((g) => [
      s('line', { x1: plot.x, y1: round(g.y), x2: plot.x + plot.width, y2: round(g.y) }),
      s('text', { class: 'chart__axis-label', x: plot.x - 8, y: round(g.y) + 5, 'text-anchor': 'end' }, `${g.rate}`),
    ]));

  const line = s('g', { class: 'chart__line' },
    segments.map((segment) => (segment.length > 1
      ? s('path', { d: pathOf(segment), fill: 'none' })
      : null)));

  // Un point mesuré : disque + valeur écrite. Une semaine sans partie : petit tiret au ras de l'axe.
  const marks = s('g', { class: 'chart__marks' }, points.map((p) => (p.rate === null
    ? s('line', {
      class: 'chart__gap',
      x1: round(p.x) - 5, x2: round(p.x) + 5,
      y1: round(plot.y + plot.height), y2: round(plot.y + plot.height),
    })
    : [
      s('circle', { class: 'chart__dot', cx: round(p.x), cy: round(p.y), r: 5 }),
      s('text', {
        class: 'chart__value',
        x: round(p.x),
        y: round(p.y) - 11,
        'text-anchor': p.x <= plot.x + 12 ? 'start' : (p.x >= plot.x + plot.width - 12 ? 'end' : 'middle'),
      }, `${p.rate}%`),
    ])));

  // Une semaine sur deux au plus serré : les étiquettes ne doivent jamais se chevaucher.
  const everyNth = points.length > 9 ? Math.ceil(points.length / 7) : 1;
  const xLabels = s('g', { class: 'chart__x' }, points.map((p, i) => (
    (i % everyNth === 0 || i === points.length - 1)
      ? s('text', {
        x: round(p.x),
        y: box.height - 24,
        'text-anchor': i === 0 ? 'start' : (i === points.length - 1 ? 'end' : 'middle'),
      }, p.label)
      : null)));

  const uid = `courbe-${++serial}`;
  const svg = s('svg', {
    class: 'chart__svg',
    viewBox: `0 0 ${box.width} ${box.height}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-labelledby': `${uid}-titre ${uid}-desc`,
  },
  s('title', { id: `${uid}-titre` }, title),
  s('desc', { id: `${uid}-desc` },
    `Pourcentage de bonnes réponses par semaine, de la semaine du ${points[0].label} `
    + `à la semaine du ${points[points.length - 1].label} `
    + 'Le détail chiffré est donné dans le tableau qui suit.'),
  axes,
  line,
  marks,
  xLabels,
  s('text', { class: 'chart__axis-name', x: plot.x - 8, y: plot.y - 6, 'text-anchor': 'end' }, '%'));

  const rows = points.map((p) => h('tr', {},
    h('th', { scope: 'row', text: `Semaine du ${p.label}` }),
    h('td', { text: p.rate === null ? '—' : `${p.rate} %` }),
    h('td', { text: p.games === 0 ? 'aucune' : plural(p.games, 'partie') })));

  const table = h('table', { class: 'chart__table' },
    h('caption', { class: 'visually-hidden', text: `${title} : valeurs détaillées` }),
    h('thead', {}, h('tr', {},
      h('th', { scope: 'col', text: 'Semaine' }),
      h('th', { scope: 'col', text: 'Réussite' }),
      h('th', { scope: 'col', text: 'Parties' }))),
    h('tbody', {}, rows));

  figure.append(svg, h('div', { class: 'chart__table-wrap' }, table));
  if (caption) figure.append(h('p', { class: 'chart__caption', text: caption }));
  return figure;
}

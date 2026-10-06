// Graphiques SVG faits main : courbe (score moyen en %) et barres (nombre de parties).
// Couleurs uniquement par classes CSS (tokens) : lisibles en thème clair et sombre.
// Les calculs (graduations, positions) sont des fonctions pures, testées sans DOM.
//
//   lineChart({ points: [{ label, value|null }], title, width? })      valeurs en %, de 0 à 100
//   barChart({ points: [{ label, value }], title, width?, unit: 'partie' })
// `width` : largeur réelle disponible (voir chartWidth) ; `compact` : version plus basse.
// `label` : libellé de l'axe horizontal ; une valeur null laisse un trou dans la courbe.
// Chaque graphique a un titre accessible et un tableau de données masqué pour les lecteurs d'écran.

const NS = 'http://www.w3.org/2000/svg';

/** Pas « rond » (1, 2, 5 × 10ⁿ) pour environ `count` graduations jusqu'à `max`. */
export function niceStep(max, count = 4) {
  if (!(max > 0)) return 1;
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw);
  return Math.max(1, step);
}

/** Graduations entières de 0 à un maximum arrondi ≥ max : { top, ticks }. */
export function integerTicks(max, count = 4) {
  const step = niceStep(Math.max(1, max), count);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

/** Indices des libellés horizontaux à afficher pour ne pas les chevaucher (premier et dernier inclus). */
export function labelIndices(count, maxLabels) {
  if (count <= maxLabels) return [...Array(count).keys()];
  const every = Math.ceil((count - 1) / (maxLabels - 1));
  const out = [];
  for (let i = 0; i < count; i += every) out.push(i);
  if (out[out.length - 1] !== count - 1) {
    if (count - 1 - out[out.length - 1] < every / 2) out.pop();
    out.push(count - 1);
  }
  return out;
}

/** Segments continus de la courbe : les valeurs null coupent la ligne. */
export function lineSegments(values) {
  const segments = [];
  let current = [];
  values.forEach((v, i) => {
    if (v === null || v === undefined) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push(i);
  });
  if (current.length) segments.push(current);
  return segments;
}

// --- Rendu -------------------------------------------------------------------------------------

function svgEl(tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

const PAD = { top: 24, right: 16, bottom: 40, left: 56 };

/**
 * Largeur du dessin (unités SVG) : celle du conteneur, pour que les textes gardent leur taille
 * réelle (un viewBox fixe les rendrait minuscules sur téléphone).
 */
export function chartWidth(container, fallback = 640) {
  const w = container?.clientWidth || fallback;
  return Math.round(Math.min(900, Math.max(280, w)));
}

/** Cadre commun : axes, grille horizontale, libellés. Renvoie { svg, x(i), y(v), plotW }. */
function frame({ count, ticks, top, unit, labels, compact, band, width: W = 640 }) {
  const H = compact ? 200 : 260;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  // `band` : barres centrées dans des colonnes ; sinon points aux extrémités.
  const x = band
    ? (i) => PAD.left + (plotW / count) * (i + 0.5)
    : (i) => PAD.left + (count <= 1 ? plotW / 2 : (plotW / (count - 1)) * i);
  const y = (v) => PAD.top + plotH - (v / top) * plotH;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'chart__svg', role: 'img', preserveAspectRatio: 'xMidYMid meet',
  });
  const grid = svgEl('g', { class: 'chart__grid', 'aria-hidden': 'true' });
  for (const t of ticks) {
    grid.append(svgEl('line', { x1: PAD.left, x2: W - PAD.right, y1: y(t), y2: y(t) }));
    grid.append(svgEl('text', { x: PAD.left - 10, y: y(t), class: 'chart__tick chart__tick--y', 'dominant-baseline': 'middle', 'text-anchor': 'end' },
      unit === '%' ? `${t}\u00a0%` : String(t)));
  }
  grid.append(svgEl('line', { class: 'chart__axis', x1: PAD.left, x2: W - PAD.right, y1: y(0), y2: y(0) }));
  grid.append(svgEl('line', { class: 'chart__axis', x1: PAD.left, x2: PAD.left, y1: PAD.top, y2: y(0) }));
  const maxLabels = Math.max(2, Math.floor((W - PAD.left) / 72));
  for (const i of labelIndices(count, maxLabels)) {
    grid.append(svgEl('text', { x: x(i), y: H - PAD.bottom + 24, class: 'chart__tick chart__tick--x', 'text-anchor': 'middle' }, labels[i]));
  }
  svg.append(grid);
  return { svg, x, y, plotH, plotW };
}

/** Tableau masqué reprenant les données (accessibilité). */
function dataTable(caption, points, format) {
  const table = document.createElement('table');
  table.className = 'visually-hidden';
  const cap = document.createElement('caption');
  cap.textContent = caption;
  table.append(cap);
  for (const p of points) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = p.label;
    const td = document.createElement('td');
    td.textContent = format(p.value);
    tr.append(th, td);
    table.append(tr);
  }
  return table;
}

function wrap(title, svg, table, extraClass) {
  const fig = document.createElement('figure');
  fig.className = `chart ${extraClass || ''}`.trim();
  const cap = document.createElement('figcaption');
  cap.className = 'chart__title';
  cap.textContent = title;
  svg.setAttribute('aria-label', title);
  fig.append(cap, svg, table);
  return fig;
}

/** Courbe d'un pourcentage (0–100) ; les points sans valeur laissent un trou. */
export function lineChart({ points, title, width, compact = false, className = '' }) {
  const ticks = [0, 25, 50, 75, 100];
  const { svg, x, y, plotW } = frame({ count: points.length, ticks, top: 100, unit: '%', labels: points.map((p) => p.label), compact, width });
  const values = points.map((p) => p.value);
  // Valeurs écrites au-dessus des points seulement s'il y a la place (sinon : tableau accessible).
  const showValues = plotW / Math.max(1, points.length) >= 44;
  const g = svgEl('g', { class: 'chart__series', 'aria-hidden': 'true' });
  for (const seg of lineSegments(values)) {
    if (seg.length > 1) {
      const d = seg.map((i, k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)} ${y(values[i]).toFixed(1)}`).join(' ');
      g.append(svgEl('path', { d, class: 'chart__line' }));
    }
  }
  values.forEach((v, i) => {
    if (v === null || v === undefined) return;
    g.append(svgEl('circle', { cx: x(i), cy: y(v), r: 6, class: 'chart__dot' }));
    if (showValues) g.append(svgEl('text', { x: x(i), y: y(v) - 12, class: 'chart__value', 'text-anchor': 'middle' }, `${v}\u00a0%`));
  });
  svg.append(g);
  const table = dataTable(title, points, (v) => (v === null || v === undefined ? 'aucune partie' : `${v}\u00a0%`));
  return wrap(title, svg, table, `chart--line ${className}`);
}

/** Barres d'un nombre entier (parties par semaine). */
export function barChart({ points, title, width, unit = 'partie', compact = false, className = '' }) {
  const max = Math.max(0, ...points.map((p) => p.value || 0));
  const { top, ticks } = integerTicks(max);
  const { svg, x, y, plotW } = frame({ count: points.length, ticks, top, unit, labels: points.map((p) => p.label), compact, band: true, width });
  const bandW = plotW / Math.max(1, points.length);
  const barW = Math.min(56, bandW * 0.62);
  const g = svgEl('g', { class: 'chart__series', 'aria-hidden': 'true' });
  points.forEach((p, i) => {
    const v = p.value || 0;
    if (v > 0) {
      g.append(svgEl('rect', {
        x: x(i) - barW / 2, y: y(v), width: barW, height: Math.max(0, y(0) - y(v)), rx: Math.min(8, barW / 4), class: 'chart__bar',
      }));
    }
    if (v > 0 && bandW >= 22) g.append(svgEl('text', { x: x(i), y: y(v) - 8, class: 'chart__value', 'text-anchor': 'middle' }, String(v)));
  });
  svg.append(g);
  const plural = (n) => `${n} ${unit}${n > 1 ? 's' : ''}`;
  const table = dataTable(title, points, (v) => plural(v || 0));
  return wrap(title, svg, table, `chart--bar ${className}`);
}

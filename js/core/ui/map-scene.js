// La carte au trésor dessinée (#96) : l'archipel, puis l'intérieur d'une île.
//
// Ce module ne décide rien — la géométrie et les textes viennent de core/map.js (pur), les objets
// de ui/art/scenery.js (pur). Il assemble, pose les liens et rend le SVG.
//
// Cadrage : une seule image de 200 × 180, cadrée par la feuille de style — paysage sur tablette,
// portrait sur téléphone (`preserveAspectRatio="xMidYMid slice"`). Tout ce qui porte de
// l'information tient dans la zone sûre de core/map.js, visible dans les deux cadrages. C'est la
// réponse au problème des étiquettes qui se marchaient dessus en 360 px : il n'y a pas deux
// dessins à tenir à jour, mais deux fenêtres sur le même dessin.
import { n, toNode, roundedStar } from './art/kawaii-parts.js';
import { character, mascot } from './art/kawaii.js';
import { propDefs, use, scatter, idsOf, propHeight } from './art/scenery.js';
import { SCENE, PLACE_HEIGHT } from '../map.js';

const r2 = (x) => Number(Number(x).toFixed(2));
const path = (d, cls) => n('path', { d, class: cls });
const ell = (cx, cy, rx, ry, cls) => n('ellipse', { cx, cy, rx, ry, class: cls });
const text = (x, y, value, cls) => n('text', { x, y, class: cls, 'text-anchor': 'middle', text: value });

/** Courbe douce passant par une suite de points (chemins, écume, lignes de relief). */
function smooth(points) {
  if (points.length < 2) return '';
  let d = `M${r2(points[0][0])} ${r2(points[0][1])}`;
  for (let i = 1; i < points.length; i += 1) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    d += `Q${r2((px + x) / 2)} ${r2(py)} ${r2((px + x) / 2 + (x - px) / 4)} ${r2((py + y) / 2)}`;
    d += `T${r2(x)} ${r2(y)}`;
  }
  return d;
}

/** Arc le long du bas d'une ellipse (ligne d'eau, bord de falaise). */
const bottomArc = ({ cx, cy, rx, ry }) => `M${r2(cx - rx)} ${cy}a${rx} ${ry} 0 0 0 ${r2(rx * 2)} 0`;

/** Petite étoile pleine ou vide, pour les compteurs des plaques. */
const starMark = (x, y, size, filled) => path(
  roundedStar(x, y, size, size * 0.46, { round: 0.3, innerRound: 0.24 }),
  filled ? 'sc-star' : 'sc-star-empty',
);

// --- Ciel et mer ---------------------------------------------------------------------------------

/** Le ciel : deux nappes (le haut plus froid, l'horizon plus chaud), le soleil, des nuages. */
function sky({ horizon, scene }) {
  // Tout reste SOUS la ligne de crop du cadrage paysage : un soleil coupé en deux se lit comme
  // une erreur, pas comme un cadrage.
  return [
    n('rect', { x: 0, y: 0, width: SCENE.width, height: SCENE.height, class: 'sc-sky' }),
    path(`M0 ${r2(horizon - 12)}Q50 ${r2(horizon - 18)} 100 ${r2(horizon - 11)}T200 ${r2(horizon - 14)}`
      + `V${r2(horizon + 2)}H0Z`, 'sc-sky-low'),
    use('sun', { scene, x: 30, y: r2(horizon + 1), scale: 0.56 }),
    use('cloud', { scene, x: 86, y: r2(horizon - 4), scale: 0.78 }),
    use('cloud', { scene, x: 160, y: r2(horizon - 7), scale: 0.6, flip: true }),
    use('cloud', { scene, x: 126, y: r2(horizon - 1), scale: 0.46 }),
    use('bird', { scene, x: 60, y: r2(horizon - 9), scale: 0.85 }),
    use('bird', { scene, x: 70, y: r2(horizon - 13), scale: 0.6 }),
    use('bird', { scene, x: 182, y: r2(horizon - 4), scale: 0.7 }),
  ];
}

/** La mer : trois profondeurs en nappes souples, des écumes, des reflets. Aucun dégradé. */
function sea({ horizon }) {
  return [
    n('rect', {
      x: 0, y: horizon, width: SCENE.width, height: SCENE.height - horizon, class: 'sc-sea-deep',
    }),
    path(`M0 ${r2(horizon + 16)}q46-9 92-3t108-5v${SCENE.height}H0Z`, 'sc-sea'),
    path(`M0 ${r2(horizon + 58)}q54-11 104-3t96-7v${SCENE.height}H0Z`, 'sc-sea-shallow'),
    n('g', { class: 'sc-ripples' },
      path(`M14 ${r2(horizon + 10)}q6-3 12 0t12 0`, 'sc-ripple'),
      path(`M152 ${r2(horizon + 8)}q6-3 12 0t12 0`, 'sc-ripple'),
      path(`M62 ${r2(horizon + 26)}q7-3.4 14 0t14 0`, 'sc-ripple'),
      path(`M128 ${r2(horizon + 34)}q7-3.4 14 0t14 0`, 'sc-ripple'),
      path(`M22 ${r2(horizon + 44)}q7-3.4 14 0t14 0`, 'sc-ripple')),
  ];
}

// --- Le corps d'une île --------------------------------------------------------------------------

/**
 * Contour d'une masse de terre, en super-ellipse : `squareness` = 2 donne un simple ovale
 * (les îles lointaines), 3,5 une forme plus carrée aux coins ronds. C'est ce second réglage qui
 * permet à l'île que l'on visite de rester LARGE EN BAS — sinon la rangée de lieux du premier
 * plan déborderait dans la mer.
 */
function landPoints(cx, cy, rx, ry, squareness = 2, steps = 48) {
  const p = 2 / squareness;
  return Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const c = Math.cos(t);
    const si = Math.sin(t);
    return [
      r2(cx + rx * Math.sign(c) * Math.abs(c) ** p),
      r2(cy + ry * Math.sign(si) * Math.abs(si) ** p),
    ];
  });
}

const mid = (a, b) => [r2((a[0] + b[0]) / 2), r2((a[1] + b[1]) / 2)];

/** Tracé fermé et lisse passant par une suite de points (courbes par les milieux). */
function closedPath(points) {
  let d = `M${mid(points[points.length - 1], points[0]).join(' ')}`;
  for (let i = 0; i < points.length; i += 1) {
    const to = mid(points[i], points[(i + 1) % points.length]);
    d += `Q${points[i][0]} ${points[i][1]} ${to[0]} ${to[1]}`;
  }
  return `${d}Z`;
}

const polyline = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');

/**
 * Une île vue de trois quarts : hauts-fonds, ombre portée, falaise avec ses strates, plage, herbe.
 * C'est cette épaisseur, et l'ombre sur l'eau, qui posent l'île sur la mer au lieu de l'y coller.
 */
function islandBody({
  cx, cy, rx, ry, grassInset = 0.84, thickness = 0.9, squareness = 2.1,
}) {
  const wall = r2(ry * thickness);   // hauteur de la falaise
  const pts = landPoints(cx, cy, rx, ry, squareness);
  const half = pts.length / 4;
  // Moitié basse du contour, de la droite vers la gauche en passant par le bas.
  const lower = pts.slice(half, half * 3 + 1);
  const down = (dy) => lower.map(([x, y]) => [x, r2(y + dy)]);
  const cliff = `${polyline(lower)}${polyline([...down(wall)].reverse()).replace('M', 'L')}Z`;
  const land = closedPath(pts);
  const grass = closedPath(landPoints(cx, r2(cy - ry * 0.12), r2(rx * grassInset), r2(ry * grassInset), squareness));
  // Strates : trois lignes parallèles au pied de la falaise. Jamais d'aplat nu sur une grande surface.
  const strata = [0.28, 0.54, 0.8].map((t) => polyline(down(wall * t).slice(2, -2))).join('');
  const lightSide = [...lower.slice(Math.round(lower.length * 0.55))];
  const darkSide = [...lower.slice(0, Math.round(lower.length * 0.3))];
  const sideBand = (part) => `${polyline(part)}${polyline(part.map(([x, y]) => [x, r2(y + wall)]).reverse()).replace('M', 'L')}Z`;
  return [
    // Hauts-fonds : l'eau s'éclaircit autour de la terre. C'est ce halo qui pose l'île sur la mer.
    path(closedPath(landPoints(cx, r2(cy + ry * 0.26), r2(rx * 1.1), r2(ry * 1.42), squareness)), 'sc-shoal'),
    ell(cx, r2(cy + ry + wall * 0.88), r2(rx * 0.82), r2(ry * 0.26), 'sc-cast'),
    // Falaise : éclairée à gauche, à l'ombre à droite.
    path(cliff, 'sc-cliff'),
    path(sideBand(lightSide), 'sc-cliff-lt'),
    path(sideBand(darkSide), 'sc-cliff-dk'),
    n('path', { d: strata, class: 'sc-dt sc-dt--land' }),
    n('path', { d: cliff, class: 'sc-ln sc-ln--land' }),
    // Plage, puis l'écume juste au bord de l'eau
    path(land, 'sc-sand'),
    n('path', { d: land, class: 'sc-ln sc-ln--land' }),
    n('path', { d: polyline(lower.map(([x, y]) => [x, r2(y + 1.6)])), class: 'sc-foam' }),
    // Herbe, avec son ombre de relief et sa crête éclairée
    path(grass, 'sc-grass'),
    path(closedPath(landPoints(r2(cx + rx * 0.05), r2(cy - ry * 0.02), r2(rx * grassInset * 0.86), r2(ry * grassInset * 0.78), squareness)), 'sc-grass-dk'),
    path(closedPath(landPoints(r2(cx - rx * 0.26), r2(cy - ry * 0.42), r2(rx * grassInset * 0.5), r2(ry * grassInset * 0.36), squareness)), 'sc-grass-lt'),
    n('path', { d: grass, class: 'sc-ln sc-ln--land' }),
  ];
}

// --- Plaques ---------------------------------------------------------------------------------------

/**
 * La plaque de bois d'un lieu : deux piquets, une planche, le nom sur une ou deux lignes et le
 * compte d'étoiles. Taille fixe (core/map.js) : c'est ce qui garantit l'absence de chevauchement.
 */
function plaque({ x, y, width, height, lines, meta, stars = null, max = 0, dim = false }) {
  const w2 = r2(width / 2);
  const h2 = r2(height / 2);
  const lh = r2(height * 0.33);
  const top = r2(-(lines.length - 1) * lh / 2 - height * 0.12);
  const starRow = stars === null ? null : n('g', {},
    [0, 1, 2].map((i) => starMark(r2(x - 15 + i * 5), r2(y + height * 0.3), r2(height * 0.105),
      stars >= (i + 1) * (max / 3))),
    n('text', {
      x: r2(x + 9), y: r2(y + height * 0.36), class: 'sc-plaque-meta', 'text-anchor': 'middle', text: meta,
    }));
  return n('g', { class: `sc-plaque${dim ? ' is-dim' : ''}` },
    n('rect', { x: r2(x - w2 * 0.56), y: r2(y + h2 - 2), width: 2.6, height: r2(height * 0.46), class: 'sc-post' }),
    n('rect', { x: r2(x + w2 * 0.56 - 2.6), y: r2(y + h2 - 2), width: 2.6, height: r2(height * 0.46), class: 'sc-post' }),
    n('rect', {
      x: r2(x - w2 + 1.5), y: r2(y - h2 + 2.5), width: r2(width - 3), height, rx: 4, class: 'sc-plaque-shadow',
    }),
    n('rect', { x: r2(x - w2), y: r2(y - h2), width, height, rx: 4.5, class: 'sc-plaque-board' }),
    n('rect', {
      x: r2(x - w2 + 1.6), y: r2(y - h2 + 1.6), width: r2(width - 3.2), height: r2(height * 0.34), rx: 3,
      class: 'sc-plaque-light',
    }),
    n('rect', { x: r2(x - w2), y: r2(y - h2), width, height, rx: 4.5, class: 'sc-ln' }),
    lines.map((line, i) => text(x, r2(y + top + i * lh), line, 'sc-plaque-name')),
    starRow || n('text', {
      x, y: r2(y + height * 0.36), class: 'sc-plaque-meta', 'text-anchor': 'middle', text: meta,
    }));
}

// --- L'archipel --------------------------------------------------------------------------------------

const ARCHIPELAGO_PROPS = ['sun', 'cloud', 'bird', 'palm', 'tree', 'bush', 'rock', 'boat', 'frond', 'lock', 'tuft', 'flower'];

/** Le petit décor posé sur une île de l'archipel : il change avec sa taille, jamais vide. */
function islandTrim(entry, scene) {
  const { cx, cy, rx, ry, id } = entry;
  const s = Math.min(1, rx / 42) * 0.86;
  const items = [
    { id: id === 'mots' ? 'palm' : 'tree', x: cx - rx * 0.52, y: cy - ry * 0.34, scale: 0.9 * s },
    { id: 'tree', x: cx + rx * 0.5, y: cy - ry * 0.2, scale: 0.78 * s, flip: true },
    { id: 'rock', x: cx - rx * 0.1, y: cy - ry * 0.5, scale: 0.7 * s },
    { id: 'bush', x: cx - rx * 0.34, y: cy + ry * 0.22, scale: 1.1 * s },
    { id: 'bush', x: cx + rx * 0.3, y: cy + ry * 0.3, scale: 0.9 * s, flip: true },
    { id: 'tuft', x: cx - rx * 0.72, y: cy + ry * 0.14, scale: 1.1 * s },
    { id: 'tuft', x: cx + rx * 0.7, y: cy + ry * 0.1, scale: 1 * s, flip: true },
    { id: 'tuft', x: cx + rx * 0.04, y: cy + ry * 0.44, scale: 0.95 * s },
    { id: 'flower', x: cx - rx * 0.56, y: cy + ry * 0.4, scale: 1.1 * s, tint: 'rose' },
    { id: 'flower', x: cx + rx * 0.44, y: cy + ry * 0.42, scale: 1 * s, tint: 'citron' },
  ];
  return scatter(scene, items);
}

/** Une île de l'archipel : un lien vers son intérieur, ou une île encore fermée dans la brume. */
function archipelagoIsland(entry, scene) {
  const { id, unlocked, plaque: at, lines, label, starsLeft } = entry;
  const body = n('g', { class: 'sc-island-body' },
    islandBody({ ...entry, thickness: 0.62, squareness: 2.2 }),
    islandTrim(entry, scene));
  const sign = unlocked
    ? plaque({
      x: at.x, y: at.y, width: 46, height: 22, lines, meta: entry.meta, stars: null,
    })
    : n('g', {},
      plaque({ x: at.x, y: at.y, width: 46, height: 22, lines, meta: entry.meta, dim: true }),
      use('lock', { scene, x: at.x + 18, y: at.y - 6, scale: 0.72 }));
  const content = [body, sign];
  if (!unlocked) {
    return n('g', {
      class: 'sc-island is-locked', 'data-island': id, role: 'img', 'aria-label': label,
    }, content, n('title', { text: `${entry.name} — encore ${starsLeft} étoiles` }));
  }
  return n('a', {
    href: `#/ile/${id}`, class: 'sc-island sc-link', 'data-island': id, 'aria-label': label,
  },
  n('ellipse', {
    cx: entry.cx, cy: entry.cy, rx: r2(entry.rx + 4), ry: r2(entry.ry + 10), class: 'sc-halo',
  }),
  content);
}

/** La scène de l'archipel (accueil). `entries` vient de core/map.js (déjà triées par profondeur). */
export function archipelagoScene(entries) {
  const scene = 'world';
  const horizon = 34;
  const foreground = [
    { id: 'frond', x: 6, y: 182, scale: 2.1 },
    { id: 'frond', x: 26, y: 186, scale: 1.5 },
    { id: 'frond', x: 196, y: 180, scale: 2, flip: true },
    { id: 'frond', x: 178, y: 186, scale: 1.4, flip: true },
    { id: 'pebble', x: 44, y: 176, scale: 1.1 },
    { id: 'starfish', x: 162, y: 174, scale: 1.1, tint: 'peche' },
  ];
  const tree = n('svg', {
    viewBox: `0 0 ${SCENE.width} ${SCENE.height}`,
    class: 'map-scene map-scene--world',
    preserveAspectRatio: 'xMidYMid slice',
    role: 'img',
    'aria-label': 'Carte de l\'archipel : cinq îles posées sur la mer.',
    focusable: 'false',
  },
  n('defs', {}, propDefs(scene, [...ARCHIPELAGO_PROPS, ...idsOf(foreground), 'pebble', 'starfish'])),
  sky({ horizon, scene }),
  sea({ horizon }),
  use('boat', { scene, x: 186, y: 74, scale: 0.9, tint: 'citron' }),
  use('boat', { scene, x: 18, y: 96, scale: 0.7, tint: 'rose' }),
  entries.map((entry) => archipelagoIsland(entry, scene)),
  n('g', { class: 'sc-foreground' }, scatter(scene, foreground)));
  return toNode(tree);
}

// --- L'intérieur d'une île -----------------------------------------------------------------------

const ISLAND_PROPS = [
  'sun', 'cloud', 'bird', 'boat', 'palm', 'tree', 'bush', 'flower', 'tuft', 'pebble', 'rock',
  'shell', 'starfish', 'mushroom', 'lantern', 'bunting', 'barrel', 'chest', 'frond', 'sign',
];

/**
 * Le décor de remplissage de l'île : la règle de la direction artistique est « si une zone de la
 * taille d'un bâtiment est vide, il y manque un objet ». Les objets sont posés loin des cases des
 * lieux (core/map.js), donc ils ne cachent jamais un nom.
 */
const ISLAND_SCATTER = [
  // Rive du fond : la ligne de végétation dépasse au-dessus des plaques, elle ferme la scène
  { id: 'palm', x: 26, y: 72, scale: 0.8 },
  { id: 'tree', x: 74, y: 70, scale: 0.72 },
  { id: 'bush', x: 64, y: 73, scale: 0.78 },
  { id: 'tree', x: 128, y: 68, scale: 0.68, flip: true },
  { id: 'bush', x: 138, y: 72, scale: 0.72, flip: true },
  { id: 'palm', x: 176, y: 74, scale: 0.76, flip: true },
  { id: 'tuft', x: 88, y: 72, scale: 0.7 },
  { id: 'tuft', x: 114, y: 69, scale: 0.65, flip: true },
  { id: 'bush', x: 160, y: 68, scale: 0.6, flip: true },
  { id: 'rock', x: 40, y: 70, scale: 0.5 },
  { id: 'tuft', x: 50, y: 74, scale: 0.6 },
  { id: 'tuft', x: 152, y: 75, scale: 0.6, flip: true },
  // Couloir de gauche
  { id: 'bush', x: 24, y: 114, scale: 1 },
  { id: 'flower', x: 33, y: 122, scale: 0.95, tint: 'rose' },
  { id: 'flower', x: 22, y: 128, scale: 0.85, tint: 'citron' },
  { id: 'tuft', x: 36, y: 108, scale: 0.9 },
  { id: 'lantern', x: 22, y: 102, scale: 0.8 },
  { id: 'mushroom', x: 40, y: 128, scale: 0.7, tint: 'rose' },
  // Clairière du milieu : entre les deux rangées, le coin où l'on pose ses affaires
  { id: 'barrel', x: 74, y: 118, scale: 0.72 },
  { id: 'chest', x: 84, y: 123, scale: 0.75 },
  { id: 'tuft', x: 66, y: 126, scale: 0.85 },
  { id: 'flower', x: 70, y: 131, scale: 0.8, tint: 'citron' },
  { id: 'mushroom', x: 124, y: 120, scale: 0.75, tint: 'peche' },
  { id: 'flower', x: 132, y: 127, scale: 0.9, tint: 'lavande' },
  { id: 'tuft', x: 118, y: 129, scale: 0.8, flip: true },
  { id: 'bush', x: 134, y: 114, scale: 0.8 },
  { id: 'pebble', x: 108, y: 132, scale: 0.8 },
  { id: 'pebble', x: 94, y: 133, scale: 0.7 },
  // Couloir de droite
  { id: 'bush', x: 176, y: 116, scale: 0.95, flip: true },
  { id: 'flower', x: 167, y: 124, scale: 0.9, tint: 'citron' },
  { id: 'flower', x: 178, y: 130, scale: 0.8, tint: 'rose' },
  { id: 'tuft', x: 164, y: 110, scale: 0.85, flip: true },
  { id: 'lantern', x: 178, y: 102, scale: 0.8, flip: true },
  { id: 'mushroom', x: 160, y: 130, scale: 0.7, tint: 'lavande' },
  // La plage, devant : palmiers des deux bords et petits trésors au bord de l'eau
  { id: 'palm', x: 18, y: 148, scale: 1.05 },
  { id: 'palm', x: 184, y: 150, scale: 1, flip: true },
  { id: 'tuft', x: 30, y: 156, scale: 0.9 },
  { id: 'tuft', x: 172, y: 157, scale: 0.85, flip: true },
  { id: 'shell', x: 62, y: 162, scale: 0.85, tint: 'rose' },
  { id: 'starfish', x: 140, y: 163, scale: 0.9, tint: 'peche' },
  { id: 'pebble', x: 84, y: 164, scale: 0.9 },
  { id: 'pebble', x: 92, y: 166, scale: 0.7 },
  { id: 'shell', x: 116, y: 164, scale: 0.75, tint: 'ciel' },
  { id: 'pebble', x: 124, y: 166, scale: 0.85 },
  { id: 'starfish', x: 44, y: 165, scale: 0.8, tint: 'lavande' },
];

const ISLAND_FOREGROUND = [
  { id: 'frond', x: 2, y: 176, scale: 2.2 },
  { id: 'frond', x: 24, y: 182, scale: 1.5 },
  { id: 'frond', x: 198, y: 174, scale: 2.1, flip: true },
  { id: 'frond', x: 176, y: 182, scale: 1.4, flip: true },
  { id: 'pebble', x: 48, y: 174, scale: 1.3 },
  { id: 'pebble', x: 152, y: 172, scale: 1.1 },
];

/**
 * Marques d'herbe : de petits « v » semés sur la pelouse. Sans eux, la plus grande surface de la
 * scène resterait un aplat — la règle n°4 de la direction artistique l'interdit.
 */
function grassMarks(cx, cy, rx, ry) {
  const seeds = [
    [-0.78, -0.3], [-0.52, 0.12], [-0.3, -0.48], [-0.06, 0.34], [0.18, -0.2], [0.44, 0.26],
    [0.68, -0.36], [0.82, 0.08], [-0.66, 0.42], [-0.18, 0.6], [0.3, 0.56], [0.6, 0.5],
    [-0.42, -0.6], [0.06, -0.62], [0.52, -0.58], [-0.86, 0.16], [0.86, 0.38], [-0.08, -0.08],
  ];
  return n('g', { class: 'sc-grass-marks' }, seeds.map(([u, v]) => {
    const x = r2(cx + rx * u);
    const y = r2(cy + ry * v);
    return path(`M${x} ${y}l-1.6-2.6M${r2(x + 1.4)} ${y}l1-2.4`, 'sc-blade');
  }));
}

/** Le chemin qui relie les lieux : il ne numérote rien, il invite à se promener. */
function trail(slots) {
  if (slots.length < 2) return [];
  const mid = slots.reduce((sum, p) => sum + p.y, 0) / slots.length;
  const points = [...slots]
    .map((p, i) => [p.ax, r2(mid + (i % 2 ? 8 : -8))])
    .sort((a, b) => a[0] - b[0]);
  const d = smooth([[8, r2(mid + 24)], ...points, [192, r2(mid + 20)]]);
  return [path(d, 'sc-trail'), path(d, 'sc-trail-top')];
}

/** Un lieu : sa zone touchable, son décor, sa plaque. Toujours un lien, toujours au clavier. */
function placeNode(place, layout, scene) {
  const { slot } = place;
  const meta = place.played ? `${place.stars} / ${place.max}` : 'à découvrir';
  return n('a', {
    href: place.href,
    class: `sc-place sc-link${place.played ? '' : ' is-new'}`,
    'aria-label': place.label,
  },
  n('rect', { ...slot.hit, rx: 6, class: 'sc-hit' }),
  n('rect', { ...slot.hit, rx: 6, class: 'sc-halo-box' }),
  // Chaque lieu est ramené à la même emprise : un phare ne doit pas déborder sur la plaque du
  // lieu de derrière, et des rochers bas ne doivent pas avoir l'air perdus dans leur case.
  use(place.kind, {
    scene,
    x: slot.ax,
    y: slot.ay,
    scale: r2(layout.decor * Math.min(1.15, PLACE_HEIGHT / (propHeight(place.kind) || PLACE_HEIGHT))),
  }),
  plaque({
    x: slot.x,
    y: slot.y,
    width: layout.plaque.width,
    height: layout.plaque.height,
    lines: place.lines,
    meta,
    stars: place.played ? place.stars : null,
    max: place.max,
    dim: !place.played,
  }));
}

/** La mascotte de l'île, posée au sol dans la scène (décorative : le texte dit déjà tout). */
function mascotNode(islandId, { x, y, size }) {
  const art = character(mascot(islandId, { face: 'happy', decorative: true }));
  const svg = {
    ...art,
    attrs: {
      ...art.attrs,
      class: `${art.attrs.class} map-mascot`.replace('art ', ''),
      x: r2(x - size / 2),
      y: r2(y - size),
      width: size,
      height: size,
    },
  };
  return n('g', { class: 'sc-mascot', 'aria-hidden': 'true' },
    ell(x, y, r2(size * 0.26), r2(size * 0.08), 'sc-shadow'),
    svg);
}

/**
 * La scène d'une île : le décor, les lieux, la mascotte.
 * `island` : l'entrée du registre. `places` et `layout` : core/map.js.
 */
export function islandScene(island, places, layout) {
  const scene = `isle-${island.id}`;
  const horizon = 34;
  const body = { cx: 100, cy: 104, rx: 87, ry: 52, thickness: 0.2, squareness: 3.4, grassInset: 0.88 };
  const kinds = [...new Set(places.map((p) => p.kind))];
  const used = [...ISLAND_PROPS, ...kinds, ...idsOf(ISLAND_SCATTER), ...idsOf(ISLAND_FOREGROUND)];
  const tree = n('svg', {
    viewBox: `0 0 ${SCENE.width} ${SCENE.height}`,
    class: 'map-scene map-scene--isle',
    preserveAspectRatio: 'xMidYMid slice',
    role: 'img',
    'aria-label': `${island.name} vue de haut : ${places.length} lieux à visiter librement.`,
    focusable: 'false',
  },
  n('defs', {}, propDefs(scene, used)),
  sky({ horizon, scene }),
  sea({ horizon }),
  use('boat', { scene, x: 176, y: 46, scale: 0.7, tint: 'ciel' }),
  use('boat', { scene, x: 22, y: 44, scale: 0.55, tint: 'citron' }),
  islandBody(body),
  // Les collines du fond : du relief posé SUR l'herbe, derrière la première rangée de lieux
  path('M24 80q26-26 50 0t46-8 46 10q-38 10-72 10t-70-12Z', 'sc-hill'),
  path('M40 77q18-19 38-2t30-5q-24 8-38 8t-30-1Z', 'sc-hill-lt'),
  grassMarks(100, 102, 70, 36),
  trail(layout.slots),
  n('g', { class: 'sc-scatter' }, scatter(scene, ISLAND_SCATTER)),
  // La guirlande traverse l'arrière de l'île : elle passe derrière les lieux, comme une corde tendue.
  use('bunting', { scene, x: 100, y: 70, scale: 1.5 }),
  places.map((place) => placeNode(place, layout, scene)),
  mascotNode(island.id, { x: 38, y: 118, size: 21 }),
  n('g', { class: 'sc-foreground' }, scatter(scene, ISLAND_FOREGROUND)));
  return toNode(tree);
}

export { PLACE_HEIGHT };

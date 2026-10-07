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
import { propDefs, use, scatter, idsOf } from './art/scenery.js';
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
  return [
    n('rect', { x: 0, y: 0, width: SCENE.width, height: SCENE.height, class: 'sc-sky' }),
    path(`M0 ${r2(horizon - 12)}Q50 ${r2(horizon - 18)} 100 ${r2(horizon - 11)}T200 ${r2(horizon - 14)}`
      + `V${r2(horizon + 2)}H0Z`, 'sc-sky-low'),
    use('sun', { scene, x: 28, y: r2(horizon - 2), scale: 0.72 }),
    use('cloud', { scene, x: 84, y: 16, scale: 0.9 }),
    use('cloud', { scene, x: 158, y: 12, scale: 0.68, flip: true }),
    use('cloud', { scene, x: 124, y: 26, scale: 0.52 }),
    use('bird', { scene, x: 58, y: 14, scale: 0.9 }),
    use('bird', { scene, x: 68, y: 9, scale: 0.6 }),
    use('bird', { scene, x: 180, y: 24, scale: 0.75 }),
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
 * Une île vue de trois quarts : ombre portée sur l'eau, dessous rocheux, falaise, plage, herbe.
 * C'est l'épaisseur (quatre couches) qui la pose sur la mer plutôt que de la coller dessus.
 */
function islandBody({ cx, cy, rx, ry, grassInset = 0.82, thickness = 0.95 }) {
  const gx = r2(rx * grassInset);
  const gy = r2(ry * grassInset);
  const gcy = r2(cy - ry * 0.14);
  const wall = r2(ry * thickness);   // la falaise : c'est elle qui donne l'épaisseur
  const base = { cx, cy, rx, ry };
  const cliff = `${bottomArc(base)}v${wall}a${rx} ${ry} 0 0 1 ${r2(-rx * 2)} 0Z`;
  // Strates : trois arcs parallèles dans la falaise. Jamais d'aplat nu sur une grande surface.
  const strata = [0.3, 0.56, 0.82].map((t) => `M${r2(cx - rx * 0.84)} ${r2(cy + ry * 0.56 + wall * t)}`
    + `a${r2(rx * 0.86)} ${r2(ry * 0.86)} 0 0 0 ${r2(rx * 1.68)} 0`).join('');
  return [
    // Hauts-fonds : l'eau s'éclaircit autour de la terre. C'est ce halo qui pose l'île sur la mer.
    ell(cx, r2(cy + ry * 0.4), r2(rx * 1.16), r2(ry * 1.8), 'sc-shoal'),
    ell(cx, r2(cy + ry + wall * 0.9), r2(rx * 0.84), r2(ry * 0.3), 'sc-cast'),
    // Falaise : éclairée à gauche, à l'ombre à droite.
    path(cliff, 'sc-cliff'),
    path(`M${r2(cx - rx)} ${cy}a${rx} ${ry} 0 0 0 ${r2(rx * 0.56)} ${r2(ry * 0.83)}`
      + `v${wall}a${rx} ${ry} 0 0 1 ${r2(-rx * 0.56)} ${r2(-ry * 0.83)}Z`, 'sc-cliff-lt'),
    path(`M${r2(cx + rx * 0.56)} ${r2(cy + ry * 0.83)}a${rx} ${ry} 0 0 0 ${r2(rx * 0.44)} ${r2(-ry * 0.83)}`
      + `v${wall}a${rx} ${ry} 0 0 1 ${r2(-rx * 0.44)} ${r2(ry * 0.83)}Z`, 'sc-cliff-dk'),
    n('path', { d: strata, class: 'sc-dt sc-dt--land' }),
    n('path', { d: cliff, class: 'sc-ln sc-ln--land' }),
    // Plage, puis l'écume juste au bord de l'eau
    ell(cx, cy, rx, ry, 'sc-sand'),
    n('ellipse', { cx, cy, rx, ry, class: 'sc-ln sc-ln--land' }),
    path(`M${r2(cx - rx * 1.02)} ${r2(cy + ry * 0.1)}a${r2(rx * 1.06)} ${r2(ry * 1.06)} 0 0 0 ${r2(rx * 2.04)} 0`, 'sc-foam'),
    // Herbe, avec son ombre de relief et sa crête éclairée
    ell(cx, gcy, gx, gy, 'sc-grass'),
    path(`M${r2(cx - gx * 0.92)} ${r2(gcy + gy * 0.1)}q${r2(gx * 0.45)} ${r2(-gy * 0.62)} ${r2(gx * 0.95)} ${r2(-gy * 0.5)}`
      + `t${r2(gx * 0.88)} ${r2(gy * 0.48)}q${r2(-gx * 0.5)} ${r2(gy * 0.72)} ${r2(-gx * 0.95)} ${r2(gy * 0.68)}`
      + `t${r2(-gx * 0.88)} ${r2(-gy * 0.76)}Z`, 'sc-grass-dk'),
    path(`M${r2(cx - gx * 0.74)} ${r2(gcy - gy * 0.2)}q${r2(gx * 0.5)} ${r2(-gy * 0.55)} ${r2(gx * 1.1)} ${r2(-gy * 0.3)}`
      + `q${r2(-gx * 0.6)} ${r2(gy * 0.46)} ${r2(-gx * 1.1)} ${r2(gy * 0.3)}Z`, 'sc-grass-lt'),
    n('ellipse', { cx, cy: gcy, rx: gx, ry: gy, class: 'sc-ln sc-ln--land' }),
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
    islandBody({ ...entry, thickness: 0.52 }),
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
  // Arrière-plan : la ligne d'arbres de la colline
  { id: 'palm', x: 26, y: 72, scale: 0.86 },
  { id: 'tree', x: 172, y: 70, scale: 0.8, flip: true },
  { id: 'tree', x: 86, y: 58, scale: 0.6 },
  { id: 'bush', x: 124, y: 62, scale: 0.7 },
  { id: 'rock', x: 150, y: 60, scale: 0.55 },
  { id: 'tuft', x: 64, y: 62, scale: 0.8 },
  { id: 'tuft', x: 110, y: 58, scale: 0.7, flip: true },
  { id: 'mushroom', x: 96, y: 64, scale: 0.7, tint: 'rose' },
  // Plan moyen : la clairière entre les deux rangées de lieux
  { id: 'bush', x: 20, y: 104, scale: 1 },
  { id: 'bush', x: 182, y: 106, scale: 0.95, flip: true },
  { id: 'flower', x: 34, y: 112, scale: 1, tint: 'rose' },
  { id: 'flower', x: 40, y: 118, scale: 0.85, tint: 'citron' },
  { id: 'flower', x: 164, y: 114, scale: 1, tint: 'lavande' },
  { id: 'flower', x: 172, y: 120, scale: 0.85, tint: 'rose' },
  { id: 'tuft', x: 76, y: 104, scale: 0.9 },
  { id: 'tuft', x: 126, y: 102, scale: 0.85, flip: true },
  { id: 'barrel', x: 92, y: 110, scale: 0.75 },
  { id: 'chest', x: 108, y: 112, scale: 0.8 },
  { id: 'lantern', x: 66, y: 114, scale: 0.9 },
  { id: 'lantern', x: 140, y: 112, scale: 0.85, flip: true },
  { id: 'mushroom', x: 116, y: 118, scale: 0.8, tint: 'peche' },
  // Devant : la plage et ses trésors
  { id: 'palm', x: 14, y: 140, scale: 1.1 },
  { id: 'palm', x: 188, y: 142, scale: 1.05, flip: true },
  { id: 'tuft', x: 32, y: 148, scale: 1 },
  { id: 'tuft', x: 170, y: 150, scale: 0.95, flip: true },
  { id: 'shell', x: 56, y: 156, scale: 0.9, tint: 'rose' },
  { id: 'starfish', x: 148, y: 157, scale: 0.95, tint: 'peche' },
  { id: 'pebble', x: 80, y: 158, scale: 1 },
  { id: 'pebble', x: 88, y: 160, scale: 0.7 },
  { id: 'pebble', x: 120, y: 157, scale: 0.9 },
  { id: 'shell', x: 104, y: 160, scale: 0.75, tint: 'ciel' },
  { id: 'flower', x: 96, y: 148, scale: 0.8, tint: 'citron' },
];

const ISLAND_FOREGROUND = [
  { id: 'frond', x: 4, y: 182, scale: 2.3 },
  { id: 'frond', x: 28, y: 188, scale: 1.6 },
  { id: 'frond', x: 198, y: 180, scale: 2.2, flip: true },
  { id: 'frond', x: 174, y: 188, scale: 1.5, flip: true },
  { id: 'pebble', x: 52, y: 178, scale: 1.3 },
  { id: 'pebble', x: 150, y: 176, scale: 1.1 },
];

/** Le chemin qui relie les lieux : il ne numérote rien, il invite à se promener. */
function trail(slots) {
  if (slots.length < 2) return [];
  const points = [...slots]
    .map((s) => [s.ax, s.ay + 4])
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const d = smooth([[14, 150], ...points, [188, 148]]);
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
  use(place.kind, { scene, x: slot.ax, y: slot.ay, scale: layout.decor }),
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
  const body = { cx: 100, cy: 104, rx: 97, ry: 50 };
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
  use('boat', { scene, x: 178, y: 62, scale: 0.8, tint: 'ciel' }),
  // Les collines du fond : du relief avant même les lieux
  path('M30 76q22-30 46-2t44-6 40 10q-34 10-66 10t-64-12Z', 'sc-hill'),
  path('M44 72q16-20 34-2t30-4q-22 8-34 8t-30-2Z', 'sc-hill-lt'),
  islandBody(body),
  trail(layout.slots),
  n('g', { class: 'sc-scatter' }, scatter(scene, ISLAND_SCATTER)),
  // La guirlande de fanions, tendue entre les deux palmiers du bord
  use('bunting', { scene, x: 100, y: 150, scale: 1.1 }),
  places.map((place) => placeNode(place, layout, scene)),
  mascotNode(island.id, { x: 100, y: 128, size: 30 }),
  n('g', { class: 'sc-foreground' }, scatter(scene, ISLAND_FOREGROUND)));
  return toNode(tree);
}

export { PLACE_HEIGHT };

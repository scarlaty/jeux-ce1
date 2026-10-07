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
import { SCENE, SAFE, PLACE_HEIGHT, BADGE, ISLAND_PLAQUE } from '../map.js';

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

/** Petite étoile pleine ou vide : repère d'un lieu, plaque d'une île. */
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

/** Nappe à bord souple : une courbe qui traverse la scène, puis tout ce qui est dessous. */
function sheet(points, cls) {
  return path(`${smooth(points)}L${SCENE.width} ${SCENE.height}H0Z`, cls);
}

/** Une ligne de bord souple, entre deux nappes, pour l'écume. */
const edge = (points, cls) => path(smooth(points), cls);

/**
 * La mer : trois profondeurs en nappes souples, des écumes, des reflets. Aucun dégradé.
 * L'HORIZON AUSSI est une nappe souple : une règle parfaitement horizontale coupait la scène en
 * deux et se lisait comme un bord de cadre (relecture du premier lot). Entre le ciel et l'eau,
 * une brume pâle fait la transition — c'est elle qui donne la distance.
 */
function sea({ horizon }) {
  const far = [[0, horizon + 2], [42, horizon - 2.5], [96, horizon + 2.5], [150, horizon - 2], [200, horizon + 1.5]];
  return [
    sheet([[0, horizon - 7], [50, horizon - 10], [104, horizon - 6], [156, horizon - 9], [200, horizon - 5]], 'sc-haze'),
    sheet(far, 'sc-sea-deep'),
    edge(far.map(([x, y]) => [x, r2(y + 1.4)]), 'sc-foam sc-foam--far'),
    sheet([[0, horizon + 17], [46, horizon + 11], [100, horizon + 19], [154, horizon + 12], [200, horizon + 16]], 'sc-sea'),
    sheet([[0, horizon + 58], [52, horizon + 50], [104, horizon + 60], [156, horizon + 51], [200, horizon + 57]], 'sc-sea-shallow'),
    n('g', { class: 'sc-ripples' },
      path(`M14 ${r2(horizon + 10)}q6-3 12 0t12 0`, 'sc-ripple'),
      path(`M152 ${r2(horizon + 8)}q6-3 12 0t12 0`, 'sc-ripple'),
      path(`M62 ${r2(horizon + 30)}q7-3.4 14 0t14 0`, 'sc-ripple'),
      path(`M128 ${r2(horizon + 38)}q7-3.4 14 0t14 0`, 'sc-ripple'),
      path(`M22 ${r2(horizon + 46)}q7-3.4 14 0t14 0`, 'sc-ripple')),
  ];
}

// --- Le corps d'une île --------------------------------------------------------------------------

/**
 * Contour d'une masse de terre, en super-ellipse : `squareness` = 2 donne un simple ovale
 * (les îles lointaines), 3,5 une forme plus carrée aux coins ronds. C'est ce second réglage qui
 * permet à l'île que l'on visite de rester LARGE EN BAS — sinon la rangée de lieux du premier
 * plan déborderait dans la mer.
 *
 * `wave` creuse ensuite des baies : c'est ce qui donne à chaque île de l'archipel SA côte, alors
 * qu'elles avaient toutes la même silhouette. L'ondulation ne fait que rentrer (facteur ≤ 1),
 * donc une île ne déborde jamais du rectangle que la composition lui réserve.
 */
function landPoints(cx, cy, rx, ry, shape = {}, steps = 48) {
  const { squareness = 2, wave = null } = shape;
  const p = 2 / squareness;
  return Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const c = Math.cos(t);
    const si = Math.sin(t);
    const f = wave ? 1 - (wave.amp * (1 - Math.cos(wave.k * t + wave.phase))) / 2 : 1;
    return [
      r2(cx + rx * f * Math.sign(c) * Math.abs(c) ** p),
      r2(cy + ry * f * Math.sign(si) * Math.abs(si) ** p),
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
  cx, cy, rx, ry, grassInset = 0.84, thickness = 0.9, squareness = 2.1, wave = null,
}) {
  const shape = { squareness, wave };
  const soft = { squareness: Math.min(squareness, 2.2), wave };
  const wall = r2(ry * thickness);   // hauteur de la falaise
  const pts = landPoints(cx, cy, rx, ry, shape);
  const half = pts.length / 4;
  // Moitié basse du contour, de la droite vers la gauche en passant par le bas.
  const lower = pts.slice(half, half * 3 + 1);
  const down = (dy) => lower.map(([x, y]) => [x, r2(y + dy)]);
  const cliff = `${polyline(lower)}${polyline([...down(wall)].reverse()).replace('M', 'L')}Z`;
  const land = closedPath(pts);
  const grass = closedPath(landPoints(cx, r2(cy - ry * 0.12), r2(rx * grassInset), r2(ry * grassInset), shape));
  // Strates : trois lignes parallèles au pied de la falaise. Jamais d'aplat nu sur une grande surface.
  const strata = [0.28, 0.54, 0.8].map((t) => polyline(down(wall * t).slice(2, -2))).join('');
  const lightSide = [...lower.slice(Math.round(lower.length * 0.55))];
  const darkSide = [...lower.slice(0, Math.round(lower.length * 0.3))];
  const sideBand = (part) => `${polyline(part)}${polyline(part.map(([x, y]) => [x, r2(y + wall)]).reverse()).replace('M', 'L')}Z`;
  return [
    // Hauts-fonds : l'eau s'éclaircit autour de la terre. C'est ce halo qui pose l'île sur la mer.
    path(closedPath(landPoints(cx, r2(cy + ry * 0.26), r2(rx * 1.1), r2(ry * 1.42), shape)), 'sc-shoal'),
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
    // Le modelé de la pelouse se trace en formes RONDES, même quand la côte est un plateau :
    // reprise de la super-ellipse carrée, l'ombre et la lumière dessinaient deux rectangles aux
    // coins arrondis au milieu de l'herbe, qu'on prenait pour un défaut d'affichage.
    path(closedPath(landPoints(r2(cx + rx * 0.05), r2(cy - ry * 0.02), r2(rx * grassInset * 0.86), r2(ry * grassInset * 0.78), soft)), 'sc-grass-dk'),
    path(closedPath(landPoints(r2(cx - rx * 0.26), r2(cy - ry * 0.42), r2(rx * grassInset * 0.5), r2(ry * grassInset * 0.36), soft)), 'sc-grass-lt'),
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
    // Trois étoiles pour résumer neuf : la première se gagne dès la première étoile, pas au tiers.
    // Une enfant qui vient de réussir un niveau doit VOIR quelque chose s'allumer.
    [0, 1, 2].map((i) => starMark(r2(x - 15 + i * 5), r2(y + height * 0.3), r2(height * 0.105),
      stars >= (i * max) / 3 + 1)),
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

const ARCHIPELAGO_PROPS = [
  'sun', 'cloud', 'bird', 'palm', 'tree', 'bush', 'rock', 'boat', 'frond', 'lock', 'tuft',
  'flower', 'pebble', 'mushroom', 'tent', 'lantern', 'shell', 'starfish',
];

/**
 * Le semis de chaque île de l'archipel. Elles avaient toutes la même silhouette ET le même décor
 * (relecture du premier lot) : on les reconnaissait seulement à leur plaque. Ici, chacune a son
 * paysage — cocotiers, rochers, plateau, forêt, campement — posé en coordonnées RELATIVES
 * `[u, v]` dans [-1, 1] du rayon de l'île, pour que le même semis serve à toute taille.
 *
 * Forme d'un élément : [prop, u, v, échelle, retourné ?, teinte ?].
 */
export const ISLAND_TRIM = {
  // Tropicale : cocotiers penchés, fleurs, coquillages sur le sable. Les deux grands sont posés
  // AUX EXTRÉMITÉS : au milieu, la plaque de l'île les cacherait entièrement.
  mots: [
    ['palm', -0.8, 0.04, 0.88], ['palm', 0.56, 0.52, 0.78, true],
    ['bush', -0.44, 0.34, 0.95], ['bush', 0.26, 0.3, 0.85, true],
    ['flower', -0.22, 0.46, 1, false, 'rose'], ['flower', 0.06, 0.5, 0.95, false, 'citron'],
    ['tuft', -0.62, 0.42, 0.95], ['tuft', 0.44, 0.48, 0.9],
    ['shell', 0.2, 0.62, 0.75, false, 'rose'], ['starfish', -0.36, 0.64, 0.7, false, 'peche'],
    ['pebble', 0.86, 0.3, 0.8],
  ],
  // Rocheuse : des blocs empilés, peu d'arbres, des galets au bord de l'eau.
  nombres: [
    ['rock', -0.3, -0.34, 1.05], ['rock', 0.16, -0.12, 0.8, true], ['rock', 0.5, -0.4, 0.62],
    ['tree', -0.66, -0.06, 0.72], ['bush', 0.38, 0.22, 0.85, true],
    ['tuft', -0.14, 0.34, 0.9], ['pebble', -0.56, 0.42, 0.9], ['pebble', 0.66, 0.46, 0.75],
    ['flower', 0.02, 0.5, 0.8, false, 'ciel'], ['tuft', 0.78, 0.1, 0.8, true],
  ],
  // Plateau : une ligne d'arbres taillés bien rangée, comme un jardin mesuré.
  mesures: [
    ['tree', -0.58, -0.2, 0.74], ['tree', -0.08, -0.26, 0.74], ['tree', 0.42, -0.2, 0.74, true],
    ['bush', -0.34, 0.14, 0.85], ['bush', 0.18, 0.16, 0.85, true], ['rock', 0.68, -0.02, 0.6],
    ['tuft', -0.74, 0.22, 0.9], ['tuft', 0.56, 0.34, 0.9, true],
    ['flower', -0.1, 0.46, 0.9, false, 'peche'], ['pebble', 0.8, 0.3, 0.75],
  ],
  // Forêt : dense, des champignons au sol, rien d'aligné.
  monde: [
    ['tree', -0.5, -0.3, 0.9], ['tree', -0.04, -0.44, 0.78, true], ['tree', 0.44, -0.22, 0.86],
    ['bush', -0.72, 0.06, 0.95], ['bush', 0.14, 0.04, 0.9, true], ['bush', 0.7, 0.14, 0.8],
    ['mushroom', -0.28, 0.32, 0.95, false, 'rose'], ['mushroom', 0.3, 0.38, 0.85, true, 'peche'],
    ['tuft', -0.02, 0.5, 0.95], ['flower', -0.6, 0.44, 0.9, false, 'lavande'],
  ],
  // Campement : une tente, une lanterne, des fleurs lavande — l'île où l'on vient d'ailleurs.
  ailleurs: [
    ['tent', -0.34, -0.06, 0.78], ['lantern', 0.16, -0.14, 0.8], ['tree', 0.58, -0.28, 0.72, true],
    ['bush', -0.72, 0.1, 0.9], ['bush', 0.42, 0.16, 0.8, true],
    ['flower', -0.1, 0.34, 1, false, 'lavande'], ['flower', 0.26, 0.44, 0.9, false, 'ciel'],
    ['tuft', -0.5, 0.4, 0.95], ['tuft', 0.7, 0.34, 0.85, true], ['pebble', 0.02, 0.52, 0.8],
  ],
};

/** Le petit décor posé sur une île de l'archipel : il change avec sa taille, jamais vide. */
function islandTrim(entry, scene) {
  const { cx, cy, rx, ry, id } = entry;
  const s = Math.min(1, rx / 42) * 0.92;
  const items = (ISLAND_TRIM[id] || ISLAND_TRIM.mots).map(([prop, u, v, scale, flip, tint]) => ({
    id: prop,
    x: r2(cx + rx * u),
    y: r2(cy + ry * v),
    scale: r2(scale * s),
    flip: Boolean(flip),
    tint: tint || null,
  }));
  return scatter(scene, items);
}

/** Une île de l'archipel : un lien vers son intérieur, ou une île encore fermée dans la brume. */
function archipelagoIsland(entry, scene) {
  const { id, unlocked, plaque: at, lines, label, starsLeft } = entry;
  const body = n('g', { class: 'sc-island-body' },
    islandBody({ ...entry, thickness: 0.46 }),
    islandTrim(entry, scene));
  const board = { x: at.x, y: at.y, ...ISLAND_PLAQUE, lines, meta: entry.meta };
  const sign = unlocked
    ? plaque({ ...board, stars: null })
    : n('g', {},
      plaque({ ...board, dim: true }),
      use('lock', { scene, x: at.x + 16, y: at.y - 5, scale: 0.68 }));
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
  // Le premier plan cadre la scène sans mordre sur les îles : posé plus bas et plus court, il
  // laisse voir l'île aux Mots, qui est justement celle qu'on regarde en premier.
  const foreground = [
    { id: 'frond', x: 4, y: 188, scale: 1.8 },
    { id: 'frond', x: 26, y: 192, scale: 1.3 },
    { id: 'frond', x: 198, y: 186, scale: 1.7, flip: true },
    { id: 'frond', x: 176, y: 192, scale: 1.3, flip: true },
    { id: 'pebble', x: 46, y: 178, scale: 1.1 },
    { id: 'starfish', x: 160, y: 176, scale: 1.1, tint: 'peche' },
  ];
  const tree = n('svg', {
    viewBox: `0 0 ${SCENE.width} ${SCENE.height}`,
    class: 'map-scene map-scene--world',
    preserveAspectRatio: 'xMidYMid slice',
    role: 'group',
    'aria-label': 'Carte de l\'archipel : cinq îles posées sur la mer.',
    focusable: 'false',
  },
  n('defs', { 'aria-hidden': 'true' }, propDefs(scene, [...ARCHIPELAGO_PROPS, ...idsOf(foreground), 'pebble', 'starfish'])),
  sky({ horizon, scene }),
  sea({ horizon }),
  use('boat', { scene, x: 188, y: 70, scale: 0.8, tint: 'citron' }),
  use('boat', { scene, x: 14, y: 100, scale: 0.62, tint: 'rose' }),
  use('boat', { scene, x: 120, y: 56, scale: 0.5, tint: 'menthe' }),
  entries.map((entry) => archipelagoIsland(entry, scene)),
  n('g', { class: 'sc-foreground' }, scatter(scene, foreground)));
  return toNode(tree);
}

// --- L'intérieur d'une île -----------------------------------------------------------------------

const ISLAND_PROPS = [
  'sun', 'cloud', 'bird', 'boat', 'palm', 'tree', 'bush', 'flower', 'tuft', 'pebble', 'rock',
  'shell', 'starfish', 'mushroom', 'lantern', 'bunting', 'barrel', 'chest', 'frond',
];

/**
 * Le décor de remplissage de l'île : la règle de la direction artistique est « si une zone de la
 * taille d'un bâtiment est vide, il y manque un objet ». Les plaques de nom parties, la pelouse
 * qu'elles couvraient est à meubler — d'où un semis bien plus dense que dans le premier lot.
 *
 * Il est dessiné AVANT les lieux : un objet qui déborde dans l'emprise d'un lieu passe derrière
 * son décor, et le doigt qui le touche active quand même le lieu. Rien ne se perd.
 */
const ISLAND_SCATTER = [
  // Rive du fond : la ligne de végétation ferme la scène au-dessus de la première rangée.
  // Rien de haut au-dessus du soleil (il est posé à gauche, dans le ciel) : une cime en travers
  // d'un visage se lit comme une erreur de montage.
  { id: 'tree', x: 22, y: 66, scale: 0.7 },
  { id: 'bush', x: 32, y: 63, scale: 0.72 },
  { id: 'rock', x: 40, y: 60, scale: 0.44 },
  { id: 'tuft', x: 46, y: 64, scale: 0.6 },
  { id: 'tree', x: 70, y: 60, scale: 0.66 },
  { id: 'bush', x: 78, y: 63, scale: 0.7 },
  { id: 'rock', x: 60, y: 58, scale: 0.46 },
  { id: 'tree', x: 124, y: 58, scale: 0.62, flip: true },
  { id: 'rock', x: 134, y: 62, scale: 0.5, flip: true },
  { id: 'tuft', x: 114, y: 60, scale: 0.6, flip: true },
  { id: 'palm', x: 180, y: 64, scale: 0.74, flip: true },
  { id: 'bush', x: 168, y: 60, scale: 0.6, flip: true },
  { id: 'mushroom', x: 88, y: 64, scale: 0.55, tint: 'rose' },
  // Entre la grotte et le moulin : le bosquet du fond
  { id: 'bush', x: 72, y: 80, scale: 0.8 },
  { id: 'flower', x: 80, y: 86, scale: 0.9, tint: 'citron' },
  { id: 'tuft', x: 66, y: 88, scale: 0.8 },
  { id: 'mushroom', x: 74, y: 92, scale: 0.7, tint: 'peche' },
  { id: 'flower', x: 62, y: 82, scale: 0.8, tint: 'rose' },
  // Entre le moulin et les rochers jumeaux
  { id: 'bush', x: 124, y: 82, scale: 0.78, flip: true },
  { id: 'flower', x: 118, y: 90, scale: 0.95, tint: 'lavande' },
  { id: 'tuft', x: 130, y: 90, scale: 0.8, flip: true },
  { id: 'pebble', x: 136, y: 94, scale: 0.75 },
  { id: 'mushroom', x: 128, y: 76, scale: 0.6, tint: 'ciel' },
  { id: 'pebble', x: 88, y: 94, scale: 0.7 },
  { id: 'flower', x: 100, y: 96, scale: 0.85, tint: 'rose' },
  // Les deux bords de l'herbe, à hauteur de la première rangée
  { id: 'lantern', x: 24, y: 92, scale: 0.78 },
  { id: 'tuft', x: 32, y: 96, scale: 0.8 },
  { id: 'flower', x: 22, y: 100, scale: 0.85, tint: 'rose' },
  { id: 'lantern', x: 178, y: 92, scale: 0.78, flip: true },
  { id: 'tuft', x: 170, y: 96, scale: 0.8, flip: true },
  { id: 'flower', x: 180, y: 100, scale: 0.85, tint: 'citron' },
  // La clairière du milieu : le coin où l'on pose ses affaires, entre les deux rangées
  { id: 'barrel', x: 108, y: 102, scale: 0.7 },
  { id: 'chest', x: 118, y: 106, scale: 0.72 },
  { id: 'tuft', x: 98, y: 104, scale: 0.8 },
  { id: 'flower', x: 128, y: 102, scale: 0.8, tint: 'rose' },
  { id: 'mushroom', x: 134, y: 108, scale: 0.72, tint: 'citron' },
  { id: 'pebble', x: 92, y: 108, scale: 0.75 },
  { id: 'flower', x: 56, y: 100, scale: 0.9, tint: 'ciel' },
  { id: 'tuft', x: 46, y: 102, scale: 0.85 },
  { id: 'mushroom', x: 64, y: 104, scale: 0.7, tint: 'lavande' },
  { id: 'pebble', x: 40, y: 106, scale: 0.8 },
  { id: 'bush', x: 146, y: 104, scale: 0.8, flip: true },
  { id: 'flower', x: 156, y: 108, scale: 0.8, tint: 'peche' },
  { id: 'tuft', x: 166, y: 106, scale: 0.8, flip: true },
  // Entre l'arbre et le phare, puis entre le phare et la cabane
  { id: 'bush', x: 76, y: 132, scale: 0.85 },
  { id: 'flower', x: 70, y: 140, scale: 0.9, tint: 'citron' },
  { id: 'tuft', x: 84, y: 142, scale: 0.85 },
  { id: 'mushroom', x: 78, y: 148, scale: 0.72, tint: 'rose' },
  { id: 'mushroom', x: 58, y: 138, scale: 0.72, tint: 'citron' },
  { id: 'bush', x: 124, y: 130, scale: 0.8, flip: true },
  { id: 'flower', x: 132, y: 138, scale: 0.9, tint: 'lavande' },
  { id: 'tuft', x: 118, y: 142, scale: 0.85, flip: true },
  { id: 'pebble', x: 128, y: 148, scale: 0.8 },
  // Le bord du sentier, entre la clairière et la rangée du devant : deux lanternes le jalonnent
  { id: 'lantern', x: 62, y: 120, scale: 0.75 },
  { id: 'tuft', x: 54, y: 124, scale: 0.8 },
  { id: 'flower', x: 70, y: 118, scale: 0.85, tint: 'peche' },
  { id: 'lantern', x: 140, y: 120, scale: 0.75, flip: true },
  { id: 'pebble', x: 148, y: 126, scale: 0.8 },
  { id: 'mushroom', x: 112, y: 124, scale: 0.7, tint: 'menthe' },
  { id: 'tuft', x: 94, y: 126, scale: 0.8, flip: true },
  // Les deux bords de la rangée du devant
  { id: 'tuft', x: 22, y: 128, scale: 0.9 },
  { id: 'flower', x: 26, y: 136, scale: 0.9, tint: 'rose' },
  { id: 'tuft', x: 178, y: 126, scale: 0.9, flip: true },
  { id: 'flower', x: 176, y: 134, scale: 0.9, tint: 'ciel' },
  // La plage, devant : palmiers des deux bords et petits trésors au bord de l'eau
  { id: 'palm', x: 14, y: 156, scale: 1 },
  { id: 'palm', x: 188, y: 158, scale: 0.96, flip: true },
  { id: 'tuft', x: 28, y: 160, scale: 0.9 },
  { id: 'tuft', x: 174, y: 161, scale: 0.85, flip: true },
  { id: 'shell', x: 58, y: 162, scale: 0.85, tint: 'rose' },
  { id: 'starfish', x: 144, y: 163, scale: 0.9, tint: 'peche' },
  { id: 'pebble', x: 86, y: 164, scale: 0.9 },
  { id: 'pebble', x: 94, y: 166, scale: 0.7 },
  { id: 'shell', x: 118, y: 164, scale: 0.75, tint: 'ciel' },
  { id: 'pebble', x: 126, y: 166, scale: 0.85 },
  { id: 'starfish', x: 42, y: 165, scale: 0.8, tint: 'lavande' },
  { id: 'shell', x: 160, y: 166, scale: 0.7, tint: 'citron' },
  { id: 'shell', x: 34, y: 159, scale: 0.7, tint: 'menthe' },
  { id: 'pebble', x: 68, y: 158, scale: 0.75 },
  { id: 'starfish', x: 104, y: 159, scale: 0.75, tint: 'rose' },
  { id: 'shell', x: 134, y: 157, scale: 0.7, tint: 'lavande' },
  { id: 'pebble', x: 152, y: 159, scale: 0.8 },
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

/**
 * Le chemin qui relie les lieux : il ne numérote rien, il invite à se promener. Il serpente entre
 * les deux rangées, assez fin pour rester un sentier — large, il devenait une nappe de sable au
 * milieu de l'herbe, qu'on lisait comme un défaut d'affichage.
 */
function trail(slots) {
  if (slots.length < 2) return [];
  const band = slots.reduce((sum, p) => sum + p.y, 0) / slots.length;
  const at = (x, dy) => [x, r2(band + dy)];
  const d = smooth([at(2, 24), at(28, 11), at(62, -7), at(100, 3), at(138, -8), at(172, 10), at(198, 22)]);
  return [path(d, 'sc-trail'), path(d, 'sc-trail-top')];
}

/**
 * Le repère d'un lieu : trois étoiles sur une pastille de bois, grande comme un galet. C'est tout
 * ce que la scène affiche en permanence — le nom vient au survol, au focus et au toucher, et la
 * liste sous la scène le porte en toutes lettres. Le décor reprend ainsi toute la place.
 */
function badgeNode({ x, y }, { stars, max, played }) {
  const { width: w, height: hg } = BADGE;
  const left = r2(x - w / 2);
  const rad = r2(hg / 2);
  const row = r2(y + hg / 2);
  return n('g', { class: `sc-badge${played ? '' : ' is-new'}` },
    n('rect', { x: left, y: r2(y + 1.1), width: w, height: hg, rx: rad, class: 'sc-badge-shadow' }),
    n('rect', { x: left, y, width: w, height: hg, rx: rad, class: 'sc-badge-board' }),
    n('rect', {
      x: r2(left + 1.6), y: r2(y + 1), width: r2(w - 3.2), height: r2(hg * 0.36), rx: r2(hg * 0.18),
      class: 'sc-badge-light',
    }),
    n('rect', { x: left, y, width: w, height: hg, rx: rad, class: 'sc-ln sc-ln--badge' }),
    // Trois étoiles pour résumer neuf : la première s'allume dès la première étoile gagnée.
    [0, 1, 2].map((i) => starMark(r2(x - 5.4 + i * 5.4), row, 2.4,
      played && stars >= (i * max) / 3 + 1)));
}

/**
 * Un lieu : sa zone touchable, son décor, son repère d'étoiles. Toujours un lien, toujours
 * atteignable au clavier, toujours avec son nom accessible complet.
 * Le décor est ramené à l'emprise de l'emplacement : un phare est haut, des rochers sont bas,
 * et aucun des deux ne doit avoir l'air perdu ni déborder sur son voisin.
 */
function placeNode(place, scene) {
  const { slot } = place;
  // Le facteur est borné : un décor bas (des rochers) ne doit pas être étiré jusqu'à la taille
  // d'un phare, sinon il déborde en largeur sur ses voisins.
  const fit = Math.min(1.45, PLACE_HEIGHT / (propHeight(place.kind) || PLACE_HEIGHT));
  return n('a', {
    href: place.href,
    class: `sc-place sc-link${place.played ? '' : ' is-new'}`,
    'data-place': place.id,
    'aria-label': place.label,
  },
  n('rect', { ...slot.hit, rx: 8, class: 'sc-hit' }),
  // Halo au sol : il souligne le lieu survolé sans redessiner une case rectangulaire.
  ell(slot.x, r2(slot.y + 1), r2(slot.hit.width * 0.42), r2(slot.hit.width * 0.15), 'sc-spot'),
  n('rect', { ...slot.hit, rx: 8, class: 'sc-halo-box' }),
  n('g', { class: 'sc-place-art', 'aria-hidden': 'true' },
    use(place.kind, { scene, x: slot.x, y: slot.y, scale: r2(slot.scale * fit) })),
  badgeNode(slot.badge, place));
}

// --- Le nom d'un lieu, à la demande ----------------------------------------------------------
//
// Six noms affichés en même temps, c'était une grille de pancartes posée sur l'île. Un seul nom à
// la fois, celui du lieu que l'on désigne, c'est une carte qu'on explore. Le panneau vit dans une
// couche unique, dessinée EN DERNIER : il passe donc toujours au-dessus du décor, ce que l'ordre
// des `<a>` ne permettrait pas (SVG n'a pas de `z-index`).

const TIP_PAD = { x: 5, y: 2.8 };
const TIP_GAP = 1.4;

/** La couche du panneau : un seul exemplaire, masqué tant qu'aucun lieu n'est désigné. */
function tipLayer() {
  return n('g', { class: 'sc-tip', 'aria-hidden': 'true' },
    n('path', { class: 'sc-tip-stem', d: 'M0 0' }),
    n('rect', { class: 'sc-tip-shadow', x: 0, y: 0, width: 0, height: 0, rx: 4 }),
    n('rect', { class: 'sc-tip-board', x: 0, y: 0, width: 0, height: 0, rx: 4 }),
    n('rect', { class: 'sc-tip-light', x: 0, y: 0, width: 0, height: 0, rx: 3 }),
    n('rect', { class: 'sc-ln sc-ln--tip', x: 0, y: 0, width: 0, height: 0, rx: 4 }),
    n('text', { class: 'sc-tip-name', x: 0, y: 0, 'text-anchor': 'middle', text: '' }),
    n('text', { class: 'sc-tip-where', x: 0, y: 0, 'text-anchor': 'middle', text: '' }));
}

/**
 * Encombrement réel d'un texte, dans les unités du dessin. C'est `getBBox` qui fait le travail :
 * la taille des textes change avec la largeur de l'écran (css/map.css), donc on ne peut pas la
 * coder en dur sans voir le panneau se déchirer sur un téléphone. Repli estimé si le SVG n'est
 * pas encore rendu — la mesure est refaite au survol suivant.
 */
function textBox(node, size) {
  try {
    const box = node.getBBox();
    if (box.width > 0 && box.height > 0) return { width: box.width, height: box.height };
  } catch { /* pas encore rendu */ }
  return { width: (node.textContent || '').length * size * 0.52, height: size * 1.2 };
}

/**
 * Branche le panneau de nom sur les lieux : survol, focus clavier et appui du doigt.
 * Un seul jeu d'écouteurs, posé sur la scène (délégation) : ajouter un lieu n'ajoute rien ici.
 */
function wireTips(svg, places) {
  const tip = svg.querySelector('.sc-tip');
  if (!tip) return;
  const byId = new Map(places.map((place) => [place.id, place]));
  const parts = {
    stem: tip.querySelector('.sc-tip-stem'),
    shadow: tip.querySelector('.sc-tip-shadow'),
    board: tip.querySelector('.sc-tip-board'),
    light: tip.querySelector('.sc-tip-light'),
    line: tip.querySelector('.sc-ln--tip'),
    name: tip.querySelector('.sc-tip-name'),
    where: tip.querySelector('.sc-tip-where'),
  };

  const hide = () => tip.classList.remove('is-on');

  const show = (place) => {
    const { slot } = place;
    parts.name.textContent = place.name;
    parts.where.textContent = place.where;
    const top = textBox(parts.name, 7);
    const sub = textBox(parts.where, 5.4);
    const width = r2(Math.min(174, Math.max(top.width, sub.width, 34) + TIP_PAD.x * 2));
    const height = r2(TIP_PAD.y * 2 + top.height + TIP_GAP + sub.height);
    // Au-dessus du décor, et replié dessous si le haut de la scène manque de place. Le panneau
    // reste dans la ZONE SÛRE : au-delà, le cadrage portrait d'un téléphone le couperait.
    const above = slot.y - PLACE_HEIGHT * slot.scale - height - 5;
    const under = above < SAFE.y;
    const y = r2(under ? slot.y + 15 : above);
    const room = SAFE.x + SAFE.width + 2 - width;
    const x = r2(Math.min(Math.max(room, SAFE.x - 2), Math.max(SAFE.x - 2, slot.x - width / 2)));
    for (const box of [parts.shadow, parts.board, parts.line]) {
      box.setAttribute('x', x);
      box.setAttribute('y', box === parts.shadow ? r2(y + 1.4) : y);
      box.setAttribute('width', width);
      box.setAttribute('height', height);
    }
    parts.light.setAttribute('x', r2(x + 1.8));
    parts.light.setAttribute('y', r2(y + 1.5));
    parts.light.setAttribute('width', r2(width - 3.6));
    parts.light.setAttribute('height', r2(height * 0.32));
    parts.name.setAttribute('x', r2(x + width / 2));
    parts.name.setAttribute('y', r2(y + TIP_PAD.y + top.height / 2));
    parts.where.setAttribute('x', r2(x + width / 2));
    parts.where.setAttribute('y', r2(y + TIP_PAD.y + top.height + TIP_GAP + sub.height / 2));
    // Un petit pied désigne le lieu : court, sinon il barre le décor dont il parle.
    const stemX = r2(Math.min(x + width - 5, Math.max(x + 5, slot.x)));
    const from = under ? y : r2(y + height);
    const way = Math.sign(slot.y - 2 - from) || 1;
    parts.stem.setAttribute('d', `M${stemX} ${from}L${stemX} ${r2(from + way * Math.min(9, Math.abs(slot.y - 2 - from)))}`);
    tip.classList.add('is-on');
  };

  const find = (event) => {
    const link = event.target.closest?.('.sc-place');
    return link ? byId.get(link.dataset.place) : null;
  };
  const onEnter = (event) => {
    const place = find(event);
    if (place) show(place); else hide();
  };
  for (const type of ['pointerover', 'pointerdown', 'focusin']) svg.addEventListener(type, onEnter);
  for (const type of ['pointerout', 'focusout']) svg.addEventListener(type, (event) => {
    if (!find(event)) return;
    const to = event.relatedTarget;
    if (!(to && to.closest?.('.sc-place') === event.target.closest('.sc-place'))) hide();
  });
  svg.addEventListener('pointerleave', hide);
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
  const body = { cx: 100, cy: 106, rx: 88, ry: 58, thickness: 0.2, squareness: 3.4, grassInset: 0.88 };
  const kinds = [...new Set(places.map((p) => p.kind))];
  const used = [...ISLAND_PROPS, ...kinds, ...idsOf(ISLAND_SCATTER), ...idsOf(ISLAND_FOREGROUND)];
  const tree = n('svg', {
    viewBox: `0 0 ${SCENE.width} ${SCENE.height}`,
    class: 'map-scene map-scene--isle',
    preserveAspectRatio: 'xMidYMid slice',
    // `group` et non `img` : la scène CONTIENT des liens, et `img` rendrait ses enfants
    // présentatifs — on tabulerait sur six lieux sans nom. La liste sous la scène reste la
    // lecture de référence ; ici, chaque lieu dit lui-même ce qu'il est.
    role: 'group',
    'aria-label': `${island.name} vue de haut : ${places.length} lieux à visiter librement.`,
    focusable: 'false',
  },
  n('defs', { 'aria-hidden': 'true' }, propDefs(scene, used)),
  sky({ horizon, scene }),
  sea({ horizon }),
  use('boat', { scene, x: 176, y: 44, scale: 0.7, tint: 'ciel' }),
  use('boat', { scene, x: 22, y: 42, scale: 0.55, tint: 'citron' }),
  islandBody(body),
  // Les collines du fond : du relief posé SUR l'herbe, derrière la première rangée de lieux
  path('M22 70q26-24 50 0t46-7 48 9q-40 10-74 10t-70-12Z', 'sc-hill'),
  path('M38 67q18-17 38-2t30-5q-24 8-38 8t-30-1Z', 'sc-hill-lt'),
  grassMarks(100, 104, 72, 40),
  trail(layout.slots),
  // La guirlande traverse l'arrière de l'île : elle passe derrière les lieux, comme une corde tendue.
  use('bunting', { scene, x: 100, y: 64, scale: 1.6 }),
  n('g', { class: 'sc-scatter' }, scatter(scene, ISLAND_SCATTER)),
  mascotNode(island.id, { x: 76, y: 108, size: 23 }),
  places.map((place) => placeNode(place, scene)),
  n('g', { class: 'sc-foreground' }, scatter(scene, ISLAND_FOREGROUND)),
  tipLayer());
  const svg = toNode(tree);
  wireTips(svg, places);
  return svg;
}

export { PLACE_HEIGHT };

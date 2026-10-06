// Pièces du kit kawaii (#88) : formes de corps, visages, accessoires, filtre « autocollant ».
// Tout est PUR : chaque fonction renvoie un arbre { tag, attrs, children } (aucun DOM), que
// kawaii.js assemble, et que toMarkup() / toNode() transforment en SVG. C'est ce qui permet de
// tester les dessins sous node (identifiants, expressions, paramètres).
//
// Repère : 120 × 120, le personnage pose sur le « sol » vers y = 106. Couleurs : uniquement des
// classes (css/kawaii.css), elles-mêmes branchées sur les variables --kawaii-* de tokens.css.
import { s } from '../svg.js';

export const COLORS = ['rose', 'peche', 'citron', 'menthe', 'ciel', 'lavande', 'creme'];
export const COLOR_NAMES = {
  rose: 'rose', peche: 'pêche', citron: 'jaune citron', menthe: 'vert menthe',
  ciel: 'bleu ciel', lavande: 'lavande', creme: 'crème',
};

export const FACES = ['happy', 'joyful', 'surprised', 'cheering', 'sleepy'];
export const FACE_NAMES = {
  happy: 'content', joyful: 'très content', surprised: 'surpris', cheering: 'encourageant', sleepy: 'endormi',
};

export const ACCESSORIES = ['none', 'bow', 'hat', 'flower', 'sprout', 'crown', 'star', 'glasses'];
export const ACCESSORY_NAMES = {
  bow: 'un nœud', hat: 'un chapeau de fête', flower: 'une fleur', sprout: 'une pousse',
  crown: 'une couronne', star: 'une barrette étoile', glasses: 'des lunettes rondes',
};
/** Couleur d'accessoire par défaut (remplacée si elle se confond avec le corps). */
export const ACCESSORY_ACCENT = {
  bow: 'rose', hat: 'lavande', flower: 'rose', sprout: 'menthe', crown: 'citron', star: 'citron', glasses: 'ciel',
};

export const SHAPES = ['round', 'drop', 'block', 'star', 'cloud', 'egg'];
export const ANIMALS = ['cat', 'bunny', 'bear'];
export const BODIES = [...SHAPES, ...ANIMALS];
export const BODY_NAMES = {
  round: 'Boule', drop: 'Goutte', block: 'Cube', star: 'Étoile', cloud: 'Nuage', egg: 'Œuf',
  cat: 'Chaton', bunny: 'Lapin', bear: 'Ourson',
};
/** Stades d'un bébé animal : 1 = bébé (encore dans sa coquille), 2 = petit, 3 = grand. */
export const ANIMAL_STAGES = [1, 2, 3];

// ---------------------------------------------------------------------------------------------
// Arbre SVG

const num = (x) => Number(x.toFixed(2));

let counter = 0;
/** Identifiant unique par dessin : plusieurs autocollants sur la page sans collision d'id SVG. */
export function nextUid() {
  counter += 1;
  return `kw${counter}`;
}

/** Nœud de l'arbre : n('circle', { cx: 4, r: 2, class: 'kw__ink' }, enfant…). */
export function n(tag, attrs = {}, ...children) {
  return { tag, attrs, children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false) };
}

const escape = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Le SVG en texte (tests, ou insertion statique). Les attributs nuls sont omis. */
export function toMarkup(node) {
  if (typeof node === 'string') return escape(node);
  const attrs = Object.entries(node.attrs)
    .filter(([key, v]) => v !== null && v !== undefined && v !== false && key !== 'text')
    .map(([k, v]) => ` ${k}="${escape(v)}"`).join('');
  const inner = (node.attrs.text !== undefined ? escape(node.attrs.text) : '') + node.children.map(toMarkup).join('');
  return `<${node.tag}${attrs}${inner ? `>${inner}</${node.tag}>` : '/>'}`;
}

/** L'arbre en éléments SVG du document (navigateur uniquement). */
export function toNode(node) {
  if (typeof node === 'string') return node;
  return s(node.tag, node.attrs, node.children.map(toNode));
}

/** Parcourt l'arbre (tests : identifiants, références url(#…), classes). */
export function walk(node, visit) {
  if (typeof node === 'string') return;
  visit(node);
  node.children.forEach((child) => walk(child, visit));
}

// ---------------------------------------------------------------------------------------------
// Formes

/**
 * Étoile aux pointes arrondies : chaque sommet est remplacé par une courbe qui commence et
 * finit à une fraction `round` des deux côtés (les creux un peu moins arrondis que les pointes).
 */
export function roundedStar(cx, cy, outer, inner, { points = 5, round = 0.3, innerRound = 0.22 } = {}) {
  const verts = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const towards = (from, to, t) => [num(from[0] + (to[0] - from[0]) * t), num(from[1] + (to[1] - from[1]) * t)];
  return `${verts.map((v, i) => {
    const prev = verts[(i + verts.length - 1) % verts.length];
    const next = verts[(i + 1) % verts.length];
    const t = i % 2 ? innerRound : round;
    const a = towards(v, prev, t);
    const b = towards(v, next, t);
    return `${i ? 'L' : 'M'}${a[0]} ${a[1]}Q${num(v[0])} ${num(v[1])} ${b[0]} ${b[1]}`;
  }).join('')}Z`;
}

const ROUND = 'M60 37C86 37 102 55 102 79C102 98 85 106 60 106C35 106 18 98 18 79C18 55 34 37 60 37Z';

/**
 * Chaque forme : le tracé du corps, la place du visage (centre, échelle), et des points
 * d'attache pour les accessoires : `top` (sur la tête), `side` (sur le côté, avec un angle),
 * `zz` (les « z » du sommeil, hors du corps), `shine` (reflet de lumière).
 */
export const SHAPE_GEOMETRY = {
  round: {
    d: ROUND,
    face: { x: 60, y: 76, scale: 1 },
    top: { x: 60, y: 38, rotate: -8 }, side: { x: 84, y: 47, rotate: 28 },
    zz: { x: 95, y: 36 }, shine: { x: 37, y: 57, rx: 8, ry: 4.5, rotate: -38 },
  },
  drop: {
    d: 'M60 13C66 30 100 50 100 78C100 96 83 106 60 106C37 106 20 96 20 78C20 50 54 30 60 13Z',
    face: { x: 60, y: 80, scale: 0.95 },
    top: { x: 60, y: 27, rotate: 0, scale: 0.75 }, side: { x: 80, y: 46, rotate: 32 },
    zz: { x: 88, y: 26 }, shine: { x: 38, y: 64, rx: 7.5, ry: 4.5, rotate: -50 },
  },
  block: {
    d: 'M46 32H74A24 24 0 0 1 98 56V84A22 22 0 0 1 76 106H44A22 22 0 0 1 22 84V56A24 24 0 0 1 46 32Z',
    face: { x: 60, y: 72, scale: 1 },
    top: { x: 60, y: 33, rotate: -6 }, side: { x: 87, y: 37, rotate: 22 },
    zz: { x: 100, y: 22 }, shine: { x: 35, y: 47, rx: 6, ry: 4, rotate: -40 },
  },
  star: {
    d: roundedStar(60, 64, 52, 28, { round: 0.3, innerRound: 0.4 }),
    face: { x: 60, y: 70, scale: 0.8 },
    top: { x: 60, y: 22, rotate: 0 }, side: { x: 82, y: 42, rotate: 30 },
    zz: { x: 100, y: 26 }, shine: { x: 47, y: 50, rx: 4, ry: 2.6, rotate: -40 },
  },
  cloud: {
    d: 'M30 105A16 16 0 0 1 22 76A18 18 0 0 1 44 54A24 24 0 0 1 88 52A19 19 0 0 1 100 88A15 15 0 0 1 88 105Z',
    face: { x: 60, y: 82, scale: 0.95 },
    top: { x: 66, y: 39, rotate: 4 }, side: { x: 33, y: 58, rotate: -32 },
    zz: { x: 100, y: 38 }, shine: { x: 52, y: 52, rx: 6, ry: 3.4, rotate: -20 },
  },
  egg: {
    d: 'M60 17C83 17 98 51 98 76C98 96 82 106 60 106C38 106 22 96 22 76C22 51 37 17 60 17Z',
    face: { x: 60, y: 80, scale: 0.95 },
    top: { x: 60, y: 19, rotate: 0 }, side: { x: 78, y: 32, rotate: 30 },
    zz: { x: 90, y: 22 }, shine: { x: 41, y: 46, rx: 6, ry: 9, rotate: 25 },
  },
};

/** Corps commun aux bébés animaux (leur stade les fait grandir, voir animalScale). */
export const ANIMAL_GEOMETRY = {
  d: 'M60 40C86 40 101 58 101 80C101 98 85 106 60 106C35 106 19 98 19 80C19 58 34 40 60 40Z',
  face: { x: 60, y: 77, scale: 1 },
  top: { x: 60, y: 41, rotate: -6 }, side: { x: 86, y: 50, rotate: 30 },
  zz: { x: 98, y: 40 }, shine: { x: 37, y: 60, rx: 7, ry: 4.2, rotate: -40 },
};

/** Taille d'un animal à chaque stade : il grandit en restant posé sur le sol. */
export const animalScale = (stage) => ({ 1: 0.78, 2: 0.9, 3: 1 }[stage]);

/** Moitié inférieure de la coquille, d'où sort le bébé (stade 1). */
export const SHELL_D = 'M27 91L34 85L41 92L48 85L55 92L62 85L69 92L76 85L83 92L89 86L93 90C93 103 80 110 60 110C40 110 27 103 27 91Z';

/** Fêlure de l'œuf qui éclot (elle est ensuite découpée par la forme de l'œuf). */
export const CRACK_D = 'M18 62L28 57L35 65L44 56L52 65L60 56L68 65L76 56L84 64L92 57L104 61';

// Oreilles et queues, dessinées pour le côté gauche ; le côté droit est leur reflet.
export const MIRROR = 'matrix(-1 0 0 1 120 0)';

export const EARS = {
  cat: () => [
    n('path', { d: 'M27 68L27 36Q28 27 35 31L56 46Z', class: 'kw__part' }),
    n('path', { d: 'M32 56L32.5 39L46 48Z', class: 'kw__inner' }),
  ],
  bunny: () => [
    n('ellipse', { cx: 43, cy: 28, rx: 9.5, ry: 23, transform: 'rotate(-12 43 50)', class: 'kw__part' }),
    n('ellipse', { cx: 43, cy: 30, rx: 4.5, ry: 15, transform: 'rotate(-12 43 50)', class: 'kw__inner' }),
  ],
  bear: () => [
    n('circle', { cx: 32, cy: 50, r: 12, class: 'kw__part' }),
    n('circle', { cx: 32, cy: 50, r: 6.5, class: 'kw__inner' }),
  ],
};

export const TAILS = {
  cat: () => [
    n('path', { d: 'M92 98C110 100 116 82 107 70', class: 'kw__tail-edge' }),
    n('path', { d: 'M92 98C110 100 116 82 107 70', class: 'kw__tail' }),
  ],
  bunny: () => [n('circle', { cx: 99, cy: 96, r: 9, class: 'kw__part' })],
  bear: () => [n('circle', { cx: 99, cy: 95, r: 7, class: 'kw__part' })],
};

export const feet = () => [
  n('ellipse', { cx: 43, cy: 105, rx: 10, ry: 6, class: 'kw__part' }),
  n('ellipse', { cx: 77, cy: 105, rx: 10, ry: 6, class: 'kw__part' }),
];

/** Petits bras du grand stade : l'un salue (levé), l'autre est posé. */
export const arms = () => [
  n('ellipse', { cx: 19, cy: 88, rx: 6, ry: 9.5, transform: 'rotate(38 19 88)', class: 'kw__part' }),
  n('ellipse', { cx: 104, cy: 72, rx: 6, ry: 10, transform: 'rotate(-58 104 72)', class: 'kw__part' }),
];

/**
 * Une forme en volume : remplissage, ombre en croissant en bas à droite (la forme décalée vers
 * le haut à gauche, le tout découpé par la forme), reflet de lumière, contour.
 * `inside` : motifs eux aussi découpés par la forme (taches, fêlure…).
 */
export function shapeLayers({ d, shine, clipId, inside = [], offset = [-3, -4.5] }) {
  return [
    n('path', { d, class: 'kw__fill' }),
    n('g', { 'clip-path': `url(#${clipId})` },
      n('path', { d, class: 'kw__shade' }),
      n('path', { d, class: 'kw__fill', transform: `translate(${offset[0]} ${offset[1]})` }),
      inside),
    shine && n('ellipse', {
      cx: shine.x, cy: shine.y, rx: shine.rx, ry: shine.ry,
      transform: `rotate(${shine.rotate} ${shine.x} ${shine.y})`, class: 'kw__gloss',
    }),
    n('path', { d, class: 'kw__line' }),
  ];
}

// ---------------------------------------------------------------------------------------------
// Visages : dessinés autour de (0, 0), puis placés et mis à l'échelle par `face()`.

const EYE_X = 15;

function openEye(cx, big = false) {
  return n('g', { class: 'kw__eye' },
    n('ellipse', { cx, cy: 0, rx: big ? 6.3 : 5.5, ry: big ? 7.6 : 6.7, class: 'kw__ink' }),
    n('circle', { cx: num(cx + (big ? 2.1 : 1.9)), cy: big ? -3 : -2.6, r: big ? 2.6 : 2.3, class: 'kw__shine' }),
    n('circle', { cx: num(cx - (big ? 2 : 1.8)), cy: big ? 3.2 : 2.8, r: big ? 1.3 : 1.1, class: 'kw__shine' }));
}

/** Œil fermé : arc vers le haut (« ^ », la joie) ou vers le bas (« ‿ », le sommeil). */
const closedEye = (cx, up) => n('path', {
  d: up ? `M${cx - 5.4} 1.8Q${cx} -5.8 ${cx + 5.4} 1.8` : `M${cx - 5.4} -0.4Q${cx} 5 ${cx + 5.4} -0.4`,
  class: 'kw__stroke-ink',
});

const cheeks = () => [
  n('ellipse', { cx: -24, cy: 7.5, rx: 6.4, ry: 3.9, class: 'kw__blush' }),
  n('ellipse', { cx: 24, cy: 7.5, rx: 6.4, ry: 3.9, class: 'kw__blush' }),
];

/** Petits traits de rougissement (« /// »), pour la grande joie. */
const blushLines = () => [-24, 24].map((cx) => n('path', {
  d: `M${cx - 3.6} 7.6l2-3.6M${cx - 0.6} 7.6l2-3.6M${cx + 2.4} 7.6l2-3.6`,
  class: 'kw__blush-line',
}));

const smile = () => n('path', { d: 'M-4.4 5Q0 9.6 4.4 5', class: 'kw__stroke-ink' });

function openMouth(width = 5.6) {
  return [
    n('path', { d: `M${-width} 3.6H${width}Q${width} 11.8 0 11.8Q${-width} 11.8 ${-width} 3.6Z`, class: 'kw__ink kw__mouth' }),
    n('path', { d: `M${num(-width * 0.58)} 9.9Q0 6.6 ${num(width * 0.58)} 9.9Q0 12.2 ${num(-width * 0.58)} 9.9Z`, class: 'kw__tongue' }),
  ];
}

const FACE_PARTS = {
  happy: () => [cheeks(), openEye(-EYE_X), openEye(EYE_X), smile()],
  joyful: () => [cheeks(), blushLines(), closedEye(-EYE_X, true), closedEye(EYE_X, true), openMouth(6)],
  surprised: () => [
    cheeks(),
    n('path', { d: `M${-EYE_X - 4} -12.5Q${-EYE_X} -15.5 ${-EYE_X + 4} -13`, class: 'kw__stroke-ink kw__brow' }),
    n('path', { d: `M${EYE_X - 4} -13Q${EYE_X} -15.5 ${EYE_X + 4} -12.5`, class: 'kw__stroke-ink kw__brow' }),
    openEye(-EYE_X, true), openEye(EYE_X, true),
    n('ellipse', { cx: 0, cy: 7.4, rx: 2.7, ry: 3.3, class: 'kw__ink' }),
  ],
  // Encourageant : un clin d'œil complice et un grand sourire (« Allez, tu peux le faire ! »).
  cheering: () => [cheeks(), openEye(-EYE_X), closedEye(EYE_X, true), openMouth(5)],
  sleepy: () => [
    cheeks(), closedEye(-EYE_X, false), closedEye(EYE_X, false),
    n('ellipse', { cx: 0, cy: 6.6, rx: 1.8, ry: 2.2, class: 'kw__ink' }),
  ],
};

/** Le visage complet d'une expression, centré en (x, y). `glasses` ajoute des lunettes rondes. */
export function face(expression, { x, y, scale = 1 }, { glasses = false } = {}) {
  return n('g', { class: `kw__face kw__face--${expression}`, transform: `translate(${x} ${y}) scale(${scale})` },
    FACE_PARTS[expression](),
    glasses && glassesParts());
}

function glassesParts() {
  return n('g', { class: 'kw__glasses' },
    n('circle', { cx: -EYE_X, cy: 0, r: 10, class: 'kw__lens' }),
    n('circle', { cx: EYE_X, cy: 0, r: 10, class: 'kw__lens' }),
    n('path', { d: 'M-5 -1.5Q0 -5 5 -1.5M-25 -1.6L-28 -4.5M25 -1.6L28 -4.5', class: 'kw__frame' }));
}

/** Les « z » du sommeil, à côté de la tête. */
export const sleepZ = ({ x, y }) => n('g', { class: 'kw__zz', transform: `translate(${x} ${y})` },
  n('path', { d: 'M0 0h7l-7 8h7', class: 'kw__zz-letter' }),
  n('path', { d: 'M10 -11h5l-5 6h5', class: 'kw__zz-letter kw__zz-letter--small' }));

// ---------------------------------------------------------------------------------------------
// Accessoires : dessinés autour de leur point d'attache (0, 0).

const ACCESSORY_PARTS = {
  bow: () => [
    n('path', { d: 'M-2 2L-8 13L-3.5 12L-1 16Z M2 2L8 13L3.5 12L1 16Z', class: 'kw__acc' }),
    n('path', { d: 'M-2 0C-8 -10 -19 -9 -18 0C-19 9 -8 10 -2 0Z', class: 'kw__acc' }),
    n('path', { d: 'M2 0C8 -10 19 -9 18 0C19 9 8 10 2 0Z', class: 'kw__acc' }),
    n('path', { d: 'M-6 -2.4Q-10 -5 -13.5 -2.6M6 -2.4Q10 -5 13.5 -2.6', class: 'kw__acc-line' }),
    n('ellipse', { cx: 0, cy: 0, rx: 4.2, ry: 4.8, class: 'kw__acc' }),
  ],
  hat: () => [
    n('path', { d: 'M-13 0L-1.5 -27Q0 -30 1.5 -27L13 0Q0 4.5 -13 0Z', class: 'kw__acc' }),
    n('circle', { cx: -4.5, cy: -8, r: 1.9, class: 'kw__shine' }),
    n('circle', { cx: 4, cy: -4, r: 1.9, class: 'kw__shine' }),
    n('circle', { cx: 1.5, cy: -16, r: 1.7, class: 'kw__shine' }),
    n('circle', { cx: 0, cy: -29.5, r: 4.6, class: 'kw__gold' }),
  ],
  flower: () => [
    ...[0, 72, 144, 216, 288].map((a) => n('circle', {
      cx: num(Math.sin((a * Math.PI) / 180) * 6.4), cy: num(-Math.cos((a * Math.PI) / 180) * 6.4), r: 5.4, class: 'kw__acc',
    })),
    n('circle', { cx: 0, cy: 0, r: 4.2, class: 'kw__gold' }),
  ],
  sprout: () => [
    n('path', { d: 'M0 2Q1.5 -6 0 -12', class: 'kw__stem' }),
    n('path', { d: 'M0 -11C-3 -19 -12 -21 -16 -15C-11 -9.5 -4 -9 0 -11Z', class: 'kw__leaf' }),
    n('path', { d: 'M0 -11C3 -21 14 -24 19 -17C14 -10 5 -9 0 -11Z', class: 'kw__leaf' }),
  ],
  crown: () => [
    n('path', { d: 'M-14 1L-15 -13L-7 -6L0 -17L7 -6L15 -13L14 1Q0 4 -14 1Z', class: 'kw__gold' }),
    n('circle', { cx: 0, cy: -18, r: 2.4, class: 'kw__gold' }),
    n('circle', { cx: -15, cy: -14, r: 2.1, class: 'kw__gold' }),
    n('circle', { cx: 15, cy: -14, r: 2.1, class: 'kw__gold' }),
    n('circle', { cx: 0, cy: -3.5, r: 2.4, class: 'kw__acc' }),
  ],
  star: () => [n('path', { d: roundedStar(0, 0, 10, 5, { round: 0.28, innerRound: 0.2 }), class: 'kw__gold' })],
};

/** L'accessoire placé à son point d'attache (`top` ou `side` de la forme). Rien pour 'glasses'. */
export function accessory(kind, geometry) {
  if (!kind || kind === 'none' || kind === 'glasses') return null;
  const onTop = kind === 'hat' || kind === 'crown' || kind === 'sprout';
  const at = onTop ? geometry.top : geometry.side;
  return n('g', { class: `kw__accessory kw__accessory--${kind}`, transform: `translate(${at.x} ${at.y}) rotate(${at.rotate})${at.scale ? ` scale(${at.scale})` : ''}` },
    ACCESSORY_PARTS[kind]());
}

// ---------------------------------------------------------------------------------------------
// Autocollant : liseré clair tout autour + petite ombre portée (un filtre par dessin).

/**
 * Filtre « autocollant » : l'alpha est flouté puis seuillé (contour arrondi régulier, sans les
 * angles carrés d'un feMorphology), teinté de --sticker-rim, et posé sur une ombre douce.
 */
export function stickerFilter(id, { rim = 3 } = {}) {
  return n('filter', { id, x: '-20%', y: '-20%', width: '140%', height: '145%', 'color-interpolation-filters': 'sRGB' },
    n('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: num(rim * 0.7), result: 'spread' }),
    n('feComponentTransfer', { in: 'spread', result: 'grown' }, n('feFuncA', { type: 'linear', slope: 5, intercept: 0 })),
    n('feFlood', { class: 'kw__rim-color', result: 'rimColor' }),
    n('feComposite', { in: 'rimColor', in2: 'grown', operator: 'in', result: 'rim' }),
    n('feGaussianBlur', { in: 'grown', stdDeviation: 1.6, result: 'soft' }),
    n('feOffset', { in: 'soft', dy: 2.6, result: 'drop' }),
    n('feFlood', { class: 'kw__shadow-color', result: 'shadowColor' }),
    n('feComposite', { in: 'shadowColor', in2: 'drop', operator: 'in', result: 'shadow' }),
    n('feMerge', {},
      n('feMergeNode', { in: 'shadow' }),
      n('feMergeNode', { in: 'rim' }),
      n('feMergeNode', { in: 'SourceGraphic' })));
}

/** Variables CSS de couleur posées sur la racine du dessin (lues par css/kawaii.css). */
export const colorVars = (color, accent) =>
  `--kw-fill: var(--kawaii-${color}); --kw-deep: var(--kawaii-${color}-deep);`
  + ` --kw-accent: var(--kawaii-${accent}); --kw-accent-deep: var(--kawaii-${accent}-deep);`;

/** Petit décalage de clignement propre à chaque dessin : ils ne clignent pas tous ensemble. */
export function blinkDelay(uid) {
  let hash = 0;
  for (const ch of String(uid)) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return `${(hash % 40) / 10}s`;
}

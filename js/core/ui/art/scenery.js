// Bibliothèque de décor (#96) : les objets qui peuplent la carte au trésor.
//
// Pourquoi une bibliothèque plutôt que des dessins à la main : la direction artistique « kawaii
// cosy » demande qu'AUCUNE zone ne soit vide. Une île porte donc quarante à soixante objets.
// Chacun est déclaré UNE fois dans un `<defs>` et posé autant de fois qu'on veut par `<use>` :
// le poids du fichier ne bouge pas, et un objet corrigé l'est partout.
//
// Règles de dessin (la grille de relecture de l'issue #96) :
//   1. contour partout, épaisseur uniforme (classe `sc-ln`), détails internes plus fins (`sc-dt`) ;
//   2. trois tons par matière — « -lt » du côté éclairé (toujours en HAUT À GAUCHE), la teinte,
//      « -dk » dans l'ombre — plus un reflet blanc (`sc-shine`) sur les surfaces rondes ;
//   3. un motif plutôt qu'un aplat nu : planches, rayures, pois, tuiles, nervures ;
//   4. une ombre portée (`sc-shadow`) pose l'objet sur le sol.
//
// Repère d'un objet : l'origine (0, 0) est son POINT DE CONTACT AU SOL, et il monte vers les y
// négatifs. Un `use(id, { x, y })` le pose donc directement là où il touche terre.
//
// Tout est pur (aucun DOM) : les fonctions renvoient l'arbre { tag, attrs, children } de
// kawaii-parts.js, que `toNode` transforme en SVG. Les couleurs viennent uniquement des classes
// de css/map.css, elles-mêmes branchées sur les variables de css/tokens.css.
import { n, roundedStar } from './kawaii-parts.js';

// --- Petits outils de tracé -------------------------------------------------------------------

const r2 = (x) => Number(Number(x).toFixed(2));
const path = (d, cls) => n('path', { d, class: cls });
const ell = (cx, cy, rx, ry, cls) => n('ellipse', { cx, cy, rx, ry, class: cls });
const circ = (cx, cy, rad, cls) => n('circle', { cx, cy, r: rad, class: cls });
/** Contour de la silhouette : posé APRÈS les aplats, il reste net. */
const ln = (d) => path(d, 'sc-ln');
/** Détail interne (planche, nervure, rainure) : même couleur, trait plus fin. */
const dt = (d) => path(d, 'sc-dt');
/** Ombre portée au sol. */
const ground = (rx, ry = rx * 0.34) => ell(0, 0, rx, ry, 'sc-shadow');
/** Reflet blanc d'une surface ronde. */
const gloss = (cx, cy, rx, ry, rotate = -38) =>
  n('ellipse', { cx, cy, rx, ry, transform: `rotate(${rotate} ${cx} ${cy})`, class: 'sc-shine' });

/** Points d'un polygone régulier : sert aux feuillages festonnés et aux fleurs. */
const around = (count, radius, cx = 0, cy = 0, from = -90) =>
  Array.from({ length: count }, (_, i) => {
    const a = ((from + (i * 360) / count) * Math.PI) / 180;
    return [r2(cx + radius * Math.cos(a)), r2(cy + radius * Math.sin(a))];
  });

/**
 * Feuillage festonné : une suite de bosses rondes posées sur une ellipse. C'est la forme la plus
 * utile du lot (arbre, buisson, nuage, canopée bicolore) — d'où une fonction plutôt que des
 * tracés écrits un à un. `squash` aplatit la forme (1 = ronde, 0,5 = nuage).
 */
function scallop(cx, cy, radius, bumps, squash = 1) {
  const pts = around(bumps, radius, cx, cy).map(([x, y]) => [x, r2(cy + (y - cy) * squash)]);
  const bump = r2(radius * Math.sin(Math.PI / bumps) * 1.3);   // > la demi-corde : la bosse ressort
  const arcs = pts.slice(1).concat([pts[0]])
    .map(([x, y]) => `A${bump} ${bump} 0 0 1 ${x} ${y}`).join('');
  return `M${pts[0][0]} ${pts[0][1]}${arcs}Z`;
}

// --- Les objets --------------------------------------------------------------------------------
//
// Chaque entrée : { label, parts() }. `label` sert au nom accessible quand l'objet est posé seul
// (dans une liste, par exemple) ; dans une scène, le décor est muet et c'est la scène qui parle.

/** Tronc légèrement courbé, avec son côté éclairé, son côté à l'ombre et ses anneaux. */
function trunk({ height, lean = 0, width = 2.6 }) {
  const top = r2(-height);
  const half = r2(width * 0.55);
  const ctrl = r2(lean * 0.5);
  const side = (fromX, toX) => `M${fromX} 0Q${r2(fromX * 0.6 + ctrl)} ${r2(top / 2)} ${toX} ${top}`;
  const d = `${side(r2(-width), r2(lean - half))}H${r2(lean + half)}`
    + `Q${r2(width * 0.6 + ctrl)} ${r2(top / 2)} ${width} 0Z`;
  const dark = `M${r2(width * 0.3)} 0Q${r2(width * 0.5 + ctrl)} ${r2(top / 2)} ${r2(lean + half * 0.2)} ${top}`
    + `H${r2(lean + half)}Q${r2(width * 0.6 + ctrl)} ${r2(top / 2)} ${width} 0Z`;
  const light = `${side(r2(-width), r2(lean - half))}H${r2(lean - half * 0.2)}`
    + `Q${r2(-width * 0.2 + ctrl)} ${r2(top / 2)} ${r2(-width * 0.35)} 0Z`;
  return [
    path(d, 'sc-wood'),
    path(dark, 'sc-wood-dk'),
    path(light, 'sc-wood-lt'),
    ln(d),
    dt(`M${r2(-width * 0.8)} ${r2(top * 0.32)}q${r2(width * 0.8)} 1.6 ${r2(width * 1.6)} 0`),
    dt(`M${r2(-width * 0.7 + ctrl * 0.6)} ${r2(top * 0.64)}q${r2(width * 0.7)} 1.6 ${r2(width * 1.4)} 0`),
  ];
}

const PALM = () => {
  const fronds = [-168, -130, -92, -54, -16];
  const frond = (angle) => n('g', { transform: `rotate(${angle})` },
    path('M0 0C9 -7 20 -7 27 -2C19 -1 11 2 0 3Z', 'sc-leaf'),
    path('M0 0C9 -7 20 -7 27 -2C20 -2.6 11 -0.6 2 1.4Z', 'sc-leaf-lt'),
    ln('M0 0C9 -7 20 -7 27 -2C19 -1 11 2 0 3Z'),
    dt('M1 1.2C10 -1 18 -2.4 25 -2'));
  return [
    ground(7.5),
    ...trunk({ height: 30, lean: -4, width: 2.5 }),
    n('g', { transform: 'translate(-4 -30)' },
      fronds.map(frond),
      circ(1.8, 2.6, 2.4, 'sc-fruit'),
      circ(-2.6, 3.2, 2.2, 'sc-fruit'),
      path('M1.8 2.6a2.4 2.4 0 1 0 .01 0M-2.6 3.2a2.2 2.2 0 1 0 .01 0', 'sc-ln sc-ln--thin'),
      gloss(1, 1.8, 1, 0.6),
      circ(0, 0.4, 2.2, 'sc-leaf-dk')),
  ];
};

const TREE = () => [
  ground(8),
  ...trunk({ height: 11, width: 2.6 }),
  // Volume : la masse entière dans l'ombre, puis le remplissage décalé vers la lumière (en haut à
  // gauche), puis une touffe éclairée. Il reste un croissant sombre en bas à droite — c'est lui qui
  // donne le relief, et c'est le même sur TOUS les objets de la carte.
  path(scallop(0, -20, 10.5, 7, 0.95), 'sc-leaf-dk'),
  path(scallop(-1.2, -21.4, 9.6, 7, 0.95), 'sc-leaf'),
  path(scallop(-3.6, -23.4, 6, 6, 0.95), 'sc-leaf-lt'),
  ln(scallop(0, -20, 10.5, 7, 0.95)),
  dt('M-4 -14.6q4 2.4 8 0M-7 -18.6q3 1.8 6 0'),
  gloss(-5.6, -25, 2.3, 1.3),
];

const BUSH = () => [
  ground(6),
  path(scallop(0, -5.6, 6.6, 6, 0.86), 'sc-leaf-dk'),
  path(scallop(-0.8, -6.4, 5.9, 6, 0.86), 'sc-leaf'),
  path(scallop(-2, -7.4, 3.6, 5, 0.86), 'sc-leaf-lt'),
  ln(scallop(0, -5.6, 6.6, 6, 0.86)),
  circ(2.8, -7, 1.4, 'sc-tint'),
  circ(-3, -4.6, 1.2, 'sc-tint'),
  path('M2.8 -7a1.4 1.4 0 1 0 .01 0M-3 -4.6a1.2 1.2 0 1 0 .01 0', 'sc-ln sc-ln--thin'),
  gloss(2.3, -7.5, 0.6, 0.4),
];

const FLOWER = () => [
  path('M0 0Q-1 -4 0.4 -8.4', 'sc-stem'),
  path('M0.2 -4.2C-2.6 -5 -4.2 -7 -3.2 -8.8C-1.2 -8.4 -0.2 -6.6 0.2 -4.2Z', 'sc-leaf'),
  path('M0.2 -4.2C-2.4 -5.2 -3.6 -7 -3.2 -8.8C-2 -7.4 -1 -5.8 0.2 -4.2Z', 'sc-leaf-lt'),
  ln('M0.2 -4.2C-2.6 -5 -4.2 -7 -3.2 -8.8C-1.2 -8.4 -0.2 -6.6 0.2 -4.2Z'),
  // Une seule silhouette pour la corolle : cinq contours de pétale feraient, à cette taille,
  // une tache sombre au lieu d'une fleur.
  path(scallop(0.4, -10.6, 3.3, 5), 'sc-tint-dk'),
  path(scallop(-0.3, -11.3, 3, 5), 'sc-tint'),
  path(scallop(-1.1, -12.1, 1.8, 5), 'sc-tint-lt'),
  ln(scallop(0.4, -10.6, 3.3, 5)),
  circ(0.4, -10.6, 1.5, 'sc-fruit'),
  path('M0.4 -10.6a1.5 1.5 0 1 0 .01 0', 'sc-ln sc-ln--thin'),
  gloss(-0.3, -11.3, 0.7, 0.45),
];

const TUFT = () => [
  path('M0 0.6Q-3.4 -1.4 -4.6 -5.6Q-1.6 -3.6 0 0.6Z', 'sc-leaf-dk'),
  path('M0 0.6Q0.6 -3.6 -0.4 -7.4Q2 -3.8 1.4 0.6Z', 'sc-leaf'),
  path('M0.6 0.6Q2.8 -1.8 5 -4.6Q3.6 -1.2 2 0.6Z', 'sc-leaf-lt'),
  dt('M-3.6 -1.6Q-1.8 -2 -0.6 -4.4M2.4 -1.4Q3 -2.6 4 -3.8'),
];

const PEBBLE = () => [
  ground(4.4),
  path('M-4.4 -0.6C-4.8 -3.6 -2.4 -5.6 0.4 -5.4C3.4 -5.2 5 -3.4 4.6 -1C4.2 0.4 -4 0.8 -4.4 -0.6Z', 'sc-stone'),
  path('M-4.4 -1.2C-3.6 -4 -1.4 -5.4 0.6 -5.4C2 -4.2 1 -2.4 -1.2 -1.6Z', 'sc-stone-lt'),
  ln('M-4.4 -0.6C-4.8 -3.6 -2.4 -5.6 0.4 -5.4C3.4 -5.2 5 -3.4 4.6 -1C4.2 0.4 -4 0.8 -4.4 -0.6Z'),
  gloss(-1.8, -3.8, 1.2, 0.7),
];

const ROCK = () => [
  ground(9),
  path('M-9 -0.4C-10 -6 -6 -11 -1.6 -12.6C3.2 -13.4 8.6 -9.4 9.2 -3.6C9.6 0 8 1 -0.4 1C-6.6 1 -8.8 0.8 -9 -0.4Z', 'sc-stone'),
  path('M-9 -1C-9.4 -6.6 -5.4 -11.2 -1.6 -12.6C1 -11 0.4 -6 -2.4 -2.6C-4.4 -0.4 -7.4 0 -9 -1Z', 'sc-stone-lt'),
  path('M3 -12.2C7 -10.6 9.6 -7 9.2 -3.6C8.8 -0.6 7 0.6 2.6 0.8C5.6 -2.6 6 -8 3 -12.2Z', 'sc-stone-dk'),
  ln('M-9 -0.4C-10 -6 -6 -11 -1.6 -12.6C3.2 -13.4 8.6 -9.4 9.2 -3.6C9.6 0 8 1 -0.4 1C-6.6 1 -8.8 0.8 -9 -0.4Z'),
  dt('M-4.6 -11Q-2 -8.4 -2.4 -4M2.6 -11.6Q4.6 -8 4.2 -4.4'),
  gloss(-5.2, -8.2, 1.8, 1),
];

const SHELL = () => [
  ground(4),
  path('M0 0.4C-4.6 0.4 -6.6 -2 -6.2 -4.4C-5.6 -7.8 -2.8 -9.4 0 -9.4C2.8 -9.4 5.6 -7.8 6.2 -4.4C6.6 -2 4.6 0.4 0 0.4Z', 'sc-tint'),
  path('M0 0.4C-4.6 0.4 -6.6 -2 -6.2 -4.4C-5.6 -7.8 -2.8 -9.4 0 -9.4C-1.2 -6.6 -1.6 -3 -0.6 0.4Z', 'sc-tint-lt'),
  ln('M0 0.4C-4.6 0.4 -6.6 -2 -6.2 -4.4C-5.6 -7.8 -2.8 -9.4 0 -9.4C2.8 -9.4 5.6 -7.8 6.2 -4.4C6.6 -2 4.6 0.4 0 0.4Z'),
  dt('M0 -9.2V0.2M-3.2 -8.4L-4.6 -0.4M3.2 -8.4L4.6 -0.4'),
  gloss(-2.6, -6.4, 1.2, 0.7),
];

const STARFISH = () => [
  ground(5),
  path(roundedStar(0, -4.6, 5.6, 2.6, { round: 0.38, innerRound: 0.3 }), 'sc-tint'),
  path(roundedStar(-0.8, -5.4, 4.2, 2, { round: 0.38, innerRound: 0.3 }), 'sc-tint-lt'),
  ln(roundedStar(0, -4.6, 5.6, 2.6, { round: 0.38, innerRound: 0.3 })),
  circ(0, -4.6, 0.7, 'sc-dot'),
  circ(-1.6, -6, 0.5, 'sc-dot'),
  circ(1.6, -6, 0.5, 'sc-dot'),
  circ(0, -2.8, 0.5, 'sc-dot'),
];

const MUSHROOM = () => [
  ground(4),
  path('M-1.8 0.2Q-2.4 -3.4 -1.4 -5.6H1.4Q2.4 -3.4 1.8 0.2Z', 'sc-creme'),
  ln('M-1.8 0.2Q-2.4 -3.4 -1.4 -5.6H1.4Q2.4 -3.4 1.8 0.2Z'),
  path('M-5.4 -5C-5.4 -9.4 -2.8 -11.4 0 -11.4C2.8 -11.4 5.4 -9.4 5.4 -5C5.4 -3.8 -5.4 -3.8 -5.4 -5Z', 'sc-tint'),
  path('M-5.4 -5.4C-5.2 -9.2 -2.8 -11.4 0 -11.4C-1.4 -9.6 -2.4 -7.2 -2.6 -4.4Z', 'sc-tint-lt'),
  ln('M-5.4 -5C-5.4 -9.4 -2.8 -11.4 0 -11.4C2.8 -11.4 5.4 -9.4 5.4 -5C5.4 -3.8 -5.4 -3.8 -5.4 -5Z'),
  circ(2.2, -7.4, 1.1, 'sc-dot-light'),
  circ(-1.8, -8.6, 0.9, 'sc-dot-light'),
  circ(0.6, -5.8, 0.7, 'sc-dot-light'),
];

const CLOUD = () => [
  path(scallop(0, -7, 11, 7, 0.52), 'sc-cloud-dk'),
  path(scallop(-0.8, -8, 10.4, 7, 0.52), 'sc-cloud'),
  path(scallop(-3.2, -9, 6.4, 6, 0.52), 'sc-cloud-lt'),
  ln(scallop(0, -7, 11, 7, 0.52)),
];

const SUN = () => [
  n('g', { class: 'sc-rays' },
    ...around(12, 15.4, 0, -14).map(([x, y], i) => path(
      `M${x} ${y}L${r2(x * 1.3)} ${r2(-14 + (y + 14) * 1.3)}`, i % 2 ? 'sc-ray sc-ray--short' : 'sc-ray'))),
  circ(0, -14, 12, 'sc-sun'),
  path('M-12 -14A12 12 0 0 1 2 -25.8A13 13 0 0 0 -8 -6.6A12 12 0 0 1 -12 -14Z', 'sc-sun-lt'),
  ln('M0 -26a12 12 0 1 0 .01 0'),
  // Du caractère : le soleil sourit (point 5 de la direction artistique).
  ell(-4.4, -14.6, 1.3, 1.7, 'sc-ink'),
  ell(4.4, -14.6, 1.3, 1.7, 'sc-ink'),
  circ(-3.9, -15.3, 0.5, 'sc-shine'),
  circ(4.9, -15.3, 0.5, 'sc-shine'),
  path('M-2.6 -10.6q2.6 2.6 5.2 0', 'sc-smile'),
  ell(-7.6, -11.4, 2, 1.2, 'sc-blush'),
  ell(7.6, -11.4, 2, 1.2, 'sc-blush'),
];

const LANTERN = () => [
  ground(4),
  path('M-1 0V-13h2V0Z', 'sc-wood'),
  ln('M-1 0V-13h2V0Z'),
  path('M0 -13q0 -3 4.6 -3', 'sc-arm'),
  path('M2.4 -15.4h4.4l1.4 2.4v7.2l-1.4 2.2H2.4L1 -5.8v-7.2Z', 'sc-glow-fill'),
  path('M2.4 -15.4h4.4l-1 2.4v7.2l1 2.2H2.4L1 -5.8v-7.2Z', 'sc-glow-light'),
  ln('M2.4 -15.4h4.4l1.4 2.4v7.2l-1.4 2.2H2.4L1 -5.8v-7.2Z'),
  path('M0.4 -16.6h8v1.6h-8Z', 'sc-wood-dk'),
  ln('M0.4 -16.6h8v1.6h-8Z'),
  dt('M1 -12.8h7M1 -8h7'),
  circ(4.6, -11.2, 0.8, 'sc-shine'),
];

const BUNTING = () => {
  const span = 46;
  const flags = 7;
  const curve = (t) => r2(-10 + 5.6 * Math.sin(Math.PI * t));
  const items = Array.from({ length: flags }, (_, i) => {
    const t = (i + 0.5) / flags;
    const x = r2(-span / 2 + span * t);
    const y = curve(t);
    const w = 3.2;
    return n('g', { class: `sc-flag sc-flag--${i % 3}` },
      path(`M${r2(x - w)} ${y}H${r2(x + w)}L${x} ${r2(y + 7)}Z`, 'sc-flag-fill'),
      path(`M${r2(x - w)} ${y}H${x}L${x} ${r2(y + 7)}Z`, 'sc-flag-light'),
      ln(`M${r2(x - w)} ${y}H${r2(x + w)}L${x} ${r2(y + 7)}Z`));
  });
  return [
    path(`M${-span / 2} -10Q0 -2.6 ${span / 2} -10`, 'sc-rope'),
    ...items,
  ];
};

const BARREL = () => [
  ground(6.5),
  path('M-5.6 -1.4C-6.4 -6 -6.4 -11 -5.6 -15.4C-2 -16.4 2 -16.4 5.6 -15.4C6.4 -11 6.4 -6 5.6 -1.4C2 -0.2 -2 -0.2 -5.6 -1.4Z', 'sc-wood'),
  path('M-5.6 -1.4C-6.4 -6 -6.4 -11 -5.6 -15.4C-4 -15.8 -2.6 -16 -1.2 -16.1C-2 -11 -2 -6 -1.2 -0.9C-2.8 -1 -4.2 -1.1 -5.6 -1.4Z', 'sc-wood-lt'),
  path('M3 -16C4 -15.9 4.8 -15.7 5.6 -15.4C6.4 -11 6.4 -6 5.6 -1.4C4.8 -1.1 4 -0.9 3 -0.8C3.8 -6 3.8 -11 3 -16Z', 'sc-wood-dk'),
  ln('M-5.6 -1.4C-6.4 -6 -6.4 -11 -5.6 -15.4C-2 -16.4 2 -16.4 5.6 -15.4C6.4 -11 6.4 -6 5.6 -1.4C2 -0.2 -2 -0.2 -5.6 -1.4Z'),
  dt('M-2 -16.2V-0.7M2 -16.2V-0.7'),
  path('M-6.2 -12.6C-2 -13.8 2 -13.8 6.2 -12.6V-11C2 -12.2 -2 -12.2 -6.2 -11Z', 'sc-iron'),
  path('M-6.2 -5.6C-2 -4.4 2 -4.4 6.2 -5.6V-4C2 -2.8 -2 -2.8 -6.2 -4Z', 'sc-iron'),
  ell(0, -15.6, 5.6, 1.5, 'sc-wood-lt'),
  ln('M-5.6 -15.6a5.6 1.5 0 1 0 11.2 0a5.6 1.5 0 1 0 -11.2 0'),
  gloss(-3.4, -11.4, 1.2, 2.4, 10),
];

const CHEST = () => [
  ground(8),
  path('M-7 -1.2V-8h14v6.8Z', 'sc-wood'),
  path('M-7 -1.2V-8h3.6v6.8Z', 'sc-wood-lt'),
  path('M3.6 -8h3.4v6.8H3.6Z', 'sc-wood-dk'),
  ln('M-7 -1.2V-8h14v6.8Z'),
  dt('M-3.4 -8v6.8M0.2 -8v6.8M3.6 -8v6.8'),
  path('M-7.4 -8a7.4 5.4 0 0 1 14.8 0Z', 'sc-wood'),
  path('M-7.4 -8a7.4 5.4 0 0 1 7.4 -5.4v5.4Z', 'sc-wood-lt'),
  ln('M-7.4 -8a7.4 5.4 0 0 1 14.8 0Z'),
  dt('M-3.8 -12.4L-3 -8M3.8 -12.4L3 -8'),
  path('M-1.6 -9.4h3.2v5.6h-3.2Z', 'sc-gold'),
  ln('M-1.6 -9.4h3.2v5.6h-3.2Z'),
  circ(0, -6.4, 0.8, 'sc-ink'),
  gloss(-4, -11, 1.6, 0.9),
];

const BOAT = () => [
  path('M-9 -1C-9 1.6 -6 3 0 3C6 3 9 1.6 9 -1Z', 'sc-wood'),
  path('M-9 -1C-9 1 -7 2.2 -3.4 2.7C-4.6 1.2 -5.2 0.1 -5.4 -1Z', 'sc-wood-lt'),
  ln('M-9 -1C-9 1.6 -6 3 0 3C6 3 9 1.6 9 -1Z'),
  path('M-0.6 -1V-16h1.2V-1Z', 'sc-wood-dk'),
  path('M1.4 -15.2C5.4 -12.6 6.6 -8 6 -4.4C4 -5.6 2.6 -6 1.4 -6Z', 'sc-tint'),
  ln('M1.4 -15.2C5.4 -12.6 6.6 -8 6 -4.4C4 -5.6 2.6 -6 1.4 -6Z'),
  path('M-1.4 -14C-4.2 -11.6 -5.4 -8 -5 -4.8C-3.4 -5.8 -2.4 -6.2 -1.4 -6.2Z', 'sc-tint-lt'),
  ln('M-1.4 -14C-4.2 -11.6 -5.4 -8 -5 -4.8C-3.4 -5.8 -2.4 -6.2 -1.4 -6.2Z'),
  dt('M-7 -0.2h14'),
];

const BIRD = () => [
  path('M-5 0Q-2.6 -3.2 0 -0.4Q2.6 -3.2 5 0', 'sc-bird'),
];

const FROND = () => [
  path('M0 2C-2 -8 2 -17 10 -22C8 -11 6 -3 2 2Z', 'sc-leaf'),
  path('M0 2C-1.4 -7.4 2 -16 10 -22C5.6 -14 3 -6 2 2Z', 'sc-leaf-lt'),
  ln('M0 2C-2 -8 2 -17 10 -22C8 -11 6 -3 2 2Z'),
  dt('M1.4 1.4Q3.4 -9 9 -20M2.4 -3.6L6.4 -7M2.6 -8.2L7.4 -12.4M3.4 -13L8.4 -16.6'),
];

const SIGN = () => [
  ground(4),
  path('M-1.2 0V-9h2.4V0Z', 'sc-wood-dk'),
  ln('M-1.2 0V-9h2.4V0Z'),
  path('M-7 -16.6h14l1.4 3.4L7 -9.4H-7l-1.4-3.8Z', 'sc-wood'),
  path('M-7 -16.6h3.6L-4.8 -9.4H-7l-1.4-3.8Z', 'sc-wood-lt'),
  ln('M-7 -16.6h14l1.4 3.4L7 -9.4H-7l-1.4-3.8Z'),
  dt('M-7 -13.4h14'),
];

const LOCK = () => [
  path('M-3.4 -4.6a3.4 4 0 0 1 6.8 0', 'sc-arm'),
  path('M-5 -5h10a1.6 1.6 0 0 1 1.6 1.6v5.8a1.6 1.6 0 0 1 -1.6 1.6h-10a1.6 1.6 0 0 1 -1.6 -1.6v-5.8a1.6 1.6 0 0 1 1.6 -1.6Z', 'sc-gold'),
  path('M-5 -5h3.4v9h-3.4a1.6 1.6 0 0 1 -1.6 -1.6v-5.8a1.6 1.6 0 0 1 1.6 -1.6Z', 'sc-gold-lt'),
  ln('M-5 -5h10a1.6 1.6 0 0 1 1.6 1.6v5.8a1.6 1.6 0 0 1 -1.6 1.6h-10a1.6 1.6 0 0 1 -1.6 -1.6v-5.8a1.6 1.6 0 0 1 1.6 -1.6Z'),
  circ(0, -0.8, 1.2, 'sc-ink'),
  path('M-0.6 -0.4h1.2v2.4h-1.2Z', 'sc-ink'),
];

// --- Les lieux : un jeu = un endroit du décor ---------------------------------------------------
//
// Un lieu est un objet comme un autre, en plus grand et en plus détaillé (c'est le point focal de
// sa zone). Les quatre derniers sont des emplacements d'avance : un 7ᵉ, 8ᵉ ou 9ᵉ jeu dans l'île
// prend le lieu suivant de la liste sans que la composition bouge.

const CAVE = () => [
  ground(17, 4),
  path('M-16 0C-17 -9 -12 -19 -3 -21C7 -22 16 -14 17 -4C17.4 -0.6 16 0.4 10 0.6Z', 'sc-stone'),
  path('M-16 -0.6C-16.6 -9.4 -12 -18.8 -3 -21C1 -18.4 -0.6 -11 -5 -5.6C-8.4 -1.6 -12.6 0.2 -16 -0.6Z', 'sc-stone-lt'),
  path('M6 -20C13 -17 17 -10.6 17 -4C17 -0.8 15.6 0.4 10.6 0.6C12.6 -6 11.4 -14 6 -20Z', 'sc-stone-dk'),
  ln('M-16 0C-17 -9 -12 -19 -3 -21C7 -22 16 -14 17 -4C17.4 -0.6 16 0.4 10 0.6Z'),
  dt('M-9.4 -17.4Q-5 -12.6 -6 -5.4M7.4 -18.6Q11.6 -13 11 -5'),
  // L'entrée : un noir chaud, pas un trou. Deux échos dessinés en arcs : la grotte des sons.
  path('M-7.6 0.6C-7.6 -8.4 -4.4 -13 0 -13C4.4 -13 7.6 -8.4 7.6 0.6Z', 'sc-cave-mouth'),
  ln('M-7.6 0.6C-7.6 -8.4 -4.4 -13 0 -13C4.4 -13 7.6 -8.4 7.6 0.6Z'),
  path('M-4.4 0.4C-4.4 -6 -2.4 -9.4 0 -9.4C2.4 -9.4 4.4 -6 4.4 0.4', 'sc-echo'),
  path('M-2 0.4C-2 -4 -1 -6 0 -6C1 -6 2 -4 2 0.4', 'sc-echo'),
  gloss(-10, -13.6, 3, 1.6),
];

const MILL = () => [
  ground(12, 3.4),
  path('M-7.6 0.4L-5.6 -21h11.2L7.6 0.4Z', 'sc-wall'),
  path('M-7.6 0.4L-5.6 -21h3.2L-3.6 0.4Z', 'sc-wall-lt'),
  path('M3.4 -21h2.2L7.6 0.4H4.6Z', 'sc-wall-dk'),
  ln('M-7.6 0.4L-5.6 -21h11.2L7.6 0.4Z'),
  dt('M-6.8 -8h13.6M-7.2 -14.4h14.4'),
  // Toit en tuiles (motif, jamais un aplat nu)
  path('M-8.6 -21L0 -29.4L8.6 -21Z', 'sc-roof'),
  path('M-8.6 -21L0 -29.4L1.4 -28v7Z', 'sc-roof-lt'),
  ln('M-8.6 -21L0 -29.4L8.6 -21Z'),
  dt('M-5.4 -24.2h10.8M-3 -26.6h6'),
  // Porte et fenêtre
  path('M-2.4 0.4v-6.6a2.4 2.4 0 0 1 4.8 0V0.4Z', 'sc-door'),
  ln('M-2.4 0.4v-6.6a2.4 2.4 0 0 1 4.8 0V0.4Z'),
  circ(1.4, -3.2, 0.5, 'sc-gold'),
  path('M-3.4 -15.4h2.8v3h-2.8Z', 'sc-window'),
  ln('M-3.4 -15.4h2.8v3h-2.8Z'),
  // Les ailes : quatre pales, chacune avec sa toile
  n('g', { class: 'sc-mill-sails', transform: 'translate(0 -23)' },
    [0, 90, 180, 270].map((a) => n('g', { transform: `rotate(${a})` },
      path('M-1 -2L-1.4 -13h2.8L1 -2Z', 'sc-sail'),
      ln('M-1 -2L-1.4 -13h2.8L1 -2Z'),
      dt('M0 -3v-9.4'))),
    circ(0, 0, 1.8, 'sc-gold'),
    ln('M0 0a1.8 1.8 0 1 0 .01 0')),
];

const TWIN_ROCKS = () => [
  ground(15, 3.6),
  path('M-13 0.4C-14 -5 -11 -11.6 -6.6 -12.6C-2.6 -12 0.2 -6 -0.4 0.4Z', 'sc-stone'),
  path('M-13 0C-13.6 -5.4 -10.8 -11.6 -6.6 -12.6C-5 -10 -6.6 -4.6 -9 0.2Z', 'sc-stone-lt'),
  ln('M-13 0.4C-14 -5 -11 -11.6 -6.6 -12.6C-2.6 -12 0.2 -6 -0.4 0.4Z'),
  dt('M-10.6 -9.6Q-7.6 -6.4 -8 -1M-4.4 -10.6Q-2.4 -6 -3 -0.6'),
  path('M1.4 0.4C0.4 -6.6 3.4 -14.4 7.6 -15.6C11.6 -14.8 14.4 -7 13.4 0.4Z', 'sc-stone'),
  path('M1.4 0C0.6 -7 3.6 -14.6 7.6 -15.6C9 -12.6 7.4 -6 5.4 0.2Z', 'sc-stone-lt'),
  ln('M1.4 0.4C0.4 -6.6 3.4 -14.4 7.6 -15.6C11.6 -14.8 14.4 -7 13.4 0.4Z'),
  dt('M4.4 -12Q7.4 -7.6 7 -0.6M10.6 -12.4Q12.4 -7 11.8 -0.4'),
  gloss(-9.6, -9.4, 1.8, 1),
  gloss(4.6, -12.4, 1.8, 1),
];

/** L'arbre qui change de son : une moitié menthe, une moitié pêche, et des feuilles qui tombent. */
const RAINBOW_TREE = () => [
  ground(11),
  ...trunk({ height: 13, width: 3 }),
  path(scallop(-5.4, -23, 9.4, 7, 0.95), 'sc-leaf-dk'),
  path(scallop(-6.6, -24.4, 8.6, 7, 0.95), 'sc-leaf'),
  path(scallop(-8.4, -26, 5.4, 6, 0.95), 'sc-leaf-lt'),
  ln(scallop(-5.4, -23, 9.4, 7, 0.95)),
  path(scallop(5.4, -21, 9.4, 7, 0.95), 'sc-tint-dk'),
  path(scallop(4.2, -22.4, 8.6, 7, 0.95), 'sc-tint'),
  path(scallop(2.6, -24, 5.4, 6, 0.95), 'sc-tint-lt'),
  ln(scallop(5.4, -21, 9.4, 7, 0.95)),
  dt('M-9 -18q4 2.4 7 0M4 -16q3.4 2 6.6 0'),
  path('M12 -11.6q2 1.4 1 3.2q-2.4 0.2 -1 -3.2Z', 'sc-tint'),
  path('M-13 -8.4q2 1.4 1 3.2q-2.4 0.2 -1 -3.2Z', 'sc-leaf'),
  ln('M12 -11.6q2 1.4 1 3.2q-2.4 0.2 -1 -3.2ZM-13 -8.4q2 1.4 1 3.2q-2.4 0.2 -1 -3.2Z'),
  gloss(-10.4, -27, 2.2, 1.2),
];

const LIGHTHOUSE = () => [
  ground(13, 3.4),
  path('M-9 1C-7.6 -2.2 -4 -3.4 0 -3.4C4 -3.4 7.6 -2.2 9 1Z', 'sc-stone'),
  ln('M-9 1C-7.6 -2.2 -4 -3.4 0 -3.4C4 -3.4 7.6 -2.2 9 1Z'),
  // Tour à rayures : le motif fait le phare
  path('M-5.4 -1.4L-3.6 -27h7.2L5.4 -1.4Z', 'sc-wall'),
  path('M-5.4 -1.4L-3.6 -27h2.4L-2.2 -1.4Z', 'sc-wall-lt'),
  path('M2.6 -27h1L5.4 -1.4H3.2Z', 'sc-wall-dk'),
  n('g', { class: 'sc-stripes' },
    path('M-4.9 -8.4h9.8L5.2 -4.4H-5.2Z', 'sc-stripe'),
    path('M-4.2 -18.4h8.4L4.5 -14.4H-4.5Z', 'sc-stripe'),
    path('M-3.6 -27h7.2L3.8 -24.4H-3.8Z', 'sc-stripe')),
  ln('M-5.4 -1.4L-3.6 -27h7.2L5.4 -1.4Z'),
  // Galerie, lanterne et faisceau
  path('M-6 -27h12v2.4h-12Z', 'sc-iron'),
  ln('M-6 -27h12v2.4h-12Z'),
  path('M-3.6 -34.4h7.2v7.4h-7.2Z', 'sc-glow-fill'),
  path('M-3.6 -34.4h2.6v7.4h-2.6Z', 'sc-glow-light'),
  ln('M-3.6 -34.4h7.2v7.4h-7.2Z'),
  path('M-4.6 -34.4L0 -39.4l4.6 5Z', 'sc-roof'),
  ln('M-4.6 -34.4L0 -39.4l4.6 5Z'),
  circ(0, -40.6, 1.2, 'sc-gold'),
  n('g', { class: 'sc-beam' },
    path('M4 -32.4L17 -36.4L17 -27.4Z', 'sc-glow-fill'),
    path('M-4 -32.4L-17 -36.4L-17 -27.4Z', 'sc-glow-fill')),
  path('M-2 -24h4v2.6h-4Z', 'sc-window'),
  ln('M-2 -24h4v2.6h-4Z'),
];

const HUT = () => [
  ground(13, 3.2),
  path('M-8.6 0.4v-13h17.2v13Z', 'sc-wall'),
  path('M-8.6 0.4v-13h4v13Z', 'sc-wall-lt'),
  path('M5 -12.6h3.6v13H5Z', 'sc-wall-dk'),
  ln('M-8.6 0.4v-13h17.2v13Z'),
  dt('M-4.6 -12.6v13M-0.6 -12.6v13M3.4 -12.6v13'),
  path('M-10.6 -12.6L0 -21.6l10.6 9Z', 'sc-roof'),
  path('M-10.6 -12.6L0 -21.6l1.6 1.4v7.6Z', 'sc-roof-lt'),
  ln('M-10.6 -12.6L0 -21.6l10.6 9Z'),
  dt('M-7 -15.6h14M-4 -18.2h8'),
  path('M-2.8 0.4v-7a2.8 2.8 0 0 1 5.6 0V0.4Z', 'sc-door'),
  ln('M-2.8 0.4v-7a2.8 2.8 0 0 1 5.6 0V0.4Z'),
  circ(1.8, -3.4, 0.5, 'sc-gold'),
  // La plaque au « ? » : c'est la cabane aux devinettes
  path('M-4 -19.4h8v6h-8Z', 'sc-sign-plate'),
  ln('M-4 -19.4h8v6h-8Z'),
  n('text', { x: 0, y: -14.8, class: 'sc-glyph', text: '?' }),
];

const TENT = () => [
  ground(12, 3),
  path('M-10 0.4L0 -17l10 17.4Z', 'sc-tint'),
  path('M-10 0.4L0 -17l-2.6 17.4Z', 'sc-tint-lt'),
  ln('M-10 0.4L0 -17l10 17.4Z'),
  dt('M-5.6 0.2L-0.6 -13M5 0.2L0.6 -13'),
  path('M-3 0.4L0 -10l3 10.4Z', 'sc-cave-mouth'),
  ln('M-3 0.4L0 -10l3 10.4Z'),
  path('M0 -17v-4', 'sc-arm'),
  path('M0.4 -21h5l-1.6 2 1.6 2h-5Z', 'sc-tint'),
  ln('M0.4 -21h5l-1.6 2 1.6 2h-5Z'),
];

const WELL = () => [
  ground(11, 3),
  path('M-8 -0.6C-8 -5 -8 -8.6 -7.4 -10h14.8C8 -8.6 8 -5 8 -0.6C8 1.4 -8 1.4 -8 -0.6Z', 'sc-stone'),
  path('M-8 -0.6C-8 -5 -8 -8.6 -7.4 -10h3.8C-4 -8.6 -4 -4 -4 0.4Z', 'sc-stone-lt'),
  ln('M-8 -0.6C-8 -5 -8 -8.6 -7.4 -10h14.8C8 -8.6 8 -5 8 -0.6C8 1.4 -8 1.4 -8 -0.6Z'),
  dt('M-7.8 -5.6h15.6M-4 -10v4.2M0 -5.6v5.6M4 -10v4.2'),
  ell(0, -10, 7.6, 2.4, 'sc-cave-mouth'),
  ln('M-7.6 -10a7.6 2.4 0 1 0 15.2 0a7.6 2.4 0 1 0 -15.2 0'),
  path('M-6 -10.4V-20M6 -10.4V-20', 'sc-post'),
  path('M-8.4 -19.6L0 -25.4l8.4 5.8Z', 'sc-roof'),
  path('M-8.4 -19.6L0 -25.4l1.4 1v4.8Z', 'sc-roof-lt'),
  ln('M-8.4 -19.6L0 -25.4l8.4 5.8Z'),
  dt('M-5.4 -21.6h10.8'),
  path('M0 -19.6v5.4', 'sc-rope'),
  path('M-2 -14.2h4v3h-4Z', 'sc-wood'),
  ln('M-2 -14.2h4v3h-4Z'),
];

/** Catalogue. L'ordre n'a pas d'importance : on y accède par identifiant. */
export const PROPS = {
  palm: { label: 'Palmier', parts: PALM },
  tree: { label: 'Arbre', parts: TREE },
  bush: { label: 'Buisson', parts: BUSH },
  flower: { label: 'Fleur', parts: FLOWER },
  tuft: { label: 'Touffe d\'herbe', parts: TUFT },
  pebble: { label: 'Galet', parts: PEBBLE },
  rock: { label: 'Rocher', parts: ROCK },
  shell: { label: 'Coquillage', parts: SHELL },
  starfish: { label: 'Étoile de mer', parts: STARFISH },
  mushroom: { label: 'Champignon', parts: MUSHROOM },
  cloud: { label: 'Nuage', parts: CLOUD },
  sun: { label: 'Soleil', parts: SUN },
  lantern: { label: 'Lanterne', parts: LANTERN },
  bunting: { label: 'Guirlande de fanions', parts: BUNTING },
  barrel: { label: 'Tonneau', parts: BARREL },
  chest: { label: 'Coffre', parts: CHEST },
  boat: { label: 'Petit voilier', parts: BOAT },
  bird: { label: 'Oiseau', parts: BIRD },
  frond: { label: 'Palme', parts: FROND },
  sign: { label: 'Panneau de bois', parts: SIGN },
  lock: { label: 'Cadenas', parts: LOCK },
  cave: { label: 'Grotte', parts: CAVE },
  mill: { label: 'Moulin', parts: MILL },
  'twin-rocks': { label: 'Rochers jumeaux', parts: TWIN_ROCKS },
  'rainbow-tree': { label: 'Arbre aux deux feuillages', parts: RAINBOW_TREE },
  lighthouse: { label: 'Phare', parts: LIGHTHOUSE },
  hut: { label: 'Cabane', parts: HUT },
  tent: { label: 'Tente', parts: TENT },
  well: { label: 'Puits', parts: WELL },
};

export const PROP_IDS = Object.keys(PROPS);

export function propLabel(id) {
  return PROPS[id]?.label || '';
}

/** Les teintes utilisables comme accent d'un objet (fleur, fanion, coquillage, voile…). */
export const TINTS = ['rose', 'peche', 'citron', 'menthe', 'ciel', 'lavande', 'creme'];

/** Les variables de teinte posées sur un `<use>` (le dessin est partagé, la couleur ne l'est pas). */
export function tintVars(tint) {
  if (!tint || !TINTS.includes(tint)) return '';
  return `--sc-tint: var(--kawaii-${tint}); --sc-tint-lt: var(--kawaii-${tint}-light);`
    + ` --sc-tint-dk: var(--kawaii-${tint}-deep);`;
}

const DEF_PREFIX = 'sc';

/** Identifiant d'un objet dans le `<defs>` d'une scène (préfixé : plusieurs scènes par page). */
export const defId = (scene, id) => `${DEF_PREFIX}-${scene}-${id}`;

/**
 * Le `<defs>` d'une scène : un `<g>` par objet demandé, dans l'ordre du catalogue.
 * Déclarer deux fois le même objet n'a aucun coût : la liste est dédoublonnée.
 */
export function propDefs(scene, ids) {
  const wanted = [...new Set(ids)].filter((id) => PROPS[id]);
  return wanted.map((id) => n('g', { id: defId(scene, id) }, PROPS[id].parts()));
}

/**
 * Pose un objet : use('tree', { scene, x, y, scale, flip, tint }).
 * `--sc-stroke` compense l'échelle pour que TOUS les contours de la scène aient la même
 * épaisseur à l'écran — c'est le marqueur n°1 du style, il ne doit pas maigrir avec la taille.
 */
export function use(id, { scene = 'map', x = 0, y = 0, scale = 1, flip = false, tint = null, opacity = null, className = '' } = {}) {
  const transform = `translate(${r2(x)} ${r2(y)}) scale(${r2(flip ? -scale : scale)} ${r2(scale)})`;
  // Compensation BORNÉE : au-delà, un objet posé tout petit ne serait plus qu'un trait.
  // Un objet lointain garde donc un contour un peu plus fin — c'est aussi ce que fait la distance.
  const clamped = Math.min(Math.max(Math.abs(scale), 0.8), 1.4);
  const style = `--sc-stroke: ${r2(1.45 / clamped)};${tint ? ` ${tintVars(tint)}` : ''}`;
  return n('use', {
    href: `#${defId(scene, id)}`,
    transform,
    style,
    opacity,
    class: className || null,
  });
}

/** Pose une liste d'objets décrits par `{ id, x, y, scale, flip, tint }`. */
export function scatter(scene, items) {
  return items.map(({ id, ...rest }) => use(id, { scene, ...rest }));
}

/** Les identifiants d'objets utilisés par une liste (pour construire le `<defs>` exact). */
export function idsOf(items) {
  return [...new Set(items.map((item) => item.id))];
}

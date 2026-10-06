// Décorations kawaii (#88) : { kind: 'kawaii-deco', shape, color?, face? }.
// Petits autocollants à semer autour d'un titre, d'une carte ou d'une récompense : étoile, cœur,
// nuage, étincelle. Même style que les personnages (volume, reflet, liseré, ombre).
// Décoratives par défaut (aria-hidden) ; `label` leur donne un nom si elles portent un sens.
import {
  n, toNode, nextUid, roundedStar, shapeLayers, stickerFilter, colorVars, face, COLORS, COLOR_NAMES, FACES,
} from './kawaii-parts.js';

export const DECORATIONS = ['star', 'heart', 'cloud', 'sparkle'];
const NAMES = { star: 'Étoile', heart: 'Cœur', cloud: 'Nuage', sparkle: 'Étincelle' };
const DEFAULT_COLOR = { star: 'citron', heart: 'rose', cloud: 'ciel', sparkle: 'citron' };

// Repère 60 × 60. `face` : place et taille d'un petit visage facultatif (pas sur l'étincelle).
const GEOMETRY = {
  star: {
    d: roundedStar(30, 32, 26, 14, { round: 0.3, innerRound: 0.2 }),
    shine: { x: 23, y: 24, rx: 2.4, ry: 1.5, rotate: -40 }, face: { x: 30, y: 35, scale: 0.42 },
  },
  heart: {
    d: 'M30 52C14 43 6 32 7.5 22C9 12 22 9 30 19C38 9 51 12 52.5 22C54 32 46 43 30 52Z',
    shine: { x: 16, y: 21, rx: 3.6, ry: 2.2, rotate: -45 }, face: { x: 30, y: 31, scale: 0.46 },
  },
  cloud: {
    d: 'M15 47A9 9 0 0 1 10 31A11 11 0 0 1 25 18.5A13 13 0 0 1 48 25A11 11 0 0 1 47 47Z',
    shine: { x: 17, y: 32, rx: 3, ry: 1.8, rotate: -40 }, face: { x: 30, y: 37, scale: 0.42 },
  },
  sparkle: {
    d: 'M30 5Q33 27 55 30Q33 33 30 55Q27 33 5 30Q27 27 30 5Z',
    shine: null, face: null,
  },
};

export function check(spec, errors) {
  if (!DECORATIONS.includes(spec.shape)) errors.push(`kawaii-deco.shape : ${DECORATIONS.join(' | ')}`);
  if (spec.color !== undefined && !COLORS.includes(spec.color)) errors.push(`kawaii-deco.color : ${COLORS.join(' | ')}`);
  if (spec.face !== undefined && !FACES.includes(spec.face)) errors.push(`kawaii-deco.face : ${FACES.join(' | ')}`);
  if (spec.face !== undefined && spec.shape === 'sparkle') errors.push('kawaii-deco.face : pas de visage sur une étincelle');
}

/** Nom accessible (« Cœur rose »), ou `spec.label` s'il est fourni. Pure. */
export function label(spec) {
  if (spec.label) return spec.label;
  const color = spec.color || DEFAULT_COLOR[spec.shape];
  return NAMES[spec.shape] ? `${NAMES[spec.shape]} ${COLOR_NAMES[color]}` : '';
}

/** L'arbre SVG d'une décoration (pure), identifiants préfixés par `uid`. */
export function decoration(spec, { uid = nextUid() } = {}) {
  const geo = GEOMETRY[spec.shape] || GEOMETRY.star;
  const color = spec.color || DEFAULT_COLOR[spec.shape] || 'citron';
  const clipId = `${uid}-clip`;
  const filterId = `${uid}-sticker`;
  const named = Boolean(spec.label);
  return n('svg', {
    viewBox: '0 0 60 60',
    class: `art kw kw-deco kw-deco--${spec.shape}`,
    style: colorVars(color, color),
    role: named ? 'img' : null,
    'aria-label': named ? spec.label : null,
    'aria-hidden': named ? null : 'true',
    focusable: 'false',
  },
  n('defs', {},
    spec.sticker === false ? null : stickerFilter(filterId, { rim: 2.2 }),
    n('clipPath', { id: clipId }, n('path', { d: geo.d }))),
  n('g', { class: 'kw__sticker', filter: spec.sticker === false ? null : `url(#${filterId})` },
    shapeLayers({ d: geo.d, shine: geo.shine, clipId, offset: [-1.6, -2.4] }),
    spec.face && geo.face && face(spec.face, geo.face)));
}

export function draw(spec) {
  return toNode(decoration(spec));
}

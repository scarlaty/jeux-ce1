// Kit de personnages kawaii (#88) : { kind: 'kawaii', body, color, face, accessory, … }.
// Des « autocollants » posés sur la page du cahier : formes rondes, gros yeux brillants, joues
// roses, liseré clair et petite ombre. Paramétrable plutôt que dessiné un à un.
//
// Description d'un personnage (tous les champs sont facultatifs) :
//   body      'round' | 'drop' | 'block' | 'star' | 'cloud' | 'egg'   formes simples
//             'cat' | 'bunny' | 'bear'                                bébés animaux (avec `stage`)
//   color     'rose' | 'peche' | 'citron' | 'menthe' | 'ciel' | 'lavande' | 'creme'
//   face      'happy' (content) | 'joyful' (très content) | 'surprised' (surpris)
//             | 'cheering' (encourageant) | 'sleepy' (endormi)
//   accessory 'none' | 'bow' | 'hat' | 'flower' | 'sprout' | 'crown' | 'star' | 'glasses'
//   accent    couleur de l'accessoire (par défaut : celle de l'accessoire, jamais celle du corps)
//   stage     1 | 2 | 3 pour un animal : bébé dans sa coquille, petit, grand
//   crack     true : l'œuf est fêlé (il va éclore)
//   name      prénom, ajouté au nom accessible (« Perle : goutte rose, l'air content… »)
//   blink     false : pas de clignement d'yeux ; sticker false : sans liseré ni ombre
//   decorative true : aria-hidden (le personnage accompagne un texte qui dit déjà tout)
//
// Fonctions pures (testées sous node) : character(spec) → arbre SVG, label, check, kawaiiErrors,
// mascot(île), companion({ animal, stage }). Navigateur : draw(spec) → <svg>, play(el, mouvement).
// Couleurs et animations : css/kawaii.css (+ variables --kawaii-* de tokens.css).
import {
  n, toNode, toMarkup, nextUid, face, accessory, sleepZ, stickerFilter, colorVars, blinkDelay, shapeLayers,
  COLORS, COLOR_NAMES, FACES, FACE_NAMES, ACCESSORIES, ACCESSORY_NAMES, ACCESSORY_ACCENT,
  SHAPES, ANIMALS, BODIES, BODY_NAMES, ANIMAL_STAGES,
  SHAPE_GEOMETRY, ANIMAL_GEOMETRY, animalScale, EARS, TAILS, MIRROR, feet, arms, SHELL_D, CRACK_D,
} from './kawaii-parts.js';

export { COLORS, FACES, ACCESSORIES, SHAPES, ANIMALS, BODIES, ANIMAL_STAGES, toMarkup, toNode, nextUid };

const DEFAULTS = { body: 'round', color: 'rose', face: 'happy', accessory: 'none', stage: 2, crack: false };

// Ordre de repli quand l'accessoire aurait la couleur du corps (un nœud rose sur une goutte rose).
const ACCENT_FALLBACK = ['rose', 'lavande', 'citron', 'ciel', 'menthe', 'peche'];

/** La description complétée par les valeurs par défaut (pure). */
export function normalize(spec = {}) {
  const k = { ...DEFAULTS, ...spec };
  const wanted = spec.accent || ACCESSORY_ACCENT[k.accessory] || 'rose';
  k.accent = wanted === k.color ? ACCENT_FALLBACK.find((c) => c !== k.color) : wanted;
  return k;
}

const oneOf = (list, value) => list.includes(value);

export function check(spec, errors) {
  const k = { ...DEFAULTS, ...spec };
  if (!oneOf(BODIES, k.body)) errors.push(`kawaii.body : ${BODIES.join(' | ')}`);
  if (!oneOf(COLORS, k.color)) errors.push(`kawaii.color : ${COLORS.join(' | ')}`);
  if (!oneOf(FACES, k.face)) errors.push(`kawaii.face : ${FACES.join(' | ')}`);
  if (!oneOf(ACCESSORIES, k.accessory)) errors.push(`kawaii.accessory : ${ACCESSORIES.join(' | ')}`);
  if (spec.accent !== undefined && !oneOf(COLORS, spec.accent)) errors.push(`kawaii.accent : ${COLORS.join(' | ')}`);
  if (spec.stage !== undefined && !oneOf(ANIMAL_STAGES, spec.stage)) errors.push('kawaii.stage : 1, 2 ou 3');
  if (spec.stage !== undefined && !oneOf(ANIMALS, k.body)) errors.push('kawaii.stage : seulement pour un animal');
  if (spec.crack !== undefined && k.body !== 'egg') errors.push('kawaii.crack : seulement pour un œuf');
  if (spec.name !== undefined && (typeof spec.name !== 'string' || !spec.name.trim())) errors.push('kawaii.name : texte non vide');
}

/** Liste des problèmes d'une description (vide = valide). Pure. */
export function kawaiiErrors(spec) {
  if (!spec || typeof spec !== 'object') return ['kawaii : la description doit être un objet'];
  const errors = [];
  check(spec, errors);
  return errors;
}

function bodyWords(k) {
  const base = BODY_NAMES[k.body];
  if (k.body === 'egg' && k.crack) return 'Œuf qui éclot';
  if (!oneOf(ANIMALS, k.body)) return base;
  return { 1: `Bébé ${base.toLowerCase()}`, 2: base, 3: `Grand ${base.toLowerCase()}` }[k.stage];
}

/** Nom accessible : « Perle : goutte rose, l'air content, avec un nœud. » Pure. */
export function label(spec) {
  const k = normalize(spec);
  const what = bodyWords(k);
  const head = k.name ? `${k.name.trim()} : ${what.charAt(0).toLowerCase()}${what.slice(1)}` : what;
  const extra = k.accessory !== 'none' ? `, avec ${ACCESSORY_NAMES[k.accessory]}` : '';
  return `${head} ${COLOR_NAMES[k.color]}, l'air ${FACE_NAMES[k.face]}${extra}.`;
}

const EGG_SPOTS = [
  { cx: 43, cy: 40, rx: 6, ry: 4.2, rotate: -25 },
  { cx: 75, cy: 47, rx: 4.4, ry: 3.2, rotate: 20 },
  { cx: 29, cy: 63, rx: 4.2, ry: 5.6, rotate: 10 },
  { cx: 93, cy: 73, rx: 4.6, ry: 6.4, rotate: 0 },
  { cx: 50, cy: 103, rx: 7, ry: 4, rotate: 0 },
];

/** Taches de l'œuf et fêlure : posées DANS la forme (découpées par elle). */
function eggMarks(k) {
  if (k.body !== 'egg') return [];
  return [
    EGG_SPOTS.map((p) => n('ellipse', {
      cx: p.cx, cy: p.cy, rx: p.rx, ry: p.ry, transform: `rotate(${p.rotate} ${p.cx} ${p.cy})`, class: 'kw__spot',
    })),
    k.crack && n('path', { d: CRACK_D, class: 'kw__crack' }),
  ];
}

/**
 * L'arbre SVG d'un personnage (pure). `uid` préfixe les identifiants internes (filtre, découpe) :
 * par défaut un compteur, ce qui garantit l'unicité quand plusieurs personnages cohabitent.
 */
export function character(spec = {}, { uid = nextUid() } = {}) {
  const k = normalize(spec);
  const animal = oneOf(ANIMALS, k.body);
  const geo = animal ? ANIMAL_GEOMETRY : SHAPE_GEOMETRY[k.body];
  const clipId = `${uid}-clip`;
  const filterId = `${uid}-sticker`;

  const figure = [
    animal && k.stage >= 2 && TAILS[k.body](),
    animal && [EARS[k.body](), n('g', { transform: MIRROR }, EARS[k.body]())],
    shapeLayers({ d: geo.d, shine: geo.shine, clipId, inside: eggMarks(k) }),
    animal && k.stage >= 2 && feet(),
    animal && k.stage === 3 && arms(),
    face(k.face, geo.face, { glasses: k.accessory === 'glasses' }),
    accessory(k.accessory, geo),
    k.face === 'sleepy' && sleepZ(geo.zz),
  ];
  const grown = animal
    ? n('g', { class: 'kw__grow', transform: `translate(60 ${k.stage === 1 ? 103 : 106}) scale(${animalScale(k.stage)}) translate(-60 -106)` }, figure)
    : figure;

  const decorative = Boolean(spec.decorative);
  return n('svg', {
    viewBox: '0 0 120 120',
    class: `art kw kw--${k.body}${spec.blink === false ? '' : ' kw--blink'}`,
    style: `${colorVars(k.color, k.accent)} --kw-blink-delay: ${blinkDelay(uid)};`,
    role: decorative ? null : 'img',
    'aria-label': decorative ? null : label(spec),
    'aria-hidden': decorative ? 'true' : null,
    focusable: 'false',
  },
  n('defs', {},
    spec.sticker === false ? null : stickerFilter(filterId),
    n('clipPath', { id: clipId }, n('path', { d: geo.d }))),
  n('g', { class: 'kw__sticker', filter: spec.sticker === false ? null : `url(#${filterId})` },
    n('g', { class: 'kw__figure' }, grown),
    animal && k.stage === 1 && n('path', { d: SHELL_D, class: 'kw__shell', transform: 'translate(0 6)' })));
}

/** Le <svg> du personnage (navigateur). Utilisé par le registre des dessins (art/index.js). */
export function draw(spec) {
  return toNode(character(spec));
}

// ---------------------------------------------------------------------------------------------
// Mascottes des îles : une par île, de la même famille (formes simples, teinte de l'île).

export const MASCOTS = {
  mots: { name: 'Perle', body: 'drop', color: 'rose', accessory: 'bow', accent: 'lavande' },
  nombres: { name: 'Cubi', body: 'block', color: 'ciel', accessory: 'glasses' },
  mesures: { name: 'Étincelle', body: 'star', color: 'peche', accessory: 'none' },
  monde: { name: 'Pépin', body: 'round', color: 'menthe', accessory: 'sprout' },
  ailleurs: { name: 'Nuagette', body: 'cloud', color: 'lavande', accessory: 'flower', accent: 'rose' },
};

/** La mascotte d'une île, prête pour `art` ou `draw` : mascot('mots', { face: 'joyful' }). */
export function mascot(island, overrides = {}) {
  const base = MASCOTS[island];
  if (!base) throw new Error(`île inconnue : ${island}`);
  return { kind: 'kawaii', ...base, ...overrides };
}

// ---------------------------------------------------------------------------------------------
// Compagnon (#90) : un œuf qui éclot, puis un bébé animal qui grandit. Le kit ne fait que
// DESSINER chaque stade ; les seuils (étoiles gagnées…) appartiennent au futur module compagnon.

export const COMPANION_STAGES = [
  { stage: 0, id: 'egg', name: 'Œuf' },
  { stage: 1, id: 'hatching', name: 'Œuf qui éclot' },
  { stage: 2, id: 'baby', name: 'Bébé' },
  { stage: 3, id: 'young', name: 'Petit' },
  { stage: 4, id: 'grown', name: 'Grand' },
];

/**
 * Description du compagnon à un stade donné : companion({ animal: 'bunny', stage: 3, color: 'lavande' }).
 * Stades 0 et 1 : l'œuf (crème, taché de la couleur de l'animal), endormi puis fêlé.
 */
export function companion({ animal = 'cat', stage = 0, color = 'peche', face: expression, accessory: acc, accent, name } = {}) {
  if (!oneOf(ANIMALS, animal)) throw new Error(`animal inconnu : ${animal}`);
  if (!COMPANION_STAGES.some((s) => s.stage === stage)) throw new Error(`stade inconnu : ${stage}`);
  const common = { kind: 'kawaii', ...(name ? { name } : {}), ...(acc ? { accessory: acc } : {}) };
  if (stage <= 1) {
    return {
      ...common, body: 'egg', color: 'creme', accent: color === 'creme' ? 'peche' : color,
      crack: stage === 1, face: expression || (stage === 0 ? 'sleepy' : 'happy'),
    };
  }
  return { ...common, body: animal, color, stage: stage - 1, face: expression || 'happy', ...(accent ? { accent } : {}) };
}

// ---------------------------------------------------------------------------------------------
// Mouvements (navigateur) : classes de css/kawaii.css. Les boucles se posent une fois ; les
// mouvements ponctuels se rejouent avec play(). Tout s'arrête avec « réduire les animations ».

export const LOOPS = ['bounce', 'float', 'wobble', 'twinkle'];
export const ONE_SHOTS = ['jump', 'wiggle', 'pop'];

/** Rejoue un mouvement ponctuel sur un élément (le personnage ou son conteneur). */
export function play(el, motion) {
  if (!el || !ONE_SHOTS.includes(motion)) return;
  const name = `kw-${motion}`;
  el.classList.remove(name);
  void el.getBoundingClientRect();   // force le navigateur à repartir du début
  el.classList.add(name);
  // animationend remonte depuis les enfants (clignement des yeux) : on attend celui de `el`.
  const done = (event) => {
    if (event.target !== el) return;
    el.classList.remove(name);
    el.removeEventListener('animationend', done);
  };
  el.addEventListener('animationend', done);
}

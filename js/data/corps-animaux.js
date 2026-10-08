// Banque « Body and animals » (CE1, langues vivantes, niveau A1) : animaux courants et parties du corps.
// Fonctions pures, sans DOM. Chaque entrée porte son émoji (image de contenu, reconnaissable sans
// hésiter par une enfant de 7 ans), son mot anglais, son pluriel et sa traduction française.
//   plural : 'regular' (cats) | 'irregular' (feet, teeth, mice) | 'invariant' (sheep, fish)
//   g      : genre du nom français ; elide : « l'oreille » (voyelle ou h muet)
//   transparent : le mot anglais ressemble au mot français (lion, elephant) — repérable sans comprendre.
// `art` : dessin de js/core/ui/art/body.js quand l'émoji se lit mal (🦶 ressemble à un nuage jaune sous Windows).
// Écartés volontairement : 🐔 (coq ou poule ?), 🐀 / 🐇 (doublons de 🐭 / 🐰), 🦵 (jambe ou pied ?),
// 💪, 👅 (langue ou bouche ?), 👀 (« regarder »), et les cheveux, la tête, les doigts, sans émoji net.

const item = (kind, id, emoji, fr, g, frPlural, extra = {}) => ({
  kind, id, en: id, enPlural: extra.enPlural || `${id}s`, emoji, fr, g, frPlural,
  elide: Boolean(extra.elide), art: extra.art || null, plural: extra.plural || 'regular', transparent: Boolean(extra.transparent),
});

export const ANIMALS = [
  item('animal', 'cat', '🐱', 'chat', 'm', 'chats'),
  item('animal', 'dog', '🐶', 'chien', 'm', 'chiens'),
  item('animal', 'bird', '🐦', 'oiseau', 'm', 'oiseaux', { elide: true }),
  item('animal', 'fish', '🐟', 'poisson', 'm', 'poissons', { enPlural: 'fish', plural: 'invariant' }),
  item('animal', 'horse', '🐴', 'cheval', 'm', 'chevaux'),
  item('animal', 'cow', '🐮', 'vache', 'f', 'vaches'),
  item('animal', 'pig', '🐷', 'cochon', 'm', 'cochons'),
  item('animal', 'rabbit', '🐰', 'lapin', 'm', 'lapins'),
  item('animal', 'duck', '🦆', 'canard', 'm', 'canards'),
  item('animal', 'lion', '🦁', 'lion', 'm', 'lions', { transparent: true }),
  item('animal', 'elephant', '🐘', 'éléphant', 'm', 'éléphants', { elide: true, transparent: true }),
  item('animal', 'monkey', '🐵', 'singe', 'm', 'singes'),
  item('animal', 'sheep', '🐑', 'mouton', 'm', 'moutons', { enPlural: 'sheep', plural: 'invariant' }),
  item('animal', 'mouse', '🐭', 'souris', 'f', 'souris', { enPlural: 'mice', plural: 'irregular' }),
  item('animal', 'frog', '🐸', 'grenouille', 'f', 'grenouilles'),
  item('animal', 'bear', '🐻', 'ours', 'm', 'ours', { elide: true }),
  item('animal', 'giraffe', '🦒', 'girafe', 'f', 'girafes', { transparent: true }),
  item('animal', 'snake', '🐍', 'serpent', 'm', 'serpents'),
];

export const PARTS = [
  item('part', 'ear', '👂', 'oreille', 'f', 'oreilles', { elide: true }),
  item('part', 'eye', '👁️', 'œil', 'm', 'yeux', { elide: true }),
  item('part', 'nose', '👃', 'nez', 'm', 'nez'),
  item('part', 'mouth', '👄', 'bouche', 'f', 'bouches'),
  item('part', 'hand', '✋', 'main', 'f', 'mains'),
  item('part', 'foot', '🦶', 'pied', 'm', 'pieds', { enPlural: 'feet', plural: 'irregular', art: 'foot' }),
  item('part', 'tooth', '🦷', 'dent', 'f', 'dents', { enPlural: 'teeth', plural: 'irregular' }),
];

export const ITEMS = [...ANIMALS, ...PARTS];
export const getItem = (id) => ITEMS.find((i) => i.id === id) || null;

/** Les 12 premiers animaux (niveau 1) ; les six autres arrivent au niveau 2. */
export const FIRST_ANIMALS = ANIMALS.slice(0, 12).map((a) => a.id);

/** Paires d'images qu'une enfant peut confondre : jamais ensemble parmi les choix d'une question. */
export const CONFLICTS = [['bird', 'duck']];
export const conflict = (a, b) => CONFLICTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
/** « a cat », « an elephant ». */
export const indefiniteEn = (i) => `${/^[aeiou]/.test(i.en) ? 'an' : 'a'} ${i.en}`;
/** « le chat », « l'oreille », « la vache ». */
export const definiteFr = (i) => (i.elide ? `l'${i.fr}` : `${i.g === 'f' ? 'la' : 'le'} ${i.fr}`);
/** « un chat », « une vache ». */
export const indefiniteFr = (i) => `${i.g === 'f' ? 'une' : 'un'} ${i.fr}`;
/** « les chats ». */
export const pluralFr = (i) => `les ${i.frPlural}`;
/** « ton nez », « ta bouche », « ton oreille ». */
export const yourFr = (i) => (i.g === 'f' && !i.elide ? `ta ${i.fr}` : `ton ${i.fr}`);
/** « un chat » (1) ou « deux chats » (2). */
export const countFr = (i, n) => (n > 1 ? `deux ${i.frPlural}` : indefiniteFr(i));
/** Le mot anglais pour n objets : « foot » / « feet ». */
export const wordEn = (i, n) => (n > 1 ? i.enPlural : i.en);

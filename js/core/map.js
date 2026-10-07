// Géométrie et contenu de la carte au trésor (#96). TOUT EST PUR ICI : aucune référence au DOM.
// Le dessin vit dans js/core/ui/map-scene.js, les écrans dans js/screens/.
//
// Deux niveaux :
//   - l'archipel  : les cinq îles posées sur la mer (accueil, #/) ;
//   - une île     : ses jeux deviennent des LIEUX du décor (#/ile/<id>), parcourus librement.
//
// Le repère de dessin fait 200 × 180 pour les deux scènes. Il est volontairement plus haut que
// large : la feuille de style cadre la même image en paysage sur tablette et en portrait sur
// téléphone (`preserveAspectRatio="xMidYMid slice"`). D'où une ZONE SÛRE, visible dans les deux
// cadrages, où doit tenir tout ce qui porte de l'information.
export const SCENE = { width: 200, height: 180 };
export const SAFE = { x: 20, y: 22, width: 160, height: 138 };

/** Hauteur maximale d'un décor de lieu (à l'échelle 1) : la composition en dépend. */
export const PLACE_HEIGHT = 36;

const STARS_PER_LEVEL = 3;
const LEVELS_PER_GAME = 3;
export const STARS_PER_GAME = STARS_PER_LEVEL * LEVELS_PER_GAME;

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

// --- Emplacements de lieu ----------------------------------------------------------------------
//
// Deuxième version (#96, second lot). La première pavait la zone sûre de cases rectangulaires
// « décor + plaque de bois » : la non-collision était garantie, mais les six plaques occupaient la
// moitié de la scène et cachaient l'île. On a commandé un décor, pas une grille de boutons.
//
// Ici, un lieu N'EST QUE son décor. L'emplacement donne :
//   - `x, y`   : le point de contact au sol du décor (il monte vers les y négatifs) ;
//   - `hit`    : la zone touchable — l'emprise du décor, et rien d'autre ;
//   - `badge`  : où poser le petit repère d'étoiles, À CÔTÉ du décor et jamais devant ;
//   - `scale`  : chaque décor a sa taille propre (la place libérée leur revient).
// Le nom complet, lui, n'apparaît qu'au survol, au focus et au toucher (ui/map-scene.js), et la
// liste HTML sous la scène le porte en permanence.
//
// Les emplacements sont posés à la main, par paliers, pour que la composition respire : décalés en
// x comme en y, jamais alignés. tests/map.test.js vérifie ce qui doit l'être — aucun recouvrement
// entre deux zones touchables, chacune assez grande pour un doigt, le tout dans la zone sûre.

/**
 * Paliers : jusqu'à 4 lieux (grands), jusqu'à 6 (le cas d'aujourd'hui), jusqu'à 9 (resserré).
 * `anchors` : [x, y, côté du repère d'étoiles (-1 à gauche, +1 à droite), variation de taille].
 * `hit` : emprise d'une zone touchable ; `foot` = ce qu'elle descend sous le point de contact.
 */
const TIERS = [
  {
    max: 4,
    scale: 1.15,
    hit: { width: 62, height: 56, foot: 12 },
    anchors: [[58, 84, 1, 0.04], [146, 80, -1, -0.03], [54, 146, 1, 0], [148, 142, -1, 0.05]],
  },
  {
    max: 6,
    scale: 1,
    hit: { width: 50, height: 50, foot: 12 },
    anchors: [
      [48, 82, 1, 0.05], [100, 76, 1, -0.04], [152, 84, -1, 0.02],
      [46, 140, 1, -0.02], [100, 146, 1, 0.05], [154, 142, -1, -0.05],
    ],
  },
  {
    max: 9,
    scale: 0.76,
    hit: { width: 48, height: 40, foot: 11 },
    anchors: [
      [50, 60, 1, 0.04], [100, 56, 1, -0.03], [152, 60, -1, 0.02],
      [46, 102, 1, -0.02], [100, 106, 1, 0.05], [154, 102, -1, -0.04],
      [50, 144, 1, 0.03], [100, 148, 1, -0.02], [152, 144, -1, 0.04],
    ],
  },
];

/** Taille du repère d'étoiles posé au pied d'un lieu : minuscule devant un décor de 36 de haut. */
export const BADGE = { width: 21, height: 8.6 };

/**
 * Disposition des lieux d'une île : le palier, et un emplacement par lieu. Pure.
 * Renvoyer `scale` par emplacement (et non une seule échelle) évite la rangée d'objets calibrés
 * au millimètre, qui est exactement ce qui faisait « grille » dans la version précédente.
 */
export function placeLayout(count) {
  const tier = TIERS.find((t) => count <= t.max) || TIERS[TIERS.length - 1];
  const { width, height, foot } = tier.hit;
  const slots = tier.anchors.slice(0, Math.max(count, 0)).map(([x, y, side, vary]) => ({
    x,
    y,
    side,
    scale: Number((tier.scale * (1 + vary)).toFixed(3)),
    hit: { x: x - width / 2, y: y - height + foot, width, height },
    // Le repère est planté dans l'herbe, SOUS la ligne de sol et décalé sur le côté : il ne
    // recouvre donc jamais le bâtiment qu'il désigne — c'est tout le reproche fait aux plaques.
    badge: { x: x + side * 12, y: y + 1.5 },
  }));
  return { ...tier, height: PLACE_HEIGHT * tier.scale, slots };
}

/** Le lieu qui représente chaque jeu. Un jeu sans lieu attitré prend un emplacement de réserve. */
export const PLACE_KINDS = {
  sons: { kind: 'cave', where: 'la grotte des échos' },
  syllabes: { kind: 'mill', where: 'le moulin' },
  'lettres-soeurs': { kind: 'twin-rocks', where: 'les rochers jumeaux' },
  'lettres-qui-changent': { kind: 'rainbow-tree', where: 'l\'arbre aux deux feuillages' },
  'lecture-eclair': { kind: 'lighthouse', where: 'le phare' },
  devinettes: { kind: 'hut', where: 'la cabane au point d\'interrogation' },
};

/** Décors de réserve, pour les jeux qui n'ont pas encore le leur. */
export const SPARE_KINDS = [
  { kind: 'hut', where: 'la cabane' },
  { kind: 'tent', where: 'la tente' },
  { kind: 'well', where: 'le puits' },
];

export function placeKind(gameId, index = 0) {
  return PLACE_KINDS[gameId] || SPARE_KINDS[index % SPARE_KINDS.length];
}

// --- Noms des lieux ------------------------------------------------------------------------------
//
// Les titres de jeu sont faits pour une liste, pas pour une bulle posée sur un dessin. On en donne
// un nom court, qui tient sur une ligne même sur un téléphone de 360 px : c'est ce nom-là qui
// apparaît au survol, au focus et au toucher. Le titre complet reste dans le nom accessible du
// lien et dans la liste HTML sous la scène.

export const SHORT_TITLES = {
  sons: 'Les sons',
  syllabes: 'Syllabes',
  'lettres-soeurs': 'Lettres sœurs',
  'lettres-qui-changent': 'Lettres qui changent',
  'lecture-eclair': 'Lecture éclair',
  devinettes: 'Devinettes',
  'calcul-mental': 'Calcul mental',
  cdu: 'Centaines et dizaines',
  'ecrire-nombres': 'Écrire les nombres',
  tables: 'Les tables',
  heure: 'Lire l\'heure',
  tirelire: 'La tirelire',
  'colors-numbers': 'Colors and numbers',
  'besoins-vivant': 'Besoins du vivant',
};

/**
 * Longueur maximale d'un nom court. Le panneau de survol tient sur UNE ligne : au-delà, il
 * déborderait de la zone sûre sur un téléphone de 360 px. Vérifié par tests/map.test.js.
 */
export const MAX_SHORT_TITLE = 21;

export function shortTitle(game) {
  return SHORT_TITLES[game.id] || game.title;
}

// --- Les lieux d'une île --------------------------------------------------------------------------

/** Étoiles gagnées sur un jeu, d'après `profile.progress` (même calcul que core/rewards.js). */
function starsOf(progress) {
  return Object.values(progress?.best || {}).reduce((sum, b) => sum + (b.stars || 0), 0);
}

/**
 * Les lieux d'une île : un par jeu, posé sur un emplacement, avec son nom coupé, ses étoiles et
 * son nom accessible complet. `progressFor(gameId)` renvoie la progression du jeu (injectée pour
 * garder la fonction pure et testable).
 */
export function islandPlaces(games, progressFor = () => null) {
  const layout = placeLayout(games.length);
  const places = games.slice(0, layout.slots.length).map((game, index) => {
    const slot = layout.slots[index];
    const { kind, where } = placeKind(game.id, index);
    const progress = progressFor(game.id);
    const stars = starsOf(progress);
    const played = Boolean(progress?.plays);
    const name = shortTitle(game);
    return {
      id: game.id,
      title: game.title,
      name,
      kind,
      where,
      stars,
      max: STARS_PER_GAME,
      played,
      href: `#/jeu/${game.id}`,
      slot,
      label: played
        ? `${game.title}, ${where}, ${plural(stars, 'étoile')} sur ${STARS_PER_GAME}.`
        : `${game.title}, ${where}, à découvrir.`,
    };
  });
  return { layout, places };
}

// --- L'archipel ------------------------------------------------------------------------------------
//
// Cinq îles vues de trois quarts, posées à la main : la plus avancée au premier plan (grande,
// saturée), les suivantes plus petites, plus hautes dans l'image et plus pâles.
//
// Troisième lot (#96) : les cinq plaques de nom ont disparu. Elles s'affichaient toutes en même
// temps, masquaient la mer, et celle des Mesures chevauchait le corps de l'île aux Mots. On
// applique ici le traitement déjà validé à l'intérieur des îles :
//   - `hit`   : L'ÎLE ELLE-MÊME est la zone cliquable (un rectangle invisible l'enveloppe) ;
//   - `badge` : le seul repère permanent, posé SOUS la ligne de flottaison et décalé sur le côté,
//               donc jamais devant l'île — étoiles gagnées, ou cadenas + seuil si elle est fermée ;
//   - le nom complet n'apparaît qu'au survol, au focus clavier et au toucher, dans la couche
//     d'infobulle partagée avec l'intérieur des îles.
// La liste HTML sous la scène porte, elle, toute l'information en permanence.
//
// Chaque île a sa SILHOUETTE : `squareness` règle le galbe du contour (2 = ovale, 3,5 = plateau
// aux coins ronds) et `wave` y creuse des baies — `amp` leur profondeur, `k` leur nombre, `phase`
// leur orientation. L'ondulation ne fait que RENTRER (jamais sortir), donc une île ne peut pas
// déborder de son rayon : la composition et les tests restent valables.

/** Épaisseur de la falaise d'une île de l'archipel, en fraction de son rayon vertical. */
export const ISLAND_THICKNESS = 0.46;

/** Le repère permanent d'une île : une planchette flottante, grande comme une bouée. */
export const ISLAND_BADGE = { width: 24, height: 9.4 };

/** Ligne de flottaison d'une île : le bas de sa falaise, là où la terre entre dans l'eau. */
export const waterline = ({ cy, ry }) => Number((cy + ry * (1 + ISLAND_THICKNESS)).toFixed(2));

export const ISLAND_GEOMETRY = {
  mots: {
    cx: 55, cy: 130, rx: 34, ry: 13, depth: 1,
    squareness: 2.6, wave: { amp: 0.14, k: 3, phase: 0.6 },
    hit: { x: 20, y: 114, width: 70, height: 46 }, badge: { x: 69, y: 150.4 },
  },
  nombres: {
    cx: 146, cy: 128, rx: 28, ry: 11.5, depth: 0.78,
    squareness: 2.1, wave: { amp: 0.2, k: 4, phase: 1.5 },
    hit: { x: 114, y: 114, width: 66, height: 46 }, badge: { x: 133, y: 146.4 },
  },
  mesures: {
    cx: 100, cy: 86, rx: 26, ry: 10, depth: 0.58,
    squareness: 3.1, wave: { amp: 0.1, k: 5, phase: 0.2 },
    hit: { x: 72, y: 70, width: 56, height: 42 }, badge: { x: 113, y: 102 },
  },
  monde: {
    cx: 46, cy: 54, rx: 23, ry: 9, depth: 0.45,
    squareness: 2.3, wave: { amp: 0.22, k: 3, phase: 2.3 },
    hit: { x: 22, y: 40, width: 50, height: 40 }, badge: { x: 59, y: 68.6 },
  },
  ailleurs: {
    cx: 154, cy: 50, rx: 21, ry: 8.5, depth: 0.38,
    squareness: 2, wave: { amp: 0.16, k: 2, phase: 1.1 },
    hit: { x: 130, y: 36, width: 50, height: 40 }, badge: { x: 143, y: 64 },
  },
};

/**
 * L'archipel prêt à dessiner : une entrée par île, dans l'ordre de PROFONDEUR (les plus lointaines
 * d'abord, pour que les plus proches les recouvrent — c'est le recouvrement qui crée la distance).
 * `read(islandId)` fournit les vraies données du profil : { unlocked, starsLeft, earned, possible,
 * stickers, total, games }.
 */
export function archipelago(islands, read) {
  return islands
    .map((island) => {
      const geometry = ISLAND_GEOMETRY[island.id];
      const data = read(island.id);
      return {
        ...island,
        ...geometry,
        ...data,
        meta: islandMeta(data),
        label: islandLabel(island, data),
      };
    })
    .filter((entry) => entry.cx !== undefined)
    .sort((a, b) => a.depth - b.depth);
}

/** Nom accessible d'une île : jamais une information portée par la seule position. Pure. */
export function islandLabel(island, data) {
  if (!data.unlocked) {
    return `${island.name}, ${island.subject}. Île fermée : encore ${plural(data.starsLeft, 'étoile')} à gagner.`;
  }
  if (!data.games) return `${island.name}, ${island.subject}. Île ouverte, pas encore de jeu ici.`;
  return `${island.name}, ${island.subject}. ${plural(data.earned, 'étoile')} sur ${data.possible}, `
    + `${plural(data.stickers, 'gommette')} sur ${data.total}. Île ouverte.`;
}

/** Texte court affiché sous une île (le même que le nom accessible, en abrégé). Pure. */
export function islandMeta(data) {
  if (!data.unlocked) return `encore ${data.starsLeft} ⭐`;
  if (!data.games) return 'bientôt';
  return `${data.earned} / ${data.possible} ⭐`;
}

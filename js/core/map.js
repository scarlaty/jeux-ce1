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
export const PLACE_HEIGHT = 30;

const STARS_PER_LEVEL = 3;
const LEVELS_PER_GAME = 3;
export const STARS_PER_GAME = STARS_PER_LEVEL * LEVELS_PER_GAME;

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

// --- Emplacements de lieu ----------------------------------------------------------------------
//
// Un lieu occupe une case : le décor en haut, sa plaque de bois juste en dessous. Les cases pavent
// la zone sûre sans se chevaucher — c'est ce qui garantit, à TOUTE taille d'écran, que deux noms ne
// se marchent jamais dessus (le défaut de la maquette), et que la zone touchable fait au moins
// 56 px même sur un téléphone de 360 px.
//
// Un 7ᵉ jeu ne casse pas la composition : l'île passe simplement d'une grille de 2 rangées à une
// grille de 3 rangées, un peu plus serrée (décors et plaques réduits d'autant). Les deux grilles
// sont vérifiées par tests/map.test.js.

const COLUMNS = [52, 100, 148];

/** Jitter du décor : il n'est jamais exactement au-dessus de sa plaque, sinon la scène s'aligne. */
const JITTER = [2, -3, 0, -2, 3, 1, -1, 2, -2];

/**
 * Grille de l'île : deux rangées jusqu'à six lieux, trois au-delà.
 * `gap` est l'écart entre le point de contact au sol du décor et le haut de sa plaque.
 */
const GRIDS = [
  {
    max: 6,
    rows: [90, 146],
    // Décalage vertical par colonne : sans lui, les plaques forment deux barres bien alignées
    // et la scène redevient un tableau. Les colonnes ne se recouvrent jamais en x, donc décaler
    // en y ne peut pas créer de collision.
    stagger: [-6, 4, -2],
    order: [[0, 0], [2, 0], [1, 0], [0, 1], [2, 1], [1, 1]],
    plaque: { width: 46, height: 25 }, decor: 1, lift: 15,
  },
  {
    max: 9,
    rows: [74, 112, 150],
    stagger: [-4, 3, -1],
    order: [[0, 0], [2, 0], [1, 0], [0, 1], [2, 1], [1, 1], [0, 2], [2, 2], [1, 2]],
    plaque: { width: 44, height: 19 }, decor: 0.56, lift: 10,
  },
];

/**
 * Disposition des lieux d'une île : la grille, et une case par lieu
 * `{ x, y }` (centre de la plaque), `{ ax, ay }` (point de contact du décor au sol),
 * `hit` (la zone touchable, qui couvre le décor ET la plaque). Pure.
 */
export function placeLayout(count) {
  const grid = GRIDS.find((g) => count <= g.max) || GRIDS[GRIDS.length - 1];
  const height = PLACE_HEIGHT * grid.decor;
  // Seule la rangée du fond est décalée : devant, le décor viendrait buter sur la plaque d'arrière.
  const rowY = (col, row) => grid.rows[row] + (row === 0 ? grid.stagger[col] : 0);
  const slots = grid.order.slice(0, Math.max(count, 0)).map(([col, row], i) => {
    const x = COLUMNS[col];
    const y = rowY(col, row);
    const bottom = y + grid.plaque.height / 2;
    // La zone touchable couvre le décor ET sa plaque, mais s'arrête au pied de la case du dessus :
    // le décor d'un lieu de devant peut recouvrir la plaque d'un lieu du fond (c'est ce recouvrement
    // qui crée la profondeur) ; le DOIGT, lui, ne doit jamais être dans deux zones à la fois.
    const ceiling = row > 0 ? rowY(col, row - 1) + grid.plaque.height / 2 : -Infinity;
    const top = Math.max(y - grid.lift - height, ceiling);
    return {
      x,
      y,
      ax: x + JITTER[i % JITTER.length],
      ay: y - grid.lift,
      hit: { x: x - grid.plaque.width / 2, y: top, width: grid.plaque.width, height: bottom - top },
    };
  });
  return { ...grid, height, slots };
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
// Les titres de jeu sont faits pour une liste, pas pour une plaque de bois. On en donne un nom
// court, puis on le coupe en au plus deux lignes : c'est ce qui permet une plaque de taille fixe,
// donc une composition qui tient de 360 px à 1366 px.

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

export const MAX_LINE = 11;
export const MAX_LINES = 2;

/** Coupe un nom en au plus `MAX_LINES` lignes d'au plus `MAX_LINE` caractères (glouton). Pure. */
export function wrapLabel(text, max = MAX_LINE, maxLines = MAX_LINES) {
  const lines = [];
  for (const word of String(text).trim().split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length <= maxLines) return lines;
  // Débordement : on garde les premières lignes et on agrège le reste (toujours lisible, jamais vide).
  return [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
}

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
      lines: wrapLabel(name),
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
// saturée), les suivantes plus petites, plus hautes dans l'image et plus pâles. Les plaques de nom
// sont également placées à la main, et le test vérifie qu'elles ne se chevauchent pas.

export const ISLAND_GEOMETRY = {
  mots: { cx: 52, cy: 134, rx: 42, ry: 15, plaque: { x: 48, y: 116 }, depth: 1 },
  nombres: { cx: 152, cy: 128, rx: 31, ry: 12, plaque: { x: 154, y: 104 }, depth: 0.78 },
  mesures: { cx: 102, cy: 82, rx: 27, ry: 10.5, plaque: { x: 102, y: 114 }, depth: 0.58 },
  monde: { cx: 44, cy: 50, rx: 24, ry: 9, plaque: { x: 46, y: 80 }, depth: 0.45 },
  ailleurs: { cx: 158, cy: 46, rx: 22, ry: 8.5, plaque: { x: 156, y: 78 }, depth: 0.38 },
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
        lines: wrapLabel(island.name, 13),
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
  if (!data.games) return `${island.name}, ${island.subject}. Pas encore de jeu ici.`;
  return `${island.name}, ${island.subject}. ${plural(data.earned, 'étoile')} sur ${data.possible}, `
    + `${plural(data.stickers, 'gommette')} sur ${data.total}.`;
}

/** Texte court affiché sous une île (le même que le nom accessible, en abrégé). Pure. */
export function islandMeta(data) {
  if (!data.unlocked) return `encore ${data.starsLeft} ⭐`;
  if (!data.games) return 'bientôt';
  return `${data.earned} / ${data.possible} ⭐`;
}

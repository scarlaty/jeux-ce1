// Banque de mots illustrés, partagée par les jeux de français (sons, syllabes, lecture…).
// Aucune dépendance, aucun DOM : uniquement des données et des fonctions pures.
//
// Chaque mot porte la liste EXHAUSTIVE des sons complexes qu'il contient : c'est ce qui permet
// de fabriquer des questions sans ambiguïté. Un mot proposé comme intrus ne doit contenir
// AUCUN des sons visés, sinon la question a deux bonnes réponses. Pièges fréquents :
//   « oiseau » = [oi] + le graphème « eau », « chien » = [ch] + [in], « montagne » = [on] + [gn],
//   « feuille » = [eu] + [ill], « chou » = [ch] + [ou] (inutilisable comme intrus des deux).
//
// On ne garde que des mots dont le son suit vraiment les lettres : pas de « banane » (on n'y
// entend pas [an]), pas d'« oignon » (on n'y entend pas [oi]), pas de « chouette » (« ou » y est
// la semi-voyelle [w]). Les émojis sont des images de contenu : un mot n'a d'émoji que si une
// enfant de 7 ans le nomme sans hésiter (sinon le mot ne sert qu'aux questions écrites).

/** Les onze sons complexes travaillés au CE1. `say` : la forme prononçable pour la voix. */
export const SOUNDS = [
  { id: 'ou', label: '[ou]', say: 'ou' },
  { id: 'on', label: '[on]', say: 'on' },
  { id: 'an', label: '[an]', say: 'an' },
  { id: 'oi', label: '[oi]', say: 'oi' },
  { id: 'ch', label: '[ch]', say: 'che' },
  { id: 'in', label: '[in]', say: 'in' },
  { id: 'eu', label: '[eu]', say: 'eu' },
  { id: 'gn', label: '[gn]', say: 'gne' },
  { id: 'ill', label: '[ill]', say: 'ille' },
  { id: 'ail', label: '[ail]', say: 'aille' },
  { id: 'eil', label: '[eil]', say: 'eille' },
];

/**
 * Sons notés en plus, jamais visés par une question, mais indispensables pour écarter
 * les mots dangereux :
 *  - `e` : le « e » discret de « cheval », trop proche de [eu] pour servir d'intrus ;
 *  - `eau` : le graphème complexe « eau »/« au » (« chapeau », « chaussure »). Ce code repère
 *    ce graphème, pas toutes les façons d'écrire le son [o] ;
 *  - `yod` : la semi-voyelle [j] écrite autrement qu'avec « ill » — « lion », « chien »,
 *    « yeux ». On l'entend comme le [j] de « fille » : ces mots ne peuvent donc pas servir
 *    d'intrus pour [ill], [ail] ou [eil].
 */
export const EXTRA_SOUNDS = [
  { id: 'e', label: '[e]', say: 'e' },
  { id: 'eau', label: '[eau]', say: 'o' },
  { id: 'yod', label: '[yod]', say: 'ye' },
];

const ALL_SOUNDS = [...SOUNDS, ...EXTRA_SOUNDS];
const BY_ID = new Map(ALL_SOUNDS.map((s) => [s.id, s]));

// Les sons de la famille du « y » ([j]) s'entendent pareil : l'un ne peut pas servir d'intrus
// pour l'autre. `yod` en fait partie, sinon « lion » ou « chien » deviendrait un mauvais choix
// pour une question sur [ill] alors qu'on y entend le même [j]. Idem pour [eu] et le « e » discret.
const GLIDE = ['ill', 'ail', 'eil', 'yod'];
const CONFLICTS = new Map([
  ...GLIDE.map((id) => [id, GLIDE]),
  ['eu', ['eu', 'e']],
  ['e', ['eu', 'e']],
]);

// mot, émoji (null si l'image n'est pas évidente), sons contenus.
const RAW = [
  ['abeille', '🐝', 'eil'],
  ['agneau', null, 'gn eau'],
  ['ail', '🧄', 'ail'],
  ['araignée', '🕷️', 'gn'],
  ['avion', '✈️', 'on yod'],
  ['baignoire', '🛁', 'gn oi'],
  ['balance', null, 'an'],   // ⚖️ se lit « justice » plutôt que « balance »
  ['ballon', '⚽', 'on'],
  ['beignet', null, 'gn'],
  ['beurre', '🧈', 'eu'],
  ['biberon', '🍼', 'e on'],
  ['bille', null, 'ill'],
  ['bois', null, 'oi'],
  ['boîte', null, 'oi'],
  ['bonbon', '🍬', 'on'],
  ['bouche', '👄', 'ou ch'],
  ['bouquet', null, 'ou'],   // 💐 se dit d'abord « fleurs », et « fleur » est déjà dans la banque
  ['bouteille', null, 'ou eil'],
  ['caillou', null, 'ail ou'],
  ['camion', '🚚', 'on yod'],
  ['chameau', '🐫', 'ch eau'],
  ['champignon', '🍄', 'ch an gn on'],
  ['chapeau', '🎩', 'ch eau'],
  ['chat', '🐱', 'ch'],
  ['châtaigne', null, 'ch gn'],
  ['château', '🏰', 'ch eau'],
  ['chaussette', '🧦', 'ch eau'],
  ['chaussure', '👟', 'ch eau'],
  ['chemise', null, 'ch e'],
  ['chenille', '🐛', 'ch e ill'],
  ['cheval', '🐴', 'ch e'],
  ['cheveux', null, 'ch e eu'],
  ['chèvre', '🐐', 'ch'],
  ['chien', '🐶', 'ch in yod'],
  ['chocolat', '🍫', 'ch'],
  ['chou', null, 'ch ou'],
  ['citron', '🍋', 'on'],
  ['citrouille', '🎃', 'ou ill'],
  ['cloche', '🔔', 'ch'],
  ['cochon', '🐷', 'ch on'],
  ['cœur', '❤️', 'eu'],
  ['concombre', '🥒', 'on'],
  ['coquillage', '🐚', 'ill'],
  ['corbeille', null, 'eil'],
  ['couronne', '👑', 'ou'],
  ['croissant', '🥐', 'oi an'],
  ['cuillère', '🥄', 'ill'],
  ['cygne', '🦢', 'gn'],
  ['dent', '🦷', 'an'],
  ['deux', '2️⃣', 'eu'],
  ['dinde', '🦃', 'in'],
  ['doigt', '☝️', 'oi'],
  ['dragon', '🐉', 'on'],
  ['écureuil', '🐿️', 'eu ill'],
  ['éléphant', '🐘', 'an'],
  ['enfant', null, 'an'],
  ['étoile', '⭐', 'oi'],
  ['éventail', null, 'an ail'],
  ['famille', '👪', 'ill'],
  ['feu', '🔥', 'eu'],
  ['feuille', '🍃', 'eu ill'],
  ['fille', '👧', 'ill'],
  ['fleur', '🌼', 'eu'],
  ['fourmi', '🐜', 'ou'],
  ['gant', '🧤', 'an'],
  ['genou', null, 'e ou'],
  ['gorille', '🦍', 'ill'],
  ['grenouille', '🐸', 'e ou ill'],
  ['groseille', null, 'eil'],
  ['hache', '🪓', 'ch'],
  ['hibou', '🦉', 'ou'],
  ['jambe', '🦵', 'an'],
  ['jeu', null, 'eu'],
  ['journal', '📰', 'ou'],
  ['kangourou', '🦘', 'an ou'],
  ['lampe', null, 'an'],
  ['lapin', '🐰', 'in'],
  ['lion', '🦁', 'on yod'],
  ['loup', '🐺', 'ou'],
  ['maillot', '🩱', 'ail'],
  ['main', '✋', 'in'],
  ['maison', '🏠', 'on'],
  ['maman', null, 'an'],
  ['manteau', '🧥', 'an eau'],
  ['médaille', '🏅', 'ail'],
  ['melon', '🍈', 'e on'],
  ['miroir', '🪞', 'oi'],
  ['montagne', '⛰️', 'on gn'],
  ['mouche', '🪰', 'ou ch'],
  ['moulin', null, 'ou in'],
  ['moustique', '🦟', 'ou'],
  ['mouton', '🐑', 'ou on'],
  ['neuf', '9️⃣', 'eu'],
  ['œuf', '🥚', 'eu'],
  ['oiseau', '🐦', 'oi eau'],
  ['orange', '🍊', 'an'],
  ['ordinateur', '💻', 'eu'],
  ['oreille', '👂', 'eil'],
  ['orteil', null, 'eil'],
  ['ours', '🐻', 'ou'],
  ['paille', null, 'ail'],
  ['pain', '🍞', 'in'],
  ['panda', '🐼', 'an'],
  ['pantalon', '👖', 'an on'],
  ['papillon', '🦋', 'ill on'],
  ['pêche', '🍑', 'ch'],
  ['peigne', null, 'gn'],
  ['pinceau', '🖌️', 'in eau'],
  ['plante', '🪴', 'an'],
  ['poire', '🍐', 'oi'],
  ['poisson', '🐟', 'oi on'],
  ['poivron', '🫑', 'oi on'],
  ['pont', '🌉', 'on'],
  ['poule', '🐔', 'ou'],
  ['poussin', '🐤', 'ou in'],
  ['quille', null, 'ill'],
  ['rail', null, 'ail'],
  ['raisin', '🍇', 'in'],
  ['requin', '🦈', 'e in'],
  ['réveil', '⏰', 'eil'],
  ['roi', null, 'oi'],
  ['ruban', null, 'an'],
  ['sapin', '🎄', 'in'],
  ['savon', '🧼', 'on'],
  ['serpent', '🐍', 'an'],
  ['singe', '🐵', 'in'],
  ['soleil', '☀️', 'eil'],
  ['sommeil', null, 'eil'],
  ['soupe', null, 'ou'],
  ['souris', '🐭', 'ou'],
  ['tambour', '🥁', 'an ou'],
  ['tente', '⛺', 'an'],
  ['tracteur', '🚜', 'eu'],
  ['train', '🚂', 'in'],
  ['travail', null, 'ail'],
  ['vache', '🐮', 'ch'],
  ['vent', null, 'an'],   // 🌬️ montre un visage qui souffle : l'image ne dit pas « vent »
  ['vitrail', null, 'ail'],
  ['voiture', '🚗', 'oi'],
  ['yeux', '👀', 'eu yod'],
];

/** Un mot illustré : { word, emoji, sounds }. `emoji` vaut null si l'image serait ambiguë. */
export const WORDS = RAW.map(([word, emoji, sounds]) => Object.freeze({
  word,
  emoji,
  sounds: Object.freeze(sounds ? sounds.split(' ') : []),
}));

const BY_WORD = new Map(WORDS.map((w) => [w.word, w]));

export function getSound(id) {
  const sound = BY_ID.get(id);
  if (!sound) throw new RangeError(`son inconnu : ${id}`);
  return sound;
}

export function findWord(word) {
  return BY_WORD.get(word) || null;
}

/** Les sons qui empêchent un mot de servir d'intrus pour `sound` (lui-même compris). */
export function conflictsOf(sound) {
  return CONFLICTS.get(sound) || [sound];
}

/** Tous les sons interdits à un intrus, pour une liste de sons visés. */
export function blockedSounds(sounds) {
  return new Set(sounds.flatMap(conflictsOf));
}

/**
 * Les mots où l'on entend `sound`. `emoji` : seulement ceux qui ont une image ;
 * `from` : partir d'une sous-banque (la liste de lecture d'un niveau, par exemple).
 */
export function wordsWithSound(sound, { emoji = false, from = WORDS } = {}) {
  getSound(sound);
  return from.filter((w) => w.sounds.includes(sound) && (!emoji || w.emoji));
}

/** Les mots où l'on n'entend aucun des sons de `blocked` : des intrus sûrs. */
export function wordsWithout(blocked, { emoji = false, from = WORDS } = {}) {
  return from.filter((w) => !w.sounds.some((s) => blocked.has(s)) && (!emoji || w.emoji));
}

/** Les mots qui ne contiennent que les sons de `allowed` : de quoi borner un niveau. */
export function wordsOnlyWith(allowed, { from = WORDS } = {}) {
  const ok = new Set(allowed);
  return from.filter((w) => w.sounds.every((s) => ok.has(s)));
}

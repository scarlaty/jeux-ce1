// Les homophones (E6-T1, #42) : banque écrite à la main. Jamais de phrase générée.
// Une phrase = un texte où chaque trou est écrit {mot} : le mot entre accolades EST la bonne réponse.
//   « Léo {a} un vélo rouge. »  → trou, réponse « a », paire a/à.
// Invariants (vérifiés par tests/games/homophones.test.js) :
//   - une seule réponse grammaticale par trou : l'autre forme de la paire donne une phrase impossible ;
//   - la phrase ne montre JAMAIS un mot de la paire du trou (pas de « et » visible quand on cherche et/est) ;
//   - les voisins du trou ne trahissent pas la réponse : « la » suit autant « a » que « à », « ils » n'est
//     qu'une fois sur cinq devant « ont », la virgule précède autant « on » que « ont »… (voir le test) ;
//   - phrases épicènes, personnages variés, aucun « tu » ni « je » genré ;
//   - le remplacement de l'astuce (a → avait…) donne une phrase correcte quand la réponse est cette forme.

/** Les quatre paires de CE1 (programme 2024) et leur astuce : on remplace le mot et on écoute la phrase. */
export const PAIRS = {
  'a/à': ['a', 'à'],
  'et/est': ['et', 'est'],
  'son/sont': ['son', 'sont'],
  'on/ont': ['on', 'ont'],
};

/** Mot de remplacement de l'astuce, pour chaque forme qui en a un. */
export const REPLACE = { a: 'avait', est: 'était', son: 'mon', sont: 'étaient', on: 'il', ont: 'avaient' };

/** Formes sans remplacement : l'astuce montre que le remplacement de la forme voisine ne va pas. */
export const NO_REPLACE = { 'à': 'a', et: 'est' };

export const pairOf = (word) => Object.keys(PAIRS).find((p) => PAIRS[p].includes(word));

// ---- Niveau 1 : a/à et et/est, phrases très courtes ------------------------------------------------------
// Équilibres voulus (les solveurs de surface du test les mesurent) : le trou de a/à est autant juste après
// le premier mot que plus loin, des « est » devant un déterminant et des « et » devant un verbe.
export const LEVEL_1 = [
  // a
  'Lina {a} un ballon rouge.',
  'Mia {a} faim.',
  'Noah {a} la clé de la maison.',
  'Papa {a} la voiture rouge.',
  'Le chat {a} peur du chien.',
  'Il y {a} un chat sur le toit.',
  'Le petit chat de Mia {a} soif.',
  'Le frère de Hugo {a} le ballon.',
  // à
  'Merci {à} Papa pour le gâteau.',
  'Bravo {à} Hugo pour son dessin.',
  'Rendez-vous {à} midi.',
  'Bonjour {à} tout le monde.',
  'Mia joue {à} la balle.',
  'Léo pense {à} un cadeau pour Papa.',
  'Noah donne un gâteau {à} Lina.',
  'Inès joue {à} cache-cache.',
  // est
  'Noah {est} un bon nageur.',
  'Sofia {est} la sœur de Noah.',
  'Zoé {est} la gardienne de but.',
  'Papa {est} très bon cuisinier.',
  'Le chat {est} noir.',
  'Le ciel {est} bleu.',
  'Léo {est} en classe.',
  'Hugo {est} dans le jardin.',
  // et
  'Léo {et} Mia jouent.',
  'Le chat {et} le chien dorment.',
  'Maman {et} Papa chantent.',
  'Zoé mange une pomme {et} une poire.',
  'Hugo ouvre la porte {et} sort.',
  'Yanis chante {et} danse.',
  'Jade court {et} saute.',
  'Le chat noir {et} blanc dort.',
];

// ---- Niveau 2 : + son/sont et on/ont ----------------------------------------------------------------------
export const LEVEL_2 = [
  // son
  'Léo range ses jouets dans {son} placard.',
  'Les jours de pluie, Mia prend {son} parapluie.',
  'Noah joue avec {son} frère.',
  'Mes parents invitent Inès et {son} frère.',
  'Hugo met la clé dans {son} sac.',
  'Le bébé tient {son} doudou.',
  'Zoé cherche ses clés sous {son} lit.',
  // sont
  'Les enfants {sont} dans la cour.',
  'Mes chats {sont} très doux.',
  'Elles {sont} jolies.',
  'Papa et Maman {sont} au travail.',
  'Léo et Mia {sont} frère et sœur.',
  'Mes deux chiens {sont} des champions.',
  'Mia et Noah {sont} dans la même classe.',
  // on
  'Demain matin {on} va au zoo.',
  'Pendant les vacances {on} part à la mer.',
  'Papa pense qu\'{on} sera à l\'heure.',
  'Dans les rues, {on} joue au ballon.',
  'Léo veut savoir où {on} range les billes.',
  'Léo se demande comment {on} fait des crêpes.',
  'Mia chante et {on} l\'écoute.',
  // ont
  'Les enfants {ont} un nouveau jeu.',
  'Mes amis, Léo et Mia, {ont} gagné la partie.',
  'Les chevaux {ont} soif.',
  'Les chats {ont} faim.',
  'Léo et Mia {ont} fini leur dessin.',
  'Noah et Lina {ont} peur du noir.',
  'Papa et Maman {ont} acheté du pain.',
  // a / à
  'La pompière {a} sauvé le chat du voisin.',
  'Hugo {a} gagné la course.',
  'Sofia {a} un nouveau crayon.',
  'Le chien de Zoé {a} un os.',
  'Léo téléphone {à} Pépé.',
  'Merci {à} Mamie pour le pull.',
  'Maman donne un bisou {à} un bébé.',
  'Les enfants vont {à} la plage.',
  // est / et
  'La salade {est} dans le frigo.',
  'Mon vélo {est} neuf.',
  'Le chien de Zoé {est} très gentil.',
  'Adam {est} un grand lecteur.',
  'Mia mange une crêpe {et} boit du lait.',
  'Papa {et} Lina font un gâteau.',
  'Noah prend un livre {et} un crayon.',
  'Léo ouvre la fenêtre {et} regarde dehors.',
];

// ---- Niveau 3 : les quatre paires, phrases longues --------------------------------------------------------
export const LEVEL_3_SINGLE = [
  // a
  'Après la classe, Sofia {a} tous ses crayons dans la trousse.',
  'Le garçon qui habite près de l\'école {a} trois perroquets verts.',
  'Ce matin, Adam {a} dessiné un dragon avec des feutres.',
  // à
  'Merci {à} tous les enfants qui ont aidé la voisine du premier étage.',
  'La factrice apporte un colis {à} Maman avant midi.',
  'Ma tante écrit {à} Pépé tous les dimanches.',
  // est
  'Dans le jardin de mes grands-parents, le cerisier {est} le plus vieil arbre du quartier.',
  'Le gâteau que Papa a préparé {est} la surprise de Lina.',
  'Mon voisin {est} un pompier courageux, il travaille de nuit.',
  // et
  'Pour la fête, Mia a apporté des ballons {et} décoré la salle.',
  'Noah ouvre la fenêtre {et} regarde la neige tomber.',
  'Dans le panier, il y a des pommes, des poires {et} cinq prunes.',
  // son
  'Lina regarde le gâteau puis tend {son} assiette à Papa.',
  'Les élèves applaudissent Zoé quand elle montre {son} dessin.',
  'Le cheval du fermier galope vite et {son} cavalier rit.',
  // sont
  'Les poissons du bassin {sont} orange avec des taches blanches.',
  'Léo, Hugo et Sofia {sont} partis en sortie scolaire.',
  'Les livres que Mia a empruntés {sont} vraiment épais.',
  // on
  'Léo demande à Maman quand {on} pourra aller au parc.',
  'Mia chante très fort quand {on} lui demande un air.',
  'Les voisins disent qu\'{on} entend la musique de loin.',
  // ont
  'Hier, après la pluie, tous les enfants du quartier {ont} sauté dans les flaques.',
  'Les deux sœurs de Noah {ont} une chambre très bien rangée.',
  'Mes cousins, qui habitent loin, {ont} enfin reçu notre lettre.',
];

/** Deux trous dans la même phrase : l'enfant choisit la paire de mots qui convient. */
export const LEVEL_3_DOUBLE = [
  'Mia {a} mal {à} la tête.',
  'Le frère de Léo {a} un chien {et} un chat noir.',
  'Le chat {est} sous la chaise {et} dort.',
  'Le petit Hugo {a} perdu {son} bonnet.',
  'Nina {et} Adam {ont} gagné.',
  'Les élèves {sont} contents {et} chantent.',
  'Yanis pense {à} {son} frère.',
  'Papa dit qu\'{on} ira {à} la plage.',
  'Ce soir, Maël {et} Jade {ont} faim.',
  'Le chien {est} content : il {a} son os.',
  'Elles {ont} appris que le sac {est} à Léo.',
  'Le bébé {a} sommeil, alors {on} lit une histoire.',
];

// ---- Analyse d'une phrase de la banque ---------------------------------------------------------------------
const GAP = /\{([^}]+)\}/g;

/** Réponses d'une phrase, dans l'ordre des trous : « Mia {a} mal {à} … » → ['a', 'à']. */
export const answersOf = (template) => [...template.matchAll(GAP)].map((m) => m[1]);

/** Phrase juste, sans accolades. */
export const completed = (template) => template.replace(GAP, '$1');

/** Phrase avec le trou numéroté `index` remplacé par `word`, les autres trous étant justes. */
export function withWord(template, index, word) {
  let i = -1;
  return template.replace(GAP, (_, w) => { i += 1; return i === index ? word : w; });
}

/** Phrase montrée : un trou « ____ », ou « [1] », « [2] » s'il y en a deux. */
export function gapped(template) {
  const n = answersOf(template).length;
  let i = 0;
  return template.replace(GAP, () => { i += 1; return n === 1 ? '____' : `[${i}]`; });
}

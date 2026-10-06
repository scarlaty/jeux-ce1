// Registre des jeux : métadonnées légères (pour l'accueil, la carte, l'espace parents) et
// chargement paresseux du fichier du jeu. Ajouter un jeu = créer js/games/<id>.js + une entrée ici.
// Un test vérifie que ces métadonnées sont identiques à celles du fichier du jeu.

/** Les cinq îles de la carte. La couleur vient du token CSS --island-<id>. */
export const ISLANDS = [
  { id: 'mots', name: 'L\'île aux Mots', subject: 'Français' },
  { id: 'nombres', name: 'L\'île aux Nombres', subject: 'Nombres et calcul' },
  { id: 'mesures', name: 'L\'île des Mesures', subject: 'Grandeurs, mesures et géométrie' },
  { id: 'monde', name: 'L\'île du Monde', subject: 'Questionner le monde' },
  { id: 'ailleurs', name: 'L\'île d\'Ailleurs', subject: 'Anglais et vivre ensemble' },
];

export const GAMES = [
  {
    id: 'demo',
    title: 'Démonstration',
    island: 'ailleurs',
    subject: 'démo',
    demo: true,   // jeu de démonstration des composants : hors accueil, accessible par #/jeu/demo
    load: () => import('./demo.js'),
  },
  {
    id: 'sons',
    title: 'Les sons',
    island: 'mots',
    subject: 'français',
    load: () => import('./sons.js'),
  },
  {
    id: 'syllabes',
    title: 'Syllabes en folie',
    island: 'mots',
    subject: 'français',
    load: () => import('./syllabes.js'),
  },
  {
    id: 'lettres-soeurs',
    title: 'Lettres sœurs',
    island: 'mots',
    subject: 'français',
    load: () => import('./lettres-soeurs.js'),
  },
  {
    id: 'lettres-qui-changent',
    title: 'Les lettres qui changent de son',
    island: 'mots',
    subject: 'français',
    load: () => import('./lettres-qui-changent.js'),
  },
  {
    id: 'lecture-eclair',
    title: 'Lecture éclair',
    island: 'mots',
    subject: 'français',
    load: () => import('./lecture-eclair.js'),
  },
  {
    id: 'calcul-mental',
    title: 'Calcul mental',
    island: 'nombres',
    subject: 'maths',
    load: () => import('./calcul-mental.js'),
  },
  {
    id: 'cdu',
    title: 'Centaines, dizaines, unités',
    island: 'nombres',
    subject: 'maths',
    load: () => import('./cdu.js'),
  },
  {
    id: 'ecrire-nombres',
    title: 'Écrire les nombres',
    island: 'nombres',
    subject: 'maths',
    load: () => import('./ecrire-nombres.js'),
  },
  {
    id: 'tables',
    title: 'Les tables',
    island: 'nombres',
    subject: 'maths',
    load: () => import('./tables.js'),
  },
];

export function getIsland(id) {
  return ISLANDS.find((i) => i.id === id) || null;
}

export function getGameEntry(id) {
  return GAMES.find((g) => g.id === id) || null;
}

/** Charge le module du jeu ; renvoie null si le jeu n'existe pas. */
export async function loadGame(id) {
  const entry = getGameEntry(id);
  if (!entry) return null;
  const module = await entry.load();
  return module.default;
}

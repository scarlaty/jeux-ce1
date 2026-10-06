// Registre des jeux : métadonnées légères (pour l'accueil, la carte, l'espace parents) et
// chargement paresseux du fichier du jeu. Ajouter un jeu = créer js/games/<id>.js + une entrée ici.
// Un test vérifie que ces métadonnées sont identiques à celles du fichier du jeu.

/** Les cinq îles de la carte. La couleur vient du token CSS --island-<id>. */
export const ISLANDS = [
  { id: 'mots', name: 'Île des Mots', subject: 'Français' },
  { id: 'nombres', name: 'Île des Nombres', subject: 'Nombres et calcul' },
  { id: 'mesures', name: 'Île des Mesures et des Formes', subject: 'Grandeurs, mesures et géométrie' },
  { id: 'monde', name: 'Île du Monde', subject: 'Questionner le monde' },
  { id: 'ailleurs', name: 'Île des Voyages', subject: 'Anglais et vivre ensemble' },
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

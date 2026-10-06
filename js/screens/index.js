// Table des écrans : POINT D'EXTENSION pour les prochains lots.
// Pour ajouter ou remplacer un écran : créer js/screens/<nom>.js et modifier sa ligne ici.
//
// Un module d'écran exporte par défaut :
//   {
//     title?: 'Mon album',                 // titre de la barre du haut (sinon « Jeux CE1 »)
//     render(view, { params, app }) {      // view : <main> vidé ; params : paramètres d'URL
//       …                                  // peut être async
//       return () => { … };                // facultatif : nettoyage quand on quitte l'écran
//     },
//   }
// `app` : voir createAppContext dans js/app.js (store, profileId, navigate, setTitle…).
//
// L'ordre compte : la première route dont le motif correspond gagne. '/profil/nouveau' est donc
// déclarée avant '/profil/:id'.
//
// Plus aucun écran provisoire : `soon.js` reste disponible pour les rubriques à venir.
export const SCREENS = [
  { path: '/', load: () => import('./home.js') },
  { path: '/jeu/:id', load: () => import('./play.js') },
  { path: '/defi', load: () => import('./daily.js'), title: 'Défi du jour' },
  { path: '/album', load: () => import('./album.js'), title: 'Mon album' },
  { path: '/parents', load: () => import('./parents.js'), title: 'Espace parents' },
  { path: '/bienvenue', load: () => import('./welcome.js'), title: 'Bienvenue !' },
  { path: '/profil', load: () => import('./profiles.js'), title: 'Qui joue ?' },
  { path: '/profil/nouveau', load: () => import('./welcome.js'), title: 'Nouveau profil' },
  { path: '/profil/:id', load: () => import('./welcome.js'), title: 'Mon profil' },
];

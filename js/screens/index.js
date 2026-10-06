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
// Écrans encore provisoires (à remplacer) :
//   '/parents' espace parents (#15)
//   '/profil'  prénom, avatar, profils (#9, #10)
export const SCREENS = [
  { path: '/', load: () => import('./home.js') },
  { path: '/jeu/:id', load: () => import('./play.js') },
  { path: '/album', load: () => import('./album.js'), title: 'Mon album' },
  { path: '/parents', load: () => import('./soon.js'), title: 'Espace parents' },
  { path: '/profil', load: () => import('./soon.js'), title: 'Mon profil' },
];

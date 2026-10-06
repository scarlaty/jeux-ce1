# Jeux CE1 — guide de développement

Mini-jeux éducatifs couvrant le programme officiel de CE1 (programmes 2024, BO n°41 du 31/10/2024),
pour une enfant de 7 ans, sur tablette (tactile) et PC (souris).
Publié sur GitHub Pages : https://scarlaty.github.io/jeux-ce1/ — backlog : issues + jalons (E0…E14) du dépôt.

## Principes non négociables

- **Aucune étape de build.** HTML + CSS + JavaScript (modules ES natifs) servis tels quels par GitHub Pages.
  Aucune dépendance npm à l'exécution. Chemins **relatifs** partout (le site vit sous `/jeux-ce1/`).
- **Qualité avant quantité.** Code lisible, petites fonctions pures, pas de duplication entre jeux :
  tout ce qui sert à deux jeux va dans `js/core/`.
- **Logique séparée de l'affichage.** Les générateurs de questions et les calculs (scores, grades,
  stockage, nombres en lettres…) sont des fonctions pures, sans DOM, testées avec `node --test`.
- **Contenu pédagogique exact.** Orthographe irréprochable (orthographe rectifiée de 1990 pour les
  nombres : « deux-cent-trente »). Aucune question ambiguë : une seule bonne réponse possible.
  Vocabulaire adapté à 7 ans, phrases courtes, consignes à l'impératif (« Touche le mot qui… »).
- **Bienveillance.** Jamais de message négatif (« Faux ! »). Après une erreur : la bonne réponse +
  une explication courte ou une astuce. Pas de chrono punitif.
- **Vie privée.** Rien n'est envoyé sur le réseau. Pas d'analytics, pas de cookies.

## Arborescence

```
index.html              application unique (SPA), routage par hash : #/ , #/jeu/<id> , #/album , #/parents …
manifest.webmanifest    PWA (E0-T8)
sw.js                   service worker hors ligne (E0-T8)
css/
  tokens.css            variables de design (couleurs, polices, espacements, rayons) — clair + sombre
  base.css              reset, typographie, fond Seyès
  components.css        boutons, cartes, pavé numérique, bulles de feedback…
js/
  app.js                démarrage, routeur, écrans
  core/
    storage.js          lecture/écriture localStorage versionnée (préfixe « jeux-ce1: »), migrations
    profile.js          profils, prénom, avatar, profil actif
    history.js          historique des parties, agrégats pour les courbes
    engine.js           déroulé d'une partie (10 questions, score, étoiles, niveau suivant)
    rewards.js          points, séries, grades, gommettes
    audio.js            sons (Web Audio) + voix (speechSynthesis fr-FR / en-GB)
    random.js           RNG avec graine (mulberry32), shuffle, pick, sample sans remise
    ui/                 composants d'affichage réutilisables (un fichier par type de question)
      choice.js         QCM texte / image
      keypad.js         pavé numérique
      order.js          remettre dans l'ordre
      drag.js           glisser-déposer (pointer events)
      letters.js        clavier de lettres
  games/
    registry.js         liste des jeux : métadonnées + chemin d'import (chargement paresseux)
    <id>.js             un fichier par jeu (logique pure, sans DOM)
  data/                 banques de contenu partagées (mots illustrés, conjugaisons, nombres en lettres…)
tests/                  tests node --test (*.test.js)
docs/                   notes de conception si nécessaire
```

## Contrat d'un jeu (`js/games/<id>.js`)

Un jeu = **un fichier** + **une entrée dans `registry.js`**. Pas de DOM dans le fichier du jeu.

```js
export default {
  id: 'sons',                       // identique à la clé du registre et à l'URL #/jeu/sons
  title: 'Les sons',
  island: 'mots',                   // mots | nombres | mesures | monde | ailleurs (anglais + EMC)
  subject: 'français',              // français | maths | monde | anglais | emc
  issue: 22,                        // numéro d'issue GitHub
  skills: ['Discriminer les sons complexes'],   // compétences du programme (affichées aux parents)
  levels: [                         // exactement 3 niveaux, du plus facile au plus dur
    { label: 'Niveau 1', hint: '[ou], [on], [an], [oi], [ch]' },
    { label: 'Niveau 2', hint: '+ [in], [eu]' },
    { label: 'Niveau 3', hint: '+ [gn], [ill], [ail], [eil]' },
  ],
  // Renvoie UNE question. `rng` est le générateur à graine de core/random.js.
  // `seen` : Set des clés déjà posées dans la partie (pour éviter les doublons).
  makeQuestion(level, rng, seen) { return question; },
};
```

### Forme d'une question

```js
{
  key: 'sons:ou:loup',          // identifiant stable (doublons, statistiques des erreurs)
  type: 'choice',               // choice | keypad | order | drag | letters | (type custom documenté)
  prompt: 'Touche l\'image où tu entends le son [ou].',   // consigne (texte simple)
  speak: 'Où entends-tu le son ou ?',                     // facultatif : texte lu par la voix
  display: { … },               // données d'affichage propres au type (voir js/core/ui/*.js)
  answer: …,                    // bonne réponse (valeur comparée par le moteur)
  explain: 'Dans « loup », on entend [ou].',              // affiché après une erreur
  skill: 'son [ou]',            // notion travaillée (statistiques « à retravailler »)
}
```

Le moteur (`engine.js`) vérifie la réponse, applique les points, enregistre l'historique.
Un jeu ne touche jamais au stockage ni aux récompenses directement.

Exigences par jeu (critères des issues) : 3 niveaux progressifs, **au moins 30 questions distinctes
par niveau** (générées ou en banque), correction expliquée, jouable au doigt et à la souris,
tests unitaires du générateur (`tests/games/<id>.test.js` : 500 tirages par niveau → question valide,
une seule bonne réponse, réponse présente parmi les choix, pas de choix en double).

## Stockage (localStorage)

- Toutes les clés commencent par `jeux-ce1:` (les pages scarlaty.github.io partagent la même origine).
- Une clé par profil : `jeux-ce1:profile:<profileId>` + `jeux-ce1:meta` (liste des profils, profil actif,
  version du schéma). Champ `schemaVersion` + fonction de migration à chaque changement de format.
- Chaque accès est entouré de try/catch : l'appli doit fonctionner (sans sauvegarde) si le stockage
  est indisponible, et l'indiquer discrètement.
- Historique : une entrée par partie `{ t, game, level, score, total, durationMs, missed:[skill] }`,
  plafonné (les plus anciennes au-delà de 5000 sont agrégées par semaine).
- Export/import : JSON versionné, validé avant import.

## Design

- Univers « cahier d'école » : fond à réglure Seyès, gommettes, tampons de maîtresse. Thème sombre = ardoise.
- Polices Google Fonts avec repli : **Andika** (conçue pour l'apprentissage de la lecture) pour le texte,
  une cursive scolaire (Playwrite FR Moderne si disponible, sinon repli `cursive`) pour les mots en
  français à lire, et une police ronde lisible pour les titres. Chiffres en `tabular-nums`.
- Toutes les couleurs sont des variables de `tokens.css`, redéfinies pour le thème sombre
  (`prefers-color-scheme` + `[data-theme]`). Aucune couleur en dur dans les composants.
- Zones tactiles ≥ 56 px, espacement généreux, texte de consigne ≥ 22 px sur tablette.
- Doit fonctionner de 360 px (téléphone) à 1366 px (tablette paysage / PC), sans défilement horizontal.
- Pointer events (pas de `click` seul pour le glisser-déposer), `touch-action` réglé, pas de survol requis.
- `prefers-reduced-motion` respecté. Focus clavier visible. Contrastes AA. Info jamais portée par la
  seule couleur (✓/✗ en plus du vert/rouge).
- Les émojis sont acceptés comme **images de contenu** (animaux, objets, gommettes), pas comme décoration d'UI.

## Tests et vérification

- `node --test tests/` doit passer avant chaque commit (aucune dépendance à installer).
- Vérifier visuellement dans un navigateur (serveur statique : `python -m http.server 8000` à la racine,
  ou `npx serve`) en largeur tablette ET téléphone, thème clair ET sombre.
- Aucune erreur dans la console.

## Git

- Auteur : `scarlaty` uniquement. **Jamais** de ligne `Co-Authored-By: Claude` ni de mention « Generated with Claude ».
- Une branche par lot de travail (`feat/e0-socle`, `feat/jeu-sons`…), messages de commit en français,
  au présent, référençant l'issue : `Ajoute le pavé numérique (#6)`.
- Ne jamais pousser directement sur `main` depuis un agent : l'orchestrateur relit et fusionne.

## Conventions de code

- Identifiants en anglais, textes affichés en français, commentaires en français et rares (le « pourquoi »).
- `const` par défaut, fonctions courtes, modules ES (`import`/`export`), pas de variable globale.
- Pas de `innerHTML` avec du contenu saisi par l'utilisateur (prénom) : `textContent`.

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
index.html              application unique (SPA), routage par hash : #/ , #/jeu/<id> , #/defi , #/album ,
                        #/bienvenue , #/profil , #/profil/nouveau , #/profil/<id> , #/parents
manifest.webmanifest    PWA : nom, icônes, start_url et scope relatifs, standalone (E0-T8)
sw.js                   service worker hors ligne : liste de pré-cache + stratégies (E0-T8)
package.json            uniquement pour `npm test` (aucune dépendance)
icons/
  icon.svg              source des icônes (maskable) ; les PNG en sont la copie pixel
  icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
tools/                  outils ponctuels hors application (jamais servis au navigateur)
  make-icons.mjs        régénère les PNG d'icônes : `node tools/make-icons.mjs`
  precache.mjs          logique pure du pré-cache, utilisée par tests/offline.test.js
css/
  tokens.css            variables de design (couleurs, polices, espacements, rayons) — clair + sombre
  base.css              reset, typographie, fond Seyès
  components.css        boutons, cartes, pavé numérique, bulles de feedback…
  profile.css           profils, avatars, courbes, espace parents (E1)
  rewards.css           récompenses : compteur de points, grades, album, carte des îles, confettis
js/
  app.js                démarrage : stockage, profil actif, réglages, barre du haut, routeur
  screens/
    index.js            TABLE DES ÉCRANS (point d'extension) : chemin → module d'écran
    home.js             accueil : carte au trésor des îles (avancement, défi du jour, grade)
    play.js             choix du niveau, partie, fin de partie ; exporte createGameView (réutilisé)
    album.js            album de gommettes et échelle des grades (#/album)
    daily.js            défi du jour : 5 questions tirées des jeux déjà joués (#/defi)
    welcome.js          prénom + avatar : premier lancement, nouveau profil, modification (#9, #10)
    profiles.js         « Qui joue ? » : choisir, ajouter, supprimer un profil (#10)
    parents.js          espace parents : progrès, historique, courbes, sauvegarde (#12…#15)
    soon.js             écran « Bientôt » : disponible pour les rubriques à venir
  core/
    storage.js          lecture/écriture localStorage versionnée (préfixe « jeux-ce1: »), migrations
    profile.js          profils, prénom, avatar, profil actif
    history.js          historique des parties, progression par jeu, agrégats pour les courbes
    stats.js            agrégats de l'espace parents (semaines, notions ratées, géométrie des courbes)
    backup.js           export/import d'une sauvegarde JSON versionnée et validée (#14)
    gate.js             opération de contrôle à l'entrée de l'espace parents (#15)
    engine.js           déroulé d'une partie (10 questions, score, étoiles, niveau suivant) + gameEvents
    validate.js         vérification de la forme d'une question (utilisée par les tests des jeux)
    alphabet.js         touches du clavier de lettres
    router.js           routeur par hash
    offline.js          enregistrement du service worker + avis discret de mise à jour
    rewards.js          points, séries, grades, gommettes, défi du jour (FONCTIONS PURES)
    rewards-live.js     branchement des récompenses sur gameEvents + écriture dans le profil
    audio.js            sons (Web Audio) + voix (speechSynthesis fr-FR / en-GB)
    random.js           RNG avec graine (mulberry32), shuffle, pick, sample sans remise
    ui/                 composants d'affichage réutilisables (un fichier par type de question)
      index.js          registre des composants (registerQuestionUI pour un type nouveau)
      dom.js, icons.js  h() pour créer des éléments, icônes SVG d'interface, pastilles ✓/✗
      svg.js            s() et figure() pour construire un SVG (aucun import : pas de cycle)
      confetti.js       confettis de fin de partie (sans effet si « réduire les animations »)
      art/              dessins demandés par les jeux (index.js = registre, un fichier par genre)
      avatar.js         pastille d'avatar (barre du haut, listes de profils)
      chart.js          courbe SVG + tableau des valeurs (aucune bibliothèque)
      choice.js         QCM texte / image
      keypad.js         pavé numérique
      order.js          remettre dans l'ordre
      drag.js           glisser-déposer (pointer events)
      letters.js        clavier de lettres
  games/
    registry.js         îles + liste des jeux : métadonnées + chemin d'import (chargement paresseux)
    demo.js             jeu de démonstration des 5 types de questions (#/jeu/demo)
    <id>.js             un fichier par jeu (logique pure, sans DOM)
  data/                 banques de contenu partagées (mots illustrés, conjugaisons…)
    nombres-en-lettres.js  enLettres(n), enChiffres(mots), morceaux(n) — orthographe rectifiée de 1990
tests/                  tests node --test (*.test.js) ; tests/helpers/game-checks.js pour les jeux
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

Le format de `display` de chaque type est documenté en tête de `js/core/ui/<type>.js`. Commun à tous :
`display.show = { emoji?, text?, cursive?, speak?, lang?, math? }` (illustration au-dessus des réponses ;
`speak` ajoute un bouton « écouter » dédié, `lang: 'en-GB'` pour l'anglais ; `math: true` affiche `text`
comme un calcul : morceaux séparés par des espaces, vrais signes `+ − × =`, « ? » = case du nombre à
trouver, taille ajustée pour tenir sur une ligne — voir `mathText` dans `ui/dom.js`).

**Dessins** : une illustration autre qu'un émoji se demande par `art: { kind, … }`, utilisable dans
`display.show` **et** dans un choix ou un élément à ranger (`{ value, art: { kind: 'clock', hours: 3,
minutes: 30 } }`). Ajouter un genre = un fichier `js/core/ui/art/<kind>.js` exportant `label(spec)`
(nom accessible, **fonction pure**), `draw(spec)` (le SVG) et `check(spec, errors)` facultatif, puis une
ligne dans `js/core/ui/art/index.js`. `validateQuestion` s'en sert : un dessin inconnu ou mal formé fait
échouer les tests du jeu, et deux dessins de même `label` comptent comme deux choix identiques.
Le `label` ne doit jamais donner la réponse : un cadran décrit la position des aiguilles, pas l'heure.

Les réponses sont comparées
par `sameAnswer` (nombres, textes normalisés NFC + apostrophes, listes dans l'ordre, objets clé par clé).
Les éléments à ranger (`order`, `drag`) sont fournis **déjà mélangés** par le jeu (avec `rng`).
Un jeu marqué `demo: true` (dans le fichier et dans le registre) a tous ses niveaux ouverts et disparaît
de l'accueil dès qu'un vrai jeu existe.

Test d'un jeu, en quelques lignes :

```js
import game from '../../js/games/sons.js';
import { checkGameShape, checkGenerator } from '../helpers/game-checks.js';
test('contrat', () => checkGameShape(game));
test('500 tirages par niveau', () => checkGenerator(game, { draws: 500, minDistinct: 30 }));
```

## API du socle (pour les écrans et les modules à venir)

- **Écrans** : `js/screens/index.js` associe un chemin (`/jeu/:id`) à un module
  `{ title?, render(view, { params, app, route }) → nettoyage? }`. `app` fournit `store`, `profileId`,
  `switchProfile(id)`, `navigate(path)`, `setTitle(texte)`, `record(result)`, `showProfile()`
  (rafraîchit la pastille de profil de la barre du haut). L'ordre des routes compte : la première
  qui correspond gagne (`/profil/nouveau` avant `/profil/:id`). Au premier lancement, le routeur
  renvoie tout vers `#/bienvenue`, sauf `#/parents` — c'est par là qu'on restaure une sauvegarde
  sur une tablette neuve.
- **Moteur** : `createSession(game, level, { seed?, record?, now? })` → `session.current`,
  `session.answer(valeur) → { correct, answer, explain }`, `session.next() → question | null` ;
  à la fin `session.result = { t, game, level, score, total, stars, durationMs, missed, bestStreak,
  unlocksNext, progress, extras }`. `starsFor(score, total)` : 3 si ≥ 90 %, 2 si ≥ 70 %, 1 si ≥ 50 %.
- **Récompenses et autres modules** : s'abonner à `gameEvents` (engine.js) sans modifier le moteur :
  `'start'`, `'question'`, `'answer'` (`{ session, question, given, correct, streak, index }`),
  `'end'` (`{ session, result, extras }`). Pousser `{ icon?, text }` dans `extras` pendant `'end'`
  l'affiche sur l'écran de fin. Un auditeur qui lève une exception ne casse pas la partie.
- **Historique / progression** (`history.js`) : `recordResult(store, profileId, result)` →
  `{ progress, newBest, newlyUnlocked }` ; `getGameProgress(profile, gameId)` →
  `{ unlocked, best: { [niveau]: { score, total, stars } }, plays }`.
- **Profils** (`profile.js`) : `AVATARS` / `avatarOf(id)`, `cleanName(texte)` et `isValidName`
  (le prénom est une donnée saisie : nettoyée ici, affichée partout en `textContent`),
  `ensureActiveProfile(store)`, `needsWelcome(store)` (premier lancement), `createProfile`,
  `updateIdentity(store, id, { name, avatar })` (met à jour le profil ET la liste du méta),
  `listProfiles`, `setActiveProfile`, `removeProfile` (jamais le dernier), `resetProgress`.
- **Statistiques** (`stats.js`, pur) : `totals(profile)`, `playedGames(profile, { limit, match })`,
  `weeklySeries(profile, { weeks, now, match })` (une ligne par semaine, `rate: null` sur les
  semaines sans partie — la courbe montre les trous), `topMissed`, `gameSummaries(profile, games)`,
  `seriesFilters(games)` (tout / par matière / par jeu), `chartGeometry(series, box)` et les
  libellés `weekLabel`, `dateTimeLabel`, `durationLabel`, `rateOf`. L'historique détaillé **et**
  les agrégats hebdomadaires sont lus ensemble : rien n'est perdu au-delà du plafond.
- **Sauvegarde** (`backup.js`) : `buildBackup(store)` → `{ app: 'jeux-ce1', format, schemaVersion,
  exportedAt, activeProfileId, profiles }` ; `serializeBackup`, `backupFilename` (jamais le prénom),
  `parseBackup(texte)` / `validateBackup(objet)` → `{ ok, backup }` ou `{ ok: false, error }`
  (message destiné à un adulte), `describeBackup` (résumé montré AVANT d'écrire),
  `applyBackup(store, backup, { mode: 'merge' | 'replace' })`. L'import ne recopie jamais le
  fichier tel quel : chaque profil passe par les migrations puis par un nettoyage champ par champ.
  Les réglages de l'appareil (thème, son) ne sont ni exportés ni écrasés.
- **Espace parents** (`gate.js`) : `makeGateChallenge(rng)` → une multiplication de 6 à 9
  (hors programme de CE1), `checkGate(challenge, réponse)`. La porte reste ouverte jusqu'au
  rechargement de la page, jamais dans le stockage.
- **Courbes** (`ui/chart.js`) : `weeklyChart(series, { title, caption })` → `<figure>` contenant
  un SVG écrit à la main (aucune bibliothèque) et le **même contenu en tableau** ; valeurs écrites
  à côté des points, ligne coupée sur les semaines sans partie, aucune animation.
- **Stockage** (`storage.js`) : `createStore(createStorage())` → `getMeta/setMeta/updateMeta`,
  `getProfile/setProfile/updateProfile/removeProfile`, `getSettings/setSetting` (réglages de l'appareil
  dans `meta.settings` : `muted`, `theme`). `store.storage.status()` : `'ok' | 'unavailable' | 'error'`.
  Changer de format : incrémenter `SCHEMA_VERSION` et ajouter l'étape dans `metaMigrations` /
  `profileMigrations` (+ un test). Profil v2 :
  `{ id, name, avatar, createdAt, progress, history, weekly, rewards }`, avec
  `rewards = { points, stickers: { [île]: [id de gommette] }, daily: { key, stars, points } | null }`.
- **Récompenses** (`rewards.js`, tout est pur) : `answerPoints({ correct, streak })` et `runPoints(résultats)`
  (10 points par bonne réponse, bonus aux séries de 3, 5, 7 et 10, +5 pour avoir terminé — une partie
  ne rapporte jamais 0) ; `GRADES` et `gradeFor/gradeProgress/gradeGained(avant, après)` ;
  `STICKERS` (10 gommettes par île, gagnées dans l'ordre : 1 par partie réussie, 2 avec 3 étoiles) ;
  `applyGameRewards(rewards, { island, stars, points, daily })` → `{ rewards, gained }` ;
  `dailyKey/dailySeed(date)` (date **locale** : le défi change à minuit pour l'enfant) ;
  `totalStars(progress)` et `islandUnlocked/islandStarsLeft(île, étoiles)` pour la carte.
  `rewards-live.js` fait le lien avec le moteur et le profil : `installRewards(app)` une fois au
  démarrage, `rewardEvents.on('points', …)` pour le compteur en direct, `rewardSummary(session)`
  pour l'écran de fin. Un jeu ou un écran ne calcule jamais de points lui-même.
- **Audio** (`audio.js`) : `playSound('tap' | 'success' | 'retry' | 'star' | 'finish')`,
  `speak(texte, { lang })`, `canSpeak()`. En français, les signes de calcul entourés d'espaces sont lus
  avec des mots (`speakableText` : « 15 − 8 = ? » → « 15 moins 8 égale combien ? »). Couper le son coupe les effets ; la voix ne parle que sur un
  appui volontaire sur « écouter » et reste donc disponible. Sans synthèse vocale, pas de bouton « écouter ».

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
- Export/import : JSON versionné, validé avant import (`core/backup.js`). Deux numéros de version :
  `format` (l'enveloppe) et `schemaVersion` (les documents de profil, rejoués par `profileMigrations`).
  Une sauvegarde plus récente que l'application est refusée avec un message explicite.

## Hors ligne (PWA)

- `sw.js` pré-cache toute la coquille **et tous les écrans et jeux**, bien qu'ils soient chargés
  paresseusement : un jeu jamais ouvert doit rester jouable sans connexion. Navigation en
  réseau d'abord (repli sur l'index en cache), reste en cache d'abord.
- **Après toute modification d'un fichier servi : incrémenter `VERSION` dans `sw.js`** (le cache
  s'appelle `jeux-ce1-<VERSION>` ; les anciens sont supprimés à l'activation). Sans cela, les
  tablettes déjà installées gardent l'ancienne version.
- La liste `PRECACHE` doit rester exactement celle des fichiers servis : `tests/offline.test.js`
  échoue dès qu'un fichier est ajouté, renommé ou supprimé sans mise à jour de la liste.
- Le nouveau service worker **attend** : `js/core/offline.js` affiche un bandeau sobre
  (« Une nouvelle version des jeux est prête »), jamais pendant une partie, et c'est l'enfant qui
  déclenche le rechargement. Jamais de rechargement automatique.
- Icônes : `icons/icon.svg` est la source ; régénérer les PNG avec `node tools/make-icons.mjs`.

## Design

- Univers « cahier d'école » : fond à réglure Seyès, gommettes, tampons de maîtresse. Thème sombre = ardoise.
- Polices **hébergées dans le dépôt** (`fonts/*.woff2`, déclarées dans `css/fonts.css`, licences dans
  `fonts/LICENCES.md`) — jamais de lien vers Google Fonts ni aucun autre CDN : **Andika** (conçue pour
  l'apprentissage de la lecture) pour le texte, **Playwrite FR Moderne** (cursive scolaire) pour les mots
  en français à lire, **Fredoka** pour les titres. Toujours avec replis. Chiffres en `tabular-nums`.
- Toutes les couleurs sont des variables de `tokens.css`, redéfinies pour le thème sombre
  (`prefers-color-scheme` + `[data-theme]`). Aucune couleur en dur dans les composants.
- Zones tactiles ≥ 56 px, espacement généreux, texte de consigne ≥ 22 px sur tablette.
  Seule exception : sur téléphone (< 520 px), les touches du clavier de lettres font 56 px de haut
  mais ~50 px de large, pour tenir 6 colonnes.
- Doit fonctionner de 360 px (téléphone) à 1366 px (tablette paysage / PC), sans défilement horizontal.
- Pointer events (pas de `click` seul pour le glisser-déposer), `touch-action` réglé, pas de survol requis.
- `prefers-reduced-motion` respecté : confettis, « +10 » qui s'envole et animation de grade
  disparaissent, mais **aucune information ne disparaît** (tampon, bandeau de grade et points restent).
  Focus clavier visible. Contrastes AA. Info jamais portée par la seule couleur (✓/✗ en plus du vert/rouge).
- Les émojis sont acceptés comme **images de contenu** (animaux, objets, gommettes), pas comme décoration d'UI.

## Tests et vérification

- `npm test` (= `node --test "tests/**/*.test.js"`) doit passer avant chaque commit (aucune dépendance
  à installer). NB : `node --test tests/` échoue avec Node ≥ 22 (un dossier n'est pas accepté).
- Vérifier visuellement dans un navigateur (serveur statique : `python -m http.server 8000` à la racine,
  ou `npx serve`) en largeur tablette ET téléphone, thème clair ET sombre (bouton de thème de la barre
  du haut : automatique → clair → sombre).
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

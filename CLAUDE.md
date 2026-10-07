# Jeux CE1 — guide de développement

Mini-jeux éducatifs couvrant le programme officiel de CE1 (programmes 2024, BO n°41 du 31/10/2024),
pour les enfants de 7 ans, filles et garçons, sur tablette (tactile) et PC (souris).
Publié sur GitHub Pages : https://scarlaty.github.io/jeux-ce1/ — backlog : issues + jalons (E0…E14) du dépôt.

## ⚠️ Avant de coder quoi que ce soit : règle anti-doublon

Plusieurs développeurs (humains et agents, sur plusieurs PC) travaillent sur ce dépôt. Le 06/10/2026, faute
de cette règle, le profil, les récompenses et « Les sons » ont été développés **deux fois**.

1. **Lire l'état réel sur GitHub, jamais seulement un fichier local** : tableau
   https://github.com/users/scarlaty/projects/1 + `git fetch --prune && git branch -r` + `docs/SUIVI.md` de `origin/main`.
2. **Une issue en « In Progress » avec un commentaire « 🔒 Pris en charge » est réservée** : ne pas y toucher.
3. **Réserver avant de commencer**, dans cet ordre :
   `gh issue comment <n> -R scarlaty/jeux-ce1 -b "🔒 Pris en charge — branche feat/<n>-<slug> — <date>"`,
   passer la carte en « In Progress », puis créer **et pousser immédiatement** la branche.
4. **Pousser au moins après chaque jeu terminé** (et en fin de séance) : aucun travail ne reste seulement en local.
5. **Jeu fini** : commenter « ✅ Prêt à relire sur feat/… ». L'orchestrateur relit, fusionne, ferme l'issue.
6. **Interruption** : pousser l'état (commit « WIP : … »), commenter « ⏸️ Interrompu : fait X, reste Y ».
   Une réservation sans aucun push depuis 48 h peut être reprise, après un commentaire sur l'issue.
7. **Ne jamais fusionner** une branche dont l'issue est déjà fermée : elle est obsolète.

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
- **Mixité.** Les jeux s'adressent aux filles comme aux garçons. Tout ce que le jeu dit à l'enfant
  (« tu… ») ou lui fait dire (« je… ») est épicène : jamais « tu es prête », « je suis content »,
  « pour ne pas être mêlé » — reformuler (« Bravo ! », « je le félicite »). Les personnages des
  questions sont variés (prénoms de filles et de garçons, rôles non stéréotypés), et leurs accords
  suivent leur propre genre. Le juge pédagogie le vérifie.
- **Vie privée.** Rien n'est envoyé sur le réseau. Pas d'analytics, pas de cookies.

## Arborescence

```
index.html              application unique (SPA), routage par hash : #/ , #/jeu/<id> , #/defi , #/album ,
                        #/bienvenue , #/profil , #/profil/nouveau , #/profil/<id> , #/parents ,
                        #/kawaii (démonstration du kit kawaii, non listée sur la carte)
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
  map.css               carte au trésor : cadrage des scènes, matières du décor, panneau de nom (#96)
  rewards.css           récompenses : compteur de points, grades, album, carte des îles, confettis
  kawaii.css            univers kawaii : peinture des personnages, animations douces, page #/kawaii
  chest.css             coffre surprise (#91) : dessin, ouverture, grille des accessoires
js/
  app.js                démarrage : stockage, profil actif, réglages, barre du haut, routeur
  screens/
    index.js            TABLE DES ÉCRANS (point d'extension) : chemin → module d'écran
    home.js             accueil : carte au trésor des îles (avancement, défi du jour, grade)
    island.js           zoom DANS une île (#/ile/<id>) : chaque jeu est un lieu du décor (#96)
    play.js             choix du niveau, partie, fin de partie ; exporte createGameView (réutilisé)
    compagnon.js        « Mon compagnon » : éclosion, croissance, nom et animal (#/compagnon, #90)
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
    map.js              carte au trésor : géométrie des îles et des lieux, noms, zone sûre (PUR)
    stats.js            agrégats de l'espace parents (semaines, notions ratées, géométrie des courbes)
    backup.js           export/import d'une sauvegarde JSON versionnée et validée (#14)
    gate.js             opération de contrôle à l'entrée de l'espace parents (#15)
    engine.js           déroulé d'une partie (10 questions, score, étoiles, niveau suivant) + gameEvents
    validate.js         vérification de la forme d'une question (utilisée par les tests des jeux)
    alphabet.js         touches du clavier de lettres
    amount.js           composer une somme : plus petite composition (PUR, #60)
    router.js           routeur par hash
    offline.js          enregistrement du service worker + avis discret de mise à jour
    rewards.js          points, séries, grades, gommettes, défi du jour (FONCTIONS PURES)
    rewards-live.js     branchement des récompenses sur gameEvents + écriture dans le profil
    companion.js        compagnon : stades, seuils, noms (PUR) ; companion-live.js : branchement sur gameEvents (#90)
    chest.js            coffre surprise : paliers, tirage à graine, accessoires, données du profil (PUR, #91)
    chest-live.js       branchement du coffre sur gameEvents (après les récompenses)
    audio.js            sons (Web Audio) + voix (speechSynthesis fr-FR / en-GB)
    random.js           RNG avec graine (mulberry32), shuffle, pick, sample sans remise
    ui/                 composants d'affichage réutilisables (un fichier par type de question)
      index.js          registre des composants (registerQuestionUI pour un type nouveau)
      dom.js, icons.js  h() pour créer des éléments, icônes SVG d'interface, pastilles ✓/✗
      svg.js            s() et figure() pour construire un SVG (aucun import : pas de cycle)
      chest.js          dessin du coffre (bois, argent, doré) et scène d'ouverture (#91)
      confetti.js       confettis de fin de partie (sans effet si « réduire les animations »)
      art/              dessins demandés par les jeux (index.js = registre, un fichier par genre) ;
        scenery.js      bibliothèque d'objets de décor de la carte, posés par <use> (#96)
                        kawaii.js (+ kawaii-parts.js, kawaii-deco.js) = kit de personnages kawaii
      avatar.js         pastille d'avatar (barre du haut, listes de profils)
      chart.js          courbe SVG + tableau des valeurs (aucune bibliothèque)
      map-scene.js      dessin des deux scènes de la carte (archipel, intérieur d'une île)
      choice.js         QCM texte / image
      keypad.js         pavé numérique
      order.js          remettre dans l'ordre
      drag.js           glisser-déposer (pointer events)
      letters.js        clavier de lettres
      amount.js         composer un montant avec des pièces et des billets (type « amount », #60)
  games/
    registry.js         îles + liste des jeux : métadonnées + chemin d'import (chargement paresseux)
    demo.js             jeu de démonstration des 5 types de questions (#/jeu/demo)
    <id>.js             un fichier par jeu (logique pure, sans DOM)
  data/                 banques de contenu partagées (mots illustrés, conjugaisons…)
    nombres-en-lettres.js  enLettres(n), enChiffres(mots), morceaux(n) — orthographe rectifiée de 1990
    syllabes.js         découpage en syllabes écrites (convention des manuels : to-ma-te), isTransparent, onsetSound
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
trouver, taille ajustée pour tenir sur une ligne — voir `mathText` dans `ui/dom.js`). Un mot long dans
`show.text` (ou sous l'image d'un choix illustré) rapetisse pour tenir sur sa ligne (`--text-len`, posé par
`content()`), et l'image, le mot et le bouton « écouter » passent à la ligne plutôt que de déborder.
`show.flash: <ms>` (300 à 5000, vérifié par `validateQuestion`) : après un décompte 3, 2, 1, l'illustration n'est visible
que ce temps puis disparaît (sa place est conservée, `aria-hidden`) ; les réponses n'apparaissent qu'ensuite, avec un
bouton « Revoir » qui la remontre à volonté, sans décompte (lecture
éclair, jeux de mémoire visuelle). Géré par `flashControls` dans `screens/play.js` ; sans effet sur le moteur.

**Dessins** : une illustration autre qu'un émoji se demande par `art: { kind, … }`, utilisable dans
`display.show` **et** dans un choix ou un élément à ranger (`{ value, art: { kind: 'clock', hours: 3,
minutes: 30 } }`). Ajouter un genre = un fichier `js/core/ui/art/<kind>.js` exportant `label(spec)`
(nom accessible, **fonction pure**), `draw(spec)` (le SVG) et `check(spec, errors)` facultatif, puis une
ligne dans `js/core/ui/art/index.js`. `validateQuestion` s'en sert : un dessin inconnu ou mal formé fait
échouer les tests du jeu, et deux dessins de même `label` comptent comme deux choix identiques.
Le `label` ne doit jamais donner la réponse : un cadran décrit la position des aiguilles, pas l'heure,
et le matériel de numération décrit les pièces posées, pas le nombre.
Genres existants : `clock` (cadran à aiguilles) et `base-ten` (matériel de numération :
`{ kind: 'base-ten', hundreds, tens, units }`, de 0 à 9 pièces par sorte — plaques de cent,
barres de dix, cubes ; partagé par les jeux de numération et de calcul), `kawaii` et `kawaii-deco`
(personnages et décorations du kit kawaii, voir « Univers kawaii »), et `money` (pièces et billets en euros :
`{ kind: 'money', pieces: [500, 500, 200, 50] }`, valeurs en **centimes** ; tailles et couleurs réelles — 5 € gris,
10 € rouge, 20 € bleu, 50 € orange ; son `label` dit les pièces, jamais la somme ; `money(cents)` écrit « 2 € et 50 c »
avec espaces insécables et `moneySpoken(cents)` donne la version à lire ; couleurs = tokens `--money-*`, identiques en clair et sombre).

**Type `amount`** (`js/core/ui/amount.js`, composer un montant) : l'enfant touche des pièces/billets
(`display: { options: [{ value: 5, art }], suffix: ' €', maxPieces?: 30 }`) et le composant répond par la **somme** posée ;
`answer` est donc le total, et toute composition juste est acceptée. `validateQuestion` vérifie que le total est réalisable
(`core/amount.js`, `fewestPieces(total, valeurs)` : plus petite composition, utile pour l'exemple de l'explication).

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
  `buildQuestions` (tiré au hasard dans une partie) rejette une question déjà posée sur sa `key`
  **et** sur `renderFingerprint(question)` (consigne + `display.show` + choix/éléments/cibles à
  l'écran, sans `speak`/`lang`/`cursive` qui ne se voient pas) : deux questions ne doivent jamais
  s'afficher pareil dans la même partie, même avec des clés et des réponses différentes (issue #92).
  `checkGenerator` (`tests/helpers/game-checks.js`) vérifie cette règle pour chaque jeu du registre.
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
  `STICKERS` (10 gommettes par île, gagnées dans l'ordre, par le coffre surprise) ;
  `applyGameRewards(rewards, { island, stars, points, daily })` → `{ rewards, gained }` (points, grade et `gained.chest`
  = `{ island, stars }` quand la partie donne un coffre ; elle ne remet plus de gommette) ;
  `dailyKey/dailySeed(date)` (date **locale** : le défi change à minuit pour l'enfant) ;
  `totalStars(progress)` et `islandUnlocked/islandStarsLeft(île, étoiles)` pour la carte.
  `rewards-live.js` fait le lien avec le moteur et le profil : `installRewards(app)` une fois au
  démarrage, `rewardEvents.on('points', …)` pour le compteur en direct, `rewardSummary(session)`
  pour l'écran de fin. Un jeu ou un écran ne calcule jamais de points lui-même.
- **Audio** (`audio.js`) : `playSound('tap' | 'success' | 'retry' | 'star' | 'finish')`,
  `speak(texte, { lang })`, `canSpeak()`. En français, les signes de calcul entourés d'espaces sont lus
  avec des mots (`speakableText` : « 15 − 8 = ? » → « 15 moins 8 égale combien ? »). Couper le son coupe les effets ; la voix ne parle que sur un
  appui volontaire sur « écouter » et reste donc disponible. Sans synthèse vocale, pas de bouton « écouter ».
  `hasVoice(lang)` dit si une voix existe pour la langue. **Questions d'anglais à l'écoute** : `lang: 'en-GB'`, `speak` (le texte
  anglais) et `listenLabel` (nom du bouton du haut). Le mot ou la phrase entendus doivent aussi être écrits dans
  `display.show = { text, lang: 'en-GB' }` : une question qui ne se distingue d'une autre que par `speak` (jamais visible à
  l'écran) peut produire deux écrans identiques dans la même partie (issue #92) et devient insoluble sans appuyer sur « écouter ».
  `listenOnly: true` (repli `play.js` : « Pas de voix anglaise sur cet appareil. Lis : … ») reste disponible pour une question
  dont la seule réponse possible est déjà donnée autrement, mais n'est plus utilisé par « Colors and numbers » depuis #92.
  Après une erreur, un bouton « Réécouter en anglais » s'ajoute (la voix française lirait mal le mot). Un mot à lire (et non à
  deviner, avec son propre bouton « écouter ») se met dans `display.show = { text, lang: 'en-GB', speak }`. Un choix dessiné
  peut porter `label` : la correction l'écrit près du dessin.
  Dessin `colored` (`{ kind: 'colored', shape: 'swatch' | 'apple' | 'balloon' | 'star' | 'flower', color, count? }`, 11 couleurs,
  tokens `--swatch-*` identiques en clair et sombre) ; banque `js/data/anglais.js` (couleurs, nombres 1-20 et dizaines, accords français).

Exigences par jeu (critères des issues) : 3 niveaux progressifs, **au moins 30 questions distinctes
par niveau** (générées ou en banque), correction expliquée, jouable au doigt et à la souris,
tests unitaires du générateur (`tests/games/<id>.test.js` : 500 tirages par niveau → question valide,
une seule bonne réponse, réponse présente parmi les choix, pas de choix en double).

## Carte au trésor (#96)

Deux écrans, une seule façon de dessiner :

- **l'archipel** (`#/`) : les cinq îles posées sur la mer, vues de trois quarts. Une île ouverte
  est un lien vers son intérieur ; une île fermée reste visible, plus pâle, avec son seuil d'étoiles.
- **l'intérieur d'une île** (`#/ile/<id>`) : chaque jeu de l'île est un **lieu du décor** (la grotte,
  le moulin, le phare…). **Libre parcours** : le chemin relie les lieux, il ne les numérote pas.

Règles non négociables de ces deux scènes :

- **Une seule image de 200 × 180**, cadrée par la feuille de style (`preserveAspectRatio="slice"` +
  `aspect-ratio`) : paysage sur tablette, portrait sur téléphone. Il n'y a jamais deux dessins à
  tenir à jour. Tout ce qui porte de l'information tient dans la **zone sûre** (`SAFE` de `core/map.js`),
  visible dans les deux cadrages.
- **Le décor EST la zone cliquable** — à l'intérieur d'une île comme sur l'archipel. Un lieu, c'est
  son décor ; une île, c'est son corps. Rien d'opaque n'est dessiné par-dessus : seulement un petit
  **repère d'étoiles**, planté à côté du bâtiment sous la ligne de sol, ou flottant sous la ligne de
  flottaison de l'île (`waterline`) et décalé — jamais devant ce qu'il désigne. Une île fermée y
  montre le cadenas et son seuil. Le nom complet n'apparaît qu'**au survol, au focus clavier et au
  toucher**, dans un panneau unique dessiné en dernier (SVG n'a pas de `z-index`) et partagé par les
  deux scènes (`wireTips`) — jamais plusieurs noms à la fois. Des pancartes opaques, c'était une
  grille de boutons posée sur une image au lieu d'une carte qu'on explore.
- **Les zones cliquables ne se recouvrent jamais.** Les cinq `hit` de `ISLAND_GEOMETRY` et les
  emprises de `placeLayout` sont vérifiées par `tests/map.test.js` : taille ≥ 30 unités (56 px sur
  un écran de 360 px), dans la zone sûre, sans chevauchement. Le décor de mer se pose donc **hors**
  de ces rectangles — on ne met pas un crabe là où le doigt cherche une île.
- **`role="group"` sur les `<svg>` de scène, jamais `role="img"`** : `img` rend les descendants
  présentatifs, et l'on tabule alors sur des liens sans nom.
- **`core/map.js` est pur** : positions des îles, emplacements des lieux, découpe des noms, noms
  accessibles. `placeLayout(n)` garantit que deux zones touchables ne se chevauchent jamais, d'un à
  neuf lieux, qu'elles restent assez grandes pour un doigt (≥ 30 unités, soit 56 px sur un écran de
  360 px) et que le décor comme son repère y tiennent : un 7ᵉ jeu fait passer l'île au palier
  suivant, plus serré, au lieu de casser la composition. `tests/map.test.js` le vérifie ; ne jamais
  déplacer un emplacement « à l'œil » sans relancer ces tests.
- **Chaque île de l'archipel a sa côte et son semis.** `ISLAND_GEOMETRY` donne le galbe du contour
  (`squareness`) et l'ondulation qui y creuse des baies (`wave` — elle ne fait que rentrer, donc une
  île ne déborde jamais de la place qui lui est réservée) ; `ISLAND_TRIM` de `ui/map-scene.js` donne
  son paysage en coordonnées relatives (tropicale, rocheuse, plateau, forêt, campement).
- **La mer est habitée.** `ARCHIPELAGO_SEA` pose bancs de poissons, remous, bouées, récifs, bancs de
  sable, une baleine au loin — et quatre habitants à visage (poisson, crabe, pieuvre, mouette), en
  plus du soleil et de la mascotte. Tout y reste petit et pâle : les cinq îles doivent rester les
  cinq seules grandes formes. Le ciel a trois étages de nuages, le plus haut pâli.
- **Le décor vient de `ui/art/scenery.js`** : chaque objet est déclaré UNE fois dans le `<defs>` de la
  scène et posé par `<use>`. Ajouter un objet = une entrée dans `PROPS` + ses classes dans `css/map.css`
  (un test échoue si une classe n'existe pas, ou si une couleur est écrite en dur). Un lieu déclare en
  plus sa `height`, pour que la scène ramène tous les lieux à la même emprise.
- **Direction artistique « kawaii cosy »** (voir l'issue #96) : contour partout (`--kw-outline`,
  éclairci sur l'ardoise), trois tons par matière (`-light` / teinte / `-deep`) plus un reflet,
  aucune zone vide, un motif plutôt qu'un aplat, du premier plan qui cadre la scène.
  `use()` compense l'échelle pour que l'épaisseur du contour reste la même partout.
- **Jamais une information portée par la seule position** : les deux écrans doublent la scène d'une
  liste HTML (comme `ui/chart.js` double sa courbe d'un tableau), et chaque île comme chaque lieu
  est un lien atteignable au clavier, au nom accessible complet.

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
- **Après toute modification d'un fichier servi fusionnée dans `main` : incrémenter `VERSION` dans `sw.js`**
  (fait par l'orchestrateur au moment de la fusion, pas dans les branches) (le cache
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

## Univers kawaii (E15, #88)

Les éléments kawaii sont des **autocollants posés sur la page Seyès** : formes rondes, gros yeux
brillants, joues roses, liseré clair (`--sticker-rim`, comme les gommettes) et petite ombre portée.
Le cahier reste le décor ; le kawaii l'habite. Démonstration vivante de tout le kit : **`#/kawaii`**.

**Palette** (`tokens.css`, clair + ardoise) : 7 teintes pastel `rose`, `peche`, `citron`, `menthe`,
`ciel`, `lavande`, `creme`. Chacune existe en 3 variables : `--kawaii-<c>` (remplissage),
`--kawaii-<c>-deep` (contour, ombre) et `--kawaii-<c>-ink` (texte posé **sur** la teinte, AA ≥ 4,5:1).
Communes : `--kawaii-ink` (yeux, bouche), `--kawaii-shine`, `--kawaii-blush`, `--kawaii-tongue`,
`--kawaii-shadow`, et `--radius-xl` (32 px) pour les cartes kawaii. Sur l'ardoise, les teintes sont un
ton plus doux mais restent pastel (ce sont des autocollants). `tests/kawaii-tokens.test.js` vérifie
les contrastes dans les deux thèmes.

**Personnages** (`js/core/ui/art/kawaii.js`) — une description, jamais un dessin fait à la main :

```js
import { draw, mascot, companion, play } from '../core/ui/art/kawaii.js';
draw({ body: 'drop', color: 'rose', face: 'joyful', accessory: 'bow' });   // → <svg>
// body      round | drop | block | star | cloud | egg  (formes)  ·  cat | bunny | bear (+ stage 1…3)
// face      happy (content) | joyful (très content) | surprised | cheering (encourageant) | sleepy
// accessory none | bow | hat | flower | sprout | crown | star | glasses   · accent : couleur de l'accessoire
// name (ajouté au nom accessible), crack (œuf fêlé), blink: false, sticker: false, decorative: true
draw(mascot('mots', { face: 'cheering' }));        // MASCOTS : une mascotte par île
draw(companion({ animal: 'bunny', stage: 3 }));   // 0 œuf · 1 œuf qui éclot · 2 bébé · 3 petit · 4 grand
```

- Dans une question : `art: { kind: 'kawaii', … }` ou `{ kind: 'kawaii-deco', shape }` comme tout dessin.
- **Fonctions pures** (testées sous node) : `character(spec, { uid })` → arbre `{ tag, attrs, children }`,
  `toMarkup(arbre)`, `label`, `kawaiiErrors`, `normalize`, `mascot`, `companion`. `draw` = `toNode(character())`.
- **Identifiants SVG** : chaque dessin préfixe ses `id` (filtre, découpe) d'un `uid` unique — autant de
  personnages qu'on veut sur une page. Ne jamais écrire d'`id` en dur dans un dessin du kit.
- Mascottes : Perle (goutte rose, Mots), Cubi (cube bleu ciel à lunettes, Nombres), Étincelle (étoile
  pêche, Mesures), Pépin (boule menthe à pousse, Monde), Nuagette (nuage lavande à fleur, Ailleurs).
- Compagnon : le kit **dessine** les stades ; les seuils appartiennent à `core/companion.js` (#90, pur) :
  profil `companion = { animal, name, hatched, games, stars }` (repris dans `normalizeProfile` ; absent → œuf).
  Œuf fêlé après 2 parties, prêt à éclore après 3 (l'enfant choisit chat ou lapin, UNE fois, et le nom sur `#/compagnon` ;
  l'ourson se débloque à 30 étoiles et s'adopte alors explicitement, `adopt()` — on ne change plus d'animal à volonté, #105),
  puis « petit » à 20 étoiles et « grand » à 60. **Une seule monnaie d'étoiles** (#105) : celles de la carte,
  `totalStars(progress)` = meilleur résultat de chaque niveau ; rejouer un niveau réussi n'en rapporte aucune.
  `companion.stars` n'est qu'un plancher (jamais de recul ; `readCompanion` lit max(plancher, totalStars) ; migration
  v2 → v3 : un compagnon gonflé garde son stade). Les POINTS (grades) ont leur icône `coin`, jamais l'étoile.
  `core/companion-live.js` (abonné à `gameEvents`, après `record`) compte les parties ; `core/ui/companion.js` dessine. Un seul personnage à la fois :
  le compagnon (ou son œuf) remplace la mascotte de l'île dans l'en-tête de partie et en fin de partie.
- **Décorations** (`kawaii-deco.js`, `import { draw as drawDeco }`) : `drawDeco({ shape: 'star' | 'heart' | 'cloud' | 'sparkle', color?, face? })`,
  décoratives (`aria-hidden`) sauf si `label` est donné.
- Ajouter une forme / un accessoire / une expression : une entrée dans `kawaii-parts.js`
  (`SHAPE_GEOMETRY` avec `face`, `top`, `side`, `zz`, `shine` ; `ACCESSORY_PARTS` ; `FACE_PARTS`),
  son nom français dans `*_NAMES`, puis vérifier sur `#/kawaii` en clair et en sombre.

**Animations** (`css/kawaii.css`) : boucles `.kw-bounce` (rebond), `.kw-float` (flottement),
`.kw-wobble` (œuf qui va éclore), `.kw-twinkle` (étincelle) ; mouvements ponctuels rejoués avec
`play(el, 'jump' | 'wiggle' | 'pop')` (saut de joie, encouragement, apparition). Les yeux clignent tout
seuls, décalés d'un personnage à l'autre. Avec « réduire les animations », tout est immobile et rien
ne disparaît. Poser l'animation sur le **conteneur** du dessin (les pieds restent au sol).

**À faire / à éviter**
- ✅ Un personnage accompagne et encourage : il est content, très content, surpris, encourageant ou
  endormi — **jamais triste, fâché ou qui pleure**, même après une erreur (alors : `cheering`).
- ✅ Teintes de la palette uniquement ; texte sur une teinte = son `-ink`. ✅ Un personnage qui porte un
  sens a un nom accessible ; à côté d'un texte qui dit déjà tout, `decorative: true`.
- ✅ Taille ≥ 64 px pour qu'on voie les yeux ; 2 ou 3 personnages par écran au plus, les décorations avec parcimonie.
- ❌ Pas d'animation en boucle à côté d'une consigne à lire (elle distrait) : les boucles sont pour
  l'accueil, la fin de partie, l'album. ❌ Pas d'image externe ni de bibliothèque. ❌ Pas de kawaii
  sur l'espace parents (sobre). ❌ Ne pas déformer un dessin (largeur seule, `height: auto`).

## Coffre surprise (E15, #91)

Une partie réussie (≥ 1 étoile) ne donne plus la gommette directement : elle donne un **coffre** (bois 1 étoile,
argent 2, doré 3) que l'enfant touche à l'écran de fin ; il se secoue, brille, s'ouvre et révèle le contenu.
0 étoile : pas de coffre. Défi du jour : un seul coffre par jour (comme avant pour la gommette).
- **`core/chest.js` (pur)** : `drawChest({ stars, island, ownedStickers, ownedAccessories, rng })` →
  `{ tier, rarity, prize }`. Raretés : gommette de l'île (commune), accessoire du compagnon (peu commun),
  accessoire doré (rare) ; chances par coffre dans `ODDS`. Pas de doublon : une sorte épuisée cède la place
  à une autre, et seul un enfant qui a TOUT reçu retrouve une gommette déjà collée (`duplicate: true`, rien stocké).
  `createRng(seed)` rend le tirage testable (`tests/chest.test.js`, fréquences sur 20 000 tirages).
- **Données** : profil `chest = { accessories, equipped, opened }` (repris dans `normalizeProfile` ; absent → vide).
  Un seul accessoire porté, ou aucun. Les accessoires sont ceux du kit kawaii (`ACCESSORIES`).
- **`core/chest-live.js`** : abonné à `gameEvents` APRÈS `installRewards` (qui dit si la partie donne un coffre) ;
  tire, range gommette ou accessoire dans le profil tout de suite, `chestSummary(session)` pour l'écran.
- **Affichage** : `core/ui/chest.js` (`chestScene`, `chestArt`), `css/chest.css`, `endChest(session)` dans
  `screens/play.js` (réutilisé par `daily.js`). Écran « Mon compagnon » : section « Mes accessoires ».
  Le compagnon porte son accessoire partout (`withAccessory`, lu par `currentCompanion()` et `companionSpec`) ; l'œuf n'en porte pas.
- **Animation** : CSS (secousse, lueur, couvercle qui se lève, contenu qui jaillit). Avec « réduire les animations »,
  le coffre s'ouvre d'un coup et montre son contenu, sans mouvement.

## Tests et vérification

- `npm test` (= `node --test "tests/**/*.test.js"`) doit passer avant chaque commit (aucune dépendance
  à installer). NB : `node --test tests/` échoue avec Node ≥ 22 (un dossier n'est pas accepté).
- Vérifier visuellement dans un navigateur (serveur statique : `python -m http.server 8000` à la racine,
  ou `npx serve`) en largeur tablette ET téléphone, thème clair ET sombre (bouton de thème de la barre
  du haut : automatique → clair → sombre).
- Aucune erreur dans la console.

### Les juges : relecture indépendante avant fusion

`npm test` vérifie ce qu'on a pensé à vérifier. Il ne regarde pas l'écran, ne tabule pas au clavier,
et ne compte pas ce qu'on ne lui a pas demandé de compter. **Tous les défauts graves de ce projet
sont passés au travers des tests** : deux questions identiques à l'écran, le défi du jour monomatière,
des devinettes résolues avec un seul indice, les points et les gommettes effacés par un import, six
liens rendus anonymes par un `role="img"`.

D'où les **juges** : des agents de relecture lancés sur une branche terminée, **avant** la fusion.
Leurs grilles sont dans [`docs/juges/`](docs/juges/README.md) — elles font foi.

| La branche touche… | Juges à lancer |
|---|---|
| un jeu, une banque `js/data/`, un générateur, un texte lu par l'enfant | **pédagogie** |
| un écran, du CSS, un dessin, `js/core/ui/` | **visuel** + **accessibilité** |
| le socle (`engine`, `storage`, `rewards`…) | aucun, mais relecture attentive de l'orchestrateur |

Trois règles, sans lesquelles les juges ne servent à rien :

1. **Un juge mesure, il n'opine pas.** Un verdict sans chiffre ni capture n'est pas un verdict.
   « Le contenu semble adapté » ne vaut rien ; « sur 4 000 tirages, 99,2 % des questions se résolvent
   avec un seul indice » vaut une issue.
2. **Le juge ne reçoit jamais le rapport de l'agent qui a écrit le code.** Un implémenteur justifie
   toujours bien ses choix ; un juge qui lit ces justifications les adopte.
3. **Tout défaut confirmé repart en test**, pas en commentaire — sinon il reviendra.

Un verdict « bloquant » est un **avis, pas un veto** : l'orchestrateur tranche et en répond. S'il
passe outre, il écrit pourquoi dans le commentaire de fusion.

## Git

- Auteur : `scarlaty` uniquement. **Jamais** de ligne `Co-Authored-By: Claude` ni de mention « Generated with Claude ».
- Une branche par issue ou petit groupe d'issues, nommée `feat/<n>-<slug>` (ex. `feat/23-syllabes`),
  messages de commit en français, au présent, référençant l'issue : `Ajoute le pavé numérique (#6)`.
- Fichiers partagés modifiés par presque chaque jeu : `js/games/registry.js` (une entrée) et `sw.js`
  (ajouter le fichier du jeu à `PRECACHE`). **Ne pas incrémenter `VERSION` dans une branche** :
  l'orchestrateur le fait à la fusion (évite des conflits en série).
- Ne jamais pousser directement sur `main` depuis un agent : l'orchestrateur relit et fusionne.

## Conventions de code

- Identifiants en anglais, textes affichés en français, commentaires en français et rares (le « pourquoi »).
- `const` par défaut, fonctions courtes, modules ES (`import`/`export`), pas de variable globale.
- Pas de `innerHTML` avec du contenu saisi par l'utilisateur (prénom) : `textContent`.

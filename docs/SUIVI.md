# Suivi du projet — point d'étape du 07/10/2026

Document de reprise. Le backlog fait foi : issues + jalons du dépôt et le tableau
https://github.com/users/scarlaty/projects/1.

## Organisation

- En ligne : https://scarlaty.github.io/jeux-ce1/ — dépôt : https://github.com/scarlaty/jeux-ce1
- Issue n°N = tâche dans l'ordre du backlog (E0-T1 = #1 … E14-T4 = #85, puis #86). Jalons = epics E0…E14.
- **Contrat d'architecture : [`CLAUDE.md`](../CLAUDE.md)** — commencer par sa section
  **« Règle anti-doublon »** : on réserve une issue (commentaire 🔒 + carte « In Progress » + branche poussée)
  **avant** d'écrire du code, et on pousse après chaque jeu.
- **Qui fait quoi = le tableau GitHub** https://github.com/users/scarlaty/projects/1 et les commentaires 🔒
  des issues. Ce fichier ne fait que résumer ; en cas de désaccord, GitHub a raison.
- Orchestration : Claude (session de scarlaty) relit, teste, fusionne dans `main`, incrémente `VERSION`
  de `sw.js`, ferme les issues. Commits signés `scarlaty` uniquement.
- **Avant chaque fusion : lancer les juges** ([`docs/juges/`](juges/README.md)) — pédagogie sur les
  jeux et les banques, visuel + accessibilité sur l'interface. Ils mesurent au lieu d'opiner, ne
  reçoivent jamais le rapport de l'implémenteur, et tout défaut confirmé repart en test. Rodés sur
  deux cas réels (#101) : ils ont trouvé neuf défauts que la relecture seule avait manqués.

## État au 06/10, 22 h : 8 jeux jouables, 286 tests

| Epic | Issues | État |
|---|---|---|
| E0 socle technique | #1 – #8 | **terminé** (hors ligne compris) |
| E1 profils, historique, espace parents | #9 – #15 | **terminé** |
| E2 récompenses | #16 – #21 | **terminé** |
| E3 lecture | #22 – #25 | **terminés** (#26 compris) ; #86 libre |
| E3 compréhension | #27 – #29 | #27 **terminé** ; #28, #29 libres |
| E4 vocabulaire | #30 – #34 | à faire (libre) |
| E5 grammaire et conjugaison | #35 – #41 | #35 **terminé** (juge : à corriger, raccourcis du niveau 3) ; #36 – #41 libres |
| E6 orthographe | #42 – #46 | à faire (libre) |
| E7 nombres | #47, #50 | **terminés** ; #48, #49, #51 libres |
| E8 calcul | #52, #54 | **terminés** ; #53, #55 – #57 libres |
| E9, E10 mesures et géométrie | #58 – #67 | #58, #60 **terminés** ; #59, #61 – #67 libres |
| E11 – E13 monde, anglais, EMC | #68 – #81 | #76 **terminé** (anglais, repli écrit sans voix anglaise) , #68 **terminé** (besoins du vivant), #80 **terminé** (règles de vie, corrigé après juge) ; reste libre |
| E14 qualité | #82 – #85, #87 | en continu (#87 : bug de débordement dans Les tables) |
| E15 plaisir de jouer | #88 – #91 | #88, #89, #90 **terminés** (kit kawaii, mascottes, compagnon : éclosion après 3 parties, stades à 20 et 60 étoiles)  et #91 coffre surprise : **E15 terminé** |

Jeux disponibles : **Les sons** (#22), **Syllabes en folie** (#23), **Lettres sœurs** (#24), **Les lettres qui changent de son** (#25), **Calcul mental** (#52), **Centaines, dizaines, unités** (#47),
**Écrire les nombres** (#50), **Les tables** (#54), **Lecture éclair** (#26), **Devinettes** (#27), **Lire l'heure** (#58), **La tirelire** (#60), **Colors and numbers** (#76), **Besoins du vivant** (#68).

Socle ajouté le 07/10 : dessin `money` (pièces agrandies x1,7 pour rester lisibles), type de question `amount` (composer une somme).

Socle : `display.show.flash` (ms) affiche l'illustration brièvement puis propose « Revoir » (#26). Bonus de rapidité non fait : le moteur ne mesure pas le temps par question.

### En cours (07/10) — 2 agents au plus, une issue chacun

| Qui | Issue | Branche |
|---|---|---|
| Claude (session scarlaty) | #97 + #106 Devinettes (niveau trop faible, « un ail », émojis) | `feat/97-106-devinettes` |

#105 **terminé** (v27) : points = jeton, étoiles = meilleur résultat, compagnon sur les étoiles de la carte, ourson débloqué à 30 étoiles. #87 **terminé** (v28) : `.stage` en `minmax(0, 1fr)`.

| Claude (session scarlaty) | #102 + #103 contraste et carte | `feat/102-103-carte-contraste` |
**Règle du 07/10 : aucun nouveau ticket (jeu ou amélioration) sans l'accord de l'utilisateur.**
Règle « Mixité » (CLAUDE.md) : textes épicènes, personnages variés — le jeu est pour filles et garçons.

⚠️ 06/10 soir : quota de tokens de Claude presque épuisé. Les 2 agents ont reçu l'ordre de pousser leur état et de commenter « ⏸️ Interrompu : fait X, reste Y » sur leur issue s'ils ne finissent pas. **Avant de reprendre #89 ou #26, lire le dernier commentaire de l'issue et partir de la branche poussée.**

Règle d'orchestration : Claude lance **au plus 2 agents à la fois, une issue chacun**, pour pouvoir toujours le terminer
dans son quota (une réservation laissée en plan bloquerait le projet). Les autres réservations du 06/10 ont été
annulées (commentaire 🔓 sur chaque issue) : **tout le reste est libre**, à réserver avant de commencer.

### Ce qui s'est passé le 06/10 (pour comprendre l'historique)

- 15 h – 16 h : socle, polices locales, Calcul mental fusionnés (session 1).
- La session 1 a été coupée par une limite d'utilisation pendant que 3 agents travaillaient sur E1, E2 et
  « Les sons ». Un autre développeur a repris en parallèle et a **refait ces mêmes issues** (version
  relue et vérifiée, celle de `main`), plus le hors ligne (#8) et 3 jeux de maths.
- Les branches `feat/e1-profil`, `feat/e2-recompenses`, `feat/jeu-sons` (travail non relu de la session 1)
  et `feat/e0-socle`, `feat/jeu-calcul-mental` (déjà fusionnées) sont **obsolètes : ne jamais les fusionner**.
  Elles sont archivées sous les étiquettes `archive/<nom>` (rien n'est perdu) ; leur suppression sur GitHub
  est à faire par scarlaty (bloquée pour l'agent). Seule idée à récupérer : de nouvelles
  formes de questions pour « Les sons », désormais suivies dans l'issue **#86**.

### Décisions de l'utilisateur

- Polices hébergées dans `fonts/` ; « son coupé » = bruitages seulement, la voix reste sur demande.
- Calcul mental : la moitié s'affiche « la moitié de 46 = ? » (fait le 06/10, `VERSION` v4).
- Univers kawaii validé (mascottes Perle, Cubi, Étincelle, Pépin, Nuagette ; compagnon œuf → grand).

## Ce que le socle offre maintenant (à réutiliser, pas à réécrire)

- **Dessins SVG** (`js/core/ui/art/`) : un jeu demande `art: { kind, … }` dans `display.show` ou dans
  un choix ; le socle dessine et `validateQuestion` refuse un dessin inconnu ou mal formé.
  Genres existants : `clock` (cadran à aiguilles) et `base-ten` (plaques, barres, cubes).
  `clock.js` est utilisé par « Lire l'heure » (#58) ; les cadrans en choix ont leur mise en page (`.choices:has(.clock__face)`).
  Règle : `label(spec)` ne donne jamais la réponse (le cadran décrit la position des aiguilles).
- **Banques de contenu** (`js/data/`) :
  - `mots-illustres.js` — 133 mots, émoji, et la liste **exhaustive** des sons complexes de chacun.
    Base des jeux de français du lot 2 (syllabes, lettres sœurs, lecture éclair…).
  - `nombres-en-lettres.js` — `enLettres(n)` / `enChiffres(mots)` / `morceaux(n)` jusqu'à 9999,
    orthographe rectifiée de 1990. Base de la tirelire (#60), des mesures, de la droite graduée (#49).
- **Récompenses** : s'abonner à `gameEvents`, ne jamais modifier `engine.js`. `rewards.js` est pur.
- **Espace parents** : `stats.js` (agrégats), `chart.js` (courbe SVG + tableau), `backup.js` (export/import).

## Pièges vérifiés — à ne pas réintroduire

1. **`sw.js` / `PRECACHE`** : `tests/offline.test.js` exige que la liste corresponde **exactement** aux
   fichiers servis. Tout fichier CSS/JS ajouté doit y figurer. **Incrémenter `VERSION`** après toute
   modification d'un fichier servi (actuellement `v28`), sinon les tablettes installées gardent l'ancienne version.
2. **Champ ajouté au profil** : il doit être repris **explicitement** dans `normalizeProfile`
   (`js/core/backup.js`), sinon il est remis à zéro à l'import d'une sauvegarde. C'est arrivé avec
   `rewards` : les points et les gommettes étaient effacés. Un test d'aller-retour compare désormais
   tous les champs — il échouera au prochain oubli.
3. **Ambiguïté phonétique** : un intrus ne doit contenir ni le son visé ni un son qui s'entend pareil.
   « lion », « chien », « yeux » portent le code `yod` pour cette raison (même [j] que « fille »).
4. **Émojis** : un émoji n'est utilisable comme image que si une enfant de 7 ans le nomme sans hésiter.
   🌬️ « vent », ⚖️ « balance », 💐 « bouquet » ont été retirés après vérification à l'écran.
5. **Service worker** : le précache télécharge avec `cache: 'reload'`. Sans cela, une nouvelle version
   reprenait d'anciens fichiers du cache HTTP (10 min sur GitHub Pages) et mélangeait deux versions (07/10, v10).
6. **Fichier importé = donnée non fiable** : les clés `__proto__` / `constructor` sont ignorées.

## Points laissés en suspens (décisions à trancher)

- **Seuils d'ouverture des îles** (`rewards.js`) : étoiles cumulées sur TOUS les jeux (Mesures 3, Monde 9,
  Ailleurs 15) : atteignables avec les jeux existants. À valider avec l'utilisatrice.
- **Textes très longs dans `display.show`** : `white-space: nowrap` fait déborder « quatre-vingt-dix-sept »
  en 360 px. Contourné dans « Écrire les nombres » en portant le mot dans la consigne. Une vraie solution
  demanderait un ajustement de taille dans le socle, sur le modèle de `--math-em` (voir `mathText`).
- **Titre « Centaines, dizaines, unités »** tronqué dans la barre du haut sur téléphone. Un titre plus
  court se change en une ligne dans `js/games/cdu.js` + `registry.js`.
- **Rejouer rapporte des points à chaque fois** : aucun garde-fou anti-répétition. Volontaire, à valider.
- **Suppression d'un profil** possible depuis l'écran enfant « Qui joue ? » (avec confirmation) :
  à réserver à l'espace parents si on préfère.

## Prochaines étapes

1. E15 « Plaisir de jouer » terminé le 07/10 (kawaii, mascottes, compagnon, coffre). Idée : ajouter des accessoires rares (seulement 2 aujourd'hui).
2. Faire tester par l'enfant les jeux déjà en ligne, et remonter ses retours dans des issues.
3. Vague suivante, une fois ces 4 agents terminés : compréhension #27 – #29, orthographe #42 – #46,
   calcul #55 – #57, puis E9/E10 (#58 démarre sur `art/clock.js`), puis E11 – E13.
4. E14 en continu : relecture du contenu (#82), banques suffisantes (#83), tests tablette (#84),
   accessibilité (#85).

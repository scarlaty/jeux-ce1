# Suivi du projet — point d'étape du 06/10/2026, 20 h 50

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

## État au 06/10, 20 h 50 : 5 jeux jouables, 227 tests

| Epic | Issues | État |
|---|---|---|
| E0 socle technique | #1 – #8 | **terminé** (hors ligne compris) |
| E1 profils, historique, espace parents | #9 – #15 | **terminé** |
| E2 récompenses | #16 – #21 | **terminé** |
| E3 lecture | #22 | **terminé** — #23 – #26 et #86 🔒 en cours |
| E3 compréhension | #27 – #29 | à faire (libre) |
| E4 vocabulaire | #30 – #34 | 🔒 en cours |
| E5 grammaire et conjugaison | #35 – #41 | 🔒 en cours |
| E6 orthographe | #42 – #46 | à faire (libre) |
| E7 nombres | #47, #50 | **terminés** — #48, #49, #51 🔒 en cours |
| E8 calcul | #52, #54 | **terminés** — #53 🔒 en cours ; #55, #56, #57 libres |
| E9, E10 mesures et géométrie | #58 – #67 | à faire (libre) |
| E11 – E13 monde, anglais, EMC | #68 – #81 | à faire (libre) |
| E14 qualité | #82 – #85 | en continu |

Jeux disponibles : **Les sons** (#22), **Calcul mental** (#52), **Centaines, dizaines, unités** (#47),
**Écrire les nombres** (#50), **Les tables** (#54).

### En cours — 4 agents lancés le 06/10 à 20 h 50 (une branche par jeu, depuis `main`)

| Agent | Issues réservées | Branches |
|---|---|---|
| Lecture | #23, #24, #25, #26, #86 | `feat/23-syllabes`, `feat/24-lettres-soeurs`, `feat/25-lettres-qui-changent`, `feat/26-lecture-eclair`, `feat/86-sons-formes` |
| Vocabulaire | #30 – #34 | `feat/30-contraires`, `feat/31-synonymes`, `feat/32-familles-mots`, `feat/33-ordre-alphabetique`, `feat/34-categories` |
| Grammaire et conjugaison | #35 – #41 | `feat/35-phrase` … `feat/41-passe-compose` |
| Nombres | #48, #49, #51, #53 | `feat/48-comparer`, `feat/49-droite-graduee`, `feat/51-fractions`, `feat/53-doubles-moities` |

**Libres pour un autre développeur** (réserver d'abord !) : #27 – #29, #42 – #46, #55 – #57, #58 – #81.

### Ce qui s'est passé le 06/10 (pour comprendre l'historique)

- 15 h – 16 h : socle, polices locales, Calcul mental fusionnés (session 1).
- La session 1 a été coupée par une limite d'utilisation pendant que 3 agents travaillaient sur E1, E2 et
  « Les sons ». Un autre développeur a repris en parallèle et a **refait ces mêmes issues** (version
  relue et vérifiée, celle de `main`), plus le hors ligne (#8) et 3 jeux de maths.
- Les branches distantes `feat/e1-profil`, `feat/e2-recompenses`, `feat/jeu-sons` (travail non relu de la
  session 1) et `feat/e0-socle`, `feat/jeu-calcul-mental` (déjà fusionnées) sont **obsolètes : ne jamais
  les fusionner**. Leur suppression attend l'accord de scarlaty. Seule idée à récupérer : de nouvelles
  formes de questions pour « Les sons », désormais suivies dans l'issue **#86**.

### Décisions de l'utilisateur

- Polices hébergées dans `fonts/` ; « son coupé » = bruitages seulement, la voix reste sur demande.
- Calcul mental : la moitié s'affiche « la moitié de 46 = ? » (fait le 06/10, `VERSION` v4).

## Ce que le socle offre maintenant (à réutiliser, pas à réécrire)

- **Dessins SVG** (`js/core/ui/art/`) : un jeu demande `art: { kind, … }` dans `display.show` ou dans
  un choix ; le socle dessine et `validateQuestion` refuse un dessin inconnu ou mal formé.
  Genres existants : `clock` (cadran à aiguilles) et `base-ten` (plaques, barres, cubes).
  **`js/core/ui/art/clock.js` est prêt et inutilisé : le jeu « Lire l'heure » (#58) peut partir dessus.**
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
   modification d'un fichier servi (actuellement `v3`), sinon les tablettes installées gardent l'ancienne version.
2. **Champ ajouté au profil** : il doit être repris **explicitement** dans `normalizeProfile`
   (`js/core/backup.js`), sinon il est remis à zéro à l'import d'une sauvegarde. C'est arrivé avec
   `rewards` : les points et les gommettes étaient effacés. Un test d'aller-retour compare désormais
   tous les champs — il échouera au prochain oubli.
3. **Ambiguïté phonétique** : un intrus ne doit contenir ni le son visé ni un son qui s'entend pareil.
   « lion », « chien », « yeux » portent le code `yod` pour cette raison (même [j] que « fille »).
4. **Émojis** : un émoji n'est utilisable comme image que si une enfant de 7 ans le nomme sans hésiter.
   🌬️ « vent », ⚖️ « balance », 💐 « bouquet » ont été retirés après vérification à l'écran.
5. **Fichier importé = donnée non fiable** : les clés `__proto__` / `constructor` sont ignorées.

## Points laissés en suspens (décisions à trancher)

- **Seuils d'ouverture des îles** (`rewards.js`) : « L'île d'Ailleurs » demande 15 étoiles, inatteignable
  tant que les jeux correspondants n'existent pas. À relire quand le lot 4 arrivera.
- **Textes très longs dans `display.show`** : `white-space: nowrap` fait déborder « quatre-vingt-dix-sept »
  en 360 px. Contourné dans « Écrire les nombres » en portant le mot dans la consigne. Une vraie solution
  demanderait un ajustement de taille dans le socle, sur le modèle de `--math-em` (voir `mathText`).
- **Titre « Centaines, dizaines, unités »** tronqué dans la barre du haut sur téléphone. Un titre plus
  court se change en une ligne dans `js/games/cdu.js` + `registry.js`.
- **Rejouer rapporte des points à chaque fois** : aucun garde-fou anti-répétition. Volontaire, à valider.
- **Suppression d'un profil** possible depuis l'écran enfant « Qui joue ? » (avec confirmation) :
  à réserver à l'espace parents si on préfère.

## Prochaines étapes

1. Relire et fusionner les jeux des 4 agents au fil de l'eau (un jeu = une branche = une fusion).
2. Faire tester par l'enfant les jeux déjà en ligne, et remonter ses retours dans des issues.
3. Vague suivante, une fois ces 4 agents terminés : compréhension #27 – #29, orthographe #42 – #46,
   calcul #55 – #57, puis E9/E10 (#58 démarre sur `art/clock.js`), puis E11 – E13.
4. E14 en continu : relecture du contenu (#82), banques suffisantes (#83), tests tablette (#84),
   accessibilité (#85).

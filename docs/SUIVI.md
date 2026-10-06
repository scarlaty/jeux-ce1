# Suivi du projet — point d'étape du 06/10/2026 (soir)

Document de reprise. Le backlog fait foi : issues + jalons du dépôt et le tableau
https://github.com/users/scarlaty/projects/1.

## Organisation

- En ligne : https://scarlaty.github.io/jeux-ce1/ — dépôt : https://github.com/scarlaty/jeux-ce1
- Issue n°N = tâche dans l'ordre du backlog (E0-T1 = #1 … E14-T4 = #85). Jalons = epics E0…E14.
- **Contrat d'architecture : [`CLAUDE.md`](../CLAUDE.md), à lire avant tout développement.**
- Méthode : un agent (ou un développeur) par lot, sur une branche `feat/*` dans un worktree isolé ;
  l'orchestrateur relit, lance `npm test`, vérifie dans le navigateur, fusionne dans `main`,
  ferme les issues. Commits signés `scarlaty` uniquement.

## État : 5 jeux jouables, 227 tests

Tout le **lot 1** est terminé et fusionné, plus trois jeux de maths du lot 3.

| Epic | Issues | État |
|---|---|---|
| E0 socle technique | #1 – #8 | **terminé** (hors ligne compris) |
| E1 profils, historique, espace parents | #9 – #15 | **terminé** |
| E2 récompenses | #16 – #21 | **terminé** |
| E3 Les sons | #22 | **terminé** |
| E7 numération | #47, #50 | **terminés** ; reste #48, #49, #51 |
| E8 calcul | #52, #54 | **terminés** ; reste #53, #55, #56, #57 |
| E3–E6 reste du français | #23 – #46 | à faire (lot 2) |
| E9, E10 mesures et géométrie | #58 – #67 | à faire |
| E11–E13 monde, anglais, EMC | #68 – #81 | à faire |
| E14 qualité | #82 – #85 | en continu |

Jeux disponibles : **Les sons** (#22), **Calcul mental** (#52), **Centaines, dizaines, unités** (#47),
**Écrire les nombres** (#50), **Les tables** (#54).

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

## Prochaines étapes conseillées

1. **Faire tester par l'enfant** le lot 1 complet avant d'ajouter des jeux : c'est le seul retour qui compte.
2. Lot 2 — français (#23 – #46), en s'appuyant sur `js/data/mots-illustres.js`.
3. Finir le lot 3 — maths : #48, #49, #51, #53, #55, #56, #57, puis E9/E10 (#58 démarre sur `art/clock.js`).
4. E14 en continu : relecture du contenu (#82), banques suffisantes (#83), tests tablette (#84),
   accessibilité (#85).

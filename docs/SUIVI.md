# Suivi du projet — point d'étape du 06/10/2026

Document de reprise pour l'orchestrateur (humain ou Claude). Le backlog fait foi : issues + jalons du dépôt
et tableau https://github.com/users/scarlaty/projects/1 (colonnes Todo / In Progress / Done).

## Organisation
- Dépôt local : `C:\repo\jeux-ce1` ; en ligne : https://scarlaty.github.io/jeux-ce1/
- Issue n°N = tâche dans l'ordre du backlog (E0-T1 = #1 … E14-T4 = #85). Jalons = epics E0…E14.
- Contrat d'architecture : `CLAUDE.md` (à lire avant tout développement).
- Méthode : un agent par lot de tâches, sur une branche `feat/*` (worktree isolé) ; l'orchestrateur relit,
  lance `npm test`, vérifie dans le navigateur, fusionne dans `main` (`--no-ff`), ferme les issues et met
  le tableau à jour. Commits signés scarlaty uniquement, jamais de mention de Claude.

## Fait (sur main)
- E0 socle technique : #1–#7 (moteur, 5 types de questions, sons/voix, charte Seyès/ardoise) — fermées.
- E1-T3 stockage local versionné : #11 — fermée.
- Polices hébergées dans `fonts/` (plus aucune requête vers Google) (décision validée).
- Décision validée : « son coupé » coupe les bruitages, pas la voix (lue seulement sur demande).

## En cours (lancé le 06/10, statut « In Progress » sur le tableau)
| Branche attendue | Issues | Contenu |
|---|---|---|
| `feat/e1-profil` | #9, #10, #12–#15 | bienvenue (prénom, avatar), profils, historique, courbes, export/import, espace parents |
| `feat/e2-recompenses` | #16–#21 | points, grades, gommettes/album, carte des îles (nouvel accueil), défi du jour, tampons |
| `feat/jeu-sons` | #22 | jeu Les sons + banque partagée `js/data/mots-illustres.js` |
| ~~`feat/jeu-calcul-mental`~~ | #52 | FUSIONNÉ le 06/10 (62 tests OK) |

Vérifier sur GitHub si ces branches ont été poussées (`git fetch && git branch -r`). Si une branche manque
ou est incomplète, relancer un agent sur les issues correspondantes avec le même cahier des charges.

## Points d'attention à la fusion
- Ces branches partent d'avant le commit des polices locales : en cas de conflit dans `index.html`,
  garder `<link rel="stylesheet" href="css/fonts.css">` + le preload, et supprimer tout lien Google Fonts.
- Fichiers partagés susceptibles de conflit : `index.html` (liens CSS dédiés `css/profile.css`,
  `css/rewards.css`), `js/games/registry.js`, `js/screens/index.js`, `CLAUDE.md`.
- E2 remplace l'accueil `#/` par la carte des îles ; E1 ajoute la pastille profil dans la barre du haut.
- Après fusion des 4 branches : tester le parcours complet (premier lancement → partie → récompenses →
  album → espace parents → export/import), tablette et téléphone, clair et sombre.

## Prochaines étapes
1. Fusionner les 4 branches du lot 1 (ordre conseillé : jeux, puis E1, puis E2), fermer les issues.
2. E0-T8 hors ligne (#8) : manifest + service worker (inclure `fonts/`).
3. Faire tester le lot 1 par l'enfant, recueillir les retours avant le lot 2.
4. Lot 2 (français, E3–E6), lot 3 (maths, E7–E10), lot 4 (monde, anglais, EMC, E11–E13) ; E14 en continu.

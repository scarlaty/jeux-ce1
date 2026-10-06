# Jeux CE1

Mini-jeux pour réviser le programme de CE1 en s'amusant : français, mathématiques, Questionner le monde, anglais et EMC.

**Jouer :** https://scarlaty.github.io/jeux-ce1/

- Fonctionne sur tablette (tactile) et sur ordinateur (souris), et **hors ligne** une fois la page ouverte une fois.
- La progression (prénom, scores, historique) reste dans le navigateur de l'appareil : rien n'est envoyé sur Internet.
- Une sauvegarde peut être exportée pour changer d'appareil.

Le suivi du projet se fait dans les [issues](https://github.com/scarlaty/jeux-ce1/issues) et les [jalons](https://github.com/scarlaty/jeux-ce1/milestones).

## Développer

Aucune étape de build, aucune dépendance à installer : le dépôt est servi tel quel.

```sh
git clone https://github.com/scarlaty/jeux-ce1.git
cd jeux-ce1
npm test                  # node --test "tests/**/*.test.js"
python -m http.server 8000     # puis http://localhost:8000/  (ou npx serve)
```

`npm test` doit passer avant chaque commit. Node 20 ou plus récent.
Ouvrir le site par un serveur (pas en `file://`) : les modules ES et le service worker l'exigent.

**Avant toute contribution, lire [`CLAUDE.md`](CLAUDE.md)** : c'est le contrat d'architecture
(principes non négociables, contrat d'un jeu, API du socle, règles de design et d'accessibilité).
[`docs/SUIVI.md`](docs/SUIVI.md) donne l'état d'avancement et par où reprendre.

### Ajouter un jeu en deux fichiers

1. `js/games/<id>.js` — logique pure, sans DOM : 3 niveaux et un `makeQuestion(level, rng, seen)`.
2. `tests/games/<id>.test.js` — `checkGameShape` + `checkGenerator` (500 tirages par niveau).

Puis une ligne dans `js/games/registry.js` et une dans la liste `PRECACHE` de `sw.js`.
Le détail du contrat et des types de questions est dans `CLAUDE.md`.

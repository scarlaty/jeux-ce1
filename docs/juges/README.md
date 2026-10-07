# Les juges — relecture indépendante avant fusion

Un **juge** est un agent de relecture lancé sur une branche terminée, avant la fusion dans `main`.
Il ne code pas. Il mesure, et il rend un verdict argumenté.

Ces grilles sont nées des défauts réellement trouvés sur ce projet. Elles ne sont pas théoriques :
chaque critère vient d'un bug qui est passé au travers des tests.

## Les deux règles qui font tout

### 1. Un juge mesure, il n'opine pas

Regarde comment les vrais défauts de ce projet ont été trouvés :

| Défaut | Trouvé comment |
|---|---|
| Deux questions identiques à l'écran (#92) | en **comptant** les doublons sur 300 parties |
| Défi du jour monomatière (#94) | en **mesurant** la répartition sur 2000 défis |
| Devinettes trop faciles (#97) | en **mesurant** : 100 % résolues avec un seul indice |
| Points et gommettes effacés à l'import | en **exécutant** un aller-retour export/import |
| Pancartes masquant le décor (#96) | en **regardant** une capture d'écran |
| `role="img"` rendant les liens anonymes | en **tabulant** au clavier |

Aucun n'a été trouvé en demandant « est-ce que c'est bien ? ».

**Un verdict sans chiffre ni capture n'est pas un verdict.** « Le contenu semble adapté » ne vaut rien.
« Sur 500 tirages du niveau 1, 100 % des questions se résolvent avec un seul indice » vaut une issue.

### 2. Tout défaut confirmé repart en test, jamais en commentaire

Un défaut signalé seulement par écrit reviendra. Un défaut transformé en test ne revient pas.

C'est ainsi que sont nés le dédoublonnage sur le rendu, le test « chaque champ du profil survit à
l'import » et le test de répartition par matière : chacun vient d'un défaut trouvé une fois.

Un juge qui ne laisse pas de test derrière lui fait du bruit.

## Ce que le juge ne voit pas

**Le juge ne reçoit jamais le rapport de l'agent qui a écrit le code.** Il reçoit la branche, la grille,
et l'issue d'origine. Rien d'autre.

Un implémenteur justifie toujours bien ses choix ; un juge qui lit ces justifications les adopte.
L'indépendance n'est pas une politesse, c'est la condition pour que le juge serve à quelque chose.

## Quand lancer quel juge

Les juges coûtent cher (plusieurs centaines de milliers de jetons chacun). On ne les lance pas tous,
tout le temps — on les déclenche selon ce que la branche touche.

| La branche touche… | Juges à lancer |
|---|---|
| un jeu, une banque de `js/data/`, un générateur | **pédagogie** |
| un écran, du CSS, un dessin, `js/core/ui/` | **visuel** + **accessibilité** |
| le socle (`engine`, `storage`, `rewards`…) | aucun juge, mais relecture attentive de l'orchestrateur |
| du contenu affiché à l'enfant, quel qu'il soit | **pédagogie** (ne serait-ce que pour l'orthographe) |

Les juges tournent **en parallèle** : ils sont indépendants les uns des autres.

## Verdict

Chaque juge rend :

- **Bloquant** — un défaut qui atteindrait l'enfant. Pas de fusion avant correction.
- **À corriger** — réel mais non bloquant. Fusion possible, issue créée dans la foulée.
- **Observation** — ni l'un ni l'autre. Reste dans le rapport, ne crée rien.

Chaque point porte **la mesure qui l'établit** et, s'il est bloquant ou à corriger, **le test à écrire**.

Un juge qui ne trouve rien doit le dire, en précisant ce qu'il a mesuré. « Rien à signaler » sans
mesure se lit comme « je n'ai pas cherché ».

## Les grilles

- [Pédagogie](pedagogie.md) — le contenu est-il juste, non ambigu, et au niveau du CE1 ?
- [Visuel](visuel.md) — le rendu tient-il la direction artistique, sur tous les écrans et les deux thèmes ?
- [Accessibilité](accessibilite.md) — l'appli reste-t-elle utilisable au clavier, sans son, sans couleur ?

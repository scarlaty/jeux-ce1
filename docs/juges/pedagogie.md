# Juge pédagogie

**Déclenché par** : toute branche touchant un jeu (`js/games/`), une banque de contenu (`js/data/`),
ou un texte lu par l'enfant.

**Question posée** : le contenu est-il **juste**, **non ambigu**, et **au niveau d'un CE1** ?

Tu ne lis pas seulement le code : tu **fais tourner le générateur** et tu comptes.

---

## 1. Une seule bonne réponse — vraiment

Sur 500 tirages par niveau :

- [ ] exactement un choix satisfait l'énoncé ;
- [ ] aucun distracteur ne peut se défendre. *Attention aux cas où le distracteur est « presque »
      juste* : « lion » et « chien » contiennent le son [j] comme « fille » — c'était le bug #22 ;
- [ ] deux choix ne s'affichent jamais pareil (texte, émoji, **et nom accessible du dessin**) ;
- [ ] la réponse figure bien parmi les choix.

**Mesure à produire** : nombre de questions à réponse multiple, sur combien de tirages.

## 2. Chaque indice est nécessaire

C'est le critère qui a fait tomber les devinettes (#97) : **100 % des questions de niveau 1 se
résolvaient avec un seul indice**, les autres étaient décoratifs.

- [ ] retirer n'importe quel indice rend la réponse ambiguë parmi les choix proposés ;
- [ ] les distracteurs partagent **tous les indices sauf un** — un château n'est pas un leurre pour
      un fruit à pépins ;
- [ ] aucune question ne se résout en regardant un seul mot de l'énoncé.

**Mesure à produire** : part des questions résolubles avec un sous-ensemble strict des indices.

## 3. La difficulté est réelle et progressive

- [ ] le niveau 1 n'est pas trivial pour un enfant qui sait lire ;
- [ ] le niveau 3 demande de réfléchir — *un adulte doit s'arrêter une seconde* ;
- [ ] les trois niveaux se distinguent par la **difficulté**, pas seulement par le nombre de choix ;
- [ ] au moins 30 questions distinctes par niveau (critère des issues), mesurées, pas supposées.

**Mesure à produire** : nombre de clés distinctes par niveau ; description de ce qui distingue
réellement les niveaux.

## 4. L'explication apprend quelque chose

Règle de bienveillance du projet : jamais de message négatif, toujours une aide.

- [ ] l'explication donne une **stratégie refaisable de tête** ou une astuce mémorisable ;
- [ ] elle ne se contente **jamais** de répéter la bonne réponse ;
- [ ] elle tient en une ou deux phrases courtes.

Bon : « 4 × 3, c'est le double du double : 3 + 3 = 6, puis 6 + 6 = 12. »
Mauvais : « La bonne réponse était 12. »

**Mesure à produire** : échantillon de 10 explications tirées au hasard, recopiées telles quelles.

## 5. La langue est irréprochable

- [ ] orthographe et accords justes, **orthographe rectifiée de 1990** pour les nombres
      (« deux-cent-trente ») ;
- [ ] vocabulaire d'un enfant de 7 ans, phrases courtes, consignes à l'impératif ;
- [ ] **aucune orthographe fautive montrée comme choix possible** — on ne fait pas lire une faute ;
- [ ] les textes lus par la voix se prononcent correctement (pas de crochets, pas de noms de lettres).

## 6. Les images ne mentent pas

- [ ] un émoji n'est utilisé comme image que si une enfant de 7 ans le nomme **sans hésiter**.
      Déjà écartés après vérification à l'écran : 🌬️ « vent », ⚖️ « balance », 💐 « bouquet »,
      et 🐔 lu « coq » autant que « poule » (#93) ;
- [ ] le **nom accessible d'un dessin ne donne jamais la réponse** : un cadran décrit la position des
      aiguilles, pas l'heure ; le matériel de numération décrit les pièces, pas le nombre ;
- [ ] deux images distinctes ne portent pas le même nom accessible.

## 7. Les mathématiques sont exactes

Pour tout jeu de maths : **ré-évaluer indépendamment** chaque égalité écrite dans une consigne ou une
explication. Un générateur faux est le pire défaut possible.

**Mesure à produire** : nombre d'égalités vérifiées, nombre d'erreurs.

---

## Ce que tu rends

Pour chaque point : **la mesure**, puis le verdict.

- **Bloquant** : une question à deux bonnes réponses, un calcul faux, une faute d'orthographe
  montrée à l'enfant, une image qui ment.
- **À corriger** : difficulté trop faible, explications qui répètent la réponse, banque trop courte.
- **Observation** : choix discutable mais défendable.

Pour chaque point bloquant ou à corriger : **le test à écrire** pour qu'il ne revienne pas.
Les helpers existent déjà (`tests/helpers/game-checks.js`) — dis lequel étendre.

# Juge accessibilité

**Déclenché par** : toute branche touchant un écran, un composant d'affichage ou un dessin.

**Question posée** : l'appli reste-t-elle utilisable **au clavier**, **sans le son**, **sans la
couleur**, et **sans voir l'écran** ?

Ce n'est pas une case à cocher : c'est une enfant de 7 ans sur une tablette dont le son est coupé,
ou un parent qui navigue au clavier.

---

## 1. Le clavier, pour de vrai

**Tabule réellement dans la page.** Ne lis pas le code pour en déduire l'ordre.

- [ ] tout ce qui est cliquable est atteignable au clavier ;
- [ ] l'ordre de tabulation suit la lecture ;
- [ ] le **focus est visible** sur chaque élément, y compris dans les SVG ;
- [ ] aucun piège : on peut toujours repartir ;
- [ ] après une navigation, le focus atterrit à un endroit sensé — et au retour, **sur l'élément
      qu'on venait de quitter**, pas en haut de page.

**Piège déjà rencontré sur ce projet** : une scène SVG en `role="img"` rend **tous ses descendants
présentatifs**. On tabulait sur six liens **sans nom**. Les scènes contenant des liens doivent être
en `role="group"`.

**Mesure à produire** : la liste des éléments atteints par Tab, dans l'ordre, avec leur nom accessible.

## 2. Les noms accessibles disent tout

- [ ] chaque lien et chaque bouton a un nom **complet et autonome** : « Les sons, la grotte des échos,
      3 étoiles sur 9 », pas « Les sons » ;
- [ ] les images de contenu (émojis, dessins) portent un nom ; les images décoratives sont
      `aria-hidden` ;
- [ ] **le nom accessible d'un dessin ne donne jamais la réponse** à la question posée ;
- [ ] les textes en anglais portent `lang="en-GB"` pour que la synthèse les prononce correctement.

## 3. L'information n'est jamais portée par un seul canal

C'est le critère qui a fait tomber #92 : deux questions **identiques à l'écran** ne se distinguaient
que par la voix. Sans appuyer sur « écouter », la question était **insoluble**.

- [ ] **sans le son**, toute question reste solvable — le mot prononcé est aussi écrit ;
- [ ] **sans la couleur**, l'information passe : ✓ et ✗ en plus du vert et du rouge ;
- [ ] **sans la position**, l'information passe : une carte, un graphique ou une scène est doublé
      d'une liste ou d'un tableau (`ui/chart.js` double déjà sa courbe) ;
- [ ] sans synthèse vocale installée, rien ne casse et aucun bouton ne ment.

**Mesure à produire** : coupe le son et joue cinq questions. Lesquelles restent solvables ?

## 4. Les cibles et le geste

- [ ] cibles tactiles **≥ 56 px mesurées à l'écran** (exception documentée : clavier de lettres
      sous 520 px, 56 × ~50 px) ;
- [ ] aucune zone cliquable ne recouvre une autre ;
- [ ] rien ne dépend du survol : tout ce qu'on peut survoler est atteignable au focus **et** au toucher ;
- [ ] le glisser-déposer a une alternative (toucher-toucher) ;
- [ ] pas d'action déclenchée au seul passage de la souris.

## 5. Contrastes

- [ ] texte et éléments d'interface au niveau AA, **dans les deux thèmes** ;
- [ ] l'anneau de focus est visible sur tous les fonds, y compris sur un dessin coloré ;
- [ ] mesure les paires les plus risquées : texte clair sur pastel, étiquette sur décor.

**Mesure à produire** : les rapports de contraste relevés sur les trois paires les plus douteuses.

## 6. Mouvement et confort

- [ ] `prefers-reduced-motion: reduce` supprime les animations **sans retirer d'information** ;
- [ ] aucun clignotement rapide ;
- [ ] aucune limite de temps imposée (règle du projet : pas de chrono punitif) ;
- [ ] les annonces vocales (`aria-live`) restent rares et utiles — pas une annonce par réponse.

## 7. Le texte saisi par l'enfant

- [ ] le prénom est affiché avec `textContent`, **jamais** `innerHTML` ;
- [ ] il n'apparaît ni dans une URL, ni dans un nom de fichier exporté.

---

## Ce que tu rends

Pour chaque point : **ce que tu as fait** (tabulé, coupé le son, mesuré un contraste), puis le verdict.

- **Bloquant** : élément inatteignable au clavier, lien sans nom, question insoluble sans le son,
  information perdue sans la couleur, cible trop petite.
- **À corriger** : nom accessible incomplet, contraste limite, focus peu visible.
- **Observation** : amélioration possible.

Pour chaque point bloquant ou à corriger : **le test à écrire** quand c'est automatisable
(présence d'un nom accessible, non-recouvrement des zones cliquables, taille des cibles, absence
d'`innerHTML` avec une donnée saisie). Le reste se vérifie à la main — dis-le, plutôt que d'inventer
un test qui ne prouve rien.

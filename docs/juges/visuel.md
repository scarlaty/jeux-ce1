# Juge visuel

**Déclenché par** : toute branche touchant un écran (`js/screens/`), du CSS, un dessin
(`js/core/ui/art/`) ou un composant d'affichage.

**Question posée** : le rendu tient-il la **direction artistique**, sur **tous les écrans** et dans
**les deux thèmes** ?

Tu ne lis pas le CSS pour deviner le rendu : **tu sers le site et tu regardes**.

---

## Avant de juger quoi que ce soit

**Le service worker sert cache d'abord.** Une page rechargée montre l'**ancien** CSS. Deux agents de
ce projet ont corrigé des défauts qui n'existaient pas, et un troisième a cru à un débordement
imaginaire. Avant chaque capture :

```js
for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
for (const k of await caches.keys()) await caches.delete(k);
```

puis recharge en ignorant le cache.

---

## 1. Les quatre tailles, les deux thèmes

Captures obligatoires, et elles figurent dans ton rapport :

- [ ] **360 px** (téléphone) — clair et ardoise
- [ ] **1280 px** — clair et ardoise
- [ ] **1366 px** — au moins un passage
- [ ] `document.documentElement.scrollWidth === clientWidth` à 360 px **et** 1366 px

Un rendu que tu n'as pas regardé n'est pas jugé. Un thème que tu n'as pas ouvert n'est pas jugé.

**Mesure à produire** : les valeurs de `scrollWidth` / `clientWidth` relevées.

## 2. La direction artistique (univers kawaii cosy)

La grille complète est dans le commentaire « Direction artistique arrêtée » de l'issue #96. Points
vérifiables :

- [ ] **contour sur chaque forme**, épaisseur constante à l'écran quelle que soit l'échelle du dessin ;
- [ ] contour en **prune sombre, jamais noir pur**, et **éclairci sur l'ardoise** (sinon tout disparaît) ;
- [ ] **trois tons + un reflet** par objet, lumière constante en haut à gauche ;
- [ ] **motifs** sur les grandes surfaces — jamais un aplat nu (planches, tuiles, rayures, strates) ;
- [ ] **densité** : *si une zone de la taille d'un bâtiment est vide, il y manque un objet* ;
- [ ] **premier plan** qui cadre la scène, **recouvrement** franc, **fond teinté** jamais blanc ;
- [ ] **du caractère** : des visages dans le décor, pas seulement sur les mascottes.

## 3. L'interface ne mange pas le décor

C'est le défaut majeur trouvé sur #96 : les étiquettes occupaient près de la moitié de la scène et
masquaient l'île qu'on venait de dessiner.

- [ ] **mesure la part de la scène couverte par des éléments d'interface opaques** ;
- [ ] une étiquette ne recouvre jamais l'objet qu'elle désigne ;
- [ ] l'information répétée ailleurs (liste HTML sous la scène) n'a pas besoin d'être affichée en
      permanence dans la scène ;
- [ ] la zone cliquable est **le décor**, pas une pastille posée dessus.

## 4. Les couleurs viennent des tokens

- [ ] **aucune couleur en dur** dans un composant ou un dessin — uniquement les variables de
      `css/tokens.css` ;
- [ ] le thème ardoise n'est pas une version éclaircie du thème clair : vérifie qu'il est *pensé*
      (ciel de nuit, contour éclairci, contrastes tenus).

**Mesure à produire** : résultat d'une recherche de couleurs littérales (`#`, `rgb(`) dans les
fichiers touchés, hors `tokens.css`.

## 5. Les animations

- [ ] `prefers-reduced-motion: reduce` **supprime les animations sans retirer aucune information** —
      le tampon, le bandeau de grade, les points restent affichés ;
- [ ] aucune boucle infinie coûteuse, aucune animation bloquant une interaction ;
- [ ] rien ne bouge pendant qu'un enfant répond à une question.

Teste en émulant la préférence, pas en lisant le CSS.

## 6. Lisibilité réelle

- [ ] texte de consigne ≥ 22 px en largeur tablette ;
- [ ] aucune troncature qui perde du sens (« Centaines, d… ») ;
- [ ] les mots longs ne débordent pas (« quatre-vingt-dix-sept » en 360 px a déjà posé problème) ;
- [ ] cibles tactiles ≥ 56 px — **mesurées à l'écran**, pas dans le code.

---

## Ce que tu rends

Pour chaque point : **la capture ou la valeur mesurée**, puis le verdict.

- **Bloquant** : débordement horizontal, texte illisible, thème ardoise cassé, information perdue
  avec « réduire les animations », cible tactile trop petite.
- **À corriger** : densité insuffisante, interface qui mange le décor, contour incohérent.
- **Observation** : choix esthétique discutable.

Pour chaque point bloquant ou à corriger : **le test à écrire** quand c'est automatisable
(débordement, absence de couleur en dur, taille des cibles, non-recouvrement des zones cliquables).
Le reste reste une vérification humaine — dis-le clairement plutôt que d'inventer un test fragile.

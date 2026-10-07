// Composer une somme avec des pièces et des billets : calcul pur, sans DOM.
// Sert au composant `amount` (ui/amount.js), à la vérification des questions de ce type
// (validate.js) et aux jeux qui montrent un exemple de composition après une erreur.

/**
 * Le plus petit nombre de pièces qui font `target` avec les valeurs `values` (entiers > 0), répétables.
 * Renvoie la liste (de la plus grande à la plus petite valeur) ou null si c'est impossible.
 */
export function fewestPieces(target, values) {
  if (!Number.isInteger(target) || target < 0) return null;
  const best = new Array(target + 1).fill(null);
  best[0] = [];
  for (let sum = 1; sum <= target; sum += 1) {
    for (const v of values) {
      const before = sum - v >= 0 ? best[sum - v] : null;
      if (before && (!best[sum] || before.length + 1 < best[sum].length)) best[sum] = [...before, v];
    }
  }
  return best[target] ? best[target].sort((a, b) => b - a) : null;
}

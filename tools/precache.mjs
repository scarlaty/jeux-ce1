// Logique pure du mode hors ligne, utilisée par tests/offline.test.js.
// Vit dans tools/ (et non dans js/) : rien ici n'est envoyé au navigateur.
//
// Le service worker est un script classique : il ne peut pas importer js/games/registry.js ni
// js/screens/index.js, il embarque donc la liste des fichiers à pré-cacher. Ces fonctions
// retrouvent les modules que les registres chargent paresseusement, pour que le test échoue si
// un jeu est ajouté au registre sans être ajouté au pré-cache.
import { posix } from 'node:path';

const IMPORT_CALL = /import\(\s*['"]([^'"]+)['"]\s*\)/;

/** Extrait './demo.js' de `() => import('./demo.js')`. */
export function importSpecifier(load) {
  const match = IMPORT_CALL.exec(String(load));
  if (!match) throw new Error(`import('…') introuvable dans : ${load}`);
  return match[1];
}

/**
 * Chemins (relatifs à la racine du site) des modules chargés paresseusement par un registre.
 * `entries` : objets portant une fonction `load` ; `baseDir` : dossier du registre.
 * Doublons retirés (plusieurs écrans partagent soon.js) et ordre stable.
 */
export function lazyModulePaths(entries, baseDir) {
  const paths = entries.map((entry) => posix.join(baseDir, importSpecifier(entry.load)));
  return [...new Set(paths)].sort();
}

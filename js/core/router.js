// Routeur par hash (#/jeu/sons) : fonctionne sur GitHub Pages sans configuration serveur.
// La correspondance des routes est pure (testée) ; createRouter branche le tout sur window.

/** '#/jeu/demo/' → '/jeu/demo' */
export function normalizePath(hash) {
  let path = String(hash || '').replace(/^#/, '').split('?')[0];
  try { path = decodeURIComponent(path); } catch { /* chemin laissé tel quel */ }
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path;
}

/** Trouve la première route dont le motif ('/jeu/:id') correspond au chemin. */
export function matchRoute(routes, path) {
  const parts = path.split('/').filter(Boolean);
  for (const route of routes) {
    const pattern = route.path.split('/').filter(Boolean);
    if (pattern.length !== parts.length) continue;
    const params = {};
    const ok = pattern.every((p, i) => {
      if (p.startsWith(':')) { params[p.slice(1)] = parts[i]; return true; }
      return p === parts[i];
    });
    if (ok) return { route, params };
  }
  return null;
}

/**
 * onRoute({ route, params, path }) est appelé à chaque changement de hash.
 * Un chemin inconnu renvoie vers `fallback`.
 */
export function createRouter({ routes, onRoute, fallback = '/' }) {
  function resolve() {
    const path = normalizePath(location.hash);
    const match = matchRoute(routes, path);
    if (!match) {
      navigate(fallback, { replace: true });
      return;
    }
    onRoute({ ...match, path });
  }

  function navigate(path, { replace = false } = {}) {
    const hash = `#${path}`;
    if (location.hash === hash) { resolve(); return; }
    if (replace) {
      history.replaceState(null, '', hash);
      resolve();
    } else {
      location.hash = hash;   // déclenche hashchange → resolve
    }
  }

  return {
    start() {
      addEventListener('hashchange', resolve);
      resolve();
    },
    navigate,
    reload: resolve,
  };
}

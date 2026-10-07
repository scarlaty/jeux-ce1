/* Service worker (#8) : l'appli doit s'ouvrir et se jouer sans connexion.
   Script « classique » (pas un module ES) : il ne peut donc rien importer du socle et embarque
   la liste des fichiers à pré-cacher. tests/offline.test.js échoue si cette liste diverge de ce
   qui est réellement sur le disque ou du registre des jeux — elle ne peut pas se désynchroniser
   en silence.

   Stratégies :
   - navigation  : réseau d'abord, repli sur l'index en cache (l'appli est une SPA à hash) ;
   - ressources  : cache d'abord (elles sont versionnées par le nom du cache), réseau en secours,
                   et la réponse est mise en cache (filet pour tout fichier ajouté plus tard) ;
   - rien n'est jamais demandé à un tiers : les requêtes d'une autre origine ne sont pas touchées.

   Mise à jour : à chaque modification d'un fichier pré-caché, incrémenter VERSION. Le nouveau
   service worker attend (pas de skipWaiting automatique) : js/core/offline.js propose la mise à
   jour à l'enfant, qui l'applique quand elle ne joue pas. */

const VERSION = 'v17';
const CACHE = `jeux-ce1-${VERSION}`;
const INDEX = './index.html';

/* Coquille de l'application. Chemins relatifs à la racine du site (= portée du service worker). */
const PRECACHE = [
  'index.html',
  'manifest.webmanifest',

  'css/fonts.css',
  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'css/profile.css',
  'css/rewards.css',
  'css/kawaii.css',
  'css/chest.css',

  'fonts/andika-400-latin.woff2',
  'fonts/andika-400-latin-ext.woff2',
  'fonts/andika-700-latin.woff2',
  'fonts/andika-700-latin-ext.woff2',
  'fonts/fredoka-500-600-latin.woff2',
  'fonts/fredoka-500-600-latin-ext.woff2',
  'fonts/playwrite-fr-moderne-300-400.woff2',

  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',

  'js/app.js',
  'js/core/alphabet.js',
  'js/core/amount.js',
  'js/core/audio.js',
  'js/core/backup.js',
  'js/core/chest-live.js',
  'js/core/chest.js',
  'js/core/companion-live.js',
  'js/core/companion.js',
  'js/core/engine.js',
  'js/core/gate.js',
  'js/core/history.js',
  'js/core/offline.js',
  'js/core/profile.js',
  'js/core/random.js',
  'js/core/rewards-live.js',
  'js/core/rewards.js',
  'js/core/router.js',
  'js/core/stats.js',
  'js/core/storage.js',
  'js/core/validate.js',
  'js/core/ui/art/base-ten.js',
  'js/core/ui/art/clock.js',
  'js/core/ui/art/colored.js',
  'js/core/ui/art/index.js',
  'js/core/ui/art/kawaii-deco.js',
  'js/core/ui/art/kawaii-parts.js',
  'js/core/ui/art/kawaii.js',
  'js/core/ui/art/money.js',
  'js/core/ui/avatar.js',
  'js/core/ui/chart.js',
  'js/core/ui/companion.js',
  'js/core/ui/chest.js',
  'js/core/ui/choice.js',
  'js/core/ui/confetti.js',
  'js/core/ui/dom.js',
  'js/core/ui/drag.js',
  'js/core/ui/icons.js',
  'js/core/ui/index.js',
  'js/core/ui/keypad.js',
  'js/core/ui/amount.js',
  'js/core/ui/letters.js',
  'js/core/ui/mascot.js',
  'js/core/ui/order.js',
  'js/core/ui/svg.js',

  /* Écrans et jeux : chargés paresseusement par le navigateur, donc jamais demandés tant que
     l'enfant n'a pas ouvert l'écran. On les pré-cache tous (fichiers de quelques kilo-octets,
     logique pure) : sinon un jeu jamais ouvert serait indisponible hors ligne. */
  'js/data/besoins-vivant.js',
  'js/data/devinettes.js',
  'js/data/mots-illustres.js',
  'js/data/anglais.js',
  'js/data/nombres-en-lettres.js',
  'js/data/mots-frequents.js',
  'js/data/syllabes.js',

  'js/screens/index.js',
  'js/screens/album.js',
  'js/screens/compagnon.js',
  'js/screens/daily.js',
  'js/screens/home.js',
  'js/screens/kawaii.js',
  'js/screens/parents.js',
  'js/screens/play.js',
  'js/screens/profiles.js',
  'js/screens/soon.js',
  'js/screens/welcome.js',

  'js/games/registry.js',
  'js/games/besoins-vivant.js',
  'js/games/calcul-mental.js',
  'js/games/cdu.js',
  'js/games/colors-numbers.js',
  'js/games/demo.js',
  'js/games/devinettes.js',
  'js/games/ecrire-nombres.js',
  'js/games/heure.js',
  'js/games/tirelire.js',
  'js/games/lecture-eclair.js',
  'js/games/lettres-qui-changent.js',
  'js/games/lettres-soeurs.js',
  'js/games/sons.js',
  'js/games/syllabes.js',
  'js/games/tables.js',
];

self.addEventListener('install', (event) => {
  // `cache: 'reload'` : on va chercher chaque fichier sur le serveur, sans passer par le cache HTTP du
  // navigateur (10 min sur GitHub Pages). Sinon une nouvelle version pouvait garder d'anciens fichiers
  // et mélanger deux versions (écran sans mascotte, dessin géant sans sa feuille de style…).
  event.waitUntil(caches.open(CACHE).then((cache) =>
    cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('jeux-ce1-') && name !== CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

/* La page décide du moment : rien ne s'applique pendant une partie. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? handleNavigation(request) : handleAsset(request));
});

/** Réseau d'abord : une nouvelle version de l'index est prise en compte dès qu'elle existe. */
async function handleNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    keep(cache, INDEX, response);
    return response;
  } catch (err) {
    return (await cache.match(INDEX)) || (await cache.match(request)) || Response.error();
  }
}

/** Cache d'abord : instantané et hors ligne par défaut ; le réseau n'est qu'un filet. */
async function handleAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  keep(cache, request, response);
  return response;
}

/** Mise en cache opportuniste : jamais bloquante, jamais une cause d'erreur pour la page. */
function keep(cache, key, response) {
  if (!response.ok || response.type !== 'basic' || response.redirected) return;
  cache.put(key, response.clone()).catch(() => { /* quota plein : on sert quand même */ });
}

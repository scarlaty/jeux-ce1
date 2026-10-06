// Mode hors ligne (#8) : enregistrement du service worker et avis discret de mise à jour.
//
// Tout est facultatif : sans service worker (vieux navigateur), en contexte non sécurisé
// (ouverture directe en file://) ou si l'enregistrement échoue, l'appli fonctionne exactement
// pareil — simplement sans fonctionner hors ligne. Aucune erreur n'est remontée à l'enfant.
//
// Mise à jour : le nouveau service worker reste en attente (sw.js ne fait pas skipWaiting tout
// seul). On propose la mise à jour par un bandeau sobre, jamais pendant une partie, et c'est
// l'appui sur « Mettre à jour » qui recharge la page : une partie en cours n'est jamais coupée.
import { gameEvents } from './engine.js';
import { h } from './ui/dom.js';

let waitingWorker = null;   // nouvelle version prête, en attente
let playing = false;        // une partie est en cours : on ne propose rien
let updating = false;       // l'enfant a demandé la mise à jour : le rechargement est voulu
let banner = null;

export function setupOffline() {
  if (!('serviceWorker' in navigator) || !isSecureContext) return;
  gameEvents.on('start', () => { playing = true; });
  gameEvents.on('end', () => { release(); });
  // Quitter l'écran de jeu termine la partie : le bandeau redevient proposable.
  addEventListener('hashchange', release);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updating) location.reload();
  });
  // Après le premier rendu : l'enregistrement ne doit pas retarder l'affichage.
  if (document.readyState === 'complete') register();
  else addEventListener('load', register, { once: true });
}

function register() {
  // Chemin relatif : le site vit sous /jeux-ce1/. La portée en découle.
  navigator.serviceWorker.register('./sw.js').then(watch).catch(() => { /* hors ligne indisponible */ });
}

function watch(registration) {
  if (registration.waiting) announce(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      // « installed » avec un contrôleur déjà en place = nouvelle version (pas la 1re installation).
      if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(worker);
    });
  });
}

function announce(worker) {
  waitingWorker = worker;
  showBanner();
}

function release() {
  playing = false;
  showBanner();
}

function showBanner() {
  if (!waitingWorker || playing || banner) return;
  const worker = waitingWorker;
  banner = h('div', { class: 'update-note', role: 'status' },
    h('p', { class: 'update-note__text', text: 'Une nouvelle version des jeux est prête.' }),
    h('button', {
      type: 'button',
      class: 'btn btn--primary update-note__btn',
      text: 'Mettre à jour',
      onclick: () => {
        updating = true;
        worker.postMessage({ type: 'SKIP_WAITING' });
      },
    }),
    h('button', {
      type: 'button',
      class: 'btn btn--ghost update-note__btn',
      text: 'Plus tard',
      onclick: hideBanner,
    }));
  document.body.append(banner);
}

function hideBanner() {
  waitingWorker = null;   // la mise à jour s'appliquera d'elle-même au prochain démarrage
  banner?.remove();
  banner = null;
}

// Démarrage de l'application : stockage, profil actif, réglages, barre du haut, routeur.
import { createStorage, createStore } from './core/storage.js';
import { ensureActiveProfile } from './core/profile.js';
import { recordResult } from './core/history.js';
import { installRewards } from './core/rewards.js';
import { createRouter } from './core/router.js';
import * as audio from './core/audio.js';
import { h } from './core/ui/dom.js';
import { icon } from './core/ui/icons.js';
import { SCREENS } from './screens/index.js';

const APP_TITLE = 'Jeux CE1';
const THEMES = ['auto', 'light', 'dark'];
const THEME_LABELS = { auto: 'automatique', light: 'clair (cahier)', dark: 'sombre (ardoise)' };
const THEME_ICONS = { auto: 'contrast', light: 'sun', dark: 'moon' };

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
  // La barre du navigateur (mobile) prend la couleur du papier.
  const paper = getComputedStyle(root).getPropertyValue('--paper').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper);
}

function buildShell(store) {
  const title = h('h1', { class: 'appbar__title', text: APP_TITLE });

  const soundButton = h('button', { type: 'button', class: 'icon-btn', onclick: () => {
    audio.setMuted(!audio.isMuted());
    store.setSetting('muted', audio.isMuted());
    audio.playSound('tap');
  } });
  const renderSound = (muted) => {
    soundButton.replaceChildren(icon(muted ? 'speakerOff' : 'speaker', { size: 28 }));
    soundButton.setAttribute('aria-label', muted ? 'Effets sonores coupés : les remettre' : 'Couper les effets sonores');
    soundButton.setAttribute('aria-pressed', String(muted));
  };
  audio.onMutedChange(renderSound);
  renderSound(audio.isMuted());

  const themeButton = h('button', { type: 'button', class: 'icon-btn', onclick: () => {
    const current = store.getSettings().theme;
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    store.setSetting('theme', next);
    renderTheme(next);
  } });
  const renderTheme = (theme) => {
    applyTheme(theme);
    themeButton.replaceChildren(icon(THEME_ICONS[theme] || 'contrast', { size: 26 }));
    themeButton.setAttribute('aria-label', `Thème ${THEME_LABELS[theme] || THEME_LABELS.auto} : changer`);
  };
  renderTheme(store.getSettings().theme);

  const header = h('header', { class: 'appbar' },
    h('a', { class: 'icon-btn appbar__home', href: '#/', 'aria-label': 'Accueil' }, icon('home', { size: 28 })),
    title,
    h('div', { class: 'appbar__tools' }, soundButton, themeButton));

  const view = h('main', { id: 'view', class: 'view', tabindex: '-1' });
  const note = h('p', { class: 'storage-note', role: 'status', hidden: true });
  const footer = h('footer', { class: 'appfoot' }, note);

  document.body.replaceChildren(header, view, footer);

  return {
    view,
    setTitle: (text) => {
      title.textContent = text || APP_TITLE;
      document.title = text ? `${text} · ${APP_TITLE}` : APP_TITLE;
    },
    // Signalement discret quand rien ne peut être sauvegardé.
    refreshStorageNote: () => {
      const status = store.storage.status();
      note.hidden = status === 'ok';
      note.textContent = status === 'ok' ? '' : 'Sur cet appareil, la progression ne peut pas être sauvegardée.';
    },
  };
}

/** Contexte passé à chaque écran. */
function createAppContext(store, shell, getRouter) {
  let profileId = ensureActiveProfile(store);
  return {
    store,
    get profileId() { return profileId; },
    /** À appeler par l'écran de profils (#10) après un changement de profil. */
    switchProfile(id) {
      store.updateMeta((meta) => ({ ...meta, activeProfileId: id }));
      profileId = ensureActiveProfile(store);
    },
    navigate: (path, options) => getRouter().navigate(path, options),
    setTitle: shell.setTitle,
    /** Enregistre une partie terminée (passé au moteur comme `record`). */
    record(result) {
      const summary = recordResult(store, profileId, result);
      shell.refreshStorageNote();
      return summary;
    },
  };
}

function showLoadError(view, app) {
  view.replaceChildren(h('section', { class: 'page page--narrow' },
    h('div', { class: 'card soon' },
      h('h1', { class: 'page-title', text: 'Cet écran n\'a pas pu s\'ouvrir' }),
      h('p', { text: 'Vérifie la connexion, puis réessaie.' }),
      h('a', { class: 'btn btn--primary', href: '#/' }, icon('home'), h('span', { text: 'Retour à l\'accueil' })))));
  app.setTitle('');
}

function start() {
  const store = createStore(createStorage());
  audio.setMuted(store.getSettings().muted);
  const shell = buildShell(store);
  shell.refreshStorageNote();

  let router = null;
  const app = createAppContext(store, shell, () => router);
  installRewards({ store, getProfileId: () => app.profileId });
  let cleanup = null;
  let renderId = 0;

  router = createRouter({
    routes: SCREENS,
    async onRoute({ route, params }) {
      const id = ++renderId;
      audio.stopSpeaking();
      try { cleanup?.(); } catch (err) { console.error(err); }
      cleanup = null;
      // Un conteneur neuf par écran : un rendu asynchrone en retard écrit dans un nœud détaché.
      const page = h('div', { class: 'screen' });
      shell.view.replaceChildren(page);
      window.scrollTo(0, 0);
      try {
        const screen = (await route.load()).default;
        if (id !== renderId) return;   // l'enfant a déjà changé d'écran
        shell.setTitle(route.title || screen.title || '');
        const result = await screen.render(page, { params, app, route });
        if (id !== renderId) { result?.(); return; }
        cleanup = typeof result === 'function' ? result : null;
        shell.view.focus({ preventScroll: true });
      } catch (err) {
        console.error(err);
        if (id === renderId) showLoadError(shell.view, app);
      }
    },
  });

  // Les navigateurs n'autorisent le son qu'après un premier geste.
  addEventListener('pointerdown', audio.unlockAudio, { once: true });
  addEventListener('keydown', audio.unlockAudio, { once: true });
  router.start();
}

start();

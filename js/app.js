// Démarrage de l'application : stockage, profil actif, réglages, barre du haut, routeur.
import { createStorage, createStore } from './core/storage.js';
import { ensureActiveProfile, needsWelcome } from './core/profile.js';
import { recordResult } from './core/history.js';
import { createRouter } from './core/router.js';
import { setupOffline } from './core/offline.js';
import * as audio from './core/audio.js';
import { h } from './core/ui/dom.js';
import { icon } from './core/ui/icons.js';
import { avatarBubble } from './core/ui/avatar.js';
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

  // Pastille de profil (#10) : qui joue en ce moment ; un appui permet d'en changer.
  const profilePill = h('a', { class: 'profile-pill', href: '#/profil' });
  const renderProfile = (profile) => {
    const name = profile?.name || '';
    profilePill.replaceChildren(
      avatarBubble(profile?.avatar, { size: 's', decorative: true }),
      h('span', { class: 'profile-pill__name', text: name || 'Profil' }));
    profilePill.setAttribute('aria-label', name ? `Profil de ${name} : changer de profil` : 'Choisir un profil');
  };

  const header = h('header', { class: 'appbar' },
    h('a', { class: 'icon-btn appbar__home', href: '#/', 'aria-label': 'Accueil' }, icon('home', { size: 28 })),
    title,
    h('div', { class: 'appbar__tools' }, profilePill, soundButton, themeButton));

  const view = h('main', { id: 'view', class: 'view', tabindex: '-1' });
  const note = h('p', { class: 'storage-note', role: 'status', hidden: true });
  const footer = h('footer', { class: 'appfoot' }, note);

  document.body.replaceChildren(header, view, footer);

  return {
    view,
    renderProfile,
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
  const showProfile = () => shell.renderProfile(store.getProfile(profileId));
  showProfile();
  return {
    store,
    get profileId() { return profileId; },
    showProfile,
    /** À appeler par les écrans de profil (#9, #10, #14) après un changement de profil. */
    switchProfile(id) {
      if (id) store.updateMeta((meta) => ({ ...meta, activeProfileId: id }));
      profileId = ensureActiveProfile(store);
      showProfile();
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
  let cleanup = null;
  let renderId = 0;

  router = createRouter({
    routes: SCREENS,
    async onRoute({ route, params, path }) {
      // Premier lancement : on demande le prénom avant tout le reste (#9). Seul l'espace
      // parents reste joignable : c'est par là qu'on restaure une sauvegarde sur une
      // tablette neuve (#14), avant même d'avoir créé un profil.
      if (path !== '/bienvenue' && path !== '/parents' && needsWelcome(store)) {
        router.navigate('/bienvenue', { replace: true });
        return;
      }
      const id = ++renderId;
      app.showProfile();
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
  setupOffline();   // hors ligne : sans effet si le navigateur ne sait pas faire
  router.start();
}

start();

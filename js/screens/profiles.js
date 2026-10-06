// « Qui joue ? » (#10) : choix du profil à l'ouverture quand il y en a plusieurs, ou ajout d'un joueur.
import { h } from '../core/ui/dom.js';
import { avatarBadge, identityForm } from '../core/ui/avatar.js';
import { listProfiles, createProfile } from '../core/profile.js';
import * as audio from '../core/audio.js';

/** Bouton « carte de profil » (avatar + prénom), pour cet écran et #/profil. */
export function profileCard(profile, { onPick, current = false } = {}) {
  return h('button', {
    type: 'button',
    class: `profile-card${current ? ' is-current' : ''}`,
    'aria-current': current ? 'true' : null,
    onclick: () => { audio.playSound('tap'); onPick(profile.id); },
  }, avatarBadge(profile, { size: 'xl' }));
}

/** Formulaire « nouveau joueur » qui remplace `slot` le temps de la saisie. */
export function addPlayerForm(app, { onDone, onCancel }) {
  const form = identityForm({
    submitLabel: 'Ajouter',
    nameLabel: 'Prénom du nouveau joueur',
    avatarLabel: 'Son animal',
    onCancel,
    onSubmit(name, avatar) {
      const id = createProfile(app.store, { name, avatar });
      audio.playSound('success');
      app.switchProfile(id);
      onDone(id);
    },
  });
  return form;
}

export default {
  title: 'Qui joue\u00a0?',
  render(view, { app }) {
    const page = h('section', { class: 'page profiles' });
    view.append(page);

    function showList() {
      const profiles = listProfiles(app.store);
      const addButton = h('button', { type: 'button', class: 'btn btn--secondary', onclick: showForm },
        h('span', { class: 'profiles__plus', 'aria-hidden': 'true', text: '+' }), h('span', { text: 'Nouveau joueur' }));
      page.replaceChildren(
        h('h1', { class: 'page-title', text: 'Qui joue\u00a0?' }),
        h('ul', { class: 'profile-grid' }, profiles.map((p) => h('li', {}, profileCard(p, {
          current: p.id === app.profileId,
          onPick: (id) => { app.switchProfile(id); app.continueAfterGate(); },
        })))),
        h('div', { class: 'profiles__actions' }, addButton));
    }

    function showForm() {
      const form = addPlayerForm(app, { onDone: () => app.continueAfterGate(), onCancel: showList });
      page.replaceChildren(
        h('h1', { class: 'page-title', text: 'Nouveau joueur' }),
        h('div', { class: 'card profiles__form' }, form.el));
      form.focus();
    }

    showList();
  },
};

// Bienvenue (#9) : au premier lancement, l'enfant écrit son prénom et choisit un animal.
// Le profil anonyme créé au démarrage est complété ; puis on reprend la page demandée.
import { h } from '../core/ui/dom.js';
import { identityForm } from '../core/ui/avatar.js';
import { isProfileComplete, updateIdentity } from '../core/profile.js';
import * as audio from '../core/audio.js';

export default {
  title: 'Bienvenue',
  render(view, { app }) {
    if (isProfileComplete(app.store.getProfile(app.profileId))) {
      app.navigate('/', { replace: true });
      return;
    }
    const form = identityForm({
      submitLabel: 'C\'est parti\u00a0!',
      nameLabel: 'Comment t\'appelles-tu\u00a0?',
      avatarLabel: 'Choisis ton animal',
      onSubmit(name, avatar) {
        updateIdentity(app.store, app.profileId, { name, avatar });
        audio.playSound('success');
        app.switchProfile(app.profileId);
        app.continueAfterGate();
      },
    });

    view.append(h('section', { class: 'page page--narrow welcome' },
      h('div', { class: 'card welcome__card' },
        h('h1', { class: 'welcome__title stamp stamp--static', text: 'Bienvenue\u00a0!' }),
        h('p', { class: 'welcome__lead cursive', text: 'Avant de jouer, présente-toi.' }),
        form.el),
      h('p', { class: 'welcome__adult' },
        h('a', { href: '#/parents', text: 'Adulte\u00a0: restaurer une sauvegarde' }))));
  },
};

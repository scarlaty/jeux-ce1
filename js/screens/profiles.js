// Choix du profil (#10) : qui joue ? La progression de chacun est séparée.
// Côté enfant : vocabulaire simple, aucune action irréversible sans confirmation.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { avatarBubble } from '../core/ui/avatar.js';
import { listProfiles, removeProfile } from '../core/profile.js';
import { totals } from '../core/stats.js';
import * as audio from '../core/audio.js';

const playedLabel = (n) => (n ? `${n} partie${n > 1 ? 's' : ''} jouée${n > 1 ? 's' : ''}` : 'Pas encore joué');

export default {
  render(view, { app }) {
    const page = h('section', { class: 'page page--narrow profiles' });
    view.append(page);
    app.setTitle('Qui joue ?');

    function draw() {
      const profiles = listProfiles(app.store);

      const cards = profiles.map((p) => {
        const played = totals(app.store.getProfile(p.id)).plays;
        return h('li', { class: 'profile-row' },
          h('button', {
            type: 'button',
            class: `profile-card${p.active ? ' is-active' : ''}`,
            'aria-current': p.active ? 'true' : null,
            onclick: () => {
              audio.playSound('tap');
              app.switchProfile(p.id);
              app.navigate('/');
            },
          },
          avatarBubble(p.avatar, { size: 'l', decorative: true }),
          h('span', { class: 'profile-card__body' },
            h('span', { class: 'profile-card__name', text: p.name || 'Sans prénom' }),
            h('span', { class: 'profile-card__meta', text: playedLabel(played) })),
          p.active
            ? h('span', { class: 'chip profile-card__chip', text: 'C\'est toi' })
            : h('span', { class: 'profile-card__go' }, icon('arrowRight'))),
          h('div', { class: 'profile-row__tools' },
            h('a', { class: 'btn btn--ghost btn--small', href: `#/profil/${encodeURIComponent(p.id)}` },
              h('span', { text: 'Modifier' })),
            profiles.length > 1 && h('button', {
              type: 'button',
              class: 'btn btn--ghost btn--small',
              onclick: () => askRemove(p),
            }, h('span', { text: 'Supprimer' }))));
      });

      page.replaceChildren(
        h('h1', { class: 'page-title', text: 'Qui joue ?' }),
        h('p', { class: 'profiles__lead cursive', text: 'Touche ton prénom pour continuer ta progression.' }),
        h('ul', { class: 'profile-list' }, cards),
        h('div', { class: 'profiles__actions' },
          h('a', { class: 'btn btn--primary', href: '#/profil/nouveau' }, h('span', { text: 'Ajouter un profil' })),
          h('a', { class: 'btn btn--ghost', href: '#/parents' }, h('span', { text: 'Espace parents' }))));
    }

    /** Suppression : toujours un écran de confirmation, jamais en un seul geste. */
    function askRemove(profile) {
      const cancel = h('button', { type: 'button', class: 'btn btn--secondary', onclick: draw },
        h('span', { text: 'Non, revenir' }));
      page.replaceChildren(h('div', { class: 'card danger' },
        h('h1', { class: 'page-title', text: 'Supprimer ce profil ?' }),
        h('p', { class: 'danger__text' },
          h('strong', { text: profile.name || 'Ce profil' }),
          h('span', { text: ' sera effacé de cette tablette : ses étoiles, ses parties et son historique.' })),
        h('p', { class: 'danger__text', text: 'Cette action ne peut pas être annulée. Pense à exporter une sauvegarde depuis l\'espace parents.' }),
        h('div', { class: 'danger__actions' },
          cancel,
          h('button', {
            type: 'button',
            class: 'btn btn--danger',
            onclick: () => {
              removeProfile(app.store, profile.id);
              app.switchProfile(app.store.getMeta().activeProfileId);
              draw();
            },
          }, h('span', { text: 'Oui, supprimer' })))));
      cancel.focus({ preventScroll: true });
    }

    draw();
    return undefined;
  },
};

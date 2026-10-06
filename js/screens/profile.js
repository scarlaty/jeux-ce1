// Mon profil (#9, #10, #13) : prénom et animal, mes progrès en version simple, changer de joueur.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { avatarBadge, identityForm } from '../core/ui/avatar.js';
import { listProfiles, updateIdentity } from '../core/profile.js';
import { totals, weekStart } from '../core/history.js';
import { plural } from '../core/format.js';
import { renderProgressCharts, emptyChart } from './progress-charts.js';
import { profileCard, addPlayerForm } from './profiles.js';

/** Étoiles gagnées : meilleur résultat de chaque niveau de chaque jeu. */
function starsEarned(profile) {
  return Object.values(profile.progress || {})
    .reduce((sum, p) => sum + Object.values(p.best || {}).reduce((s, b) => s + (b.stars || 0), 0), 0);
}

/** Phrase encourageante selon le nombre de parties de la semaine. */
function cheer(name, weekPlays, allPlays) {
  if (weekPlays >= 10) return `Quelle semaine, ${name} ! ${plural(weekPlays, 'partie')} : tu es en pleine forme.`;
  if (weekPlays > 0) return `Bravo ${name}, tu as joué ${plural(weekPlays, 'partie')} cette semaine\u00a0!`;
  if (allPlays > 0) return `Te revoilà, ${name}\u00a0! Une petite partie pour cette semaine\u00a0?`;
  return `Bonjour ${name} !`;
}

export default {
  title: 'Mon profil',
  render(view, { app }) {
    const page = h('section', { class: 'page profile-page' });
    view.append(page);

    function render() {
      const profile = app.store.getProfile(app.profileId);
      const all = totals(profile);
      const week = totals(profile, { since: weekStart(Date.now()) });
      const stars = starsEarned(profile);

      const identity = h('div', { class: 'card profile-hero' },
        avatarBadge(profile, { size: 'xl' }),
        h('p', { class: 'profile-hero__cheer', text: cheer(profile.name, week.plays, all.plays) }),
        h('div', { class: 'profile-hero__facts' },
          h('span', { class: 'fact' }, icon('star', { size: 22, className: 'fact__star' }), h('span', { text: plural(stars, 'étoile') })),
          h('span', { class: 'fact', text: plural(all.plays, 'partie') })),
        h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => editIdentity(identity, profile) },
          h('span', { text: 'Changer mon prénom ou mon animal' })));

      const charts = h('div', { class: 'profile-charts' });
      const progress = h('section', { class: 'card profile-progress', 'aria-labelledby': 'mes-progres' },
        h('h2', { class: 'section-title', id: 'mes-progres', text: 'Mes progrès' }), charts);

      const others = listProfiles(app.store);
      const players = h('section', { class: 'card profile-players', 'aria-labelledby': 'joueurs' },
        h('h2', { class: 'section-title', id: 'joueurs', text: others.length > 1 ? 'Changer de joueur' : 'Les joueurs' }),
        h('ul', { class: 'profile-grid profile-grid--small' }, others.map((p) => h('li', {}, profileCard(p, {
          current: p.id === app.profileId,
          onPick: (id) => { app.switchProfile(id); render(); },
        })))),
        h('div', { class: 'profiles__actions' },
          h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => addPlayer(players) },
            h('span', { class: 'profiles__plus', 'aria-hidden': 'true', text: '+' }), h('span', { text: 'Ajouter un joueur' }))));

      page.replaceChildren(
        h('h1', { class: 'visually-hidden', text: 'Mon profil' }),
        identity, progress, players,
        h('p', { class: 'profile-page__parents' },
          h('a', { class: 'btn btn--ghost', href: '#/parents' }, icon('lock', { size: 22 }), h('span', { text: 'Espace parents' }))));

      // Les courbes ont besoin de la largeur réelle : on les dessine une fois la page affichée.
      const drawn = renderProgressCharts(charts, profile, {
        weeks: 6,
        compact: true,
        titles: { score: 'Mes bonnes réponses (en %)', plays: 'Mes parties, semaine après semaine' },
      });
      if (!drawn) {
        charts.append(emptyChart(undefined, h('a', { class: 'btn btn--primary', href: '#/' }, h('span', { text: 'Jouer' }), icon('arrowRight'))));
      }
    }

    function editIdentity(card, profile) {
      const form = identityForm({
        name: profile.name,
        avatar: profile.avatar,
        submitLabel: 'Enregistrer',
        nameLabel: 'Ton prénom',
        onCancel: render,
        onSubmit(name, avatar) {
          updateIdentity(app.store, profile.id, { name, avatar });
          app.refreshProfile();
          render();
        },
      });
      card.replaceChildren(h('h2', { class: 'section-title', text: 'Mon prénom et mon animal' }), form.el);
      form.focus();
    }

    function addPlayer(card) {
      const form = addPlayerForm(app, { onDone: render, onCancel: render });
      card.replaceChildren(h('h2', { class: 'section-title', text: 'Nouveau joueur' }), form.el);
      form.focus();
    }

    render();
  },
};

// Accueil PROVISOIRE : liste des jeux par île. Sera remplacé par la carte des îles (#19).
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { GAMES, ISLANDS } from '../games/registry.js';
import { getGameProgress } from '../core/history.js';

/** Nombre d'étoiles gagnées sur les 3 niveaux (meilleur résultat de chaque niveau). */
function starsEarned(progress) {
  return Object.values(progress.best).reduce((sum, b) => sum + (b.stars || 0), 0);
}

function gameCard(game, profile) {
  const progress = getGameProgress(profile, game.id);
  const stars = starsEarned(progress);
  return h('li', {},
    h('a', { class: 'game-card', href: `#/jeu/${game.id}`, dataset: { island: game.island } },
      h('span', { class: 'game-card__title', text: game.title }),
      h('span', { class: 'game-card__stars', 'aria-label': `${stars} étoile${stars > 1 ? 's' : ''} sur 9` },
        icon('star', { size: 20 }), h('span', { text: `${stars} / 9` }))));
}

export default {
  render(view, { app }) {
    const profile = app.store.getProfile(app.profileId);
    const realGames = GAMES.filter((g) => !g.demo);
    // Tant qu'aucun vrai jeu n'existe, la démonstration est proposée sur l'accueil.
    const demos = realGames.length ? [] : GAMES.filter((g) => g.demo);

    const islands = ISLANDS.map((island) => {
      const games = realGames.filter((g) => g.island === island.id);
      return h('section', { class: 'island-card', dataset: { island: island.id }, 'aria-labelledby': `ile-${island.id}` },
        h('div', { class: 'island-card__head' },
          h('span', { class: 'island-card__dot', 'aria-hidden': 'true' }),
          h('div', {},
            h('h2', { class: 'island-card__name', id: `ile-${island.id}`, text: island.name }),
            h('p', { class: 'island-card__subject', text: island.subject }))),
        games.length
          ? h('ul', { class: 'game-list' }, games.map((g) => gameCard(g, profile)))
          : h('p', { class: 'island-card__empty cursive', text: 'Bientôt des jeux ici !' }));
    });

    view.append(h('div', { class: 'page home' },
      h('div', { class: 'home__hero' },
        h('h1', { class: 'home__title', text: 'Jeux CE1' }),
        h('p', { class: 'home__subtitle cursive', text: 'Choisis une île et joue !' })),
      h('div', { class: 'island-grid' }, islands),
      demos.length > 0 && h('section', { class: 'workshop', 'aria-labelledby': 'atelier' },
        h('h2', { class: 'workshop__title', id: 'atelier', text: 'Atelier' }),
        h('ul', { class: 'game-list' }, demos.map((g) => gameCard(g, profile))))));
    app.setTitle('');
  },
};

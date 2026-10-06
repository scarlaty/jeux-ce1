// Une île de la carte (#/ile/<id>) : ses jeux (du registre), ses étoiles, ses gommettes.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { islandArt } from '../core/ui/islands.js';
import { getGameProgress } from '../core/history.js';
import { getRewards, bookProgress } from '../core/rewards.js';
import { GAMES, getIsland } from '../games/registry.js';

const STARS_PER_GAME = 9;   // 3 niveaux × 3 étoiles

/** Vrais jeux d'une île (la démonstration n'apparaît pas sur la carte). */
export function islandGames(islandId) {
  return GAMES.filter((g) => g.island === islandId && !g.demo);
}

/** Étoiles gagnées sur le meilleur résultat de chaque niveau. */
export function gameStars(profile, gameId) {
  return Object.values(getGameProgress(profile, gameId).best).reduce((sum, b) => sum + (b.stars || 0), 0);
}

/** Avancement d'une île : { stars, max, games }. */
export function islandStars(islandId, profile) {
  const games = islandGames(islandId);
  return {
    stars: games.reduce((sum, g) => sum + gameStars(profile, g.id), 0),
    max: games.length * STARS_PER_GAME,
    games: games.length,
  };
}

function gameCard(game, profile) {
  const stars = gameStars(profile, game.id);
  return h('li', {},
    h('a', { class: 'game-card', href: `#/jeu/${game.id}` },
      h('span', { class: 'game-card__title', text: game.title }),
      h('span', { class: 'game-card__stars', 'aria-label': `${stars} étoile${stars > 1 ? 's' : ''} sur ${STARS_PER_GAME}` },
        icon('star', { size: 20 }), h('span', { text: `${stars} / ${STARS_PER_GAME}` }))));
}

export default {
  render(view, { params, app }) {
    const island = getIsland(params.id);
    if (!island) {
      app.navigate('/', { replace: true });
      return;
    }
    app.setTitle(island.name);
    const profile = app.store.getProfile(app.profileId);
    const games = islandGames(island.id);
    const { stars, max } = islandStars(island.id, profile);
    const album = bookProgress(getRewards(profile), island.id);

    view.append(h('section', { class: 'page island-page', dataset: { island: island.id } },
      h('header', { class: 'island-banner' },
        h('span', { class: 'island-banner__art' }, islandArt(island.id)),
        h('div', { class: 'island-banner__text' },
          h('h1', { class: 'island-banner__name', text: island.name }),
          h('p', { class: 'island-banner__subject', text: island.subject }),
          games.length > 0 && h('p', { class: 'island-banner__stars' },
            icon('star', { size: 22 }), h('span', { text: `${stars} / ${max} étoiles` })))),
      games.length
        ? h('ul', { class: 'game-list island-page__games' }, games.map((g) => gameCard(g, profile)))
        : h('div', { class: 'card island-page__soon' },
          h('p', { class: 'cursive', text: 'Bientôt des jeux ici !' }),
          h('p', { text: 'Les jeux de cette île sont en préparation. Va explorer les autres îles !' })),
      h('div', { class: 'island-page__links' },
        h('a', { class: 'btn btn--secondary', href: `#/album/${island.id}` },
          icon('book'), h('span', { text: `Mes gommettes : ${album.owned} / ${album.total}` })),
        h('a', { class: 'btn btn--ghost', href: '#/' }, icon('map'), h('span', { text: 'Retour à la carte' })))));
  },
};

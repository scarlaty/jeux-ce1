// L'intérieur d'une île (#96) : #/ile/<id>. Chaque jeu de l'île est un LIEU du décor — la grotte,
// le moulin, le phare… — et on s'y promène librement : le chemin relie, il ne numérote pas.
//
// Rien n'est écrit en dur : les étoiles, les gommettes et l'ouverture viennent du profil.
// La scène est doublée d'une liste (comme ui/chart.js double sa courbe d'un tableau) : au clavier
// comme au lecteur d'écran, aucune information ne tient à la seule position sur la carte.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { mascotSticker } from '../core/ui/mascot.js';
import { islandScene } from '../core/ui/map-scene.js';
import { islandPlaces, STARS_PER_GAME } from '../core/map.js';
import { GAMES, getIsland } from '../games/registry.js';
import { getGameProgress } from '../core/history.js';
import { openOrTrial } from '../core/trial.js';
import {
  totalStars, islandUnlocked, islandStarsLeft, islandStickers, readRewards,
} from '../core/rewards.js';

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** Une ligne de la liste des lieux : le même lien que sur la carte, avec le nom complet. */
function placeRow(place) {
  return h('li', {},
    h('a', { class: 'map-row', href: place.href, 'aria-label': place.label },
      h('span', { class: 'map-row__body' },
        h('span', { class: 'map-row__name', text: place.title }),
        h('span', { class: 'map-row__meta', text: place.where })),
      h('span', { class: 'map-row__stars', 'aria-hidden': 'true' },
        icon('star', { size: 20 }),
        h('span', { text: place.played ? `${place.stars} / ${place.max}` : '—' }))));
}

/** Île fermée : on explique ce qu'il reste à gagner, sans jamais fermer la porte au nez. */
function lockedPage(island, left) {
  return h('div', { class: 'page map-page', dataset: { island: island.id } },
    h('a', { class: 'btn btn--ghost', href: '#/' }, icon('arrowLeft', { size: 22 }), h('span', { text: 'La carte' })),
    h('h1', { class: 'page-title', text: island.name }),
    h('p', { class: 'map-hint', text: `Cette île s'ouvrira quand tu auras gagné encore ${plural(left, 'étoile')}.` }));
}

export default {
  render(view, { params, app }) {
    const island = getIsland(params.id);
    if (!island) {
      app.navigate('/', { replace: true });
      return;
    }
    const profile = app.store.getProfile(app.profileId);
    const stars = totalStars(profile?.progress);
    app.setTitle(island.name);

    if (!openOrTrial(islandUnlocked(island.id, stars))) {
      view.append(lockedPage(island, islandStarsLeft(island.id, stars)));
      return;
    }

    const games = GAMES.filter((g) => !g.demo && g.island === island.id);
    const { layout, places } = islandPlaces(games, (id) => getGameProgress(profile, id));
    const earned = places.reduce((sum, p) => sum + p.stars, 0);
    const possible = games.length * STARS_PER_GAME;
    const owned = (readRewards(profile).stickers[island.id] || []).length;
    const catalog = islandStickers(island.id).length;

    view.append(h('div', { class: 'page map-page', dataset: { island: island.id } },
      h('div', { class: 'isle-head' },
        h('a', { class: 'btn btn--ghost', href: '#/' }, icon('arrowLeft', { size: 22 }), h('span', { text: 'La carte' })),
        mascotSticker(island.id, { face: 'happy', className: 'isle-head__mascot' }),
        h('div', { class: 'isle-head__id' },
          h('h1', { class: 'isle-head__name', text: island.name }),
          h('p', { class: 'isle-head__subject', text: island.subject }),
          h('ul', { class: 'isle-head__stats' },
            h('li', {}, icon('star', { size: 18 }),
              h('span', { text: possible ? `${earned} / ${possible} étoiles` : 'pas encore de jeu' })),
            h('li', {}, h('span', { class: 'emoji', 'aria-hidden': 'true', text: '🏵️' }),
              h('span', { text: `${owned} / ${catalog} gommettes` }))))),
      places.length ? islandScene(island, places, layout) : null,
      places.length
        ? h('ul', { class: 'map-list' }, places.map(placeRow))
        : h('p', { class: 'map-hint cursive', text: 'Bientôt des jeux ici !' }),
      places.length
        ? h('p', { class: 'map-hint', text: 'Touche un lieu de l\'île pour jouer. Tu choisis l\'ordre !' })
        : null));
  },
};

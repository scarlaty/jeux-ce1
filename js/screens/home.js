// Accueil : la carte au trésor des îles (#19). Chaque île montre son avancement (étoiles,
// gommettes) et s'ouvre au fil des étoiles gagnées. L'en-tête rappelle le grade et les points,
// et le défi du jour a sa propre carte.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { mascotSticker, islandFace } from '../core/ui/mascot.js';
import { companionSticker } from '../core/ui/companion.js';
import {
  progressOf, progressText, readCompanion, readyToHatch, STAGE_LABELS, stageOf,
} from '../core/companion.js';
import { draw as drawDeco } from '../core/ui/art/kawaii-deco.js';
import { GAMES, ISLANDS } from '../games/registry.js';
import { getGameProgress } from '../core/history.js';
import {
  gameStars, totalStars, islandUnlocked, islandStarsLeft, islandStickers,
  gradeProgress, readRewards, isDailyDone, stickerCount, stickerTotal,
} from '../core/rewards.js';

const STARS_PER_GAME = 9;   // 3 niveaux × 3 étoiles
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** Bandeau du haut : grade atteint, points, avancement vers le grade suivant (#17). */
function rewardBar(rewards) {
  const { grade, next, remaining, ratio } = gradeProgress(rewards.points);
  const owned = stickerCount(rewards);
  return h('a', { class: 'reward-bar', href: '#/album' },
    h('span', { class: 'emoji reward-bar__icon', role: 'img', 'aria-label': `Grade : ${grade.name}`, text: grade.icon }),
    h('span', { class: 'reward-bar__body' },
      h('span', { class: 'reward-bar__grade', text: grade.name }),
      h('span', { class: 'reward-bar__points', text: `${plural(rewards.points, 'point')} · ${owned} / ${stickerTotal()} gommettes` }),
      next
        ? h('span', { class: 'meter', role: 'img', 'aria-label': `Encore ${plural(remaining, 'point')} pour devenir ${next.name}` },
          h('span', { class: 'meter__fill', style: `--ratio: ${Math.min(1, ratio).toFixed(3)}` }))
        : h('span', { class: 'reward-bar__max', text: 'Tous les grades sont gagnés !' }),
      next && h('span', { class: 'reward-bar__next', text: `Encore ${plural(remaining, 'point')} pour devenir ${next.name}.` })),
    h('span', { class: 'reward-bar__go' }, icon('arrowRight', { size: 22 })));
}

/** Carte du compagnon (#90) : visible sur la carte, mène à « Mon compagnon ». Jamais triste, jamais pressé. */
function companionCard(companion) {
  const ready = readyToHatch(companion);
  const { ratio } = progressOf(companion);
  return h('a', { class: `pet-card${ready ? ' is-ready' : ''}`, href: '#/compagnon' },
    companionSticker(companion, { loop: ready ? 'wobble' : null, className: 'pet-card__art' }),
    h('span', { class: 'pet-card__body' },
      h('span', { class: 'pet-card__name', text: companion.hatched ? companion.name : 'Mon œuf' }),
      h('span', { class: 'pet-card__stage', text: STAGE_LABELS[stageOf(companion)] }),
      h('span', { class: 'meter', role: 'img', 'aria-label': progressText(companion) },
        h('span', { class: 'meter__fill', style: `--ratio: ${Math.min(1, ratio).toFixed(3)}` })),
      h('span', { class: 'pet-card__text', text: progressText(companion) })),
    h('span', { class: 'pet-card__go' }, icon('arrowRight', { size: 22 })));
}

/** Carte du défi du jour (#20). */
function dailyCard(rewards, hasGames) {
  const done = isDailyDone(rewards);
  return h('a', { class: `daily-card${done ? ' is-done' : ''}`, href: '#/defi' },
    h('span', { class: 'emoji daily-card__icon', role: 'img', 'aria-label': 'Coffre au trésor', text: done ? '🏆' : '🗝️' }),
    h('span', { class: 'daily-card__body' },
      h('span', { class: 'daily-card__title', text: 'Défi du jour' }),
      h('span', {
        class: 'daily-card__text',
        text: done
          ? 'Déjà réussi aujourd\'hui ! Un nouveau défi t\'attend demain.'
          : (hasGames ? '5 questions mélangées, une récompense par jour.' : 'Cinq questions pour découvrir les jeux.'),
      })),
    h('span', { class: 'daily-card__go' }, icon('arrowRight', { size: 22 })));
}

function gameCard(game, profile) {
  const progress = getGameProgress(profile, game.id);
  const stars = gameStars(progress);
  return h('li', {},
    h('a', { class: 'game-card', href: `#/jeu/${game.id}` },
      h('span', { class: 'game-card__title', text: game.title }),
      h('span', { class: 'game-card__stars', 'aria-label': `${plural(stars, 'étoile')} sur ${STARS_PER_GAME}` },
        icon('star', { size: 20 }), h('span', { text: `${stars} / ${STARS_PER_GAME}` }))));
}

/** Une île de la carte : ouverte (avec ses jeux) ou encore fermée. */
function islandCard(island, { games, profile, rewards, stars }) {
  const open = islandUnlocked(island.id, stars);
  const left = islandStarsLeft(island.id, stars);
  const earned = games.reduce((sum, g) => sum + gameStars(getGameProgress(profile, g.id)), 0);
  const possible = games.length * STARS_PER_GAME;
  const owned = (rewards.stickers[island.id] || []).length;
  const catalog = islandStickers(island.id).length;

  return h('section', {
    class: `island-card${open ? '' : ' is-locked'}`,
    dataset: { island: island.id },
    'aria-labelledby': `ile-${island.id}`,
  },
  h('div', { class: 'island-card__head' },
    mascotSticker(island.id, { face: islandFace(open), className: 'island-card__mascot' })
      || h('span', { class: 'island-card__dot', 'aria-hidden': 'true' }),
    h('div', { class: 'island-card__id' },
      h('h2', { class: 'island-card__name', id: `ile-${island.id}`, text: island.name }),
      h('p', { class: 'island-card__subject', text: island.subject })),
    !open && h('span', { class: 'island-card__lock' }, icon('lock', { size: 26 }))),
  open && h('ul', { class: 'island-card__stats' },
    h('li', { class: 'island-stat' },
      icon('star', { size: 18 }),
      h('span', { text: possible ? `${earned} / ${possible} étoiles` : '0 étoile' })),
    h('li', { class: 'island-stat island-stat--stickers' },
      h('span', { class: 'emoji', 'aria-hidden': 'true', text: '🏵️' }),
      h('span', { text: `${owned} / ${catalog} gommettes` }))),
  open && (games.length
    ? h('ul', { class: 'game-list' }, games.map((g) => gameCard(g, profile)))
    : h('p', { class: 'island-card__empty cursive', text: 'Bientôt des jeux ici !' })),
  !open && h('p', { class: 'island-card__locked-text', text: `Gagne encore ${plural(left, 'étoile')} pour aborder cette île.` }));
}

export default {
  render(view, { app }) {
    const profile = app.store.getProfile(app.profileId);
    const rewards = readRewards(profile);
    const stars = totalStars(profile?.progress);
    const realGames = GAMES.filter((g) => !g.demo);
    // Tant qu'aucun vrai jeu n'existe, la démonstration est proposée sur l'accueil.
    const demos = realGames.length ? [] : GAMES.filter((g) => g.demo);

    const islands = ISLANDS.map((island) => islandCard(island, {
      games: realGames.filter((g) => g.island === island.id),
      profile,
      rewards,
      stars,
    }));

    view.append(h('div', { class: 'page home' },
      h('div', { class: 'home__hero' },
        h('div', { class: 'home__title-row' },
          h('span', { class: 'home__deco home__deco--left', 'aria-hidden': 'true' }, drawDeco({ shape: 'star', face: 'happy' })),
          h('h1', { class: 'home__title', text: 'Jeux CE1' }),
          h('span', { class: 'home__deco home__deco--right', 'aria-hidden': 'true' }, drawDeco({ shape: 'heart', face: 'joyful' }))),
        h('p', { class: 'home__subtitle cursive', text: 'Choisis une île et joue !' })),
      rewardBar(rewards),
      companionCard(readCompanion(profile)),
      dailyCard(rewards, realGames.length > 0),
      h('div', { class: 'map' },
        h('div', { class: 'map__sea', 'aria-hidden': 'true' }),
        h('div', { class: 'island-grid' }, islands)),
      demos.length > 0 && h('section', { class: 'workshop', 'aria-labelledby': 'atelier' },
        h('h2', { class: 'workshop__title', id: 'atelier', text: 'Atelier' }),
        h('ul', { class: 'game-list' }, demos.map((g) => gameCard(g, profile))))));
    app.setTitle('');
  },
};

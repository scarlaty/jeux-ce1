// Accueil : la carte au trésor des îles (#19). Chaque île montre son avancement (étoiles,
// gommettes) et s'ouvre au fil des étoiles gagnées. L'en-tête rappelle le grade et les points,
// et le défi du jour a sa propre carte.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { mascotSticker, islandFace } from '../core/ui/mascot.js';
import { companionSticker } from '../core/ui/companion.js';
import { withAccessory } from '../core/chest.js';
import {
  progressOf, progressText, readCompanion, readyToHatch, STAGE_LABELS, stageOf,
} from '../core/companion.js';
import { draw as drawDeco } from '../core/ui/art/kawaii-deco.js';
import { archipelagoScene } from '../core/ui/map-scene.js';
import { archipelago } from '../core/map.js';
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

/** Ce que la carte doit savoir d'une île : tout vient du profil, rien n'est écrit en dur. */
function readIsland(island, { profile, rewards, stars }) {
  const games = GAMES.filter((g) => !g.demo && g.island === island.id);
  return {
    unlocked: islandUnlocked(island.id, stars),
    starsLeft: islandStarsLeft(island.id, stars),
    earned: games.reduce((sum, g) => sum + gameStars(getGameProgress(profile, g.id)), 0),
    possible: games.length * STARS_PER_GAME,
    stickers: (rewards.stickers[island.id] || []).length,
    total: islandStickers(island.id).length,
    games: games.length,
  };
}

/**
 * La même carte en liste : chaque île y est une ligne complète, atteignable au clavier.
 * L'avancement ne doit jamais tenir à la seule position d'une île sur le dessin — et depuis que la
 * scène ne montre plus les cinq noms à la fois (#96), c'est cette liste qui porte la lecture :
 * nom, matière, étoiles, gommettes, état fermé et seuil à atteindre.
 */
function islandRow(entry) {
  const detail = entry.unlocked
    ? `${entry.stickers} / ${entry.total} gommettes`
    : `Encore ${plural(entry.starsLeft, 'étoile')} pour l'ouvrir`;
  const body = h('span', { class: 'map-row__body' },
    h('span', { class: 'map-row__name', text: entry.name }),
    h('span', { class: 'map-row__meta', text: entry.subject }),
    h('span', { class: 'map-row__meta', text: detail }));
  const mascot = mascotSticker(entry.id, { face: islandFace(entry.unlocked), className: 'map-row__art' });
  if (!entry.unlocked) {
    return h('li', {},
      h('div', { class: 'map-row map-row--locked', dataset: { island: entry.id }, 'aria-label': entry.label },
        mascot, body,
        h('span', { class: 'map-row__stars', 'aria-hidden': 'true' },
          icon('lock', { size: 22 }), h('span', { text: `${entry.starsLeft} ⭐` }))));
  }
  return h('li', {},
    h('a', {
      class: 'map-row', href: `#/ile/${entry.id}`, dataset: { island: entry.id }, 'aria-label': entry.label,
    },
    mascot, body,
    h('span', { class: 'map-row__stars', 'aria-hidden': 'true' },
      icon('star', { size: 20 }),
      h('span', { text: entry.games ? `${entry.earned} / ${entry.possible}` : '—' }))));
}

export default {
  render(view, { app }) {
    const profile = app.store.getProfile(app.profileId);
    const rewards = readRewards(profile);
    const stars = totalStars(profile?.progress);
    const realGames = GAMES.filter((g) => !g.demo);
    // Tant qu'aucun vrai jeu n'existe, la démonstration est proposée sur l'accueil.
    const demos = realGames.length ? [] : GAMES.filter((g) => g.demo);

    // Les îles triées de la plus lointaine à la plus proche (pour le dessin), puis remises dans
    // l'ordre du registre pour la liste : on lit la liste dans l'ordre de la progression.
    const entries = archipelago(ISLANDS, (id) => readIsland(ISLANDS.find((i) => i.id === id), { profile, rewards, stars }));
    const byId = new Map(entries.map((entry) => [entry.id, entry]));

    view.append(h('div', { class: 'page home' },
      h('div', { class: 'home__hero' },
        h('div', { class: 'home__title-row' },
          h('span', { class: 'home__deco home__deco--left', 'aria-hidden': 'true' }, drawDeco({ shape: 'star', face: 'happy' })),
          h('h1', { class: 'home__title', text: 'Jeux CE1' }),
          h('span', { class: 'home__deco home__deco--right', 'aria-hidden': 'true' }, drawDeco({ shape: 'heart', face: 'joyful' }))),
        h('p', { class: 'home__subtitle cursive', text: 'Choisis une île et joue !' })),
      rewardBar(rewards),
      companionCard(withAccessory(readCompanion(profile), profile)),
      dailyCard(rewards, realGames.length > 0),
      h('section', { class: 'map-page', 'aria-labelledby': 'archipel' },
        h('h2', { class: 'visually-hidden', id: 'archipel', text: 'L\'archipel' }),
        archipelagoScene(entries),
        h('ul', { class: 'map-list' }, ISLANDS.map((island) => islandRow(byId.get(island.id)))),
        h('p', { class: 'map-hint', text: 'Touche une île pour y entrer.' })),
      demos.length > 0 && h('section', { class: 'workshop', 'aria-labelledby': 'atelier' },
        h('h2', { class: 'workshop__title', id: 'atelier', text: 'Atelier' }),
        h('ul', { class: 'game-list' }, demos.map((g) => gameCard(g, profile))))));
    app.setTitle('');
  },
};

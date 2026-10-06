// Défi du jour (#20) : 5 questions mélangées, tirées des jeux DÉJÀ JOUÉS, les mêmes toute la
// journée pour tout le monde (graine = date locale). Une récompense par jour.
//
// Le défi n'est pas enregistré dans l'historique des parties : ce n'est pas une partie d'un jeu
// précis, et il ne doit pas fausser la progression par niveau. Les points, eux, comptent.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { createRng } from '../core/random.js';
import { getGameProgress } from '../core/history.js';
import { GAMES, ISLANDS, loadGame } from '../games/registry.js';
import { rewardSummary } from '../core/rewards-live.js';
import {
  DAILY_QUESTIONS, dailyKey, dailySeed, isDailyDone, readRewards,
} from '../core/rewards.js';
import { createGameView, starRow, gradeBanner, extrasList, celebrate } from './play.js';

const END_TITLES = ['Continue, tu progresses !', 'Bien joué !', 'Très bien !', 'Bravo !'];

/** Jeux déjà joués ; à défaut, le premier jeu du registre (jamais d'écran vide). */
function candidateGames(profile) {
  const real = GAMES.filter((g) => !g.demo);
  const played = real.filter((g) => getGameProgress(profile, g.id).plays > 0);
  if (played.length) return { games: played, discovery: false };
  return { games: real.length ? real.slice(0, 1) : GAMES.slice(0, 1), discovery: true };
}

/**
 * Construit le « jeu » du défi : un générateur qui pioche dans les jeux retenus, au hasard mais
 * toujours de la même façon pour une même journée (la graine vient de la date locale).
 */
function buildDailyGame(entries, { key, island }) {
  return {
    id: 'defi',
    title: 'Défi du jour',
    island: 'defi',
    rewardIsland: island,     // l'île dont la gommette est à gagner aujourd'hui
    daily: { key },
    levels: [{ label: 'Défi du jour' }],
    makeQuestion(level, rng, seen) {
      const entry = rng.pick(entries);
      return entry.game.makeQuestion(rng.int(1, entry.maxLevel), rng, seen);
    },
  };
}

export default {
  title: 'Défi du jour',
  async render(view, { app }) {
    const profile = app.store.getProfile(app.profileId);
    const rewards = readRewards(profile);
    const key = dailyKey();
    const seed = dailySeed();
    const alreadyDone = isDailyDone(rewards);

    const root = h('section', { class: 'page play daily', dataset: { island: 'defi' } });
    view.append(root);

    const { games, discovery } = candidateGames(profile);
    const loaded = (await Promise.all(games.map((g) => loadGame(g.id)))).filter(Boolean);
    const entries = loaded.map((game) => ({
      game,
      // On ne pose que des questions de niveaux déjà ouverts : le défi doit rester faisable.
      maxLevel: Math.max(1, Math.min(game.levels.length, getGameProgress(profile, game.id).unlocked)),
    }));

    if (!entries.length) {
      root.replaceChildren(h('div', { class: 'card soon' },
        h('h1', { class: 'page-title', text: 'Défi du jour' }),
        h('p', { class: 'cursive soon__text', text: 'Le défi arrive bientôt !' }),
        h('a', { class: 'btn btn--primary', href: '#/' }, icon('home'), h('span', { text: 'La carte des îles' }))));
      return undefined;
    }

    // L'île de la gommette du jour : tirée de la même date, donc stable toute la journée.
    const island = createRng(seed ^ 0x5bf03635).pick(ISLANDS).id;
    const game = buildDailyGame(entries, { key, island });

    let stopConfetti = () => {};
    const player = createGameView(root, { app, game, onEnd: (result, { session }) => showEnd(result, session) });

    function cleanup() {
      stopConfetti();
      stopConfetti = () => {};
      player.destroy();
    }

    function startDaily() {
      cleanup();
      player.start(1, { seed, count: DAILY_QUESTIONS, record: null });
    }

    function showIntro() {
      cleanup();
      const titles = entries.map((e) => e.game.title);
      root.replaceChildren(h('div', { class: 'card daily-intro' },
        h('span', { class: 'emoji daily-intro__icon', role: 'img', 'aria-label': 'Coffre au trésor', text: '🗝️' }),
        h('h1', { class: 'page-title', text: 'Défi du jour' }),
        h('p', { class: 'daily-intro__lead cursive', text: `${DAILY_QUESTIONS} questions mélangées, rien que pour aujourd'hui.` }),
        h('p', { class: 'daily-intro__games' },
          h('span', { class: 'daily-intro__label', text: discovery ? 'Pour découvrir : ' : 'Au programme : ' }),
          h('span', { text: titles.join(', ') })),
        alreadyDone
          ? h('p', { class: 'daily-intro__done' }, icon('check', { size: 22 }),
            h('span', { text: 'Tu as déjà gagné la récompense du jour. Rejoue quand tu veux !' }))
          : h('p', { class: 'daily-intro__prize', text: 'Une récompense t\'attend au bout !' }),
        h('div', { class: 'end__actions' },
          h('button', { type: 'button', class: 'btn btn--primary', onclick: startDaily },
            h('span', { text: alreadyDone ? 'Rejouer le défi' : 'Commencer' }), icon('arrowRight')),
          h('a', { class: 'btn btn--ghost', href: '#/' }, icon('home'), h('span', { text: 'La carte des îles' })))));
    }

    function showEnd(result, session) {
      player.destroy();
      const { score, total, stars } = result;
      const gained = rewardSummary(session);
      stopConfetti();
      stopConfetti = celebrate(stars);

      root.replaceChildren(h('div', { class: 'end card' },
        h('h1', { class: 'end__title stamp stamp--static', text: END_TITLES[stars] }),
        starRow(stars, { size: 56, animate: true }),
        h('p', { class: 'end__score' },
          h('strong', { text: String(score) }), ` ${score > 1 ? 'bonnes réponses' : 'bonne réponse'} sur ${total}`),
        gained?.grade && gradeBanner(gained.grade),
        extrasList(result.extras),
        h('p', { class: 'end__hint', text: 'Un nouveau défi t\'attend demain !' }),
        h('div', { class: 'end__actions' },
          h('a', { class: 'btn btn--primary', href: '#/album' }, icon('star'), h('span', { text: 'Mon album' })),
          h('a', { class: 'btn btn--secondary', href: '#/' }, icon('home'), h('span', { text: 'La carte des îles' })))));
      root.querySelector('.end__actions .btn')?.focus({ preventScroll: true });
    }

    showIntro();
    return cleanup;
  },
};

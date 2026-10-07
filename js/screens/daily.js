// Défi du jour (#20) : 5 questions mélangées, les mêmes toute la journée pour tout le monde
// (graine = date locale). Une récompense par jour.
//
// Le plan des 5 questions (quel jeu, quel niveau) est tiré par `buildDailyPlan` (core/rewards.js,
// pur et testé) : par matière puis par jeu pour ne pas écraser les matières qui ont peu de jeux,
// avec une question réservée à un jeu peu ou pas joué (#94). Cet écran ne fait que l'afficher.
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
  DAILY_QUESTIONS, dailyKey, dailySeed, isDailyDone, readRewards, buildDailyPlan,
} from '../core/rewards.js';
import { createGameView, starRow, gradeBanner, extrasList, celebrate, endCompanion, endChest, companionAction } from './play.js';

const END_TITLES = ['Continue, tu progresses !', 'Bien joué !', 'Très bien !', 'Bravo !'];

/**
 * Tous les jeux réels sont candidats, même jamais ouverts : sinon le défi ne peut jamais faire
 * découvrir une matière qu'on n'a pas encore essayée (#94). À défaut d'aucun jeu réel, le jeu de
 * démonstration évite un écran vide.
 */
function candidateGames() {
  const real = GAMES.filter((g) => !g.demo);
  return real.length ? real : GAMES.slice(0, 1);
}

/**
 * Construit le « jeu » du défi : ses questions suivent le plan `{ id, level, discovery }` déjà
 * tiré (voir `buildDailyPlan`, pur et testé), toujours dans le même ordre pour une même journée.
 * `seen.size` donne le numéro de la question en cours : c'est le compte de celles déjà acceptées
 * par le moteur (`engine.js`), qui peut retenter plusieurs fois une même question en cas de doublon.
 */
function buildDailyGame(plan, byId, { key, island }) {
  return {
    id: 'defi',
    title: 'Défi du jour',
    island: 'defi',
    rewardIsland: island,     // l'île dont la gommette est à gagner aujourd'hui
    daily: { key },
    levels: [{ label: 'Défi du jour' }],
    makeQuestion(level, rng, seen) {
      const slot = plan[Math.min(seen.size, plan.length - 1)];
      const entry = byId.get(slot.id);
      return entry.game.makeQuestion(slot.level, rng, seen);
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

    const loaded = (await Promise.all(candidateGames().map((g) => loadGame(g.id)))).filter(Boolean);
    const entries = loaded.map((game) => {
      const progress = getGameProgress(profile, game.id);
      return {
        id: game.id,
        subject: game.subject,
        game,
        plays: progress.plays,
        // On ne pose que des questions de niveaux déjà ouverts : le défi doit rester faisable.
        maxLevel: Math.max(1, Math.min(game.levels.length, progress.unlocked)),
      };
    });

    if (!entries.length) {
      root.replaceChildren(h('div', { class: 'card soon' },
        h('h1', { class: 'page-title', text: 'Défi du jour' }),
        h('p', { class: 'cursive soon__text', text: 'Le défi arrive bientôt !' }),
        h('a', { class: 'btn btn--primary', href: '#/' }, icon('home'), h('span', { text: 'La carte des îles' }))));
      return undefined;
    }

    const byId = new Map(entries.map((e) => [e.id, e]));
    const plan = buildDailyPlan(entries, seed, { count: DAILY_QUESTIONS });
    const discovery = plan.some((slot) => slot.discovery);
    const planTitles = [...new Set(plan.map((slot) => byId.get(slot.id).game.title))];

    // L'île de la gommette du jour : tirée de la même date, donc stable toute la journée.
    const island = createRng(seed ^ 0x5bf03635).pick(ISLANDS).id;
    const game = buildDailyGame(plan, byId, { key, island });

    let stopConfetti = () => {};
    let chest = null;
    const player = createGameView(root, { app, game, onEnd: (result, { session }) => showEnd(result, session) });

    function cleanup() {
      stopConfetti();
      stopConfetti = () => {};
      chest?.destroy();
      chest = null;
      player.destroy();
    }

    function startDaily() {
      cleanup();
      player.start(1, { seed, count: DAILY_QUESTIONS, record: null });
    }

    function showIntro() {
      cleanup();
      root.replaceChildren(h('div', { class: 'card daily-intro' },
        h('span', { class: 'emoji daily-intro__icon', role: 'img', 'aria-label': 'Coffre au trésor', text: '🗝️' }),
        h('h1', { class: 'page-title', text: 'Défi du jour' }),
        h('p', { class: 'daily-intro__lead cursive', text: `${DAILY_QUESTIONS} questions mélangées, rien que pour aujourd'hui.` }),
        h('p', { class: 'daily-intro__games' },
          h('span', { class: 'daily-intro__label', text: discovery ? 'Pour découvrir : ' : 'Au programme : ' }),
          h('span', { text: planTitles.join(', ') })),
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
      chest?.destroy();
      chest = endChest(session);

      root.replaceChildren(h('div', { class: 'end card' },
        endCompanion(stars),
        h('h1', { class: 'end__title stamp stamp--static', text: END_TITLES[stars] }),
        starRow(stars, { size: 56, animate: true }),
        h('p', { class: 'end__score' },
          h('strong', { text: String(score) }), ` ${score > 1 ? 'bonnes réponses' : 'bonne réponse'} sur ${total}`),
        chest?.el,
        gained?.grade && gradeBanner(gained.grade),
        extrasList(result.extras),
        h('p', { class: 'end__hint', text: 'Un nouveau défi t\'attend demain !' }),
        h('div', { class: 'end__actions' },
          companionAction(session),
          h('a', { class: `btn ${companionAction(session) ? 'btn--secondary' : 'btn--primary'}`, href: '#/album' }, icon('album'), h('span', { text: 'Mon album' })),
          h('a', { class: 'btn btn--secondary', href: '#/' }, icon('home'), h('span', { text: 'La carte des îles' })))));
      if (chest) chest.focus(); else root.querySelector('.end__actions .btn')?.focus({ preventScroll: true });
    }

    showIntro();
    return cleanup;
  },
};

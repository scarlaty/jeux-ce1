// Défi du jour (#/defi) : présentation, puis 5 questions jouées comme une partie normale.
// Le tirage (core/daily.js) ne dépend que de la date et des jeux joués : même défi toute la journée.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { chestArt } from '../core/ui/islands.js';
import { getRewards, POINTS } from '../core/rewards.js';
import {
  DAILY_COUNT, dateKey, dailyCandidates, planDaily, buildDailyQuestions, createDailyGame, dailyLevel,
} from '../core/daily.js';
import { GAMES, loadGame } from '../games/registry.js';
import { mountPlay } from './play.js';

const longDate = (d) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

async function buildGame(key, profile) {
  const ids = planDaily(key, dailyCandidates(GAMES, profile).map((g) => g.id));
  const loaded = new Map();
  for (const id of new Set(ids)) loaded.set(id, await loadGame(id));
  const entries = ids.map((id) => ({ game: loaded.get(id), level: dailyLevel(loaded.get(id), profile) }));
  return createDailyGame(key, buildDailyQuestions(key, entries));
}

export default {
  title: 'Défi du jour',
  async render(view, { app }) {
    const today = new Date();
    const key = dateKey(today);
    const profile = app.store.getProfile(app.profileId);
    const done = getRewards(profile).daily.last === key;
    const game = await buildGame(key, profile);
    let cleanup = null;

    const start = h('button', {
      type: 'button',
      class: 'btn btn--primary daily__go',
      onclick: () => {
        intro.remove();
        cleanup = mountPlay(view, app, game, { single: { level: 1, count: DAILY_COUNT }, backHref: '#/' });
      },
    }, h('span', { text: done ? 'Rejouer le défi' : 'C\'est parti !' }), icon('arrowRight'));

    const intro = h('section', { class: 'page page--narrow daily' },
      h('div', { class: `card daily__card${done ? ' is-done' : ''}` },
        h('span', { class: 'daily__chest' }, chestArt(done)),
        h('h1', { class: 'page-title', text: 'Défi du jour' }),
        h('p', { class: 'daily__date cursive', text: longDate(today) }),
        h('p', { class: 'daily__lead', text: `${DAILY_COUNT} questions mélangées, tirées de tes jeux.` }),
        done
          ? h('p', { class: 'daily__status' }, icon('check', { size: 22 }),
            h('span', { text: 'Défi réussi aujourd\'hui ! Tu peux le rejouer pour t\'entraîner. Un nouveau défi t\'attend demain.' }))
          : h('p', { class: 'daily__reward', text: `À gagner : une gommette brillante et ${POINTS.daily} points de bonus.` }),
        start));
    view.append(intro);
    start.focus({ preventScroll: true });
    return () => cleanup?.();
  },
};

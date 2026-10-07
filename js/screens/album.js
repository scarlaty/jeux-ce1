// Album de gommettes (#18) : une collection par île. Les cases vides restent visibles —
// l'enfant voit ce qu'il lui reste à gagner, sans jamais être mise en échec.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { mascotSticker, albumFace } from '../core/ui/mascot.js';
import { ISLANDS } from '../games/registry.js';
import {
  readRewards, islandStickers, gradeProgress, stickerCount, stickerTotal, GRADES, gradeRank,
} from '../core/rewards.js';

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** Une case de l'album : gommette gagnée, ou emplacement vide à remplir. */
function stickerSlot(sticker, owned) {
  if (!owned) {
    return h('li', { class: 'sticker sticker--empty' },
      h('span', { class: 'sticker__hole', 'aria-hidden': 'true', text: '?' }),
      h('span', { class: 'visually-hidden', text: 'Gommette à gagner' }));
  }
  return h('li', { class: 'sticker' },
    h('span', { class: 'emoji sticker__art', role: 'img', 'aria-label': sticker.name, text: sticker.emoji }),
    h('span', { class: 'sticker__name', text: sticker.name }));
}

function islandSection(island, owned) {
  const catalog = islandStickers(island.id);
  const have = new Set(owned);
  return h('section', { class: 'album-island', dataset: { island: island.id }, 'aria-labelledby': `album-${island.id}` },
    h('div', { class: 'album-island__head' },
      mascotSticker(island.id, {
        face: albumFace(have.size, catalog.length),
        loop: albumFace(have.size, catalog.length) === 'joyful' ? 'bounce' : null,
        className: 'album-island__mascot' })
        || h('span', { class: 'island-card__dot', 'aria-hidden': 'true' }),
      h('h2', { class: 'album-island__name', id: `album-${island.id}`, text: island.name }),
      h('span', { class: 'album-island__count', text: `${have.size} / ${catalog.length}` })),
    h('ul', { class: 'sticker-grid' }, catalog.map((s) => stickerSlot(s, have.has(s.id)))));
}

/** Échelle des grades : celui atteint, les suivants à gagner (#17). */
function gradeLadder(points) {
  const rank = gradeRank(points);
  return h('ol', { class: 'grade-ladder' }, GRADES.map((grade, i) => h('li', {
    class: `grade-step${i === rank ? ' is-current' : ''}${i < rank ? ' is-done' : ''}`,
  },
  h('span', { class: 'emoji grade-step__icon', role: 'img', 'aria-label': grade.name, text: grade.icon }),
  h('span', { class: 'grade-step__name', text: grade.name }),
  h('span', { class: 'grade-step__points', text: i <= rank ? 'gagné' : `${grade.points} points` }))));
}

export default {
  title: 'Mon album',
  render(view, { app }) {
    const rewards = readRewards(app.store.getProfile(app.profileId));
    const { grade, next, remaining, ratio } = gradeProgress(rewards.points);
    const owned = stickerCount(rewards);

    view.append(h('div', { class: 'page album' },
      h('h1', { class: 'page-title', text: 'Mon album' }),
      h('div', { class: 'card album-top' },
        h('span', { class: 'emoji album-top__icon', role: 'img', 'aria-label': `Grade : ${grade.name}`, text: grade.icon }),
        h('div', { class: 'album-top__body' },
          h('p', { class: 'album-top__grade', text: grade.name }),
          h('p', { class: 'album-top__points', text: `${plural(rewards.points, 'point')} · ${owned} / ${stickerTotal()} gommettes` }),
          next
            ? h('span', { class: 'meter', role: 'img', 'aria-label': `Encore ${plural(remaining, 'point')} pour devenir ${next.name}` },
              h('span', { class: 'meter__fill', style: `--ratio: ${Math.min(1, ratio).toFixed(3)}` }))
            : null,
          next
            ? h('p', { class: 'album-top__next', text: `Encore ${plural(remaining, 'point')} pour devenir ${next.name}.` })
            : h('p', { class: 'album-top__next', text: 'Tu as gagné tous les grades. Bravo !' }))),
      h('h2', { class: 'album-subtitle', text: 'Mes grades' }),
      gradeLadder(rewards.points),
      h('h2', { class: 'album-subtitle', text: 'Mes gommettes' }),
      h('p', { class: 'album-hint cursive', text: 'Réussis une partie pour gagner une gommette, et trois étoiles pour en gagner deux !' }),
      h('div', { class: 'album-islands' }, ISLANDS.map((island) => islandSection(island, rewards.stickers[island.id] || []))),
      h('div', { class: 'album-actions' },
        h('a', { class: 'btn btn--primary', href: '#/' }, icon('home'), h('span', { text: 'La carte des îles' })))));
    app.setTitle('Mon album');
  },
};

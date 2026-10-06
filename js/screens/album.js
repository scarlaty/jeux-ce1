// Album de gommettes (#/album, #/album/<île>) : une page par île + la page des défis du jour.
// Cases vides en silhouette « ? » ; les gommettes gagnées depuis la dernière visite se collent
// sous les yeux de l'enfant, puis sont marquées comme vues.
import { h } from '../core/ui/dom.js';
import { stickerEl, emptySlot } from '../core/ui/rewards.js';
import { getRewards, ownedIds, bookProgress, totalProgress, markSeen } from '../core/rewards.js';
import { STICKER_BOOKS, getBook, findSticker } from '../data/stickers.js';

export default {
  title: 'Mon album',
  render(view, { params, app }) {
    const rewards = getRewards(app.store.getProfile(app.profileId));
    const owned = ownedIds(rewards);
    const fresh = new Set(rewards.unseen);
    const firstFresh = rewards.unseen.map(findSticker).find(Boolean);
    let current = getBook(params.island)?.id || firstFresh?.book || STICKER_BOOKS[0].id;

    if (fresh.size) app.store.updateProfile(app.profileId, (p) => ({ ...p, rewards: markSeen(getRewards(p)) }));

    const tabs = STICKER_BOOKS.map((book) => {
      const { owned: n, total } = bookProgress(rewards, book.id);
      return h('button', {
        type: 'button',
        role: 'tab',
        class: 'album-tab',
        id: `tab-${book.id}`,
        'aria-controls': 'album-page',
        dataset: book.island ? { island: book.island } : { book: book.id },
        onclick: () => select(book.id, true),
      },
      h('span', { class: 'album-tab__name', text: book.name }),
      h('span', { class: 'album-tab__count', text: `${n}/${total}` }));
    });

    const page = h('section', { class: 'album-page', id: 'album-page', role: 'tabpanel' });

    function select(bookId, byUser) {
      current = bookId;
      const book = getBook(bookId);
      tabs.forEach((tab) => {
        const on = tab.id === `tab-${bookId}`;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
      });
      page.setAttribute('aria-labelledby', `tab-${bookId}`);
      if (book.island) page.dataset.island = book.island;
      else delete page.dataset.island;
      page.dataset.book = book.id;
      const { owned: n, total, complete } = bookProgress(rewards, bookId);
      let delay = 300;
      page.replaceChildren(
        h('header', { class: 'album-page__head' },
          h('h2', { class: 'album-page__title', text: book.name }),
          h('p', { class: 'album-page__count' }, h('strong', { text: String(n) }), ` / ${total} gommettes`)),
        complete && h('p', { class: 'album-page__complete cursive', text: 'Album complet, bravo !' }),
        book.special && n === 0 && h('p', { class: 'album-page__hint', text: 'Relève le défi du jour pour gagner ces gommettes brillantes.' }),
        h('ol', { class: 'album-grid' }, book.stickers.map((st) => {
          const has = owned.has(st.id);
          const isFresh = has && fresh.has(st.id);
          const item = has
            ? stickerEl({ ...st, book: book.id }, { fresh: isFresh, delay: isFresh ? (delay += 380) : 0 })
            : emptySlot(st);
          return h('li', { class: `album-cell${has ? ' is-owned' : ''}` },
            item,
            h('span', { class: 'album-cell__name', text: has ? st.name : '' }));
        })));
      book.stickers.forEach((st) => fresh.delete(st.id));   // ne se recollent pas au prochain passage
      if (byUser) history.replaceState(null, '', `#/album/${bookId}`);
    }

    // Flèches gauche/droite entre les onglets (motif « tablist » accessible).
    const tabList = h('div', { class: 'album-tabs', role: 'tablist', 'aria-label': 'Pages de l\'album',
      onkeydown: (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const i = STICKER_BOOKS.findIndex((b) => b.id === current);
        const next = STICKER_BOOKS[(i + (e.key === 'ArrowRight' ? 1 : -1) + STICKER_BOOKS.length) % STICKER_BOOKS.length];
        select(next.id, true);
        tabs.find((t) => t.id === `tab-${next.id}`).focus();
      } }, tabs);

    const total = totalProgress(rewards);
    view.append(h('div', { class: 'page page--wide album' },
      h('header', { class: 'album__head' },
        h('h1', { class: 'page-title', text: 'Mon album de gommettes' }),
        h('p', { class: 'album__total' }, h('strong', { text: String(total.owned) }), ` / ${total.total} gommettes`)),
      tabList,
      page));
    select(current, false);
  },
};

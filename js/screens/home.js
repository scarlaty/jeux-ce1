// Accueil : la carte au trésor des îles (#19). Chaque île mène à la liste de ses jeux (#/ile/<id>) ;
// le coffre au centre est le défi du jour (#/defi). Toutes les îles sont ouvertes ; une île sans jeu
// affiche « Bientôt ». Le jeu de démonstration n'apparaît pas sur la carte.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { islandArt, chestArt } from '../core/ui/islands.js';
import { gradeMedal, gradeProgress, stickerEl, formatPoints } from '../core/ui/rewards.js';
import { getRewards, gradeInfo, totalProgress } from '../core/rewards.js';
import { dateKey } from '../core/daily.js';
import { findSticker } from '../data/stickers.js';
import { ISLANDS } from '../games/registry.js';
import { islandStars } from './island.js';
import { createRng } from '../core/random.js';

// Position des îles (centre, en % de la carte) et ordre du chemin pointillé, pour la carte
// en largeur (tablette, PC) et en hauteur (téléphone).
const LAYOUTS = {
  wide: {
    width: 1600, height: 1000,
    at: { mots: [17, 25], nombres: [50, 17], mesures: [83, 26], monde: [23, 69], ailleurs: [77, 69], defi: [50, 56] },
    path: ['mots', 'nombres', 'mesures', 'ailleurs', 'monde', 'defi'],
    compass: [1500, 900],
    boat: [1090, 450],
  },
  tall: {
    width: 1000, height: 2300,
    at: { mots: [28, 9], nombres: [72, 24], mesures: [28, 40], monde: [72, 56], ailleurs: [28, 72], defi: [70, 88] },
    path: ['mots', 'nombres', 'mesures', 'monde', 'ailleurs', 'defi'],
    compass: [190, 2140],
    boat: [790, 900],
  },
};

const NS = 'http://www.w3.org/2000/svg';

/** Chemin pointillé ondulé passant par les îles, dans l'ordre du tracé. */
function trailPath(layout) {
  const pts = layout.path.map((id) => layout.at[id].map((v, i) => (v / 100) * (i ? layout.height : layout.width)));
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const bend = (i % 2 ? 1 : -1) * 0.22;
    const cx = (x0 + x1) / 2 - (y1 - y0) * bend;
    const cy = (y0 + y1) / 2 + (x1 - x0) * bend;
    d += ` Q${cx.toFixed(0)} ${cy.toFixed(0)} ${x1} ${y1}`;
  }
  return d;
}

/** Vaguelettes réparties (toujours au même endroit grâce à la graine). */
function waves(layout) {
  const rng = createRng(layout.width + layout.height);
  const out = [];
  const count = Math.round((layout.width * layout.height) / 52000);
  for (let i = 0; i < count; i++) {
    const x = rng.int(20, layout.width - 60);
    const y = rng.int(20, layout.height - 30);
    out.push(`M${x} ${y}q10-9 20 0t20 0`);
  }
  return out.join('');
}

/** Fond de la carte : mer, vaguelettes, chemin du trésor, rose des vents, petit bateau. */
function seaSvg(name) {
  const layout = LAYOUTS[name];
  const { width: W, height: H } = layout;
  const [cx, cy] = layout.compass;
  const [bx, by] = layout.boat;
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el.setAttribute('class', `map__sea map__sea--${name}`);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('focusable', 'false');
  el.setAttribute('preserveAspectRatio', 'none');
  // Contenu constant (aucune donnée saisie) : les coordonnées viennent de LAYOUTS.
  el.innerHTML = `
    <rect class="sea" width="${W}" height="${H}"/>
    <ellipse class="sea-deep" cx="${W * 0.5}" cy="${H * 0.5}" rx="${W * 0.36}" ry="${H * 0.3}"/>
    <path class="sea-wave" d="${waves(layout)}"/>
    <path class="sea-trail" d="${trailPath(layout)}"/>
    <g class="sea-compass" transform="translate(${cx} ${cy})">
      <circle r="58"/><circle r="44" class="sea-compass__inner"/>
      <path class="sea-compass__star" d="M0-70 12-12 70 0 12 12 0 70-12 12-70 0-12-12z"/>
      <path class="sea-compass__north" d="M0-70 12-12H-12z"/>
      <text y="-80">N</text>
    </g>
    <g class="sea-boat" transform="translate(${bx} ${by})">
      <g class="sea-boat__bob">
        <path class="sea-boat__hull" d="M-50 0h100l-16 24h-68z"/>
        <path class="sea-boat__mast" d="M0 0v-84"/>
        <path class="sea-boat__sail" d="M4-80c30 18 36 46 34 70H4z"/>
        <path class="sea-boat__flag" d="M0-84l-22 8 22 8z"/>
      </g>
    </g>`;
  return el;
}

function placement(id) {
  const [lx, ly] = LAYOUTS.wide.at[id];
  const [px, py] = LAYOUTS.tall.at[id];
  return `--lx:${lx};--ly:${ly};--px:${px};--py:${py}`;
}

function islandLink(island, profile) {
  const { stars, max, games } = islandStars(island.id, profile);
  const status = games
    ? h('span', { class: 'map-island__stars' },
      icon('star', { size: 18 }), h('span', { text: `${stars} / ${max}` }),
      h('span', { class: 'visually-hidden', text: ' étoiles' }))
    : h('span', { class: 'map-island__soon', text: 'Bientôt' });
  return h('a', { class: `map-island${games ? '' : ' is-empty'}`, href: `#/ile/${island.id}`, dataset: { island: island.id }, style: placement(island.id) },
    h('span', { class: 'map-island__art' }, islandArt(island.id)),
    h('span', { class: 'map-island__label' },
      h('span', { class: 'map-island__name', text: island.name }),
      status));
}

function chestLink(done) {
  return h('a', { class: `map-chest${done ? ' is-done' : ''}`, href: '#/defi', style: placement('defi') },
    h('span', { class: 'map-chest__art' }, chestArt(done)),
    h('span', { class: 'map-chest__label' },
      h('span', { class: 'map-chest__name', text: 'Défi du jour' }),
      done
        ? h('span', { class: 'map-chest__done' }, icon('check', { size: 18 }), h('span', { text: 'Fait aujourd\'hui' }))
        : h('span', { class: 'map-chest__todo', text: '5 questions' })));
}

/** Salutation : prénom et avatar du profil s'ils existent (fournis par l'écran de profil). */
function hello(profile) {
  const name = typeof profile?.name === 'string' ? profile.name.trim() : '';
  const avatar = typeof profile?.avatar === 'string' ? profile.avatar : '';
  return h('div', { class: 'map-hello' },
    avatar && h('span', { class: 'map-hello__avatar emoji', 'aria-hidden': 'true', text: avatar }),
    h('div', {},
      h('h1', { class: 'map-hello__title', text: name ? `Bonjour ${name} !` : 'La carte des îles' }),
      h('p', { class: 'map-hello__lead cursive', text: 'Choisis une île et pars à l\'aventure !' })));
}

function gradeCard(rewards) {
  const info = gradeInfo(rewards.points);
  return h('div', { class: 'reward-card reward-card--grade' },
    gradeMedal(info.grade),
    h('div', { class: 'reward-card__body' },
      h('p', { class: 'reward-card__kicker', text: 'Mon grade' }),
      h('p', { class: 'reward-card__title', text: info.grade.name }),
      h('p', { class: 'reward-card__points' }, icon('sparkle', { size: 18 }), h('span', { text: `${formatPoints(rewards.points)} points` })),
      gradeProgress(info, rewards.points)));
}

function albumCard(rewards) {
  const { owned, total } = totalProgress(rewards);
  const last = rewards.stickers.slice(-3).map((x) => findSticker(x.id)).filter(Boolean);
  return h('a', { class: 'reward-card reward-card--album', href: '#/album' },
    h('span', { class: 'reward-card__stack' },
      last.length ? last.map((st) => stickerEl(st, { size: 's' })) : h('span', { class: 'sticker-slot sticker-slot--s', 'aria-hidden': 'true', text: '?' })),
    h('span', { class: 'reward-card__body' },
      h('span', { class: 'reward-card__kicker', text: 'Mon album' }),
      h('span', { class: 'reward-card__title', text: `${owned} / ${total} gommettes` }),
      rewards.unseen.length > 0 && h('span', { class: 'reward-card__new', text: rewards.unseen.length > 1 ? `${rewards.unseen.length} nouvelles !` : '1 nouvelle !' })),
    icon('arrowRight', { className: 'reward-card__go' }));
}

export default {
  render(view, { app }) {
    const profile = app.store.getProfile(app.profileId);
    const rewards = getRewards(profile);
    const done = rewards.daily.last === dateKey();

    const map = h('nav', { class: 'map', 'aria-label': 'Carte des îles' },
      seaSvg('wide'), seaSvg('tall'),
      h('span', { class: 'map__tape map__tape--a', 'aria-hidden': 'true' }),
      h('span', { class: 'map__tape map__tape--b', 'aria-hidden': 'true' }),
      ISLANDS.map((island) => islandLink(island, profile)),
      chestLink(done));

    view.append(h('div', { class: 'page page--wide home' },
      h('header', { class: 'map-hero' },
        hello(profile),
        h('div', { class: 'map-hero__cards' }, gradeCard(rewards), albumCard(rewards))),
      map));
    app.setTitle('');
  },
};

// Affichage des récompenses : compteur de points en direct, gommettes, tampon de la maîtresse,
// confettis, gains de fin de partie, passage de grade. Les calculs sont dans core/rewards.js.
import { h } from './dom.js';
import { icon } from './icons.js';
import { gameEvents } from '../engine.js';
import { answerPoints, POINTS } from '../rewards.js';
import { getBook } from '../../data/stickers.js';

export const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export const formatPoints = (n) => n.toLocaleString('fr-FR');

// --- Compteur de points en direct --------------------------------------------------------------

/**
 * Pastille « ✦ 45 » de la partie en cours : écoute les réponses de `session`, fait défiler le
 * nombre et montre « +15 » à chaque bonne réponse. Discret : rien n'est annoncé au lecteur d'écran
 * pendant que l'enfant lit la consigne. `destroy()` débranche l'écouteur.
 */
export function pointsCounter(session) {
  let shown = 0;
  let target = 0;
  let frame = 0;
  const value = h('span', { class: 'points__value', text: '0' });
  const el = h('span', { class: 'points', title: 'Points de la partie' },
    icon('sparkle', { size: 20 }), value, h('span', { class: 'visually-hidden', text: ' points' }));

  function roll() {
    cancelAnimationFrame(frame);
    if (reducedMotion()) { shown = target; value.textContent = formatPoints(shown); return; }
    const from = shown;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 450);
      shown = Math.round(from + (target - from) * (1 - (1 - k) ** 3));
      value.textContent = formatPoints(shown);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  const off = gameEvents.on('answer', (e) => {
    if (e.session !== session) return;
    const gain = answerPoints(e.correct, e.streak);
    if (!gain) return;
    target += gain;
    roll();
    const streak = gain > POINTS.correct;
    const float = h('span', { class: `points__float${streak ? ' is-streak' : ''}`, 'aria-hidden': 'true', text: `+${gain}` });
    el.append(float);
    el.classList.remove('is-bump');
    void el.offsetWidth;   // relance l'animation
    el.classList.add('is-bump');
    setTimeout(() => float.remove(), 1200);
  });

  return { el, destroy() { off(); cancelAnimationFrame(frame); } };
}

// --- Gommettes ---------------------------------------------------------------------------------

/** Petite inclinaison stable par gommette, pour un album « collé à la main ». */
function tiltOf(id) {
  let n = 0;
  for (const ch of id) n = (n * 31 + ch.codePointAt(0)) % 997;
  return (n % 13) - 6;
}

/** Gommette ronde à liseré blanc ; `rare` → brillante ; `fresh` → effet de collage. */
export function stickerEl(sticker, { fresh = false, delay = 0, size = '' } = {}) {
  const book = sticker.book ? getBook(sticker.book) : null;
  return h('span', {
    class: ['sticker', sticker.rare && 'sticker--rare', fresh && 'is-fresh', size && `sticker--${size}`].filter(Boolean).join(' '),
    dataset: book?.island ? { island: book.island } : {},
    style: `--tilt:${tiltOf(sticker.id)}deg;--delay:${delay}ms`,
  }, h('span', { class: 'emoji sticker__emoji', role: 'img', 'aria-label': sticker.name, text: sticker.emoji }));
}

/** Case vide de l'album : silhouette « ? » (en pointillés dorés pour une rare). */
export function emptySlot(sticker) {
  return h('span', { class: `sticker-slot${sticker.rare ? ' sticker-slot--rare' : ''}` },
    h('span', { 'aria-hidden': 'true', text: '?' }),
    h('span', { class: 'visually-hidden', text: sticker.rare ? 'gommette rare à trouver' : 'gommette à trouver' }));
}

// --- Tampon et confettis -----------------------------------------------------------------------

const STAMPS = [
  { text: 'Continue !', tone: 'blue' },
  { text: 'Bravo !', tone: 'green' },
  { text: 'Très bien !', tone: 'red' },
  { text: 'Super travail !', tone: 'red' },
];

/** Tampon de la maîtresse, encre un peu de travers. */
export function teacherStamp(stars) {
  const { text, tone } = STAMPS[Math.max(0, Math.min(3, stars))];
  const tilt = (stars % 2 ? -1 : 1) * (4 + Math.round(Math.random() * 4));
  return h('h1', { class: `teacher-stamp teacher-stamp--${tone}`, style: `--tilt:${tilt}deg` },
    h('span', { class: 'teacher-stamp__ink', text }));
}

const CONFETTI_TOKENS = ['--island-mots', '--island-nombres', '--island-mesures', '--island-monde', '--island-ailleurs', '--star'];

/**
 * Confettis légers sur un <canvas> (au-dessus de l'écran, sans bloquer les appuis).
 * Avec « réduire les animations » : quelques confettis immobiles autour de `host`.
 * Renvoie une fonction d'arrêt.
 */
export function confetti(host, { amount = 80 } = {}) {
  if (!amount) return () => {};
  const css = getComputedStyle(document.documentElement);
  const colors = CONFETTI_TOKENS.map((t) => css.getPropertyValue(t).trim()).filter(Boolean);
  const still = reducedMotion();
  const canvas = h('canvas', { class: `confetti${still ? ' confetti--still' : ''}`, 'aria-hidden': 'true' });
  (still ? host : document.body).append(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const box = canvas.getBoundingClientRect();
  const W = box.width;
  const H = box.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.scale(dpr, dpr);

  const rand = (a, b) => a + Math.random() * (b - a);
  const pieces = Array.from({ length: still ? Math.round(amount / 3) : amount }, (_, i) => ({
    x: still ? rand(0, W) : rand(W * 0.1, W * 0.9),
    y: still ? (i % 2 ? rand(0, H * 0.18) : rand(H * 0.82, H)) : rand(-H * 0.5, -10),
    vx: rand(-60, 60),
    vy: rand(60, 220),
    rot: rand(0, Math.PI * 2),
    vr: rand(-6, 6),
    size: rand(7, 13),
    round: Math.random() < 0.3,
    color: colors[i % colors.length],
    wobble: rand(0, Math.PI * 2),
  }));

  function draw(alpha = 1) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = alpha;
    for (const p of pieces) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * (0.6 + 0.4 * Math.abs(Math.sin(p.wobble))));
      }
      ctx.restore();
    }
  }

  if (still) {
    draw(0.9);
    return () => canvas.remove();
  }

  const DURATION = 3200;
  let frame = 0;
  let last = performance.now();
  const start = last;
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const p of pieces) {
      p.vy += 380 * dt;
      p.vx *= 0.99;
      p.wobble += dt * 8;
      p.x += (p.vx + Math.sin(p.wobble) * 30) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    const t = now - start;
    draw(t > DURATION - 700 ? Math.max(0, (DURATION - t) / 700) : 1);
    if (t < DURATION) frame = requestAnimationFrame(tick);
    else canvas.remove();
  };
  frame = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(frame); canvas.remove(); };
}

// --- Grade -------------------------------------------------------------------------------------

/** Médaille du grade (émoji dans une rosette aux couleurs de la classe). */
export function gradeMedal(grade, { size = '' } = {}) {
  return h('span', { class: `grade-medal grade-medal--${grade.id}${size ? ` grade-medal--${size}` : ''}` },
    h('span', { class: 'emoji', role: 'img', 'aria-label': grade.name, text: grade.emoji }));
}

/** Barre de progression vers le grade suivant. */
export function gradeProgress(info, points) {
  return h('span', { class: 'grade-progress' },
    h('span', { class: 'grade-progress__bar', role: 'progressbar', 'aria-label': info.next ? `Vers le grade ${info.next.name}` : 'Grade le plus haut',
      'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(info.ratio * 100)) },
      h('span', { class: 'grade-progress__fill', style: `--ratio:${info.ratio.toFixed(3)}` })),
    h('span', { class: 'grade-progress__text', text: info.next
      ? `Encore ${formatPoints(info.toNext)} points pour devenir ${info.next.name}`
      : `${formatPoints(points)} points : tu as le plus haut grade !` }));
}

/**
 * Fenêtre « Nouveau grade ! ». Se ferme avec le bouton ou Échap, puis rend le focus.
 * Renvoie une fonction de fermeture.
 */
export function showGradeUp(grade, { returnFocus = null } = {}) {
  const close = () => {
    overlay.remove();
    removeEventListener('keydown', onKey);
    returnFocus?.focus({ preventScroll: true });
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const button = h('button', { type: 'button', class: 'btn btn--primary', onclick: close }, h('span', { text: 'Super !' }));
  const overlay = h('div', { class: 'grade-up', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'grade-up-title' },
    h('div', { class: 'grade-up__card card' },
      h('span', { class: 'grade-up__rays', 'aria-hidden': 'true' }),
      h('p', { class: 'grade-up__kicker cursive', text: 'Nouveau grade !' }),
      gradeMedal(grade, { size: 'xl' }),
      h('h2', { class: 'grade-up__name', id: 'grade-up-title', text: `Tu es ${grade.name} !` }),
      h('p', { class: 'grade-up__text', text: 'Continue à jouer pour gagner le grade suivant.' }),
      button));
  document.body.append(overlay);
  addEventListener('keydown', onKey);
  button.focus({ preventScroll: true });
  return close;
}

// --- Gains de fin de partie --------------------------------------------------------------------

function pointsLine(x) {
  const details = [
    x.streak > 0 && `${x.streak} de série`,
    x.stars > 0 && `${x.stars} d'étoiles`,
    x.daily > 0 && `${x.daily} du défi du jour`,
  ].filter(Boolean);
  return h('li', { class: 'end-gain end-gain--points' },
    h('span', { class: 'end-gain__points' }, icon('sparkle', { size: 26 }), h('strong', { text: x.text })),
    details.length > 0 && h('span', { class: 'end-gain__detail', text: `dont ${details.join(', ')}` }));
}

function gradeLine(x) {
  const { grade } = x;
  return h('li', { class: `end-gain end-gain--grade${x.promoted ? ' is-promoted' : ''}` },
    gradeMedal(grade),
    h('span', { class: 'end-gain__body' },
      h('strong', { text: x.text }),
      gradeProgress(grade, grade.points)));
}

/**
 * Liste des gains (`result.extras`) : points, gommettes collées, grade ; les extras d'autres
 * modules ({ icon?, text }) s'affichent simplement.
 */
export function endRewards(extras) {
  const stickers = extras.filter((x) => x.kind === 'sticker');
  const items = [];
  for (const x of extras) {
    if (x.kind === 'points') items.push(pointsLine(x));
    else if (x.kind === 'grade') items.push(gradeLine(x));
    else if (x.kind !== 'sticker') {
      items.push(h('li', { class: 'end-gain end-gain--note' },
        x.icon && h('span', { class: 'emoji', 'aria-hidden': 'true', text: x.icon }), h('span', { text: x.text })));
    }
  }
  if (stickers.length) {
    items.splice(1, 0, h('li', { class: 'end-gain end-gain--stickers' },
      h('span', { class: 'end-gain__stickers' }, stickers.map((x, i) => stickerEl(x.sticker, { fresh: true, delay: 1100 + i * 350 }))),
      h('span', { class: 'end-gain__body' },
        h('strong', { text: stickers.length > 1 ? 'Nouvelles gommettes !' : 'Nouvelle gommette !' }),
        h('span', { text: stickers.map((x) => x.sticker.name).join(' et ') }),
        h('a', { class: 'end-gain__link', href: `#/album/${stickers[0].sticker.book}` }, icon('book', { size: 20 }), h('span', { text: 'Voir mon album' })))));
  }
  return items.length ? h('ul', { class: 'end-gains' }, items) : null;
}

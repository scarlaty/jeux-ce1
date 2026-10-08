// Écran de jeu : choix du niveau → 10 questions → fin de partie.
// Toute la logique (score, étoiles, déblocage, points) est dans core/engine.js et core/rewards.js ;
// ici, seulement l'affichage.
//
// `createGameView` est aussi utilisé par l'écran du défi du jour (#/defi) : il rend l'en-tête
// (progression + points en direct), les questions et les corrections, puis rend la main avec
// `onEnd(result, { session })` — chaque écran dessine sa propre fin de partie.
import { h, content } from '../core/ui/dom.js';
import { icon, badge } from '../core/ui/icons.js';
import { getQuestionUI } from '../core/ui/index.js';
import { confetti } from '../core/ui/confetti.js';
import { mascotSticker, hasMascot } from '../core/ui/mascot.js';
import {
  companionSticker, companionReaction, companionEndFace, reactCompanion, resetCompanion,
} from '../core/ui/companion.js';
import { draw as drawDeco } from '../core/ui/art/kawaii-deco.js';
import { play } from '../core/ui/art/kawaii.js';
import { createSession } from '../core/engine.js';
import { getGameProgress } from '../core/history.js';
import { rewardEvents, rewardSummary, liveTotal } from '../core/rewards-live.js';
import { currentCompanion, companionSummary } from '../core/companion-live.js';
import { chestSummary } from '../core/chest-live.js';
import { chestScene } from '../core/ui/chest.js';
import { loadGame } from '../games/registry.js';
import { isTrial, openOrTrial, TRIAL_END_TEXT } from '../core/trial.js';
import * as audio from '../core/audio.js';

const PRAISE = ['Bravo !', 'Super !', 'Exact !', 'Bien joué !', 'Génial !'];
const END_TITLES = ['Continue, tu progresses !', 'Bien joué !', 'Très bien !', 'Bravo !'];
const AUTO_NEXT_MS = 1100;
const GAIN_MS = 1000;

/** `display.show.flash` (durée en ms) : décompte 3, 2, 1, puis l'illustration s'affiche ce temps et disparaît ;
 *  alors seulement les réponses apparaissent, avec un bouton « Revoir » (sans décompte). Le contenu garde sa
 *  place (pas de saut de mise en page) et se cache aux lecteurs d'écran. Renvoie [zone illustrée, bouton]. */
const COUNTDOWN_STEP_MS = 700;
function flashControls(contentEl, ms, answerEl) {
  let timer = null;
  const hide = (el, hidden) => {
    el.classList.toggle('is-hidden', hidden);
    if (hidden) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden');
  };
  const count = h('div', { class: 'show__countdown', 'aria-live': 'assertive' });
  const replay = h('button', { type: 'button', class: 'btn btn--secondary btn--small show__replay', onclick: () => reveal() },
    h('span', { text: 'Revoir' }));
  const reveal = (then) => {
    clearTimeout(timer);
    hide(contentEl, false);
    timer = setTimeout(() => { hide(contentEl, true); then?.(); }, ms);
  };
  hide(contentEl, true); hide(answerEl, true); hide(replay, true);
  const tick = (n) => {
    if (n === 0) {
      count.remove();
      reveal(() => { hide(answerEl, false); hide(replay, false); });
      return;
    }
    count.textContent = String(n);
    count.classList.remove('is-tick'); void count.offsetWidth; count.classList.add('is-tick');
    timer = setTimeout(() => tick(n - 1), COUNTDOWN_STEP_MS);
  };
  tick(3);
  return [h('div', { class: 'show__flash' }, contentEl, count), replay];
}

const isForeign = (q) => Boolean(q.lang && !q.lang.startsWith('fr') && q.speak);

/**
 * Question « à écouter » dans une autre langue (`listenOnly`) sur un appareil sans voix de cette
 * langue : on écrit le texte à lire, pour que la question reste jouable.
 */
function noVoiceNote(q) {
  if (!q.listenOnly || !isForeign(q) || audio.hasVoice(q.lang)) return null;
  return h('p', { class: 'no-voice' },
    h('span', { text: 'Pas de voix anglaise sur cet appareil. Lis : ' }),
    h('strong', { lang: q.lang, text: q.speak }));
}

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** Bouton « écouter » ; absent si le navigateur ne sait pas lire à voix haute. */
export function listenButton(text, { lang = 'fr-FR', label = 'Écouter la consigne', className = '' } = {}) {
  if (!audio.canSpeak() || !text) return null;
  return h('button', {
    type: 'button',
    class: `icon-btn listen ${className}`.trim(),
    'aria-label': label,
    onclick: () => audio.speak(text, { lang }),
  }, icon('speaker', { size: 28 }));
}

/** Rangée de 3 étoiles (gommettes dorées). */
export function starRow(stars, { size = 28, animate = false } = {}) {
  return h('span', { class: `stars${animate ? ' stars--animate' : ''}`, role: 'img', 'aria-label': `${plural(stars, 'étoile')} sur 3` },
    [1, 2, 3].map((i) => h('span', { class: `star${i <= stars ? ' is-earned' : ''}`, style: `--i:${i}` }, icon('star', { size }))));
}

/** Bandeau « nouveau grade » de la fin de partie (#17). L'animation est purement décorative. */
export function gradeBanner(grade) {
  return h('div', { class: 'grade-up', role: 'status' },
    h('span', { class: 'emoji grade-up__icon', role: 'img', 'aria-label': grade.name, text: grade.icon }),
    h('p', { class: 'grade-up__text' },
      h('span', { class: 'grade-up__kicker', text: 'Nouveau grade' }),
      h('strong', { class: 'grade-up__name', text: grade.name })));
}

/** Les lignes poussées dans `result.extras` par les récompenses et les autres modules. */
/** Mode essai (#111) : seule ligne ajoutée à l'écran de fin, à la place des gains. */
export function trialEndNote() {
  return isTrial() ? h('p', { class: 'end__trial', text: TRIAL_END_TEXT }) : null;
}

export function extrasList(extras) {
  if (!extras?.length) return null;
  return h('ul', { class: 'end__extras' }, extras.map((x) => h('li', {},
    x.icon && h('span', { class: 'emoji', role: 'img', 'aria-label': '', 'aria-hidden': 'true', text: x.icon }),
    h('span', { text: x.text }))));
}

/** L'île dont la mascotte accueille l'enfant (le défi du jour prend celle de sa gommette). */
export function mascotIsland(game) {
  return hasMascot(game.island) ? game.island : game.rewardIsland;
}

/**
 * Compagnon de fin de partie, à la place de la mascotte de l'île : un seul personnage à la fois
 * (comme dans l'en-tête de partie), et c'est LE personnage de l'enfant. La mascotte de l'île garde
 * l'accueil, le choix du niveau et l'album. Son expression suit les étoiles, deux étincelles dès
 * 2 étoiles ; l'œuf, lui, se balance doucement.
 */
export function endCompanion(stars) {
  const companion = currentCompanion();
  const loop = companion.hatched ? (stars >= 2 ? 'bounce' : null) : 'wobble';
  const buddy = companionSticker(companion, { face: companionEndFace(stars, companion), loop, className: 'end__mascot' });
  const sparkle = (side, color) => h('span', { class: `end__deco end__deco--${side} kw-twinkle`, 'aria-hidden': 'true' },
    drawDeco({ shape: 'sparkle', color }));
  return h('div', { class: 'end__buddy' },
    stars >= 2 && sparkle('left', 'citron'),
    buddy,
    stars >= 2 && sparkle('right', 'rose'));
}

/**
 * Coffre surprise de fin de partie (#91) : à la place de la gommette remise directement. Renvoie la scène
 * d'ouverture (`{ el, focus, destroy }`), ou null quand la partie ne donne pas de coffre (0 étoile,
 * défi du jour déjà récompensé). Le contenu est déjà dans le profil : la scène le révèle.
 */
export function endChest(session) {
  const draw = chestSummary(session);
  return draw ? chestScene(draw, { companion: currentCompanion() }) : null;
}

/** Bouton vers « Mon compagnon » quand l'œuf est prêt à éclore ou que le compagnon vient de grandir. */
export function companionAction(session) {
  const change = companionSummary(session);
  if (!change || !(change.ready || change.grew)) return null;
  return h('a', { class: 'btn btn--primary', href: '#/compagnon' },
    h('span', { text: change.ready ? 'Faire éclore mon œuf' : 'Voir mon compagnon' }), icon('arrowRight'));
}

/**
 * Déroulé d'une partie dans `root` : en-tête, questions, corrections.
 * `onEnd(result, { session })` est appelé après la dernière question.
 * Renvoie `{ start(level, options), destroy() }`.
 */
export function createGameView(root, { app, game, onEnd }) {
  let ui = null;
  let timer = null;
  let offPoints = null;
  let buddy = null;
  let buddyReacted = false;
  let mate = null;
  const gainTimers = new Set();

  function clearGains() {
    for (const t of gainTimers) clearTimeout(t);
    gainTimers.clear();
  }

  function teardown() {
    clearTimeout(timer);
    timer = null;
    clearGains();
    offPoints?.();
    offPoints = null;
    try { ui?.destroy?.(); } catch (err) { console.error(err); }
    ui = null;
    audio.stopSpeaking();
  }

  /** Compteur de points en direct (#16) : visible pendant toute la partie. */
  function pointsCounter(session) {
    if (isTrial()) return null;   // mode essai : aucun point en jeu
    const initial = liveTotal(session);
    const value = h('span', { class: 'points-chip__value', text: String(initial) });
    const chip = h('span', { class: 'points-chip', 'aria-label': plural(initial, 'point') }, icon('coin', { size: 20, className: 'icon--points' }), value);
    // Annonce sobre : seuls les bonus de série sont dits à voix haute, pas chaque réponse.
    const announce = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
    const el = h('div', { class: 'points' }, chip, announce);

    offPoints?.();
    offPoints = rewardEvents.on('points', ({ session: s, total, gain, bonus, label }) => {
      if (s !== session) return;
      value.textContent = String(total);
      chip.setAttribute('aria-label', plural(total, 'point'));
      if (gain <= 0) return;
      chip.classList.remove('is-bumped');
      void chip.offsetWidth;        // redémarre l'animation même sur deux réponses rapprochées
      chip.classList.add('is-bumped');
      const gainEl = h('span', { class: `points__gain${bonus ? ' points__gain--bonus' : ''}`, 'aria-hidden': 'true', text: `+${gain}` });
      el.append(gainEl);
      const t = setTimeout(() => { gainEl.remove(); gainTimers.delete(t); }, GAIN_MS);
      gainTimers.add(t);
      if (label) announce.textContent = `${label} Bonus de ${plural(bonus, 'point')}.`;
    });
    return el;
  }

  function start(level, { seed, count, record } = {}) {
    teardown();
    const session = createSession(game, level, {
      seed,
      count,
      record: record === undefined ? (result) => app.record(result) : record,
    });
    const dots = session.questions.map((_, i) => h('li', { class: 'dot', 'aria-label': `question ${i + 1}` }));
    // Le compagnon (ou son œuf) reste dans l'en-tête, loin de la consigne et des réponses ; immobile entre deux réactions.
    mate = currentCompanion();
    buddyReacted = false;
    buddy = companionSticker(mate, { blink: false, className: 'play-head__mascot' });
    const head = h('div', { class: 'play-head' },
      h('span', { class: 'chip', text: game.levels[level - 1].label }),
      h('ol', { class: 'dots', 'aria-label': 'Progression' }, dots),
      pointsCounter(session),
      h('span', { class: 'play-head__count', 'aria-live': 'polite' }),
      buddy);
    const stage = h('div', { class: 'stage' });
    root.replaceChildren(head, stage);
    renderQuestion(session, head, dots, stage);
    return session;
  }

  function renderQuestion(session, head, dots, stage) {
    clearTimeout(timer);
    timer = null;
    try { ui?.destroy?.(); } catch (err) { console.error(err); }
    ui = null;
    audio.stopSpeaking();

    const question = session.current;
    const index = session.index;
    dots.forEach((d, i) => d.classList.toggle('is-current', i === index));
    head.querySelector('.play-head__count').textContent = `${index + 1} / ${session.total}`;

    if (buddyReacted) {
      buddyReacted = false;
      resetCompanion(buddy, mate);
    }

    const Ui = getQuestionUI(question.type);
    const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
    ui = Ui.create(question, {
      tap: () => audio.playSound('tap'),
      submit: (value) => onAnswer(value),
    });

    const show = question.display?.show;
    const lang = question.lang || 'fr-FR';
    const showContent = show && h('div', { class: `show__content${show.text && !show.emoji ? ' show__content--text' : ''}` }, content(show, { cursive: Boolean(show.cursive) }));
    const answerEl = h('div', { class: `answer answer--${question.type}` }, ui.el);
    const [showMain, replay] = show?.flash ? flashControls(showContent, show.flash, answerEl) : [showContent, null];
    stage.className = `stage stage--${question.type}${show ? ' stage--with-show' : ''}`;
    stage.replaceChildren(...[
      h('div', { class: 'prompt' },
        listenButton(question.speak || question.prompt, { lang, label: question.listenLabel || undefined }),
        h('p', { class: 'prompt__text', text: question.prompt })),
      noVoiceNote(question),
      show && h('div', { class: 'show' },
        showMain,
        replay,
        show.speak && listenButton(show.speak, { lang: show.lang || 'fr-FR', label: 'Écouter le mot', className: 'listen--word' })),
      answerEl,
      feedback,
    ].filter(Boolean));

    function onAnswer(value) {
      const fb = session.answer(value);
      ui.showResult({ correct: fb.correct, given: value, answer: fb.answer });
      const dot = dots[index];
      dot.classList.remove('is-current');
      dot.classList.add(fb.correct ? 'is-right' : 'is-wrong');
      dot.replaceChildren(badge(fb.correct ? 'right' : 'wrong'));
      const reaction = companionReaction(fb.correct, mate);
      if (reaction) {
        buddyReacted = true;
        reactCompanion(buddy, mate, reaction);
      }
      if (fb.correct) {
        audio.playSound('success');
        stage.append(h('div', { class: 'stamp stamp--ok', 'aria-hidden': 'true', text: PRAISE[Math.floor(Math.random() * PRAISE.length)] }));
        feedback.append(h('p', { class: 'visually-hidden', text: 'Bonne réponse !' }));
        timer = setTimeout(goNext, AUTO_NEXT_MS);
      } else {
        audio.playSound('retry');
        showCorrection(question, fb, feedback);
      }
    }

    function goNext() {
      const next = session.next();
      if (next) renderQuestion(session, head, dots, stage);
      else onEnd(session.result, { session });
    }

    function showCorrection(q, fb, box) {
      const answer = Ui.describe?.(q);
      const continueButton = h('button', { type: 'button', class: 'btn btn--primary', onclick: goNext },
        h('span', { text: 'Continuer' }), icon('arrowRight'));
      const spoken = [answer?.text ? `La bonne réponse est : ${answer.text}.` : '', fb.explain].filter(Boolean).join(' ');
      box.append(h('div', { class: 'bubble' },
        answer && h('p', { class: 'bubble__answer' },
          h('span', { class: 'bubble__label', text: 'La bonne réponse : ' }),
          h('strong', { class: 'bubble__value' }, content(answer, { cursive: Boolean(answer.cursive) }))),
        !answer && h('p', { class: 'bubble__label', text: 'Regarde bien la correction.' }),
        fb.explain && h('p', { class: 'bubble__explain', text: fb.explain }),
        h('div', { class: 'bubble__actions' },
          // Question d'anglais : la voix française lirait mal le mot, on propose de le réécouter en anglais.
          isForeign(q) && listenButton(q.speak, { lang: q.lang, label: 'Réécouter en anglais' }),
          listenButton(spoken, { label: 'Écouter l\'explication' }),
          continueButton)));
      continueButton.focus({ preventScroll: true });
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  return { start, destroy: teardown };
}

/** Sons et confettis de fin de partie (#21). Renvoie la fonction d'arrêt des confettis. */
export function celebrate(stars) {
  audio.playSound('finish');
  for (let i = 0; i < stars; i++) setTimeout(() => audio.playSound('star'), 650 + i * 280);
  return stars >= 2 ? confetti() : () => {};
}

export default {
  async render(view, { params, app }) {
    const game = await loadGame(params.id);
    if (!game) {
      app.navigate('/', { replace: true });
      return undefined;
    }
    app.setTitle(game.title);

    const root = h('section', { class: 'page play', dataset: { island: game.island } });
    view.append(root);

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

    function progressOf() {
      return getGameProgress(app.store.getProfile(app.profileId), game.id);
    }

    const isOpen = (level, progress) => game.demo || openOrTrial(level <= progress.unlocked);

    // --- Choix du niveau ---------------------------------------------------------------------

    function showLevels() {
      cleanup();
      const progress = progressOf();
      const cards = game.levels.map((lvl, i) => {
        const level = i + 1;
        const open = isOpen(level, progress);
        const best = progress.best[level];
        return h('li', {}, h('button', {
          type: 'button',
          class: `level-card${open ? '' : ' is-locked'}`,
          disabled: !open,
          onclick: () => player.start(level),
        },
        h('span', { class: 'level-card__number', 'aria-hidden': 'true', text: String(level) }),
        h('span', { class: 'level-card__body' },
          h('span', { class: 'level-card__label', text: lvl.label }),
          lvl.hint && h('span', { class: 'level-card__hint', text: lvl.hint }),
          !open && h('span', { class: 'level-card__lock-text', text: `Gagne 3 étoiles au niveau ${level - 1} pour l'ouvrir.` })),
        open ? starRow(best?.stars || 0, { size: 22 }) : h('span', { class: 'level-card__lock' }, icon('lock', { size: 28 }))));
      });
      const buddy = mascotSticker(game.island, { face: 'happy', className: 'play-intro__mascot' });
      root.replaceChildren(
        h('div', { class: `play-intro${buddy ? ' play-intro--mascot' : ''}` },
          buddy,
          h('div', { class: 'play-intro__text' },
            h('h1', { class: 'page-title', text: game.title }),
            h('p', { class: 'play-intro__lead cursive', text: 'Choisis ton niveau.' }))),
        h('ol', { class: 'level-list' }, cards));
      play(buddy, 'pop');
    }

    // --- Fin de partie -----------------------------------------------------------------------

    function showEnd(result, session) {
      player.destroy();
      const { level, score, total, stars } = result;
      const progress = result.progress?.progress || progressOf();
      const hasNext = level < game.levels.length;
      const nextOpen = hasNext && isOpen(level + 1, progress);
      const gained = rewardSummary(session);
      stopConfetti();
      stopConfetti = celebrate(stars);
      chest?.destroy();
      chest = endChest(session);

      const unlocked = result.progress?.newlyUnlocked;
      const replay = h('button', { type: 'button', class: `btn ${nextOpen ? 'btn--secondary' : 'btn--primary'}`, onclick: () => player.start(level) },
        icon('replay'), h('span', { text: 'Rejouer' }));
      const next = nextOpen && h('button', { type: 'button', class: 'btn btn--primary', onclick: () => player.start(level + 1) },
        h('span', { text: 'Niveau suivant' }), icon('arrowRight'));

      root.replaceChildren(h('div', { class: 'end card' },
        endCompanion(stars),
        h('h1', { class: 'end__title stamp stamp--static', text: END_TITLES[stars] }),
        starRow(stars, { size: 56, animate: true }),
        h('p', { class: 'end__score' },
          h('strong', { text: String(score) }), ` ${score > 1 ? 'bonnes réponses' : 'bonne réponse'} sur ${total}`),
        chest?.el,
        gained?.grade && gradeBanner(gained.grade),
        unlocked && h('p', { class: 'end__unlocked' }, icon('star', { size: 22 }), h('span', { text: `Le niveau ${unlocked} est ouvert !` })),
        hasNext && !nextOpen && h('p', { class: 'end__hint', text: `Gagne 3 étoiles pour ouvrir le niveau ${level + 1}.` }),
        extrasList(result.extras),
        trialEndNote(),
        h('div', { class: 'end__actions' },
          companionAction(session),
          next || null,
          replay,
          h('button', { type: 'button', class: 'btn btn--secondary', onclick: showLevels }, h('span', { text: 'Changer de niveau' })),
          h('a', { class: 'btn btn--ghost', href: '#/album' }, icon('album'), h('span', { text: 'Mon album' })),
          h('a', { class: 'btn btn--ghost', href: '#/' }, icon('home'), h('span', { text: 'La carte' })))));
      if (chest) chest.focus(); else root.querySelector('.end__actions .btn').focus({ preventScroll: true });
    }

    showLevels();
    return cleanup;
  },
};

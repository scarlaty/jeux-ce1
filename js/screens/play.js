// Écran de jeu : choix du niveau → 10 questions → fin de partie.
// Toute la logique (score, étoiles, déblocage) est dans core/engine.js ; ici, seulement l'affichage.
// `mountPlay` sert aussi au défi du jour (partie unique, sans choix de niveau).
import { h, content } from '../core/ui/dom.js';
import { icon, badge } from '../core/ui/icons.js';
import { getQuestionUI } from '../core/ui/index.js';
import { pointsCounter, teacherStamp, confetti, endRewards, showGradeUp } from '../core/ui/rewards.js';
import { createSession } from '../core/engine.js';
import { getGameProgress } from '../core/history.js';
import { loadGame } from '../games/registry.js';
import * as audio from '../core/audio.js';

const PRAISE = ['Bravo !', 'Super !', 'Exact !', 'Bien joué !', 'Génial !'];
const END_SUBTITLES = ['Tu progresses, rejoue pour gagner une étoile.', 'Une étoile de gagnée !', 'Deux belles étoiles !', 'Trois étoiles, quel travail !'];
const CONFETTI = [0, 30, 60, 110];
const GRADE_UP_DELAY_MS = 1900;
const AUTO_NEXT_MS = 1100;

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** Bouton « écouter » ; absent si le navigateur ne sait pas lire à voix haute. */
function listenButton(text, { lang = 'fr-FR', label = 'Écouter la consigne', className = '' } = {}) {
  if (!audio.canSpeak() || !text) return null;
  return h('button', {
    type: 'button',
    class: `icon-btn listen ${className}`.trim(),
    'aria-label': label,
    onclick: () => audio.speak(text, { lang }),
  }, icon('speaker', { size: 28 }));
}

/** Rangée de 3 étoiles (gommettes dorées). */
function starRow(stars, { size = 28, animate = false } = {}) {
  return h('span', { class: `stars${animate ? ' stars--animate' : ''}`, role: 'img', 'aria-label': `${plural(stars, 'étoile')} sur 3` },
    [1, 2, 3].map((i) => h('span', { class: `star${i <= stars ? ' is-earned' : ''}`, style: `--i:${i}` }, icon('star', { size }))));
}

/**
 * Monte une partie dans `view`. Options :
 *  - single : { level, count } → partie unique lancée tout de suite, sans écran de niveaux,
 *             ni enregistrement dans l'historique (défi du jour) ;
 *  - backHref : lien « retour » de l'écran de fin.
 * Renvoie la fonction de nettoyage de l'écran.
 */
export function mountPlay(view, app, game, { single = null, backHref = null } = {}) {
  const back = backHref || (game.island && !game.demo ? `#/ile/${game.island}` : '#/');
  const root = h('section', { class: 'page play', dataset: game.island ? { island: game.island } : {} });
  view.append(root);

  let ui = null;
  let timer = null;
  let counter = null;
  const endEffects = [];

  function teardownQuestion() {
    clearTimeout(timer);
    timer = null;
    try { ui?.destroy?.(); } catch (err) { console.error(err); }
    ui = null;
    audio.stopSpeaking();
  }

  function teardownSession() {
    teardownQuestion();
    counter?.destroy();
    counter = null;
    endEffects.splice(0).forEach((stop) => stop());
  }

  function progressOf() {
    return getGameProgress(app.store.getProfile(app.profileId), game.id);
  }

  const isOpen = (level, progress) => game.demo || level <= progress.unlocked;

  // --- Choix du niveau ---------------------------------------------------------------------

  function showLevels() {
    teardownSession();
    const progress = progressOf();
    const cards = game.levels.map((lvl, i) => {
      const level = i + 1;
      const open = isOpen(level, progress);
      const best = progress.best[level];
      return h('li', {}, h('button', {
        type: 'button',
        class: `level-card${open ? '' : ' is-locked'}`,
        disabled: !open,
        onclick: () => startGame(level),
      },
      h('span', { class: 'level-card__number', 'aria-hidden': 'true', text: String(level) }),
      h('span', { class: 'level-card__body' },
        h('span', { class: 'level-card__label', text: lvl.label }),
        lvl.hint && h('span', { class: 'level-card__hint', text: lvl.hint }),
        !open && h('span', { class: 'level-card__lock-text', text: `Gagne 3 étoiles au niveau ${level - 1} pour l'ouvrir.` })),
      open ? starRow(best?.stars || 0, { size: 22 }) : h('span', { class: 'level-card__lock' }, icon('lock', { size: 28 }))));
    });
    root.replaceChildren(
      h('div', { class: 'play-intro' },
        h('h1', { class: 'page-title', text: game.title }),
        h('p', { class: 'play-intro__lead cursive', text: 'Choisis ton niveau.' })),
      h('ol', { class: 'level-list' }, cards));
  }

  // --- Partie ------------------------------------------------------------------------------

  function startGame(level) {
    teardownSession();
    const session = createSession(game, level, single
      ? { count: single.count }
      : { record: (result) => app.record(result) });
    counter = pointsCounter(session);
    const dots = session.questions.map((_, i) => h('li', { class: 'dot', 'aria-label': `question ${i + 1}` }));
    const head = h('div', { class: 'play-head' },
      h('span', { class: 'chip', text: game.levels[level - 1].label }),
      h('ol', { class: 'dots', 'aria-label': 'Progression' }, dots),
      h('span', { class: 'play-head__count', 'aria-live': 'polite' }),
      counter.el);
    const stage = h('div', { class: 'stage' });
    root.replaceChildren(head, stage);
    renderQuestion(session, head, dots, stage);
  }

  function renderQuestion(session, head, dots, stage) {
    teardownQuestion();
    const question = session.current;
    const index = session.index;
    dots.forEach((d, i) => d.classList.toggle('is-current', i === index));
    head.querySelector('.play-head__count').textContent = `${index + 1} / ${session.total}`;

    const Ui = getQuestionUI(question.type);
    const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
    ui = Ui.create(question, {
      tap: () => audio.playSound('tap'),
      submit: (value) => onAnswer(value),
    });

    // Défi du jour : chaque question garde la couleur de l'île de son jeu.
    if (question.island) root.dataset.island = question.island;
    const show = question.display?.show;
    const lang = question.lang || 'fr-FR';
    stage.className = `stage stage--${question.type}${show ? ' stage--with-show' : ''}`;
    stage.replaceChildren(...[
      h('div', { class: 'prompt' },
        listenButton(question.speak || question.prompt, { lang }),
        h('p', { class: 'prompt__text', text: question.prompt })),
      show && h('div', { class: 'show' },
        h('div', { class: `show__content${show.text && !show.emoji ? ' show__content--text' : ''}` }, content(show, { cursive: Boolean(show.cursive) })),
        show.speak && listenButton(show.speak, { lang: show.lang || 'fr-FR', label: 'Écouter le mot', className: 'listen--word' })),
      h('div', { class: `answer answer--${question.type}` }, ui.el),
      feedback,
    ].filter(Boolean));

    function onAnswer(value) {
      const fb = session.answer(value);
      ui.showResult({ correct: fb.correct, given: value, answer: fb.answer });
      const dot = dots[index];
      dot.classList.remove('is-current');
      dot.classList.add(fb.correct ? 'is-right' : 'is-wrong');
      dot.replaceChildren(badge(fb.correct ? 'right' : 'wrong'));
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
      else showEnd(session.result);
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
          listenButton(spoken, { label: 'Écouter l\'explication' }),
          continueButton)));
      continueButton.focus({ preventScroll: true });
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // --- Fin de partie -----------------------------------------------------------------------

  function showEnd(result) {
    teardownQuestion();
    counter?.destroy();
    counter = null;
    const { level, score, total, stars } = result;
    const progress = result.progress?.progress || progressOf();
    const hasNext = !single && level < game.levels.length;
    const nextOpen = hasNext && isOpen(level + 1, progress);
    audio.playSound('finish');
    for (let i = 0; i < stars; i++) setTimeout(() => audio.playSound('star'), 650 + i * 280);

    const unlocked = result.progress?.newlyUnlocked;
    const replay = !single && h('button', { type: 'button', class: `btn ${nextOpen ? 'btn--secondary' : 'btn--primary'}`, onclick: () => startGame(level) },
      icon('replay'), h('span', { text: 'Rejouer' }));
    const next = nextOpen && h('button', { type: 'button', class: 'btn btn--primary', onclick: () => startGame(level + 1) },
      h('span', { text: 'Niveau suivant' }), icon('arrowRight'));
    const toMap = back === '#/';
    const home = h('a', { class: `btn ${single ? 'btn--primary' : 'btn--ghost'}`, href: back },
      icon(toMap ? 'home' : 'map'), h('span', { text: toMap ? 'Retour à la carte' : 'Retour à l\'île' }));

    const card = h('div', { class: 'end card' },
      teacherStamp(stars),
      h('p', { class: 'end__subtitle cursive', text: END_SUBTITLES[stars] }),
      starRow(stars, { size: 56, animate: true }),
      h('p', { class: 'end__score' },
        h('strong', { text: String(score) }), ` ${score > 1 ? 'bonnes réponses' : 'bonne réponse'} sur ${total}`),
      unlocked && h('p', { class: 'end__unlocked' }, icon('star', { size: 22 }), h('span', { text: `Le niveau ${unlocked} est ouvert !` })),
      hasNext && !nextOpen && h('p', { class: 'end__hint', text: `Gagne 3 étoiles pour ouvrir le niveau ${level + 1}.` }),
      endRewards(result.extras),
      h('div', { class: 'end__actions' },
        next || null,
        replay || null,
        !single && h('button', { type: 'button', class: 'btn btn--secondary', onclick: showLevels }, h('span', { text: 'Changer de niveau' })),
        home));
    const scene = h('div', { class: 'end-scene' }, card);
    root.replaceChildren(scene);
    const focusTarget = next || replay || home;
    focusTarget.focus({ preventScroll: true });

    endEffects.push(confetti(scene, { amount: CONFETTI[stars] }));
    const promotion = result.extras.find((x) => x.kind === 'grade' && x.promoted);
    if (promotion) {
      const t = setTimeout(() => {
        audio.playSound('finish');
        endEffects.push(showGradeUp(promotion.grade, { returnFocus: focusTarget }));
      }, GRADE_UP_DELAY_MS);
      endEffects.push(() => clearTimeout(t));
    }
  }

  if (single) startGame(single.level);
  else showLevels();
  return teardownSession;
}

export default {
  async render(view, { params, app }) {
    const game = await loadGame(params.id);
    if (!game) {
      app.navigate('/', { replace: true });
      return undefined;
    }
    app.setTitle(game.title);
    return mountPlay(view, app, game);
  },
};

// Composer un montant : l'enfant touche des pièces et des billets pour les poser dans sa « tirelire »,
// le total s'écrit au fur et à mesure, puis il valide. Un appui sur une pièce posée la retire.
//
// Le composant répond par la SOMME des valeurs posées : toute composition qui fait le bon total est
// donc juste (20 € = 10 + 10 = 5 + 5 + 10 = …). La réponse de la question est ce total.
//
// display : {
//   options:   [{ value: 5, art: { kind: 'money', pieces: [500] } }],   // ce qu'on peut poser (répétable)
//   suffix?:   ' €',        // écrit après le total
//   maxPieces?: 30,         // nombre maximal de pièces posées
//   show?: { … }
// }
// answer : le total à composer (un nombre, dans la même unité que les `value`).
import { h, content, keepFocus, focusedWithin } from './dom.js';
import { icon, badge } from './icons.js';

const MAX_PIECES = 30;

export function create(question, ctx) {
  const { options, suffix = '', maxPieces = MAX_PIECES } = question.display;
  const placed = [];
  let locked = false;

  const total = h('span', { class: 'amount__total-value' });
  const totalBox = h('p', { class: 'amount__total', role: 'status', 'aria-live': 'polite' },
    h('span', { class: 'amount__total-label', text: 'Dans ta tirelire : ' }), total);
  const tray = h('div', { class: 'amount__tray', role: 'group', 'aria-label': 'Ta tirelire (touche une pièce pour la retirer)' });
  const okButton = h('button', { type: 'button', class: 'btn btn--primary amount__ok', onclick: validate },
    icon('check'), h('span', { text: 'Valider' }));

  const palette = h('div', { class: 'amount__palette', role: 'group', 'aria-label': 'Pièces et billets à poser' },
    options.map((option) => h('button', {
      type: 'button',
      class: 'amount__option',
      'aria-label': `Ajouter ${option.label || (option.art ? '' : option.text) || option.value}`.trim(),
      onclick: () => add(option),
    }, content(option))));

  function sum() {
    return placed.reduce((t, p) => t + p.value, 0);
  }

  function render() {
    // Toutes les pièces sont recréées : celle qui avait le focus disparaît avec l'ancienne liste.
    const hadFocus = focusedWithin(tray);
    total.textContent = `${sum()}${suffix}`;
    tray.replaceChildren(...placed.map((option, i) => h('button', {
      type: 'button',
      class: 'amount__piece',
      'aria-label': `Retirer ${option.label || ''}`.trim(),
      onclick: () => remove(i),
    }, content(option))));
    tray.classList.toggle('is-empty', placed.length === 0);
    okButton.disabled = placed.length === 0;
    for (const button of palette.children) button.disabled = locked || placed.length >= maxPieces;
    // Retirer une pièce ne doit pas renvoyer l'enfant au clavier en haut de la page (#113).
    if (hadFocus) keepFocus(tray.lastElementChild || okButton);
  }

  function add(option) {
    if (locked || placed.length >= maxPieces) return;
    placed.push(option);
    ctx.tap?.();
    render();
  }

  function remove(i) {
    if (locked) return;
    placed.splice(i, 1);
    render();
  }

  function validate() {
    if (locked || placed.length === 0) return;
    locked = true;
    render();
    ctx.submit(sum());
  }

  render();
  const root = h('div', { class: 'amount' }, totalBox, tray, palette, okButton);

  return {
    el: root,
    showResult({ correct }) {
      locked = true;
      render();
      for (const piece of tray.children) piece.disabled = true;
      palette.hidden = true;   // la place libérée sert à la correction
      okButton.hidden = true;
      totalBox.classList.add(correct ? 'is-right' : 'is-wrong');
      totalBox.append(badge(correct ? 'right' : 'wrong'));
    },
  };
}

export function describe(question) {
  return { text: `${question.answer}${question.display?.suffix || ''}` };
}

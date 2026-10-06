// Remettre dans l'ordre, en touchant : chaque élément touché va dans la case suivante ;
// toucher un élément placé le renvoie dans la réserve. « Valider » quand tout est placé.
//
// display : {
//   items: ['mardi', 'lundi', …] | [12, 3, …],   // ordre d'affichage (déjà mélangé par le jeu)
//   cursive?: true,                               // mots français à lire
//   show?: { … }
// }
// answer : la liste dans le bon ordre.
import { h, content } from './dom.js';
import { icon, badge } from './icons.js';
import { sameAnswer } from '../engine.js';

export function create(question, ctx) {
  const { items, cursive = false } = question.display;
  const cls = `token${cursive ? ' token--cursive' : ''}`;
  let placed = [];   // indices des éléments, dans l'ordre choisi
  let locked = false;

  const line = h('ol', { class: 'order-line', 'aria-label': 'Ton rangement' });
  const pool = h('div', { class: 'order-pool', role: 'group', 'aria-label': 'Éléments à ranger' });
  const okButton = h('button', { type: 'button', class: 'btn btn--primary order-ok', onclick: validate },
    icon('check'), h('span', { text: 'Valider' }));

  const poolButtons = items.map((item, i) => h('button', {
    type: 'button',
    class: cls,
    onclick: () => {
      if (locked || placed.includes(i)) return;
      placed = [...placed, i];
      ctx.tap?.();
      render();
    },
  }, content({ text: String(item) }, { cursive })));
  pool.append(...poolButtons);

  function render() {
    line.replaceChildren(...items.map((_, pos) => {
      const index = placed[pos];
      if (index === undefined) return h('li', { class: 'order-slot', 'aria-label': `case ${pos + 1} vide` });
      return h('li', { class: 'order-slot is-filled' }, h('button', {
        type: 'button',
        class: cls,
        'aria-label': `${items[index]}, case ${pos + 1} : touche pour le retirer`,
        onclick: () => {
          if (locked) return;
          placed = placed.filter((x) => x !== index);
          render();
        },
      }, content({ text: String(items[index]) }, { cursive })));
    }));
    poolButtons.forEach((b, i) => {
      const used = placed.includes(i);
      b.classList.toggle('is-used', used);
      b.disabled = used;
      b.setAttribute('aria-hidden', used ? 'true' : 'false');
    });
    okButton.disabled = placed.length !== items.length;
  }

  function validate() {
    if (locked || placed.length !== items.length) return;
    locked = true;
    ctx.submit(placed.map((i) => items[i]));
  }

  render();

  return {
    el: h('div', { class: 'order' }, line, pool, okButton),
    showResult() {
      locked = true;
      pool.hidden = true;
      okButton.hidden = true;
      [...line.children].forEach((slot, pos) => {
        const button = slot.querySelector('button');
        if (!button) return;
        button.disabled = true;
        const ok = sameAnswer(question.answer[pos], items[placed[pos]]);
        button.classList.add(ok ? 'is-right' : 'is-wrong');
        button.append(badge(ok ? 'right' : 'wrong'));
      });
    },
  };
}

export function describe(question) {
  return { text: question.answer.join(', '), cursive: Boolean(question.display.cursive) };
}

// Clavier de lettres, en ordre alphabétique (plus simple qu'un AZERTY à 7 ans),
// avec les lettres accentuées utiles, l'apostrophe et le trait d'union.
// Le clavier physique marche aussi mais n'est jamais nécessaire.
//
// display : {
//   length?: 5,        // affiche une case par lettre (et limite la saisie)
//   accents?: true,    // false : pas de rangée d'accents (mots anglais)
//   show?: { … }
// }
// answer : le mot attendu, en minuscules.
import { h } from './dom.js';
import { icon, badge } from './icons.js';
import { LETTERS, ACCENTED, SYMBOLS } from '../alphabet.js';

const MAX_FREE_LENGTH = 16;

export function create(question, ctx) {
  const { length = null, accents = true } = question.display || {};
  const max = length || MAX_FREE_LENGTH;
  const allowed = new Set([...LETTERS, ...(accents ? ACCENTED : []), ...SYMBOLS]);
  let chars = [];
  let locked = false;

  const field = h('div', {
    class: `answer-field answer-field--word${length ? ' answer-field--slots' : ''}`,
    role: 'status',
    'aria-live': 'polite',
    lang: question.display?.show?.lang || null,
  });

  const okButton = h('button', { type: 'button', class: 'key key--ok key--wide', 'aria-label': 'Valider', onclick: validate },
    icon('check', { size: 28 }), h('span', { text: 'Valider' }));
  const eraseButton = h('button', { type: 'button', class: 'key key--erase key--wide', 'aria-label': 'Effacer', onclick: erase },
    icon('backspace', { size: 28 }));

  const row = (list, cls) => h('div', { class: `letter-row ${cls}` }, list.map((ch) =>
    h('button', { type: 'button', class: 'key key--letter', onclick: () => type(ch), 'aria-label': ch === "'" ? 'apostrophe' : ch === '-' ? 'trait d’union' : null }, ch)));

  // Effacer et Valider juste sous le mot : toujours visibles, même sur téléphone.
  const actions = h('div', { class: 'letters-actions' }, eraseButton, okButton);
  const keyboard = h('div', { class: 'letters', role: 'group', 'aria-label': 'Clavier de lettres' },
    row(LETTERS, 'letter-row--abc'),
    row([...(accents ? ACCENTED : []), ...SYMBOLS], 'letter-row--accents'));

  function render() {
    if (length) {
      field.replaceChildren(...Array.from({ length }, (_, i) =>
        h('span', { class: `slot${chars[i] ? ' is-filled' : ''}${i === chars.length ? ' is-current' : ''}`, text: chars[i] || '' })));
    } else {
      field.replaceChildren(h('span', { class: `answer-field__value${chars.length ? '' : ' is-empty'}`, text: chars.join('') || '?' }));
    }
    field.setAttribute('aria-label', chars.length ? `Ton mot : ${chars.join('')}` : 'Aucune lettre');
    okButton.disabled = chars.length === 0;
  }

  function type(ch) {
    if (locked || chars.length >= max) return;
    chars = [...chars, ch];
    ctx.tap?.();
    render();
  }

  function erase() {
    if (locked) return;
    chars = chars.slice(0, -1);
    render();
  }

  function validate() {
    if (locked || !chars.length) return;
    locked = true;
    ctx.submit(chars.join(''));
  }

  function onKey(e) {
    if (locked || e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase().replace('’', "'") : e.key;
    if (allowed.has(key)) { e.preventDefault(); type(key); }
    else if (key === 'Backspace') erase();
    else if (key === 'Enter' && chars.length) { e.preventDefault(); validate(); }
  }
  document.addEventListener('keydown', onKey);
  render();

  return {
    el: h('div', { class: 'letters-wrap' }, field, actions, keyboard),
    showResult({ correct }) {
      locked = true;
      field.classList.add(correct ? 'is-right' : 'is-wrong');
      field.append(badge(correct ? 'right' : 'wrong'));
      keyboard.hidden = true;
      actions.hidden = true;
    },
    destroy() { document.removeEventListener('keydown', onKey); },
  };
}

export function describe(question) {
  return { text: question.answer, lang: question.display?.show?.lang };
}

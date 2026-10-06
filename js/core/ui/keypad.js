// Pavé numérique : l'enfant compose un nombre puis valide. Le clavier physique marche aussi
// (chiffres, Retour arrière, Entrée) mais n'est jamais nécessaire.
//
// display : { maxLength?: 4, prefix?: '', suffix?: '', show?: { … } }
// answer  : entier positif.
import { h } from './dom.js';
import { icon, badge } from './icons.js';

export function create(question, ctx) {
  const { maxLength = 4, prefix = '', suffix = '' } = question.display || {};
  let value = '';
  let locked = false;

  const digits = h('span', { class: 'answer-field__value' });
  const field = h('div', { class: 'answer-field answer-field--number', role: 'status', 'aria-live': 'polite' },
    prefix && h('span', { class: 'answer-field__affix', text: prefix }),
    digits,
    suffix && h('span', { class: 'answer-field__affix', text: suffix }));

  const okButton = h('button', { type: 'button', class: 'key key--ok', 'aria-label': 'Valider', onclick: validate },
    icon('check', { size: 30 }));
  const keys = h('div', { class: 'keypad', role: 'group', 'aria-label': 'Pavé numérique' },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digitKey),
    h('button', { type: 'button', class: 'key key--erase', 'aria-label': 'Effacer', onclick: erase }, icon('backspace', { size: 30 })),
    digitKey(0),
    okButton);

  function digitKey(d) {
    return h('button', { type: 'button', class: 'key', onclick: () => type(String(d)) }, String(d));
  }

  function render() {
    digits.textContent = value || '?';
    digits.classList.toggle('is-empty', !value);
    okButton.disabled = !value;
  }

  function type(d) {
    if (locked || value.length >= maxLength) return;
    value = value === '0' ? d : value + d;   // pas de zéro inutile devant
    ctx.tap?.();
    render();
  }

  function erase() {
    if (locked) return;
    value = value.slice(0, -1);
    render();
  }

  function validate() {
    if (locked || !value) return;
    locked = true;
    ctx.submit(Number(value));
  }

  function onKey(e) {
    if (locked || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[0-9]$/.test(e.key)) type(e.key);
    else if (e.key === 'Backspace') erase();
    else if (e.key === 'Enter' && value) { e.preventDefault(); validate(); }
  }
  document.addEventListener('keydown', onKey);
  render();

  return {
    el: h('div', { class: 'keypad-wrap' }, field, keys),
    showResult({ correct }) {
      locked = true;
      field.classList.add(correct ? 'is-right' : 'is-wrong');
      field.append(badge(correct ? 'right' : 'wrong'));
      keys.hidden = true;   // la place libérée sert à la correction
    },
    destroy() { document.removeEventListener('keydown', onKey); },
  };
}

export function describe(question) {
  const { prefix = '', suffix = '' } = question.display || {};
  return { text: `${prefix}${question.answer}${suffix}` };
}

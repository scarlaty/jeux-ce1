// Petits utilitaires DOM partagés par les écrans et les composants.
// On construit les éléments avec textContent : jamais d'innerHTML avec du contenu variable.

/**
 * h('button', { class: 'btn', onclick: fn, 'aria-label': '…' }, enfant1, enfant2…)
 * Attributs : `class`, `text` (textContent), `dataset` (objet), `on<event>` (écouteur),
 * booléens (true → attribut vide, false/null/undefined → ignoré).
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
}

/**
 * Contenu d'un choix, d'un élément à ranger ou d'une illustration :
 * { emoji?, text?, cursive?, lang? }. L'émoji est une image de contenu : on lui donne un nom
 * accessible (`label` ou `text`).
 */
export function content(item, { cursive = false } = {}) {
  const parts = [];
  if (item.emoji) {
    const label = item.label || item.text || '';
    parts.push(h('span', { class: 'emoji', role: 'img', 'aria-label': label || null, 'aria-hidden': label ? null : 'true', text: item.emoji }));
  }
  if (item.text !== undefined && item.text !== null && item.text !== '') {
    parts.push(h('span', {
      class: `content-text${(item.cursive ?? cursive) ? ' cursive' : ''}`,
      lang: item.lang || null,
      text: String(item.text),
    }));
  }
  return parts;
}

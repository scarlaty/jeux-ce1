// Création d'éléments SVG. Fichier volontairement sans aucun import : les dessins
// (js/core/ui/art/) s'en servent, et dom.js aussi — pas de dépendance circulaire.

const NS = 'http://www.w3.org/2000/svg';

/**
 * s('circle', { cx: 50, cy: 50, r: 48, class: 'clock__face' }, enfant…)
 * Les attributs sont posés tels quels (les SVG n'ont pas de `className` utilisable).
 */
export function s(tag, props = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'text') el.textContent = String(value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

/**
 * Racine d'un dessin : carré par défaut, mise à l'échelle par la feuille de style.
 * `label` devient le nom accessible (le dessin porte de l'information, il n'est pas décoratif).
 */
export function figure(viewBox, label, ...children) {
  return s('svg', {
    viewBox,
    class: 'art',
    role: 'img',
    'aria-label': label || null,
    'aria-hidden': label ? null : 'true',
    focusable: 'false',
  }, children);
}

// Icônes d'interface en SVG (trait arrondi, couleur = currentColor).
// Les émojis restent réservés au contenu (animaux, objets…), pas à l'interface.

const PATHS = {
  home: '<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6 10v10h4.5v-5.5h3V20H18V10"/>',
  speaker: '<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" fill="currentColor"/><path d="M16.5 8.8a4.5 4.5 0 0 1 0 6.4"/><path d="M19 6.3a8 8 0 0 1 0 11.4"/>',
  speakerOff: '<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5z" fill="currentColor"/><path d="m17 9.5 5 5m0-5-5 5"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  moon: '<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.3 6.3 0 0 0 10.1 10.1z"/>',
  contrast: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
  star: '<path d="m12 2.9 2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.1l-5.7 3.1 1.2-6.3-4.6-4.4 6.3-.8z" fill="currentColor" stroke-linejoin="round"/>',
  // Points : un jeton rond (pièce à bord double). Jamais une étoile : l'étoile est réservée aux étoiles (#105).
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" fill="currentColor"/>',
  // Album de gommettes : un livre ouvert.
  album: '<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5v13"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  cross: '<path d="m7 7 10 10M17 7 7 17"/>',
  backspace: '<path d="M9 5.5h10.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3 12z"/><path d="m11.5 9.5 5 5m0-5-5 5"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.5 4v5h5"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
};

const NS = 'http://www.w3.org/2000/svg';

/** Élément <svg> décoratif (aria-hidden) : le bouton qui le contient porte le nom accessible. */
export function icon(name, { size = 24, className = '' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `icon ${className}`.trim());
  // Chaînes constantes définies ci-dessus : aucune donnée variable.
  svg.innerHTML = PATHS[name] || '';
  return svg;
}

const BADGES = {
  right: { icon: 'check', label: 'juste' },
  wrong: { icon: 'cross', label: 'pas tout à fait' },
  moved: { icon: 'undo', label: 'remis à sa place' },
};

/** Pastille ✓ / ✗ posée sur une réponse : l'information ne passe jamais par la seule couleur. */
export function badge(kind) {
  const { icon: name, label } = BADGES[kind];
  const el = document.createElement('span');
  el.className = `badge badge--${kind}`;
  el.append(icon(name, { size: 18 }));
  const text = document.createElement('span');
  text.className = 'visually-hidden';
  text.textContent = label;
  el.append(text);
  return el;
}

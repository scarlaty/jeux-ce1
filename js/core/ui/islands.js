// Illustrations des îles et du coffre du défi du jour, dessinées en SVG.
// Couleurs : classes de css/rewards.css (variables de tokens.css, île courante via data-island).
// Les chaînes SVG sont des constantes : aucune donnée variable n'est injectée.

const NS = 'http://www.w3.org/2000/svg';

const cube = (x, y, digit) => `
  <path class="isl-mark" d="M${x} ${y}l9-9h38l-9 9z"/>
  <path class="isl-side" d="M${x + 38} ${y}l9-9v36l-9 9z"/>
  <rect class="isl-paper" x="${x}" y="${y}" width="38" height="36" rx="3"/>
  <text class="isl-num" x="${x + 19}" y="${y + 28}">${digit}</text>`;

const ART = {
  mots: `
    <path class="isl-sand" d="M18 108C20 84 60 74 100 76c40-6 86 8 82 30-4 22-50 30-84 28-38 2-82-4-80-26z"/>
    <path class="isl-land" d="M38 104c4-16 38-20 64-18 28-4 62 4 60 18-2 14-34 18-62 17-30 2-64-3-62-17z"/>
    <path class="isl-mark" d="M100 100C82 90 58 88 40 94V42l6-2v46c16-6 38-4 54 6 16-10 38-12 54-6V40l6 2v52c-18-6-42-4-60 6z"/>
    <path class="isl-paper" d="M100 92C84 82 62 80 46 86V40c16-6 38-4 54 6zM100 92c16-10 38-12 54-6V40c-16-6-38-4-54 6z"/>
    <path class="isl-line" d="M56 52q16-4 34 4M56 62q16-4 34 4M56 72q16-4 34 4M110 56q18-8 34-4M110 66q18-8 34-4M110 76q18-8 34-4"/>
    <path class="isl-ink" d="M126 14l4 10 10 1-8 7 3 10-9-6-9 6 3-10-8-7 10-1z"/>`,
  nombres: `
    <path class="isl-sand" d="M14 110c0-20 38-32 82-30 48-2 94 10 90 30-4 20-46 28-86 26-44 2-86-6-86-26z"/>
    <path class="isl-land" d="M34 106c2-14 34-20 66-18 34-2 68 4 66 18-2 14-34 18-66 17-32 1-68-3-66-17z"/>
    ${cube(44, 66, 1)}${cube(92, 66, 2)}${cube(68, 26, 3)}`,
  mesures: `
    <path class="isl-sand" d="M20 112c-6-20 30-32 72-30 40-6 92 4 92 26 0 20-38 28-80 26-42 4-78-4-84-22z"/>
    <path class="isl-land" d="M40 108c-2-14 28-20 62-19 32-3 66 3 64 17-1 13-30 17-62 16-34 2-62-2-64-14z"/>
    <path class="isl-paper" d="M58 98l44-70 44 70z"/>
    <path class="isl-mark" d="M102 28l44 70h-26z"/>
    <path class="isl-line" d="M80 64h22M70 80h32"/>
    <circle class="isl-mark" cx="160" cy="88" r="12"/>
    <rect class="isl-paper" x="40" y="100" width="104" height="14" rx="3"/>
    <path class="isl-line isl-line--thin" d="M50 100v6M60 100v4M70 100v6M80 100v4M90 100v6M100 100v4M110 100v6M120 100v4M130 100v6"/>`,
  monde: `
    <path class="isl-sand" d="M16 106c4-20 42-30 84-28 46-2 88 10 84 32-4 20-48 26-88 24-42 2-84-8-80-28z"/>
    <path class="isl-land" d="M36 104c2-14 36-20 66-18 34-2 64 4 62 18-2 13-34 17-64 16-32 2-66-2-64-16z"/>
    <path class="isl-mark" d="M86 100l34-62 12 14 10-10 30 58z"/>
    <path class="isl-paper" d="M120 38l-11 20 9-3 8 6 6-9z"/>
    <path class="isl-trunk" d="M64 104c3-20-2-38 6-58"/>
    <path class="isl-side" d="M70 46c-14-10-30-6-36 4 12-6 24-4 36-4zM70 46c-4-14-18-20-30-16 12 2 22 8 30 16zM70 46c8-14 24-16 34-8-12-2-24 2-34 8zM70 46c14-4 28 4 30 16-8-8-18-12-30-16z"/>
    <circle class="isl-mark" cx="44" cy="96" r="9"/><circle class="isl-mark" cx="152" cy="104" r="7"/>`,
  ailleurs: `
    <path class="isl-sand" d="M22 110c-4-20 34-30 76-28 44-4 86 8 82 28-4 20-42 26-80 24-40 2-74-6-78-24z"/>
    <path class="isl-land" d="M42 106c0-14 30-20 60-18 32-2 62 4 60 18-2 13-30 16-60 15-30 1-60-2-60-15z"/>
    <path class="isl-paper" d="M126 102l4-52h18l4 52z"/>
    <path class="isl-mark" d="M128 74h22l1 12h-24zM129 56h20l1 8h-22zM124 50l15-14 15 14z"/>
    <rect class="isl-star" x="132" y="40" width="14" height="8" rx="2"/>
    <path class="isl-mark" d="M66 10C44 10 34 30 42 48c6 12 18 18 22 26h8c4-8 16-14 22-26 8-18-2-38-28-38z"/>
    <path class="isl-stripe" d="M68 10c-10 14-10 44-2 64M68 10c10 14 10 44 2 64"/>
    <path class="isl-line isl-line--thin" d="M64 74l2 8M72 74l-2 8"/>
    <rect class="isl-side" x="61" y="82" width="14" height="10" rx="2"/>`,
};

function svg(viewBox, className, markup) {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('class', className);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('focusable', 'false');
  el.innerHTML = markup;
  return el;
}

/** Île illustrée (eau peu profonde, plage, terre aux couleurs de l'île, monument). */
export function islandArt(id) {
  return svg('0 0 200 150', 'island-art', `<ellipse class="isl-shallow" cx="100" cy="110" rx="96" ry="34"/>${ART[id] || ''}`);
}

/** Coffre au trésor du défi du jour : fermé, ou ouvert et plein d'or quand le défi est fait. */
export function chestArt(open = false) {
  const lid = open
    ? '<path class="chest-wood" d="M18 50l6-30c2-8 72-8 74 0l6 30z"/><path class="chest-band" d="M30 50l4-32h9l-3 32zM80 50l-3-32h9l4 32z"/>'
    : '<path class="chest-wood" d="M14 56V40c0-18 92-18 92 0v16z"/><path class="chest-band" d="M27 56V27h10v29zM83 56V27h10v29z"/>';
  const gold = open
    ? '<ellipse class="chest-gold" cx="60" cy="54" rx="40" ry="9"/><circle class="chest-gold" cx="44" cy="50" r="7"/><circle class="chest-gold" cx="62" cy="47" r="8"/><circle class="chest-gold" cx="78" cy="51" r="6"/><path class="chest-spark" d="M60 6v12M40 12l5 8M80 12l-5 8"/>'
    : '';
  return svg('0 0 120 110', 'chest-art', `
    <path class="chest-x" d="M30 92l60 14M90 92l-60 14"/>
    ${open ? lid + gold : ''}
    <rect class="chest-wood" x="14" y="54" width="92" height="42" rx="6"/>
    <path class="chest-plank" d="M16 74h88"/>
    <path class="chest-band" d="M27 54h10v42H27zM83 54h10v42H83z"/>
    ${open ? '' : lid}
    <rect class="chest-band" x="52" y="${open ? 58 : 50}" width="16" height="18" rx="3"/>
    <circle class="chest-hole" cx="60" cy="${open ? 66 : 58}" r="3"/>`);
}

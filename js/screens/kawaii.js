// Page de démonstration du kit kawaii (#88), route #/kawaii (non listée sur la carte).
// Montre tout ce que le kit sait dessiner, pour les développeurs des écrans à venir (#89 – #91)
// et pour relire le rendu en clair, en sombre, sur tablette et sur téléphone.
import { h } from '../core/ui/dom.js';
import {
  draw, mascot, companion, play, label, MASCOTS, COMPANION_STAGES,
  COLORS, FACES, ACCESSORIES, SHAPES, ANIMALS,
} from '../core/ui/art/kawaii.js';
import { draw as drawDeco, DECORATIONS } from '../core/ui/art/kawaii-deco.js';
import { ISLANDS } from '../games/registry.js';

const FACE_TEXT = { happy: 'content', joyful: 'très content', surprised: 'surpris', cheering: 'encourageant', sleepy: 'endormi' };
const ACCESSORY_TEXT = {
  none: 'aucun', bow: 'nœud', hat: 'chapeau', flower: 'fleur', sprout: 'pousse', crown: 'couronne', star: 'étoile', glasses: 'lunettes',
};
const SHAPE_TEXT = { round: 'boule', drop: 'goutte', block: 'cube', star: 'étoile', cloud: 'nuage', egg: 'œuf' };
const ANIMAL_TEXT = { cat: 'chaton', bunny: 'lapin', bear: 'ourson' };
const COLOR_TEXT = { rose: 'rose', peche: 'pêche', citron: 'citron', menthe: 'menthe', ciel: 'ciel', lavande: 'lavande', creme: 'crème' };

/** Un dessin et sa légende (la légende est visible : le dessin lui-même devient décoratif). */
function item(spec, caption, { size } = {}) {
  return h('figure', { class: `kw-item${size ? ` kw-item--${size}` : ''}` },
    h('div', { class: 'kw-item__art' }, draw({ ...spec, decorative: true })),
    h('figcaption', { class: 'kw-item__caption', text: caption }));
}

function section(title, intro, ...children) {
  return h('section', { class: 'kw-section card' },
    h('h2', { class: 'kw-section__title', text: title }),
    intro && h('p', { class: 'kw-section__intro', text: intro }),
    children);
}

/** Groupe de pastilles à choix unique (atelier, compagnon). */
let groups = 0;
function chips(name, options, current, onPick, text = (v) => v) {
  groups += 1;
  const id = `kw-chips-${groups}`;
  const group = h('div', { class: 'kw-chips', role: 'radiogroup', 'aria-labelledby': id });
  for (const value of options) {
    group.append(h('button', {
      type: 'button',
      class: 'kw-chip',
      role: 'radio',
      'aria-checked': String(value === current),
      onclick: (event) => {
        group.querySelectorAll('.kw-chip').forEach((b) => b.setAttribute('aria-checked', String(b === event.currentTarget)));
        onPick(value);
      },
      text: text(value),
    }));
  }
  return h('div', { class: 'kw-field' }, h('span', { class: 'kw-field__label', id, text: name }), group);
}

function title() {
  return h('div', { class: 'kw-hero' },
    h('div', { class: 'kw-hero__deco kw-hero__deco--left', 'aria-hidden': 'true' },
      drawDeco({ shape: 'star', face: 'happy' }), drawDeco({ shape: 'sparkle', color: 'rose' })),
    h('div', { class: 'kw-hero__text' },
      h('h1', { class: 'page-title', text: 'Univers kawaii' }),
      h('p', { class: 'kw-hero__lead', text: 'Le kit de personnages, de décorations et d\'animations du cahier.' })),
    h('div', { class: 'kw-hero__deco kw-hero__deco--right', 'aria-hidden': 'true' },
      drawDeco({ shape: 'heart', face: 'joyful' }), drawDeco({ shape: 'cloud' })));
}

function mascots() {
  const cards = ISLANDS.filter((island) => MASCOTS[island.id]).map((island) => {
    const spec = mascot(island.id);
    const art = h('div', { class: 'kw-mascot__art kw-bounce' }, draw({ ...spec, decorative: true }));
    return h('button', {
      type: 'button',
      class: 'kw-mascot',
      dataset: { island: island.id },
      'aria-label': `${label(spec)} Mascotte de ${island.name}. Touche pour la faire sauter.`,
      onclick: () => {
        art.classList.remove('kw-bounce');
        play(art, 'jump');
        art.addEventListener('animationend', () => art.classList.add('kw-bounce'), { once: true });
      },
    },
    art,
    h('span', { class: 'kw-mascot__name', text: spec.name }),
    h('span', { class: 'kw-mascot__island', text: island.name }));
  });
  return section('Les mascottes des îles', 'Une par île, de la même famille. Touche une mascotte pour la faire sauter de joie.',
    h('div', { class: 'kw-mascots' }, cards));
}

function expressions() {
  return section('Cinq expressions', 'face : happy, joyful, surprised, cheering, sleepy.',
    h('div', { class: 'kw-row' }, FACES.map((face) => item({ body: 'round', color: 'rose', face }, FACE_TEXT[face]))));
}

function shapes() {
  const palette = ['rose', 'ciel', 'peche', 'menthe', 'lavande', 'citron'];
  return section('Formes', 'body : six formes simples, et trois bébés animaux (plus bas).',
    h('div', { class: 'kw-row' }, SHAPES.map((body, i) => item({ body, color: palette[i] }, SHAPE_TEXT[body]))));
}

function colors() {
  return section('Palette pastel', 'color : chaque teinte a son contour (-deep) et son encre lisible (-ink).',
    h('ul', { class: 'kw-palette' }, COLORS.map((color) => h('li', {
      class: 'kw-swatch', style: `--kw-fill: var(--kawaii-${color}); --kw-deep: var(--kawaii-${color}-deep); --kw-ink: var(--kawaii-${color}-ink)`,
    },
    h('span', { class: 'kw-swatch__name', text: COLOR_TEXT[color] }),
    h('code', { class: 'kw-swatch__token', text: `--kawaii-${color}` })))));
}

function accessories() {
  const list = ACCESSORIES.filter((a) => a !== 'none');
  const bodies = ['round', 'block', 'round', 'round', 'round', 'cloud', 'round'];
  const tints = ['ciel', 'menthe', 'citron', 'lavande', 'rose', 'ciel', 'peche'];
  return section('Accessoires', 'accessory : leur couleur (accent) ne se confond jamais avec celle du corps.',
    h('div', { class: 'kw-row' }, list.map((accessory, i) => item({ body: bodies[i], color: tints[i], accessory }, ACCESSORY_TEXT[accessory]))));
}

function growth() {
  let animal = 'cat';
  const row = h('div', { class: 'kw-row kw-row--growth' });
  const paint = () => {
    row.replaceChildren(...COMPANION_STAGES.map(({ stage, name }) => {
      const spec = companion({ animal, stage, color: { cat: 'peche', bunny: 'lavande', bear: 'citron' }[animal] });
      const figure = item(spec, name);
      if (stage === 1) figure.querySelector('.kw-item__art').classList.add('kw-wobble');
      return figure;
    }));
  };
  paint();
  return section('Le compagnon grandit', 'companion({ animal, stage }) : de l\'œuf au grand compagnon (#90).',
    chips('Animal', ANIMALS, animal, (value) => { animal = value; paint(); }, (v) => ANIMAL_TEXT[v]),
    row);
}

function decorations() {
  return section('Décorations', '{ kind: \'kawaii-deco\', shape, color?, face? } : à semer autour des titres et des récompenses.',
    h('div', { class: 'kw-row kw-row--deco' },
      DECORATIONS.map((shape) => h('figure', { class: 'kw-item kw-item--deco' },
        h('div', { class: 'kw-item__art' }, drawDeco({ shape })),
        h('figcaption', { class: 'kw-item__caption', text: shape }))),
      ['star', 'heart', 'cloud'].map((shape) => h('figure', { class: 'kw-item kw-item--deco' },
        h('div', { class: 'kw-item__art' }, drawDeco({ shape, face: 'happy' })),
        h('figcaption', { class: 'kw-item__caption', text: `${shape} + visage` })))));
}

function motions() {
  const loop = (spec, cls, caption) => {
    const figure = item(spec, caption);
    figure.querySelector('.kw-item__art').classList.add(cls);
    return figure;
  };
  const jumper = item({ body: 'bunny', color: 'rose', stage: 2, face: 'joyful' }, 'saut de joie');
  const cheer = item({ body: 'drop', color: 'ciel', face: 'cheering' }, 'encouragement');
  const popper = item({ body: 'star', color: 'citron' }, 'apparition');
  const button = (text, target, motion) => h('button', {
    type: 'button', class: 'btn btn--secondary kw-play', text,
    onclick: () => play(target.querySelector('.kw-item__art'), motion),
  });
  return section('Animations douces', 'Boucles : .kw-bounce, .kw-float, .kw-wobble, .kw-twinkle. Ponctuelles : play(el, \'jump\' | \'wiggle\' | \'pop\'). Les yeux clignent tout seuls. Tout s\'arrête avec « réduire les animations ».',
    h('div', { class: 'kw-row' },
      loop({ body: 'round', color: 'menthe' }, 'kw-bounce', 'rebond'),
      loop({ body: 'cloud', color: 'lavande', face: 'sleepy' }, 'kw-float', 'flottement'),
      loop({ body: 'egg', color: 'creme', accent: 'rose', crack: true }, 'kw-wobble', 'œuf qui bouge'),
      h('figure', { class: 'kw-item kw-item--deco' },
        h('div', { class: 'kw-item__art kw-twinkle' }, drawDeco({ shape: 'sparkle' })),
        h('figcaption', { class: 'kw-item__caption', text: 'scintillement' }))),
    h('div', { class: 'kw-row' }, jumper, cheer, popper),
    h('div', { class: 'kw-actions' },
      button('Saute de joie !', jumper, 'jump'),
      button('Encourage-moi', cheer, 'wiggle'),
      button('Apparais', popper, 'pop')));
}

/** Atelier : composer un personnage et lire la description à donner au kit. */
function workshop() {
  const state = { body: 'round', color: 'rose', face: 'happy', accessory: 'bow' };
  const stage = h('div', { class: 'kw-workshop__art' });
  const code = h('pre', { class: 'kw-code' });
  const paint = () => {
    const spec = { kind: 'kawaii', ...state, ...(ANIMALS.includes(state.body) ? { stage: 2 } : {}) };
    stage.replaceChildren(draw(spec));
    play(stage, 'pop');
    code.textContent = JSON.stringify(spec).replace(/"(\w+)":/g, '$1: ').replace(/"/g, '\'').replace(/,/g, ', ');
  };
  const pick = (key) => (value) => { state[key] = value; paint(); };
  paint();
  return section('Atelier', 'Compose un personnage : la description s\'affiche dessous, prête à copier.',
    h('div', { class: 'kw-workshop' },
      stage,
      h('div', { class: 'kw-workshop__controls' },
        chips('Forme', [...SHAPES, ...ANIMALS], state.body, pick('body'), (v) => SHAPE_TEXT[v] || ANIMAL_TEXT[v]),
        chips('Couleur', COLORS, state.color, pick('color'), (v) => COLOR_TEXT[v]),
        chips('Expression', FACES, state.face, pick('face'), (v) => FACE_TEXT[v]),
        chips('Accessoire', ACCESSORIES, state.accessory, pick('accessory'), (v) => ACCESSORY_TEXT[v]))),
    code);
}

export default {
  title: 'Univers kawaii',
  render(view, { app }) {
    app.setTitle('Univers kawaii');
    view.append(h('div', { class: 'page kw-demo' },
      title(), mascots(), expressions(), shapes(), accessories(), growth(), decorations(), motions(), colors(), workshop()));
  },
};

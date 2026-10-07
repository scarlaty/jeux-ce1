// « Mon compagnon » (#90) : l'œuf, son éclosion (choix de l'animal et du nom), puis le compagnon en
// grand avec son stade et ce qu'il reste avant qu'il grandisse. Aucun reproche : il ne dépend jamais
// de la régularité de l'enfant, il attend simplement.
// Toute la logique (stades, seuils, noms) est dans core/companion.js ; ici, seulement l'affichage.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { confetti } from '../core/ui/confetti.js';
import { draw as drawDeco } from '../core/ui/art/kawaii-deco.js';
import { play } from '../core/ui/art/kawaii.js';
import { companionSticker } from '../core/ui/companion.js';
import {
  COMPANION_ANIMALS, MAX_NAME, STAGE_LABELS, animalInfo, customize, hatch, nameOrDefault,
  progressOf, progressText, readCompanion, readyToHatch, saveCompanion, stageOf,
} from '../core/companion.js';
import { ACCESSORIES, equip, readChest, saveChest, withAccessory } from '../core/chest.js';
import { accessoryPreview } from '../core/ui/chest.js';
import * as audio from '../core/audio.js';

const FRIEZE = [2, 3, 4];   // les stades montrés dans la frise une fois l'œuf éclos

/** Barre de progression (même composant que celle des grades). */
function meter(companion) {
  const p = progressOf(companion);
  return h('span', { class: 'meter', role: 'img', 'aria-label': progressText(companion) },
    h('span', { class: 'meter__fill', style: `--ratio: ${Math.min(1, Math.max(0, p.ratio)).toFixed(3)}` }));
}

/**
 * Choix de l'animal + champ du nom. `value()` renvoie { animal, name } (nom non filtré : c'est
 * hatch() / customize() qui le nettoient). Le nom proposé suit l'animal tant que l'enfant n'a rien écrit.
 */
function picker({ animal, name, onChange }) {
  let current = animal;
  let touched = Boolean(name);
  const field = h('input', {
    class: 'name-field', type: 'text', id: 'nom-compagnon', name: 'nom-compagnon',
    value: name || animalInfo(animal).defaultName,
    maxlength: String(MAX_NAME), autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false',
    enterkeyhint: 'done', 'aria-describedby': 'nom-compagnon-aide',
  });
  field.addEventListener('input', () => { touched = true; });

  const buttons = new Map();
  for (const a of COMPANION_ANIMALS) {
    const art = companionSticker({ animal: a.id, hatched: true, name: '', games: 0, stars: 0 }, { stage: 2, blink: false });
    const button = h('button', {
      type: 'button',
      class: `pet-pick${a.id === current ? ' is-picked' : ''}`,
      'aria-pressed': String(a.id === current),
      onclick: () => {
        current = a.id;
        audio.playSound('tap');
        for (const [id, el] of buttons) {
          el.classList.toggle('is-picked', id === current);
          el.setAttribute('aria-pressed', String(id === current));
        }
        if (!touched) field.value = animalInfo(current).defaultName;
        play(art, 'pop');
        onChange?.(current);
      },
    }, art, h('span', { class: 'pet-pick__label', text: a.label }));
    buttons.set(a.id, button);
  }

  const el = h('div', { class: 'pet-picker' },
    h('div', { class: 'identity__row' },
      h('p', { class: 'identity__label', id: 'animal-label', text: 'Choisis ton animal' }),
      h('div', { class: 'pet-grid', role: 'group', 'aria-labelledby': 'animal-label' }, [...buttons.values()])),
    h('div', { class: 'identity__row' },
      h('label', { class: 'identity__label', for: 'nom-compagnon', text: 'Son nom' }),
      field,
      h('p', { class: 'identity__hint', id: 'nom-compagnon-aide', text: 'Des lettres, au plus 12. Tu pourras le changer quand tu veux.' })));
  return { el, field, value: () => ({ animal: current, name: field.value }) };
}

export default {
  title: 'Mon compagnon',
  render(view, { app }) {
    const load = () => {
      const profile = app.store.getProfile(app.profileId);
      return { companion: withAccessory(readCompanion(profile), profile), chest: readChest(profile) };
    };
    let { companion, chest } = load();
    let step = readyToHatch(companion) ? 'egg' : 'main';
    let stopConfetti = () => {};
    let timer = null;
    const root = h('section', { class: 'page page--narrow pet' });
    view.append(root);

    const save = (update) => {
      saveCompanion(app.store, app.profileId, update);
      ({ companion, chest } = load());
    };

    /** L'enfant met (ou retire) un accessoire : un seul à la fois, ou aucun. Le dessin change sur place. */
    const wear = (id) => {
      saveChest(app.store, app.profileId, (c) => equip(c, id));
      ({ companion, chest } = load());
    };

    // --- L'œuf est prêt : il frémit, l'enfant le touche ------------------------------------

    function showEgg() {
      const art = companionSticker(companion, { loop: 'wobble', className: 'pet__art pet__art--egg', decorative: false });
      const touch = h('button', {
        type: 'button', class: 'btn btn--primary',
        onclick: () => {
          audio.playSound('star');
          play(art, 'pop');
          touch.disabled = true;
          timer = setTimeout(() => { step = 'choose'; show(); }, 650);
        },
      }, h('span', { text: 'Toucher l\'œuf' }));
      root.replaceChildren(h('div', { class: 'card pet__card' },
        art,
        h('h1', { class: 'page-title', text: 'Ton œuf bouge !' }),
        h('p', { class: 'pet__lead cursive', text: 'Quelqu\'un va en sortir…' }),
        h('div', { class: 'end__actions' }, touch)));
      touch.focus({ preventScroll: true });
    }

    // --- L'éclosion : choisir l'animal et son nom --------------------------------------------

    function showChoose() {
      const choice = picker({ animal: companion.animal, name: '' });
      const form = h('form', {
        class: 'card pet__card identity',
        novalidate: true,
        onsubmit: (event) => {
          event.preventDefault();
          const { animal, name } = choice.value();
          save((c) => hatch(c, { animal, name }));
          audio.playSound('finish');
          stopConfetti();
          stopConfetti = confetti();
          step = 'party';
          show();
        },
      },
      h('h1', { class: 'page-title', text: 'L\'œuf éclot !' }),
      h('p', { class: 'pet__lead cursive', text: 'Qui est dans l\'œuf ? C\'est toi qui choisis.' }),
      choice.el,
      h('div', { class: 'identity__actions' },
        h('button', { type: 'submit', class: 'btn btn--primary' }, h('span', { text: 'Voir mon compagnon' }), icon('arrowRight'))));
      root.replaceChildren(form);
      choice.field.focus({ preventScroll: true });
    }

    // --- La fête de l'éclosion ---------------------------------------------------------------

    function showParty() {
      const sparkle = (side, color) => h('span', { class: `end__deco end__deco--${side} kw-twinkle`, 'aria-hidden': 'true' },
        drawDeco({ shape: 'sparkle', color }));
      const art = companionSticker(companion, { face: 'joyful', loop: 'bounce', className: 'pet__art', decorative: false });
      root.replaceChildren(h('div', { class: 'card pet__card' },
        h('div', { class: 'end__buddy' }, sparkle('left', 'citron'), art, sparkle('right', 'rose')),
        h('h1', { class: 'page-title end__title' }),
        h('p', { class: 'pet__lead cursive', text: 'Il grandira avec les étoiles que tu gagnes.' }),
        h('div', { class: 'end__actions' },
          h('button', { type: 'button', class: 'btn btn--primary', onclick: () => { step = 'main'; show(); } },
            h('span', { text: 'Mon compagnon' }), icon('arrowRight')),
          h('a', { class: 'btn btn--ghost', href: '#/' }, icon('home'), h('span', { text: 'La carte des îles' })))));
      root.querySelector('.end__title').textContent = `Bienvenue, ${companion.name} !`;
      play(art.parentElement, 'pop');
      root.querySelector('.end__actions .btn').focus({ preventScroll: true });
    }

    // --- Mes accessoires (#91) : ceux des coffres, un seul porté à la fois ---------------------------

    function accessoriesSection(bigArt) {
      const buttons = new Map();   // id (ou 'none') → bouton
      let art = bigArt;
      const refresh = () => {
        const next = companionSticker(companion, {
          loop: companion.hatched ? 'bounce' : null, className: 'pet__art', decorative: false });
        art.replaceWith(next);
        art = next;
        play(next, 'pop');
        for (const [id, el] of buttons) {
          const worn = id === 'none' ? !chest.equipped : chest.equipped === id;
          el.classList.toggle('is-worn', worn);
          el.setAttribute('aria-pressed', String(worn));
          const state = el.querySelector('.acc-item__state');
          if (state) state.textContent = worn ? 'Porté' : (id === 'none' ? '' : 'Mettre');
        }
      };
      const pick = (id) => {
        audio.playSound('tap');
        wear(id);
        refresh();
      };
      const canWear = companion.hatched;
      const none = h('button', {
        type: 'button', class: `acc-item${chest.equipped ? '' : ' is-worn'}`, disabled: !canWear,
        'aria-pressed': String(!chest.equipped), onclick: () => pick(null),
      }, h('span', { class: 'acc-item__none', 'aria-hidden': 'true', text: '∅' }),
      h('span', { class: 'acc-item__name', text: 'Rien' }),
      h('span', { class: 'acc-item__state', text: chest.equipped ? '' : 'Porté' }));
      buttons.set('none', none);
      const items = ACCESSORIES.map((a) => {
        if (!chest.accessories.includes(a.id)) {
          return h('li', {}, h('div', { class: 'acc-item is-locked' },
            h('span', { class: 'acc-item__hole', 'aria-hidden': 'true', text: '?' }),
            h('span', { class: 'visually-hidden', text: 'Accessoire à gagner dans un coffre' })));
        }
        const worn = chest.equipped === a.id;
        const button = h('button', {
          type: 'button', class: `acc-item${worn ? ' is-worn' : ''}`, disabled: !canWear,
          'aria-pressed': String(worn), onclick: () => pick(a.id),
        }, accessoryPreview(a.id, companion, { className: 'acc-item__art' }),
        h('span', { class: 'acc-item__name', text: a.name }),
        h('span', { class: 'acc-item__state', text: worn ? 'Porté' : 'Mettre' }));
        buttons.set(a.id, button);
        return h('li', {}, button);
      });
      const section = h('section', { class: 'card acc', 'aria-labelledby': 'acc-title' },
        h('div', { class: 'acc__head' },
          h('h2', { class: 'acc__title', id: 'acc-title', text: 'Mes accessoires' }),
          h('span', { class: 'acc__count', text: `${chest.accessories.length} / ${ACCESSORIES.length}` })),
        h('p', { class: 'acc__lead cursive', text: canWear
          ? 'Touche un accessoire pour le mettre.'
          : 'Fais éclore ton œuf pour lui mettre des accessoires.' }),
        h('ul', { class: 'acc-grid' }, h('li', {}, none), items),
        h('p', { class: 'identity__hint', text: 'Les accessoires se trouvent dans les coffres, après une partie réussie.' }));
      return section;
    }

    // --- L'écran habituel --------------------------------------------------------------------

    function showMain() {
      const stage = stageOf(companion);
      const name = companion.hatched ? companion.name : 'Mon œuf';
      const art = companionSticker(companion, {
        loop: companion.hatched ? 'bounce' : (stage === 1 ? 'wobble' : 'float'),
        className: 'pet__art', decorative: false,
      });
      const next = progressOf(companion).next;

      const frieze = companion.hatched && h('ol', { class: 'pet-frieze', 'aria-label': 'Les étapes de ton compagnon' },
        FRIEZE.map((s) => h('li', {
          class: `pet-step${s === stage ? ' is-current' : ''}${s > stage ? ' is-ahead' : ''}`,
          ...(s === stage ? { 'aria-current': 'step' } : {}),
        },
        companionSticker(companion, { stage: s, blink: false, className: 'pet-step__art' }),
        h('span', { class: 'pet-step__label', text: STAGE_LABELS[s] }),
        h('span', { class: 'pet-step__note', text: s === stage ? 'Maintenant' : (s > stage ? 'Bientôt' : 'Déjà vu') }))));

      const edit = companion.hatched && (() => {
        const choice = picker({ animal: companion.animal, name: companion.name });
        return h('form', {
          class: 'card pet__card identity pet__edit', novalidate: true,
          onsubmit: (event) => {
            event.preventDefault();
            const { animal, name } = choice.value();
            save((c) => customize(c, { animal, name: nameOrDefault(name, animal) }));
            audio.playSound('success');
            step = 'main';
            show();
          },
        },
        h('h2', { class: 'pet__edit-title', text: 'Changer d\'animal ou de nom' }),
        choice.el,
        h('div', { class: 'identity__actions' },
          h('button', { type: 'submit', class: 'btn btn--secondary' }, icon('check'), h('span', { text: 'Enregistrer' }))));
      })();

      const accessories = (companion.hatched || chest.accessories.length) ? accessoriesSection(art) : null;
      root.replaceChildren(
        h('div', { class: 'card pet__card' },
          art,
          h('h1', { class: 'page-title pet__name', text: name }),
          h('p', { class: 'pet__stage' }, h('span', { class: 'chip', text: STAGE_LABELS[stage] })),
          meter(companion),
          h('p', { class: 'pet__progress', text: progressText(companion) }),
          next === null && h('p', { class: 'pet__lead cursive', text: 'Merci de jouer avec lui !' }),
          !companion.hatched && h('p', { class: 'pet__lead cursive', text: 'Il éclot quand tu as terminé des parties.' })),
        accessories,
        frieze || null,
        edit || null,
        h('div', { class: 'end__actions pet__actions' },
          h('a', { class: 'btn btn--ghost', href: '#/' }, icon('home'), h('span', { text: 'La carte des îles' }))));
    }

    function show() {
      clearTimeout(timer);
      if (step === 'egg') showEgg();
      else if (step === 'choose') showChoose();
      else if (step === 'party') showParty();
      else showMain();
      window.scrollTo(0, 0);
    }

    show();
    return () => {
      clearTimeout(timer);
      stopConfetti();
    };
  },
};

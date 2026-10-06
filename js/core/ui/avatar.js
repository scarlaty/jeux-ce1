// Avatar + prénom d'un profil : pastille de la barre du haut, cartes de profils, grille d'avatars,
// formulaire « prénom + animal ». Le prénom est toujours inséré avec textContent.
//
//   avatarBadge(profile, { size: 's' | 'm' | 'l' | 'xl', withName = true })   → <span>
//   profileChip(profile)          → lien vers #/profil (barre du haut)
//   avatarPicker({ value, onChange })            → { el, get value() }
//   identityForm({ name, avatar, submitLabel, onSubmit(name, avatar), onCancel? }) → { el, focus() }
import { h } from './dom.js';
import { icon } from './icons.js';
import { AVATARS, avatarLabel, validateName, NAME_MAX } from '../profile.js';

/** Rond avec l'animal (ou l'initiale du prénom si aucun avatar n'est choisi). */
function avatarDisc(profile, size) {
  const name = profile?.name || '';
  if (profile?.avatar) {
    return h('span', { class: `avatar avatar--${size}` },
      h('span', { class: 'emoji', role: 'img', 'aria-label': avatarLabel(profile.avatar), text: profile.avatar }));
  }
  return h('span', { class: `avatar avatar--${size} avatar--empty`, 'aria-hidden': 'true', text: [...name][0]?.toUpperCase() || '?' });
}

/** Avatar + prénom (réutilisable : accueil, choix du profil, espace parents…). */
export function avatarBadge(profile, { size = 'm', withName = true } = {}) {
  return h('span', { class: `avatar-badge avatar-badge--${size}` },
    avatarDisc(profile, size),
    withName && h('span', { class: 'avatar-badge__name', text: profile?.name || 'Sans prénom' }));
}

/** Pastille de la barre du haut : mène à #/profil. */
export function profileChip(profile) {
  const name = profile?.name || '';
  return h('a', {
    class: 'profile-chip',
    href: '#/profil',
    'aria-label': name ? `Mon profil\u00a0: ${name}` : 'Mon profil',
  }, avatarBadge(profile, { size: 's' }));
}

/** Grille d'animaux à choisir (groupe de boutons radio, flèches du clavier comprises). */
export function avatarPicker({ value = null, onChange = () => {}, label = 'Choisis ton animal' } = {}) {
  let current = value;
  const buttons = AVATARS.map((a) => h('button', {
    type: 'button',
    class: 'avatar-option',
    role: 'radio',
    'aria-label': a.label,
    dataset: { avatar: a.emoji },
    onclick: () => select(a.emoji, true),
  }, h('span', { class: 'emoji', 'aria-hidden': 'true', text: a.emoji })));

  function refresh() {
    const focusable = buttons.find((b) => b.dataset.avatar === current) || buttons[0];
    for (const b of buttons) {
      const on = b.dataset.avatar === current;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('is-selected', on);
      b.tabIndex = b === focusable ? 0 : -1;
    }
  }

  function select(emoji, notify) {
    current = emoji;
    refresh();
    if (notify) onChange(emoji);
  }

  const el = h('div', { class: 'avatar-grid', role: 'radiogroup', 'aria-label': label, onkeydown: (event) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement);
    const next = buttons[(Math.max(0, index) + keys[event.key] + buttons.length) % buttons.length];
    select(next.dataset.avatar, true);
    next.focus();
  } }, buttons);
  refresh();
  return { el, get value() { return current; } };
}

let formCount = 0;

/**
 * Formulaire prénom + animal. `onSubmit(name, avatar)` reçoit un prénom déjà validé et nettoyé.
 * La saisie se fait au clavier de l'appareil ; les erreurs s'affichent sous le champ, gentiment.
 */
export function identityForm({
  name = '', avatar = null, submitLabel = 'Valider', onSubmit, onCancel = null,
  nameLabel = 'Ton prénom', avatarLabel: pickerLabel = 'Choisis ton animal', preview = true,
} = {}) {
  const id = `identity-${++formCount}`;
  const input = h('input', {
    id: `${id}-name`,
    class: 'text-field',
    type: 'text',
    name: 'prenom',
    value: name,
    maxlength: String(NAME_MAX + 10),   // marge : les espaces en trop sont retirés à la validation
    autocomplete: 'off',
    autocapitalize: 'words',
    spellcheck: 'false',
    enterkeyhint: 'done',
    'aria-describedby': `${id}-error`,
  });
  const error = h('p', { id: `${id}-error`, class: 'field-error', 'aria-live': 'polite' });
  const previewEl = h('div', { class: 'identity-form__preview', 'aria-hidden': 'true' });

  const renderPreview = () => {
    if (!preview) return;
    const typed = validateName(input.value);
    previewEl.replaceChildren(avatarBadge({ name: typed.ok ? typed.value : '', avatar: picker.value }, { size: 'l', withName: typed.ok }));
  };
  const picker = avatarPicker({ value: avatar, label: pickerLabel, onChange: () => { error.textContent = ''; renderPreview(); } });
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    error.textContent = '';
    renderPreview();
  });

  const el = h('form', { class: 'identity-form', novalidate: true, onsubmit: (event) => {
    event.preventDefault();
    const check = validateName(input.value);
    if (!check.ok) {
      error.textContent = check.error;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    if (!picker.value) {
      error.textContent = 'Choisis un animal.';
      picker.el.querySelector('[tabindex="0"]')?.focus();
      return;
    }
    input.value = check.value;
    onSubmit?.(check.value, picker.value);
  } },
  h('div', { class: 'identity-form__field' },
    h('label', { class: 'field-label', for: input.id, text: nameLabel }),
    input),
  h('fieldset', { class: 'identity-form__avatars' },
    h('legend', { class: 'field-label', text: pickerLabel }),
    picker.el),
  error,
  preview && previewEl,
  h('div', { class: 'identity-form__actions' },
    onCancel && h('button', { type: 'button', class: 'btn btn--secondary', onclick: onCancel }, h('span', { text: 'Annuler' })),
    h('button', { type: 'submit', class: 'btn btn--primary' }, h('span', { text: submitLabel }), icon('arrowRight'))));
  renderPreview();
  return { el, focus: () => input.focus() };
}

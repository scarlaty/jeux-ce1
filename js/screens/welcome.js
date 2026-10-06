// Prénom + avatar (#9, #10). Trois usages, un seul écran :
//   #/bienvenue       premier lancement (le profil actif n'a pas encore de prénom) ;
//   #/profil/nouveau  ajouter un frère ou une sœur ;
//   #/profil/<id>     modifier un profil existant.
// Toute la logique (nettoyage du prénom, liste des avatars) est dans core/profile.js.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import {
  AVATARS, DEFAULT_AVATAR, MAX_NAME, cleanName, isValidName,
  createProfile, listProfiles, updateIdentity,
} from '../core/profile.js';
import * as audio from '../core/audio.js';

/** Quel profil cet écran modifie-t-il, et avec quels mots ? */
function modeOf(path, params, app) {
  if (path === '/profil/nouveau') {
    return { kind: 'new', title: 'Nouveau profil', lead: 'Qui va jouer ?', submit: 'Créer le profil', id: null };
  }
  if (params.id) {
    return { kind: 'edit', title: 'Mon profil', lead: 'Change ton prénom ou ton avatar.', submit: 'Enregistrer', id: params.id };
  }
  return { kind: 'welcome', title: 'Bienvenue !', lead: 'Comment t\'appelles-tu ?', submit: 'C\'est parti !', id: app.profileId };
}

export default {
  render(view, { params, app, route }) {
    const mode = modeOf(route.path, params, app);
    const current = mode.id ? app.store.getProfile(mode.id) : null;
    if (mode.kind === 'edit' && !current) {
      app.navigate('/profil', { replace: true });
      return undefined;
    }
    app.setTitle(mode.title);

    let avatar = current?.avatar || DEFAULT_AVATAR;

    const field = h('input', {
      class: 'name-field',
      type: 'text',
      id: 'prenom',
      name: 'prenom',
      value: current?.name || '',
      maxlength: String(MAX_NAME),
      autocomplete: 'off',
      autocapitalize: 'words',
      spellcheck: 'false',
      enterkeyhint: 'done',
      'aria-describedby': 'prenom-aide',
    });

    const submit = h('button', { type: 'submit', class: 'btn btn--primary' },
      h('span', { text: mode.submit }), icon('arrowRight'));
    const refresh = () => { submit.disabled = !isValidName(field.value); };
    field.addEventListener('input', refresh);

    const buttons = new Map();
    for (const a of AVATARS) {
      buttons.set(a.id, h('button', {
        type: 'button',
        class: `avatar-pick${a.id === avatar ? ' is-picked' : ''}`,
        'aria-pressed': String(a.id === avatar),
        'aria-label': a.label,
        onclick: () => {
          avatar = a.id;
          audio.playSound('tap');
          for (const [id, el] of buttons) {
            el.classList.toggle('is-picked', id === avatar);
            el.setAttribute('aria-pressed', String(id === avatar));
          }
        },
      }, h('span', { class: 'emoji', 'aria-hidden': 'true', text: a.emoji })));
    }

    function save(event) {
      event.preventDefault();
      const name = cleanName(field.value);
      if (!name) { field.focus(); return; }
      const id = mode.kind === 'new'
        ? createProfile(app.store, { name, avatar })
        : (updateIdentity(app.store, mode.id, { name, avatar }), mode.id);
      app.switchProfile(id);
      audio.playSound('finish');
      app.navigate('/', { replace: mode.kind === 'welcome' });
    }

    const form = h('form', { class: 'card identity', novalidate: true, onsubmit: save },
      h('h1', { class: 'page-title identity__title', text: mode.title }),
      h('p', { class: 'identity__lead cursive', text: mode.lead }),
      h('div', { class: 'identity__row' },
        h('label', { class: 'identity__label', for: 'prenom', text: 'Ton prénom' }),
        field,
        h('p', { class: 'identity__hint', id: 'prenom-aide', text: 'Il s\'affiche en haut de l\'écran. Tu pourras le changer quand tu veux.' })),
      h('div', { class: 'identity__row' },
        h('p', { class: 'identity__label', id: 'avatar-label', text: 'Choisis ton avatar' }),
        h('div', { class: 'avatar-grid', role: 'group', 'aria-labelledby': 'avatar-label' }, [...buttons.values()])),
      h('div', { class: 'identity__actions' },
        mode.kind !== 'welcome' && h('a', { class: 'btn btn--ghost', href: '#/profil' },
          icon('arrowLeft'), h('span', { text: 'Annuler' })),
        submit));

    const page = h('section', { class: 'page page--narrow' }, form);

    // Tablette neuve : le parent peut restaurer une sauvegarde au lieu de repartir de zéro (#14).
    if (mode.kind === 'welcome') {
      page.append(h('p', { class: 'identity__others' },
        h('a', { class: 'identity__link', href: '#/parents', text: 'Vous avez déjà une sauvegarde ? Espace parents' })));
    }

    // Avant d'ajouter quelqu'un, on rappelle qui joue déjà sur la tablette.
    if (mode.kind === 'new') {
      const names = listProfiles(app.store).map((p) => p.name).filter(Boolean);
      if (names.length) {
        page.append(h('p', { class: 'identity__others' },
          h('span', { text: 'Déjà sur cette tablette : ' }),
          h('strong', { text: names.join(', ') })));
      }
    }

    view.append(page);
    refresh();
    field.focus({ preventScroll: true });
    return undefined;
  },
};

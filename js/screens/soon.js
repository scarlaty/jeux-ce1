// Écran d'attente pour les rubriques pas encore construites.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';

export default {
  render(view, { app, route }) {
    view.append(h('section', { class: 'page page--narrow' },
      h('div', { class: 'card soon' },
        h('h1', { class: 'page-title', text: route.title || 'Bientôt' }),
        h('p', { class: 'cursive soon__text', text: 'Bientôt ici !' }),
        h('a', { class: 'btn btn--primary', href: '#/' }, icon('home'), h('span', { text: 'Retour à l\'accueil' })))));
    app.setTitle(route.title || '');
  },
};

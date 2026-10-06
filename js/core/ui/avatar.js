// Pastille d'avatar, partagée par la barre du haut, la liste des profils et l'espace parents.
// L'émoji est une image de contenu : il porte toujours son nom (« Chat », « Licorne »…).
import { h } from './dom.js';
import { avatarOf } from '../profile.js';

/** `size` : 's' (barre du haut), 'm' (listes), 'l' (écran de profil). */
export function avatarBubble(avatarId, { size = 'm', decorative = false } = {}) {
  const a = avatarOf(avatarId);
  return h('span', {
    class: `avatar-bubble avatar-bubble--${size}`,
    role: decorative ? null : 'img',
    'aria-label': decorative ? null : a.label,
    'aria-hidden': decorative ? 'true' : null,
  }, h('span', { class: 'emoji', 'aria-hidden': 'true', text: a.emoji }));
}

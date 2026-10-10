// QCM : choix texte, image (émoji) ou image + mot. Un appui = une réponse.
//
// display : {
//   choices: [ 'mot' | 12 | { value, text?, emoji?, label?, lang? } ],   // 2 à 6 choix
//   cursive?: true,   // les textes des choix sont des mots français à lire (police cursive)
//   large?: true,     // gros caractères : choix d'une seule lettre ou d'un son (b / d)
//   row?: true,       // 3 choix très courts (< = >) toujours sur une seule ligne, même sur téléphone
//   show?: { … }      // illustration commune (voir ui/index.js)
// Un choix dessiné peut porter `label` (son nom, sans le montrer) : la correction l'écrit à côté du dessin.
// }
// answer : la `value` du bon choix.
import { h, content } from './dom.js';
import { badge } from './icons.js';
import { toChoice } from '../validate.js';
import { sameAnswer } from '../engine.js';

/** Au-delà de cette longueur, un choix est une phrase : il lui faut toute la largeur (#115). */
export const LONG_CHOICE = 24;

/** Vrai quand au moins un choix est une phrase : la grille passe alors à une seule colonne. */
export function hasLongChoice(choices = []) {
  return choices.some((c) => c && typeof c.text === 'string' && [...c.text].length > LONG_CHOICE);
}

export function create(question, ctx) {
  const { display } = question;
  const choices = display.choices.map(toChoice);
  const withImages = choices.some((c) => c.emoji);
  const many = choices.length > 4;
  // Un choix qui est une phrase ne tient pas dans une colonne de 158 px : il s'y casse en cinq
  // lignes de deux mots, sans jamais déborder. Au-delà de 24 caractères, une seule colonne (#115).
  const long = hasLongChoice(choices);
  let locked = false;
  let picked = null;

  const list = h('div', {
    class: ['choices', withImages && 'choices--images', many && 'choices--many', long && !withImages && 'choices--long', display.large && 'choices--large', display.row && 'choices--row'].filter(Boolean).join(' '),
    role: 'group',
    'aria-label': 'Réponses possibles',
  });

  const buttons = choices.map((choice) => {
    const button = h('button', {
      type: 'button',
      class: 'choice',
      onclick: () => {
        if (locked) return;
        locked = true;
        picked = choice;
        button.classList.add('is-picked');
        ctx.submit(choice.value);
      },
    }, content(choice, { cursive: Boolean(display.cursive) }));
    list.append(button);
    return { button, choice };
  });

  return {
    el: list,
    showResult() {
      locked = true;
      for (const { button, choice } of buttons) {
        button.disabled = true;
        if (sameAnswer(question.answer, choice.value)) {
          button.classList.add('is-right');
          button.append(badge('right'));
        } else if (choice === picked) {
          button.classList.add('is-wrong');
          button.append(badge('wrong'));
        } else {
          button.classList.add('is-dim');
        }
      }
    },
  };
}

/** La bonne réponse, pour la bulle de correction : { emoji?, text?, cursive? }. */
export function describe(question) {
  const right = question.display.choices.map(toChoice).find((c) => sameAnswer(question.answer, c.value));
  if (!right) return { text: String(question.answer) };
  return {
    emoji: right.emoji,
    text: right.text ?? right.label,
    lang: right.lang,
    art: right.art,
    cursive: Boolean(question.display.cursive),
  };
}

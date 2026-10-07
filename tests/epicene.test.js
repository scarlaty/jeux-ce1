// Test DU HELPER de mixité (#107). Sans lui, chaque jeu qui « passe » donne une fausse assurance :
// la première version de `checkEpicene` laissait passer 15 contournements sur 20 sondes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { genderedAgreements, checkEpicene } from './helpers/epicene.js';

// Doivent être DÉTECTÉS (accord genré attribué à l'enfant qui joue).
const FAUTIFS = [
  'Comme tu es grand !',
  'Comme tu es grande !',
  'Tu es le premier !',
  'Tu es la première !',
  'Tu es le meilleur !',
  'Tu sembles content.',
  'Tu parais fatigué.',
  'Tu es si fier de toi !',
  'Tu as été très courageuse.',
  'Sois attentif.',
  'Tu es rapide et fort !',          // l'accord est en deuxième position
  'Es-tu prêt ?',
  'T\'es sûr ?',
  'Tu deviens très savante.',
  'Tu restes assise.',
  'Te voilà bien grandi !',
  'Tu es vraiment doué pour ça.',
  'Tu as l\'air inquiet.',
];

// Ne doivent PAS être signalés : épicènes, ou accord qui porte sur autre chose que l'enfant.
const CORRECTS = [
  'Comme tu es rapide !',
  'Tu es calme.',
  'Comme tu cours vite !',
  'Tu es dans la belle maison.',         // « belle » s'accorde avec « maison »
  'Tu as une belle robe.',               // l'accord porte sur la robe
  'Tu es sur la grande balançoire.',
  'Léa est contente de son dessin.',     // un personnage nommé garde son genre
  'Ma petite sœur est gentille !',
  'Quelle belle journée !',
  'Tu manges une bonne glace.',
  'Comme ce bébé est mignon !',
  'Tu vas jouer avec ta sœur.',
];

test('le helper détecte bien les accords genrés adressés à l\'enfant', () => {
  const manques = FAUTIFS.filter((t) => genderedAgreements(t).length === 0);
  assert.deepEqual(manques, [], 'sondes fautives non détectées');
});

test('le helper ne crie pas au loup : épicènes et accords portant sur autre chose', () => {
  const faux = CORRECTS.filter((t) => genderedAgreements(t).length > 0)
    .map((t) => `${t} → ${genderedAgreements(t).join(', ')}`);
  assert.deepEqual(faux, [], 'faux positifs');
});

test('le « je » n\'est vérifié que sur demande (dans une devinette, c\'est l\'objet qui parle)', () => {
  // « Je suis grande » = la girafe : juste. Mais « Que fais-tu ? — Je suis fatigué. » = l'enfant : fautif.
  assert.equal(genderedAgreements('Je suis grande, je vis en Afrique.').length, 0);
  assert.ok(genderedAgreements('Je suis fatigué.', { firstPerson: true }).length > 0);
});

test('checkEpicene échoue bien, et nomme le texte fautif', () => {
  assert.throws(() => checkEpicene(['Comme tu es grand !'], { label: 'sonde' }), /tu es.*grand/s);
  checkEpicene(CORRECTS, { label: 'sondes correctes' });
});

// Mixité (règle de CLAUDE.md, ajoutée le 07/10 ; outillée par #107).
// Le jeu est pour les filles ET les garçons, et on ne sait jamais qui joue : aucun texte adressé à
// l'enfant ne doit porter un accord genré. Ce test passe TOUS les jeux du registre au crible, pour
// qu'un jeu à venir ne réintroduise pas le défaut (« Comme tu es grand ! » dans « La phrase »).
//
// Le « je » n'est PAS vérifié par défaut : dans une devinette, c'est l'objet qui parle (« Je suis
// grande » = la girafe) et l'accord y est juste. Un jeu dont le « je » est celui de l'enfant doit
// ajouter, dans son propre fichier de test, `checkEpicene(..., { firstPerson: true })`.
import test from 'node:test';
import { GAMES, loadGame } from '../js/games/registry.js';
import { createRng } from '../js/core/random.js';
import { buildQuestions } from '../js/core/engine.js';
import { checkEpicene, textsOfQuestion } from './helpers/epicene.js';

const PAR_NIVEAU = 300;

test('aucun jeu n\'adresse un accord genré à l\'enfant qui joue', async () => {
  for (const meta of GAMES) {
    const game = await loadGame(meta.id);
    const texts = [];
    for (let level = 1; level <= game.levels.length; level++) {
      const rng = createRng(31 + level);
      const qs = [];
      while (qs.length < PAR_NIVEAU) qs.push(...buildQuestions(game, level, rng, 10));
      for (const q of qs) texts.push(...textsOfQuestion(q));
    }
    checkEpicene(texts, { label: `jeu « ${meta.title || meta.id} »` });
  }
});

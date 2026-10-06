// Découpage en syllabes de mots illustrés, partagé par les jeux de lecture (syllabes, lecture…).
// Aucune dépendance de DOM : uniquement des données et des fonctions pures.
//
// CONVENTION (celle des manuels de CE1) : on découpe le mot ÉCRIT en syllabes écrites, et le
// « e » muet de la fin forme une syllabe écrite : « tomate » = to-ma-te (3 syllabes écrites),
// même si l'on n'en prononce que deux. Pour qu'aucune question ne prête à confusion :
//   - on ne demande de COMPTER des syllabes, ou de trouver la DERNIÈRE syllabe, que sur des
//     mots « transparents », où l'on entend exactement les syllabes écrites (`isTransparent`) :
//     ni « e » muet ou discret (« to-ma-te », « che-val »), ni rien d'autre à négocier ;
//   - les mots qui ont un « e » muet ne servent qu'à remettre des syllabes dans l'ordre :
//     là, les syllabes sont données, et l'explication rappelle la convention ;
//   - on écarte les mots dont le découpage varie d'un manuel à l'autre : consonne double
//     (« bal-lon » ou « ba-llon » ?), « ill » (« fa-mil-le » ou « fa-mi-lle » ?), et ceux
//     dont le nombre de syllabes dépend de la diction (« li-on » ou « lion » ? « avion », « camion »).
import { WORDS } from './mots-illustres.js';

// Découpage des mots de la banque illustrée (mêmes mots, mêmes émojis).
// Absents volontairement : les mots à consonne double ou à « ill » (abeille, ballon, beurre,
// bille, bouteille, caillou, chaussette, chaussure, chenille, citrouille, coquillage, corbeille,
// couronne, croissant, cuillère, famille, feuille, fille, gorille, grenouille, groseille,
// maillot, médaille, oreille, paille, papillon, poisson, poussin, quille, sommeil) et ceux
// à diérèse possible (avion, camion, lion).
const BANK = `
agneau a-gneau | ail ail | araignée a-rai-gnée | baignoire bai-gnoi-re | balance ba-lan-ce |
beignet bei-gnet | biberon bi-be-ron | bois bois | boîte boî-te | bonbon bon-bon |
bouche bou-che | bouquet bou-quet | chameau cha-meau | champignon cham-pi-gnon |
chapeau cha-peau | chat chat | châtaigne châ-tai-gne | château châ-teau | chemise che-mi-se |
cheval che-val | cheveux che-veux | chèvre chè-vre | chien chien | chocolat cho-co-lat |
chou chou | citron ci-tron | cloche clo-che | cochon co-chon | cœur cœur |
concombre con-com-bre | cygne cy-gne | dent dent | deux deux | dinde din-de | doigt doigt |
dragon dra-gon | écureuil é-cu-reuil | éléphant é-lé-phant | enfant en-fant | étoile é-toi-le |
éventail é-ven-tail | feu feu | fleur fleur | fourmi four-mi | gant gant | genou ge-nou |
hache ha-che | hibou hi-bou | jambe jam-be | jeu jeu | journal jour-nal |
kangourou kan-gou-rou | lampe lam-pe | lapin la-pin | loup loup | main main | maison mai-son |
maman ma-man | manteau man-teau | melon me-lon | miroir mi-roir | montagne mon-ta-gne |
mouche mou-che | moulin mou-lin | moustique mous-ti-que | mouton mou-ton | neuf neuf |
œuf œuf | oiseau oi-seau | orange o-ran-ge | ordinateur or-di-na-teur | orteil or-teil |
ours ours | pain pain | panda pan-da | pantalon pan-ta-lon | pêche pê-che | peigne pei-gne |
pinceau pin-ceau | plante plan-te | poire poi-re | poivron poi-vron | pont pont | poule pou-le |
rail rail | raisin rai-sin | requin re-quin | réveil ré-veil | roi roi | ruban ru-ban |
sapin sa-pin | savon sa-von | serpent ser-pent | singe sin-ge | soleil so-leil | soupe sou-pe |
souris sou-ris | tambour tam-bour | tente ten-te | tracteur trac-teur | train train |
travail tra-vail | vache va-che | vent vent | vitrail vi-trail | voiture voi-tu-re | yeux yeux
`;

// Mots en plus, hors de la banque des sons (elle n'accepte que des mots qui portent un son
// complexe) : choisis pour leurs syllabes simples et leur image évidente.
const EXTRA = `
ananas 🍍 a-na-nas | arbre 🌳 ar-bre | avocat 🥑 a-vo-cat | banane 🍌 ba-na-ne |
bateau ⛵ ba-teau | brocoli 🥦 bro-co-li | cactus 🌵 cac-tus | cadeau 🎁 ca-deau |
canard 🦆 ca-nard | couteau 🔪 cou-teau | crocodile 🐊 cro-co-di-le | dauphin 🐬 dau-phin |
écharpe 🧣 é-char-pe | escargot 🐌 es-car-got | fée 🧚 fée | fraise 🍓 frai-se | fusée 🚀 fu-sée |
gâteau 🎂 gâ-teau | girafe 🦒 gi-ra-fe | guitare 🎸 gui-ta-re | hélicoptère 🚁 hé-li-cop-tè-re |
kiwi 🥝 ki-wi | licorne 🦄 li-cor-ne | lune 🌙 lu-ne | marteau 🔨 mar-teau | micro 🎤 mi-cro |
moto 🏍️ mo-to | parapluie ☂️ pa-ra-pluie | renard 🦊 re-nard | rhinocéros 🦏 rhi-no-cé-ros |
robot 🤖 ro-bot | tigre 🐯 ti-gre | tomate 🍅 to-ma-te | tortue 🐢 tor-tue | valise 🧳 va-li-se |
vélo 🚲 vé-lo | zèbre 🦓 zè-bre
`;

const entries = (text) => text.split('|').map((s) => s.trim().split(/\s+/)).filter((p) => p[0]);

const fromBank = entries(BANK).map(([word, cut]) => {
  const source = WORDS.find((w) => w.word === word);
  if (!source) throw new Error(`mot absent de la banque illustrée : ${word}`);
  return { word, emoji: source.emoji, cut };
});
const fromExtra = entries(EXTRA).map(([word, emoji, cut]) => ({ word, emoji, cut }));

/** Les mots découpés : { word, emoji (ou null), syllables: ['to', 'ma', 'te'] }, triés. */
export const SYLLABLE_WORDS = [...fromBank, ...fromExtra]
  .sort((a, b) => a.word.localeCompare(b.word, 'fr'))
  .map(({ word, emoji, cut }) => Object.freeze({ word, emoji, syllables: Object.freeze(cut.split('-')) }));

const BY_WORD = new Map(SYLLABLE_WORDS.map((w) => [w.word, w]));

export function findSyllableWord(word) {
  return BY_WORD.get(word) || null;
}

const VOWEL = 'aeiouyàâäéèêëîïôöûùüœ';

/**
 * Vrai si la syllabe écrite finit par un « e » qu'on n'entend pas ou presque :
 * le « e » muet (« te » de « tomate », « que » de « moustique ») ou discret (« che » de « cheval »).
 * « gnée », « tue », « pluie » ne sont pas concernées : le « e » y suit une voyelle prononcée.
 */
export function endsWithQuietE(syllable) {
  const s = syllable.toLowerCase();
  if (!/es?$/.test(s)) return false;
  const before = s.replace(/es?$/, '');
  if (/(qu|gu)$/.test(before)) return true;
  const last = before.slice(-1);
  return last !== '' && !VOWEL.includes(last);
}

/** Vrai si l'on entend exactement les syllabes écrites : on peut alors les compter à l'oreille. */
export function isTransparent(entry) {
  return !entry.syllables.some(endsWithQuietE);
}

/**
 * Le premier son d'une syllabe, de façon grossière mais sûre : deux syllabes dont le premier son
 * diffère ne peuvent pas s'entendre pareil. « ca », « ko », « qui » → k ; « ci », « ceau » → s ;
 * « ge », « jam » → j ; « hi » → voyelle (le h ne s'entend pas) ; toute voyelle → « V ».
 */
export function onsetSound(syllable) {
  const s = syllable.toLowerCase().replace(/^h/, '');
  if (!s) return 'V';
  if (VOWEL.includes(s[0])) return 'V';
  if (s.startsWith('ch')) return 'ch';
  if (s.startsWith('ph')) return 'f';
  if (s.startsWith('gn')) return 'gn';
  if (s.startsWith('qu') || s[0] === 'k') return 'k';
  if (s[0] === 'c') return /^c[eéèêiîy]/.test(s) ? 's' : 'k';
  if (s[0] === 'ç') return 's';
  if (s[0] === 'g') return /^g[eéèêiîy]/.test(s) ? 'j' : 'g';
  if (s[0] === 'r' && s[1] === 'h') return 'r';
  return s[0];
}

/** « to-ma-te » : le découpage tel qu'on l'écrit dans les corrections. */
export function cutOf(entry) {
  return entry.syllables.join('-');
}

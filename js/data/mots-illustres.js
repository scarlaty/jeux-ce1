// Banque partagée de mots illustrés (jeux de sons, de syllabes, de lecture…).
//
// Chaque mot : {
//   word:      le mot, en minuscules, orthographe courante ;
//   emoji:     une image qui le représente sans ambiguïté (émojis Unicode ≤ 13, unique dans la banque) ;
//   sounds:    les phonèmes ENTENDUS, dans l'ordre (voir PHONEMES) — jamais les lettres :
//              « oiseau » = w a z o ; « banane » = b a n a n (pas de [an]) ;
//   syllables: découpage en syllabes écrites, présent seulement quand il est sûr
//              (pas de « e » muet final, de consonne double ni de « e » qu'on peut avaler).
// }
//
// Conventions phonologiques (prononciation standard, sans régionalismes) :
//   - [o]/[ɔ] notés « o », [ø]/[œ] notés « eu », [ɛ̃]/[œ̃] notés « in » (usage courant) ;
//   - « oi » = w + a, « oin » = w + in : on cherche ces sons comme des suites de phonèmes ;
//   - le « e » qu'on peut prononcer ou avaler (« cheval », « renard ») est noté « e » (schwa) ;
//   - le yod [j] est noté « ill » partout où on l'entend, même s'il ne s'écrit pas « ill »
//     (« chien », « pied », « lion ») : ces mots ne servent donc jamais de distracteur pour [ill].
// Mots volontairement absents : mots-pièges (« femme », « oignon »), sons [ɥ] (« nuit », « fruit »),
// et mots dont l'émoji est ambigu (🦉 hibou ou chouette ? 🍊 orange ou mandarine ?).

/** Phonèmes utilisés, avec leur notation API (pour la relecture). */
export const PHONEMES = {
  a: 'a', e: 'ə', é: 'e', è: 'ɛ', i: 'i', o: 'o/ɔ', u: 'y', ou: 'u', eu: 'ø/œ',
  an: 'ɑ̃', on: 'ɔ̃', in: 'ɛ̃', w: 'w', ill: 'j',
  p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'g', f: 'f', v: 'v', s: 's', z: 'z',
  ch: 'ʃ', j: 'ʒ', m: 'm', n: 'n', gn: 'ɲ', l: 'l', r: 'ʁ',
};

const w = (word, emoji, sounds, syllables) => Object.freeze({
  word,
  emoji,
  sounds: Object.freeze(sounds.split(' ')),
  ...(syllables ? { syllables: Object.freeze(syllables.split('-')) } : {}),
});

export const WORDS = Object.freeze([
  // Animaux
  w('loup', '🐺', 'l ou', 'loup'),
  w('chat', '🐱', 'ch a', 'chat'),
  w('chien', '🐶', 'ch ill in', 'chien'),
  w('lapin', '🐰', 'l a p in', 'la-pin'),
  w('cochon', '🐷', 'k o ch on', 'co-chon'),
  w('vache', '🐮', 'v a ch'),
  w('poule', '🐔', 'p ou l'),
  w('cheval', '🐴', 'ch e v a l'),
  w('souris', '🐭', 's ou r i', 'sou-ris'),
  w('lion', '🦁', 'l i ill on'),
  w('ours', '🐻', 'ou r s', 'ours'),
  w('singe', '🐵', 's in j'),
  w('grenouille', '🐸', 'g r e n ou ill'),
  w('poisson', '🐟', 'p w a s on'),
  w('tortue', '🐢', 't o r t u', 'tor-tue'),
  w('escargot', '🐌', 'è s k a r g o', 'es-car-got'),
  w('abeille', '🐝', 'a b è ill'),
  w('renard', '🦊', 'r e n a r'),
  w('girafe', '🦒', 'j i r a f'),
  w('mouton', '🐑', 'm ou t on', 'mou-ton'),
  w('canard', '🦆', 'k a n a r', 'ca-nard'),
  w('éléphant', '🐘', 'é l é f an', 'é-lé-phant'),
  w('zèbre', '🦓', 'z è b r'),
  w('hérisson', '🦔', 'é r i s on'),
  w('dauphin', '🐬', 'd o f in', 'dau-phin'),
  w('requin', '🦈', 'r e k in'),
  w('pingouin', '🐧', 'p in g w in', 'pin-gouin'),
  w('kangourou', '🦘', 'k an g ou r ou', 'kan-gou-rou'),
  w('papillon', '🦋', 'p a p i ill on'),
  w('chenille', '🐛', 'ch e n i ill'),
  w('gorille', '🦍', 'g o r i ill'),
  w('écureuil', '🐿️', 'é k u r eu ill', 'é-cu-reuil'),
  w('araignée', '🕷️', 'a r é gn é'),
  w('cygne', '🦢', 's i gn'),
  w('chameau', '🐫', 'ch a m o', 'cha-meau'),
  w('crocodile', '🐊', 'k r o k o d i l'),
  w('dinde', '🦃', 'd in d'),
  w('poussin', '🐤', 'p ou s in'),
  w('mouche', '🪰', 'm ou ch'),
  w('fourmi', '🐜', 'f ou r m i', 'four-mi'),
  w('serpent', '🐍', 's è r p an', 'ser-pent'),
  w('baleine', '🐋', 'b a l è n'),
  w('pieuvre', '🐙', 'p i ill eu v r'),
  w('crabe', '🦀', 'k r a b'),
  w('tigre', '🐯', 't i g r'),
  w('panda', '🐼', 'p an d a', 'pan-da'),
  w('koala', '🐨', 'k o a l a', 'ko-a-la'),
  w('dragon', '🐉', 'd r a g on', 'dra-gon'),
  w('licorne', '🦄', 'l i k o r n'),
  w('castor', '🦫', 'k a s t o r', 'cas-tor'),
  w('phoque', '🦭', 'f o k'),
  w('paon', '🦚', 'p an', 'paon'),
  w('chauve-souris', '🦇', 'ch o v s ou r i'),
  w('lézard', '🦎', 'l é z a r', 'lé-zard'),
  w('rhinocéros', '🦏', 'r i n o s é r o s', 'rhi-no-cé-ros'),
  w('hippopotame', '🦛', 'i p o p o t a m'),
  w('coq', '🐓', 'k o k', 'coq'),
  w('oiseau', '🐦', 'w a z o', 'oi-seau'),
  w('aigle', '🦅', 'è g l'),
  w('dinosaure', '🦕', 'd i n o z o r'),
  w('chèvre', '🐐', 'ch è v r'),
  w('moustique', '🦟', 'm ou s t i k'),
  w('coccinelle', '🐞', 'k o k s i n è l'),
  w('perroquet', '🦜', 'p è r o k è'),

  // Aliments et cuisine
  w('pomme', '🍎', 'p o m'),
  w('banane', '🍌', 'b a n a n'),
  w('fraise', '🍓', 'f r è z'),
  w('citron', '🍋', 's i t r on', 'ci-tron'),
  w('cerise', '🍒', 's e r i z'),
  w('poire', '🍐', 'p w a r'),
  w('raisin', '🍇', 'r è z in', 'rai-sin'),
  w('ananas', '🍍', 'a n a n a s'),
  w('kiwi', '🥝', 'k i w i', 'ki-wi'),
  w('pastèque', '🍉', 'p a s t è k'),
  w('carotte', '🥕', 'k a r o t'),
  w('gâteau', '🎂', 'g a t o', 'gâ-teau'),
  w('pain', '🍞', 'p in', 'pain'),
  w('fromage', '🧀', 'f r o m a j'),
  w('œuf', '🥚', 'eu f', 'œuf'),
  w('lait', '🥛', 'l è', 'lait'),
  w('bonbon', '🍬', 'b on b on', 'bon-bon'),
  w('chocolat', '🍫', 'ch o k o l a', 'cho-co-lat'),
  w('champignon', '🍄', 'ch an p i gn on', 'cham-pi-gnon'),
  w('citrouille', '🎃', 's i t r ou ill'),
  w('tomate', '🍅', 't o m a t'),
  w('glace', '🍦', 'g l a s'),
  w('sucette', '🍭', 's u s è t'),
  w('crêpe', '🥞', 'k r è p'),
  w('miel', '🍯', 'm i ill è l', 'miel'),
  w('beurre', '🧈', 'b eu r'),
  w('maïs', '🌽', 'm a i s', 'ma-ïs'),
  w('poivron', '🫑', 'p w a v r on', 'poi-vron'),
  w('brocoli', '🥦', 'b r o k o l i', 'bro-co-li'),
  w('avocat', '🥑', 'a v o k a', 'a-vo-cat'),
  w('melon', '🍈', 'm e l on'),
  w('pêche', '🍑', 'p è ch'),
  w('cacahuète', '🥜', 'k a k a w è t'),
  w('poulet', '🍗', 'p ou l è', 'pou-let'),
  w('riz', '🍚', 'r i', 'riz'),
  w('tarte', '🥧', 't a r t'),
  w('gaufre', '🧇', 'g o f r'),
  w('ail', '🧄', 'a ill', 'ail'),
  w('concombre', '🥒', 'k on k on b r'),
  w('aubergine', '🍆', 'o b è r j i n'),
  w('piment', '🌶️', 'p i m an', 'pi-ment'),
  w('myrtille', '🫐', 'm i r t i ill'),
  w('biberon', '🍼', 'b i b e r on'),
  w('bouteille', '🍾', 'b ou t è ill'),
  w('couteau', '🔪', 'k ou t o', 'cou-teau'),
  w('croissant', '🥐', 'k r w a s an'),

  // Transports, nature, maison
  w('maison', '🏠', 'm è z on', 'mai-son'),
  w('voiture', '🚗', 'v w a t u r'),
  w('vélo', '🚲', 'v é l o', 'vé-lo'),
  w('bateau', '⛵', 'b a t o', 'ba-teau'),
  w('avion', '✈️', 'a v i ill on'),
  w('fusée', '🚀', 'f u z é', 'fu-sée'),
  w('train', '🚂', 't r in', 'train'),
  w('tracteur', '🚜', 't r a k t eu r', 'trac-teur'),
  w('camion', '🚚', 'k a m i ill on'),
  w('moto', '🏍️', 'm o t o', 'mo-to'),
  w('hélicoptère', '🚁', 'é l i k o p t è r'),
  w('étoile', '⭐', 'é t w a l'),
  w('soleil', '☀️', 's o l è ill', 'so-leil'),
  w('lune', '🌙', 'l u n'),
  w('arbre', '🌳', 'a r b r'),
  w('sapin', '🌲', 's a p in', 'sa-pin'),
  w('fleur', '🌸', 'f l eu r', 'fleur'),
  w('feuille', '🍁', 'f eu ill'),
  w('éclair', '⚡', 'é k l è r', 'é-clair'),
  w('arc-en-ciel', '🌈', 'a r k an s i ill è l'),
  w('volcan', '🌋', 'v o l k an', 'vol-can'),
  w('montagne', '🏔️', 'm on t a gn'),
  w('feu', '🔥', 'f eu', 'feu'),
  w('château', '🏰', 'ch a t o', 'châ-teau'),
  w('tente', '⛺', 't an t'),
  w('fontaine', '⛲', 'f on t è n'),
  w('planète', '🪐', 'p l a n è t'),
  w('coquillage', '🐚', 'k o k i ill a j'),
  w('fenêtre', '🪟', 'f e n è t r'),
  w('porte', '🚪', 'p o r t'),
  w('chaise', '🪑', 'ch è z'),
  w('lit', '🛏️', 'l i', 'lit'),
  w('baignoire', '🛁', 'b è gn w a r'),
  w('douche', '🚿', 'd ou ch'),
  w('miroir', '🪞', 'm i r w a r', 'mi-roir'),
  w('réveil', '⏰', 'r é v è ill', 'ré-veil'),
  w('ampoule', '💡', 'an p ou l'),
  w('bougie', '🕯️', 'b ou j i', 'bou-gie'),
  w('balai', '🧹', 'b a l è', 'ba-lai'),
  w('seau', '🪣', 's o', 'seau'),
  w('savon', '🧼', 's a v on', 'sa-von'),
  w('éponge', '🧽', 'é p on j'),
  w('téléphone', '📱', 't é l é f o n'),
  w('ordinateur', '💻', 'o r d i n a t eu r', 'or-di-na-teur'),
  w('télévision', '📺', 't é l é v i z ill on'),

  // Objets, jeux, école
  w('clé', '🔑', 'k l é', 'clé'),
  w('cadeau', '🎁', 'k a d o', 'ca-deau'),
  w('ballon', '⚽', 'b a l on'),
  w('livre', '📕', 'l i v r'),
  w('crayon', '✏️', 'k r è ill on'),
  w('ciseaux', '✂️', 's i z o', 'ci-seaux'),
  w('règle', '📏', 'r è g l'),
  w('pinceau', '🖌️', 'p in s o', 'pin-ceau'),
  w('journal', '📰', 'j ou r n a l', 'jour-nal'),
  w('enveloppe', '✉️', 'an v e l o p'),
  w('lunettes', '👓', 'l u n è t'),
  w('chapeau', '🎩', 'ch a p o', 'cha-peau'),
  w('couronne', '👑', 'k ou r o n'),
  w('chaussette', '🧦', 'ch o s è t'),
  w('pantalon', '👖', 'p an t a l on', 'pan-ta-lon'),
  w('robe', '👗', 'r o b'),
  w('valise', '🧳', 'v a l i z'),
  w('montre', '⌚', 'm on t r'),
  w('loupe', '🔍', 'l ou p'),
  w('aimant', '🧲', 'è m an', 'ai-mant'),
  w('marteau', '🔨', 'm a r t o', 'mar-teau'),
  w('échelle', '🪜', 'é ch è l'),
  w('fil', '🧵', 'f i l', 'fil'),
  w('cloche', '🔔', 'k l o ch'),
  w('ancre', '⚓', 'an k r'),
  w('boussole', '🧭', 'b ou s o l'),
  w('parachute', '🪂', 'p a r a ch u t'),
  w('médaille', '🏅', 'm é d a ill'),
  w('diamant', '💎', 'd i ill a m an'),
  w('arc', '🏹', 'a r k', 'arc'),
  w('dé', '🎲', 'd é', 'dé'),
  w('yoyo', '🪀', 'ill o ill o', 'yo-yo'),
  w('cerf-volant', '🪁', 's è r v o l an'),
  w('nounours', '🧸', 'n ou n ou r s', 'nou-nours'),
  w('trottinette', '🛴', 't r o t i n è t'),
  w('robot', '🤖', 'r o b o', 'ro-bot'),
  w('guitare', '🎸', 'g i t a r'),
  w('violon', '🎻', 'v i ill o l on'),
  w('tambour', '🥁', 't an b ou r', 'tam-bour'),
  w('trompette', '🎺', 't r on p è t'),
  w('piano', '🎹', 'p i ill a n o'),

  // Corps et personnes
  w('dent', '🦷', 'd an', 'dent'),
  w('nez', '👃', 'n é', 'nez'),
  w('oreille', '👂', 'o r è ill'),
  w('œil', '👁️', 'eu ill', 'œil'),
  w('yeux', '👀', 'ill eu', 'yeux'),
  w('main', '✋', 'm in', 'main'),
  w('poing', '👊', 'p w in', 'poing'),
  w('pied', '🦶', 'p i ill é', 'pied'),
  w('bouche', '👄', 'b ou ch'),
  w('cœur', '❤️', 'k eu r', 'cœur'),
  w('cerveau', '🧠', 's è r v o', 'cer-veau'),
  w('os', '🦴', 'o s', 'os'),
  w('bébé', '👶', 'b é b é', 'bé-bé'),
  w('fille', '👧', 'f i ill'),
  w('garçon', '👦', 'g a r s on', 'gar-çon'),
  w('prince', '🤴', 'p r in s'),
  w('princesse', '👸', 'p r in s è s'),
  w('fée', '🧚', 'f é', 'fée'),
  w('fantôme', '👻', 'f an t o m'),

  // Nombres
  w('deux', '2️⃣', 'd eu', 'deux'),
  w('trois', '3️⃣', 't r w a', 'trois'),
  w('cinq', '5️⃣', 's in k', 'cinq'),
  w('neuf', '9️⃣', 'n eu f', 'neuf'),
]);

const byWord = new Map(WORDS.map((entry) => [entry.word, entry]));

/** L'entrée de la banque pour un mot, ou null. */
export function findWord(word) {
  return byWord.get(word) || null;
}

/** Positions où la suite de phonèmes `seq` apparaît dans `sounds` (chevauchements exclus). */
export function soundPositions(sounds, seq) {
  const positions = [];
  for (let i = 0; i + seq.length <= sounds.length; i++) {
    if (seq.every((s, k) => sounds[i + k] === s)) {
      positions.push(i);
      i += seq.length - 1;
    }
  }
  return positions;
}

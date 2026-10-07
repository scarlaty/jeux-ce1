import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickVoice, hasVoice, canSpeak, speak, playSound, setMuted, isMuted, onMutedChange, speakableText,
} from '../js/core/audio.js';

const voices = [
  { name: 'US', lang: 'en-US', localService: true },
  { name: 'GB distant', lang: 'en-GB', localService: false },
  { name: 'GB local', lang: 'en_GB', localService: true },
  { name: 'Canada', lang: 'fr-CA', localService: true },
];

test('choix de la voix : langue exacte et locale d\'abord, sinon même langue', () => {
  assert.equal(pickVoice(voices, 'en-GB').name, 'GB local');
  assert.equal(pickVoice(voices, 'fr-FR').name, 'Canada');
  assert.equal(pickVoice(voices, 'de-DE'), null);
  assert.equal(pickVoice([], 'fr-FR'), null);
});

test('sans synthèse vocale ni Web Audio : rien ne plante', async () => {
  assert.equal(canSpeak(), false);
  assert.equal(await speak('Bonjour'), false);
  playSound('success');
});

test('son coupé : réglage et notification', () => {
  const seen = [];
  const off = onMutedChange((m) => seen.push(m));
  setMuted(true);
  assert.equal(isMuted(), true);
  setMuted(false);
  off();
  setMuted(true);
  assert.deepEqual(seen, [true, false]);
  setMuted(false);
});

test('les signes de calcul sont lus avec des mots', () => {
  assert.equal(speakableText('38 + 7 : 38 + 2 = 40, puis 40 + 5 = 45.'),
    '38 plus 7 : 38 plus 2 égale 40, puis 40 plus 5 égale 45.');
  assert.equal(speakableText('15 − 8 = ?'), '15 moins 8 égale combien ?');
  assert.equal(speakableText('3 × 4 = 12'), '3 fois 4 égale 12');
  // Le trait d'union et les signes collés ne sont pas touchés.
  assert.equal(speakableText('quarante-cinq, c\'est-à-dire 45'), 'quarante-cinq, c\'est-à-dire 45');
});

test('hasVoice : voix présente ou non, jamais d\'erreur', () => {
  assert.equal(hasVoice('en-GB'), false);   // pas de synthèse vocale sous node
  const keepSynth = globalThis.speechSynthesis;
  const keepUtterance = globalThis.SpeechSynthesisUtterance;
  try {
    globalThis.SpeechSynthesisUtterance = class {};
    globalThis.speechSynthesis = { getVoices: () => [{ lang: 'fr-FR' }] };
    assert.equal(hasVoice('en-GB'), false);
    assert.equal(hasVoice('fr-FR'), true);
    globalThis.speechSynthesis = { getVoices: () => [{ lang: 'fr-FR' }, { lang: 'en_US' }] };
    assert.equal(hasVoice('en-GB'), true);
    globalThis.speechSynthesis = { getVoices: () => { throw new Error('boum'); } };
    assert.equal(hasVoice('en-GB'), false);
  } finally {
    if (keepSynth === undefined) delete globalThis.speechSynthesis; else globalThis.speechSynthesis = keepSynth;
    if (keepUtterance === undefined) delete globalThis.SpeechSynthesisUtterance; else globalThis.SpeechSynthesisUtterance = keepUtterance;
  }
});

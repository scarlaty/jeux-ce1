import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice, canSpeak, speak, playSound, setMuted, isMuted, onMutedChange } from '../js/core/audio.js';

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

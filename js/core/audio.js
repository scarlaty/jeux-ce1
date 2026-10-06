// Sons et voix. Aucun fichier audio : les sons sont synthétisés avec Web Audio,
// les consignes sont lues par la synthèse vocale du système (fr-FR, en-GB).
//
// « Couper le son » coupe les effets sonores. La voix, elle, ne parle que lorsque l'enfant
// touche un bouton « écouter » : c'est une action volontaire, elle reste donc disponible.
// Sans speechSynthesis (certains navigateurs), les boutons « écouter » sont masqués.

let audioContext = null;
let muted = false;
const muteListeners = new Set();

export function isMuted() { return muted; }

export function setMuted(value) {
  muted = Boolean(value);
  for (const fn of muteListeners) fn(muted);
}

export function onMutedChange(fn) {
  muteListeners.add(fn);
  return () => muteListeners.delete(fn);
}

// --- Effets sonores --------------------------------------------------------------------------

function getContext() {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctx) return null;
  try {
    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  } catch {
    return null;
  }
}

/** À appeler lors d'un premier geste de l'enfant : les navigateurs bloquent l'audio avant. */
export function unlockAudio() {
  getContext();
}

/** Une note douce : attaque rapide, extinction exponentielle (pas de « clic »). */
function note(ac, { freq, at = 0, dur = 0.18, type = 'sine', gain = 0.12 }) {
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Notes : do5 523, mi5 659, sol5 784, do6 1047, mi6 1319 ; sol4 392, mi4 330.
const SOUNDS = {
  tap: [{ freq: 880, dur: 0.06, type: 'triangle', gain: 0.05 }],
  success: [
    { freq: 523, at: 0, dur: 0.16 },
    { freq: 659, at: 0.09, dur: 0.16 },
    { freq: 784, at: 0.18, dur: 0.3 },
  ],
  // Après une erreur : deux notes graves et feutrées, jamais un buzzer.
  retry: [
    { freq: 392, at: 0, dur: 0.22, type: 'triangle', gain: 0.08 },
    { freq: 330, at: 0.14, dur: 0.32, type: 'triangle', gain: 0.07 },
  ],
  star: [
    { freq: 1047, at: 0, dur: 0.14, gain: 0.08 },
    { freq: 1319, at: 0.07, dur: 0.22, gain: 0.07 },
  ],
  finish: [
    { freq: 523, at: 0, dur: 0.18 },
    { freq: 659, at: 0.14, dur: 0.18 },
    { freq: 784, at: 0.28, dur: 0.18 },
    { freq: 1047, at: 0.42, dur: 0.5 },
  ],
};

export const SOUND_NAMES = Object.keys(SOUNDS);

export function playSound(name) {
  if (muted || !SOUNDS[name]) return;
  const ac = getContext();
  if (!ac) return;
  try {
    for (const n of SOUNDS[name]) note(ac, n);
  } catch { /* son facultatif */ }
}

// --- Voix ------------------------------------------------------------------------------------

const synth = () => globalThis.speechSynthesis || null;

export function canSpeak() {
  return Boolean(synth() && globalThis.SpeechSynthesisUtterance);
}

/**
 * Meilleure voix pour une langue : correspondance exacte (fr-FR), sinon même langue (fr-CA…),
 * en préférant les voix locales (hors ligne). Fonction pure, testable.
 */
export function pickVoice(voices, lang) {
  const norm = (l) => String(l || '').replace('_', '-').toLowerCase();
  const wanted = norm(lang);
  const base = wanted.split('-')[0];
  const score = (v) => {
    const l = norm(v.lang);
    if (l === wanted) return v.localService ? 4 : 3;
    if (l.split('-')[0] === base) return v.localService ? 2 : 1;
    return 0;
  };
  let best = null;
  for (const v of voices || []) {
    if (score(v) > 0 && (!best || score(v) > score(best))) best = v;
  }
  return best;
}

// Signes de calcul entourés d'espaces (« 38 + 2 = 40 », « 15 − 8 ») : les voix les lisent
// mal ou pas du tout (« − » n'est pas le trait d'union), on les remplace par des mots.
const SPOKEN_SIGNS_FR = [
  [/ = \?/g, ' égale combien ?'],
  [/ \+ /g, ' plus '],
  [/ − /g, ' moins '],
  [/ × /g, ' fois '],
  [/ = /g, ' égale '],
];

/** Texte à lire en français : les signes de calcul deviennent des mots. Fonction pure. */
export function speakableText(text) {
  return SPOKEN_SIGNS_FR.reduce((s, [sign, word]) => s.replace(sign, word), String(text));
}

/** Lit un texte. Renvoie une promesse résolue à la fin de la lecture (true si lu). */
export function speak(text, { lang = 'fr-FR', rate } = {}) {
  const s = synth();
  if (!canSpeak() || !text) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      s.cancel();   // on ne laisse jamais deux phrases se chevaucher
      const u = new globalThis.SpeechSynthesisUtterance(lang.startsWith('fr') ? speakableText(text) : text);
      u.lang = lang;
      u.rate = rate ?? (lang.startsWith('fr') ? 0.9 : 0.85);
      const voice = pickVoice(s.getVoices(), lang);
      if (voice) u.voice = voice;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      s.speak(u);
    } catch {
      resolve(false);
    }
  });
}

export function stopSpeaking() {
  try { synth()?.cancel(); } catch { /* rien */ }
}

// Chrome ne charge la liste des voix qu'au premier appel : on la demande dès le démarrage.
try { synth()?.getVoices(); } catch { /* rien */ }

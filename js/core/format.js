// Mise en forme des nombres, durées et dates en français (fonctions pures).

/** « 1 partie », « 3 parties » ; `plural` pour les pluriels irréguliers. */
export function plural(n, word, pluralWord = `${word}s`) {
  return `${n} ${Math.abs(n) >= 2 ? pluralWord : word}`;
}

/** Durée lisible : « 45 s », « 12 min », « 1 h 05 », « 0 min » pour rien. */
export function formatDuration(ms) {
  const seconds = Math.round(Math.max(0, ms || 0) / 1000);
  if (seconds === 0) return '0 min';
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, '0')}`;
}

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});
const DATE_LONG = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
// Les semaines sont calculées en UTC (history.weekStart) : on les affiche en UTC pour ne pas décaler d'un jour.
const WEEK_LABEL = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** « lun. 5 oct., 14:32 » (heure locale). */
export const formatDateTime = (t) => DATE_TIME.format(new Date(t));

/** « 5 octobre 2026 ». */
export const formatDate = (t) => DATE_LONG.format(new Date(t));

/** Libellé court d'une semaine (son lundi) : « 5 oct. ». */
export const formatWeek = (week) => WEEK_LABEL.format(new Date(week));

/** Libellés des matières du registre des jeux. */
export const SUBJECT_LABELS = {
  français: 'Français',
  maths: 'Mathématiques',
  monde: 'Questionner le monde',
  anglais: 'Anglais',
  emc: 'Enseignement moral et civique',
  démo: 'Démonstration',
};

export const subjectLabel = (subject) => SUBJECT_LABELS[subject] || subject || 'Autre';

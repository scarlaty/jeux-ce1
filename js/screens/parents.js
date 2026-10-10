// Espace parents (#12, #13, #14, #15). Ton adulte et sobre, aucune gommette.
//
// L'accès passe par une petite opération (core/gate.js) : ce n'est pas une sécurité, c'est une
// porte qu'une enfant de 7 ans ne franchit pas par hasard. Elle reste ouverte jusqu'au
// rechargement de la page (variable de module), pas au-delà.
//
// Tous les calculs viennent de core/stats.js et core/backup.js : ici, uniquement de l'affichage.
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { avatarBubble } from '../core/ui/avatar.js';
import { weeklyChart } from '../core/ui/chart.js';
import { GAMES } from '../games/registry.js';
import { listProfiles, resetProgress } from '../core/profile.js';
import {
  dateTimeLabel, durationLabel, gameSummaries, playedGames, seriesFilters, topMissed, totals,
  weeklySeries,
} from '../core/stats.js';
import { makeGateChallenge, checkGate, GATE_MAX_TRIES } from '../core/gate.js';
import { isTrial, enterTrial, exitTrial } from '../core/trial.js';
import {
  applyBackup, backupFilename, buildBackup, importPlan, parseBackup, serializeBackup,
} from '../core/backup.js';

/** Porte ouverte pour la durée de la page (jamais écrite dans le stockage). */
let unlocked = false;

/** Message à afficher APRÈS une action qui redessine l'écran (import, remise à zéro). */
let notice = null;

const WEEK_CHOICES = [
  { id: 6, label: '6 semaines' },
  { id: 12, label: '12 semaines' },
  { id: 26, label: '6 mois' },
];
const HISTORY_PAGE = 15;
const LEVEL_NAMES = ['Niveau 1', 'Niveau 2', 'Niveau 3'];
const REAL_GAMES = GAMES.filter((g) => !g.demo);

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const gameTitle = (id) => GAMES.find((g) => g.id === id)?.title || id;

function statCard(label, value, note) {
  return h('li', { class: 'stat' },
    h('span', { class: 'stat__value', text: value }),
    h('span', { class: 'stat__label', text: label }),
    note && h('span', { class: 'stat__note', text: note }));
}

function sectionTitle(text) {
  return h('h2', { class: 'parents__section-title', text });
}

// --- Porte d'entrée ---------------------------------------------------------------------------

function renderGate(root, onPass) {
  let challenge = makeGateChallenge();
  let tries = 0;

  const field = h('input', {
    class: 'name-field name-field--number',
    type: 'text',
    inputmode: 'numeric',
    pattern: '[0-9]*',
    id: 'controle',
    autocomplete: 'off',
    'aria-describedby': 'controle-aide',
  });
  const message = h('p', { class: 'gate__message', role: 'status' });
  const question = h('strong', { class: 'gate__calc', text: `${challenge.text} = ?` });

  function reset() {
    challenge = makeGateChallenge();
    question.textContent = `${challenge.text} = ?`;
    field.value = '';
    field.focus();
  }

  const form = h('form', { class: 'card gate', novalidate: true, onsubmit: (e) => {
    e.preventDefault();
    if (checkGate(challenge, field.value)) { unlocked = true; onPass(); return; }
    tries += 1;
    if (tries >= GATE_MAX_TRIES) {
      tries = 0;
      message.textContent = 'Toujours pas. Voici un nouveau calcul.';
      reset();
      return;
    }
    message.textContent = 'Ce n\'est pas le bon résultat.';
    field.select();
  } },
  h('h1', { class: 'page-title', text: 'Espace parents' }),
  h('p', { class: 'gate__lead', text: 'Cet espace est réservé aux adultes. Pour continuer, donnez le résultat de cette multiplication.' }),
  h('p', { class: 'gate__question' }, question),
  h('label', { class: 'visually-hidden', for: 'controle', text: 'Résultat de la multiplication' }),
  field,
  h('p', { class: 'identity__hint', id: 'controle-aide', text: 'Les tables de 6 à 9 ne sont pas au programme du CE1.' }),
  message,
  h('div', { class: 'identity__actions' },
    h('a', { class: 'btn btn--ghost', href: '#/' }, icon('arrowLeft'), h('span', { text: 'Retour' })),
    h('button', { type: 'submit', class: 'btn btn--primary' }, h('span', { text: 'Entrer' }))));

  root.replaceChildren(h('section', { class: 'page page--narrow' }, form));
  field.focus({ preventScroll: true });
}

// --- Mode essai (#111) -----------------------------------------------------------------------

/** Carte sobre : l'adulte essaie les jeux, tout est ouvert, rien n'est enregistré. */
function trialCard(app) {
  const active = isTrial();
  return h('section', { class: 'card trial-card', 'aria-labelledby': 'essai-titre' },
    h('h2', { class: 'trial-card__title', id: 'essai-titre', text: 'Mode essai' }),
    h('p', { class: 'trial-card__text', text: active
      ? 'Le mode essai est en cours : tout est ouvert et rien n\'est enregistré pour ce profil.'
      : 'Essayez chaque jeu, à chaque niveau : tout est ouvert et rien n\'est enregistré (ni score, ni étoile, ni point, ni coffre). La progression de l\'enfant reste exactement comme elle est. Le mode s\'arrête en quittant ou en rechargeant la page.' }),
    active
      ? h('button', { type: 'button', class: 'btn btn--secondary', onclick: exitTrial }, h('span', { text: 'Quitter le mode essai' }))
      : h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => { enterTrial(); app.navigate('/'); } },
        h('span', { text: 'Commencer le mode essai' })));
}

// --- Onglets ------------------------------------------------------------------------------------

const TABS = [
  { id: 'progres', label: 'Progrès' },
  { id: 'historique', label: 'Historique' },
  { id: 'courbes', label: 'Courbes' },
  { id: 'sauvegarde', label: 'Sauvegarde' },
];

export default {
  render(view, { app }) {
    const root = h('div', {});
    view.append(root);
    app.setTitle('Espace parents');

    if (!unlocked) {
      renderGate(root, () => renderSpace(root, app));
      return undefined;
    }
    renderSpace(root, app);
    return undefined;
  },
};

function renderSpace(root, app) {
  let profileId = app.profileId;
  let tab = 'progres';

  const panel = h('div', { class: 'parents__panel', id: 'parents-panel', role: 'region' });

  function profilePicker() {
    const profiles = listProfiles(app.store);
    if (profiles.length < 2) return null;
    const select = h('select', {
      class: 'select',
      id: 'profil-choix',
      onchange: () => { profileId = select.value; draw(); },
    }, profiles.map((p) => h('option', { value: p.id, selected: p.id === profileId || null, text: p.name || 'Sans prénom' })));
    return h('div', { class: 'field-row' },
      h('label', { class: 'field-row__label', for: 'profil-choix', text: 'Profil' }),
      select);
  }

  function header(profile) {
    return h('div', { class: 'parents__head' },
      avatarBubble(profile?.avatar, { size: 'm', decorative: true }),
      h('div', { class: 'parents__identity' },
        h('h1', { class: 'parents__name', text: profile?.name || 'Sans prénom' }),
        h('p', { class: 'parents__since', text: profile?.createdAt ? `Profil créé le ${dateTimeLabel(profile.createdAt).replace(/ à .*/, '')}` : '' })),
      profilePicker());
  }

  function tabBar() {
    return h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Sections de l\'espace parents' },
      TABS.map((t) => h('button', {
        type: 'button',
        class: `tab${t.id === tab ? ' is-current' : ''}`,
        role: 'tab',
        id: `tab-${t.id}`,
        'aria-selected': String(t.id === tab),
        'aria-controls': 'parents-panel',
        onclick: () => { tab = t.id; draw(); },
      }, h('span', { text: t.label }))));
  }

  function draw() {
    const profile = app.store.getProfile(profileId) || app.store.getProfile(app.profileId);
    panel.setAttribute('aria-labelledby', `tab-${tab}`);
    panel.replaceChildren(PANELS[tab](profile, app, draw));
    root.replaceChildren(h('section', { class: 'page parents' }, header(profile), trialCard(app), tabBar(), panel));
  }

  draw();
}

// --- Onglet « Progrès » -------------------------------------------------------------------------

function progressPanel(profile) {
  const t = totals(profile);
  const summaries = gameSummaries(profile, REAL_GAMES);
  const missed = topMissed(profile);

  const stats = h('ul', { class: 'stat-grid' },
    statCard('parties jouées', String(t.plays)),
    statCard('de bonnes réponses', t.rate === null ? '—' : `${t.rate} %`, t.total ? `${t.score} sur ${t.total} questions` : ''),
    statCard('de jeu au total', durationLabel(t.durationMs)));

  const games = summaries.map((g) => h('li', { class: 'game-progress', dataset: { island: g.island } },
    h('div', { class: 'game-progress__head' },
      h('h3', { class: 'game-progress__title', text: g.title }),
      h('span', { class: 'game-progress__stars', text: `${g.stars} / ${g.maxStars} étoiles` })),
    h('ul', { class: 'level-bars' }, g.levels.map((l) => {
      const rate = l.best && l.best.total ? Math.round((l.best.score / l.best.total) * 100) : null;
      return h('li', { class: `level-bar${l.open ? '' : ' is-locked'}` },
        h('span', { class: 'level-bar__name', text: LEVEL_NAMES[l.level - 1] }),
        h('span', { class: 'level-bar__track' },
          h('span', { class: 'level-bar__fill', style: `width: ${rate ?? 0}%` })),
        h('span', {
          class: 'level-bar__value',
          text: l.best ? `${l.best.score}/${l.best.total}` : (l.open ? 'jamais joué' : 'verrouillé'),
        }));
    })),
    h('p', { class: 'game-progress__plays', text: g.plays ? plural(g.plays, 'partie') : 'Pas encore essayé' })));

  return h('div', { class: 'parents__content' },
    sectionTitle('En bref'),
    stats,
    sectionTitle('Niveaux par jeu'),
    h('ul', { class: 'game-progress-list' }, games),
    sectionTitle('À retravailler'),
    missed.length
      ? h('ul', { class: 'missed-list' }, missed.map((m) => h('li', { class: 'missed' },
        h('span', { class: 'missed__skill', text: m.skill }),
        h('span', { class: 'missed__count', text: plural(m.count, 'erreur') }))))
      : h('p', { class: 'parents__empty', text: 'Aucune erreur enregistrée pour l\'instant.' }));
}

// --- Onglet « Historique » ----------------------------------------------------------------------

function historyPanel(profile) {
  let shown = HISTORY_PAGE;
  const list = h('ol', { class: 'history-list' });
  const more = h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => { shown += HISTORY_PAGE; fill(); } },
    h('span', { text: 'Voir plus de parties' }));
  const older = h('p', { class: 'parents__empty' });

  function fill() {
    const all = playedGames(profile);
    list.replaceChildren(...all.slice(0, shown).map((e) => h('li', { class: 'history-item' },
      h('div', { class: 'history-item__head' },
        h('span', { class: 'history-item__game', text: gameTitle(e.game) }),
        h('span', { class: 'history-item__score', text: `${e.score} / ${e.total}` })),
      h('p', { class: 'history-item__meta', text: `${dateTimeLabel(e.t)} · ${LEVEL_NAMES[e.level - 1] || `Niveau ${e.level}`} · ${durationLabel(e.durationMs)}` }),
      e.missed.length
        ? h('p', { class: 'history-item__missed' },
          h('span', { class: 'history-item__missed-label', text: 'Raté : ' }),
          h('span', { text: e.missed.join(', ') }))
        : h('p', { class: 'history-item__missed history-item__missed--none', text: 'Aucune erreur.' }))));
    more.hidden = all.length <= shown;
    const archived = (profile?.weekly || []).reduce((sum, w) => sum + w.games, 0);
    older.hidden = archived === 0;
    older.textContent = archived
      ? `${plural(archived, 'partie')} plus ancienne${archived > 1 ? 's' : ''} ne sont conservées que sous forme de totaux hebdomadaires (voir l'onglet Courbes).`
      : '';
    if (all.length === 0) {
      list.replaceChildren(h('li', { class: 'parents__empty', text: 'Aucune partie enregistrée pour ce profil.' }));
    }
  }

  fill();
  return h('div', { class: 'parents__content' }, sectionTitle('Parties récentes'), list, more, older);
}

// --- Onglet « Courbes » -------------------------------------------------------------------------

function chartPanel(profile) {
  const filters = seriesFilters(REAL_GAMES);
  let weeks = WEEK_CHOICES[0].id;
  let filterId = 'tout';
  const holder = h('div', { class: 'chart-holder' });

  function redraw() {
    const filter = filters.find((f) => f.id === filterId) || filters[0];
    const series = weeklySeries(profile, { weeks, match: filter.match });
    const t = totals(profile, { match: filter.match });
    holder.replaceChildren(
      weeklyChart(series, {
        title: `Réussite semaine après semaine — ${filter.label.toLowerCase()}`,
        caption: t.plays
          ? `Sur toute la période connue : ${plural(t.plays, 'partie')}, ${t.rate} % de bonnes réponses.`
          : '',
      }));
  }

  const weekSelect = h('select', { class: 'select', id: 'periode', onchange: () => { weeks = Number(weekSelect.value); redraw(); } },
    WEEK_CHOICES.map((c) => h('option', { value: String(c.id), selected: c.id === weeks || null, text: c.label })));
  const filterSelect = h('select', { class: 'select', id: 'filtre', onchange: () => { filterId = filterSelect.value; redraw(); } },
    filters.map((f) => h('option', { value: f.id, text: f.label })));

  redraw();
  return h('div', { class: 'parents__content' },
    sectionTitle('Évolution'),
    h('div', { class: 'filters' },
      h('div', { class: 'field-row' },
        h('label', { class: 'field-row__label', for: 'periode', text: 'Période' }), weekSelect),
      h('div', { class: 'field-row' },
        h('label', { class: 'field-row__label', for: 'filtre', text: 'Afficher' }), filterSelect)),
    holder);
}

// --- Onglet « Sauvegarde » ----------------------------------------------------------------------

function backupPanel(profile, app, redraw) {
  const message = h('p', { class: 'parents__message', role: 'status' });
  const confirmBox = h('div', {});
  let lastText = '';

  function say(text, kind = 'info') {
    message.className = `parents__message parents__message--${kind}`;
    message.textContent = text;
  }
  // Un import ou une remise à zéro redessine tout l'écran : le compte rendu est repris ici.
  if (notice) { say(notice.text, notice.kind); notice = null; }

  // --- Exporter
  const code = h('textarea', { class: 'code-area', id: 'code-export', readonly: true, rows: '6', spellcheck: 'false' });
  const refreshCode = () => { code.value = serializeBackup(buildBackup(app.store)); };
  refreshCode();

  function download() {
    const backup = buildBackup(app.store);
    const blob = new Blob([serializeBackup(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: backupFilename(backup) });
    link.click();
    // Révocation différée : certains navigateurs lisent l'objet après le clic.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    say('Fichier de sauvegarde créé. Rangez-le hors de la tablette (courriel, clé USB, nuage).', 'ok');
  }

  async function copyCode() {
    code.select();
    try {
      await navigator.clipboard.writeText(code.value);
      say('Code copié. Collez-le sur l\'autre appareil, dans « Importer ».', 'ok');
    } catch {
      say('La copie automatique n\'est pas disponible : le code est sélectionné, copiez-le à la main.', 'info');
    }
  }

  // --- Importer
  const pasted = h('textarea', { class: 'code-area', id: 'code-import', rows: '6', spellcheck: 'false', placeholder: 'Collez ici le code de la sauvegarde…' });
  const file = h('input', { type: 'file', class: 'file-input', id: 'fichier', accept: 'application/json,.json' });

  /** Les profils reellement presents sur cette tablette, pour les comparer a ceux du fichier. */
  function localProfiles() {
    return listProfiles(app.store).map((row) => app.store.getProfile(row.id)).filter(Boolean);
  }

  const tally = (t) => `${plural(t.plays, 'partie')}, ${plural(t.points, 'point')}`;

  /** Une ligne de profil qui dit les DEUX cotes : ce que contient la tablette et ce que le fichier apporte. */
  function profileLine(entry, kind) {
    const details = [];
    if (kind === 'add') details.push(`${tally(entry.incoming)} — nouveau profil`);
    if (kind === 'overwrite') {
      details.push(`sur la tablette : ${tally(entry.current)}`);
      details.push(`dans le fichier : ${tally(entry.incoming)}`);
    }
    if (kind === 'remove' || kind === 'kept') details.push(`sur la tablette : ${tally(entry.current)}`);
    const body = [h('span', { class: 'confirm__name', text: entry.name || 'Sans prénom' })];
    for (const text of details) body.push(h('span', { class: 'confirm__detail', text }));
    if (entry.losesProgress) {
      body.push(h('strong', { class: 'confirm__warn', text: 'La tablette est plus avancée que le fichier : cette progression sera perdue.' }));
    }
    return h('li', { class: `confirm__row${entry.losesProgress ? ' confirm__row--warn' : ''}` },
      avatarBubble(entry.avatar, { size: 's', decorative: true }),
      h('div', { class: 'confirm__body' }, body));
  }

  function section(title, entries, kind) {
    if (!entries.length) return null;
    return h('div', { class: 'confirm__section' },
      h('h4', { class: 'confirm__subtitle', text: title }),
      h('ul', { class: 'confirm__list' }, entries.map((e) => profileLine(e, kind))));
  }

  /* La carte de confirmation decrivait le FICHIER, jamais la TABLETTE : elle ne disait donc pas
     ce qui allait etre ecrase ou supprime. Elle decrit maintenant les deux cotes (#114). */
  function review(text) {
    const read = parseBackup(text);
    if (!read.ok) { confirmBox.replaceChildren(); say(read.error, 'error'); return; }
    lastText = text;
    const backup = read.backup;
    const plan = importPlan(backup, localProfiles(), { mode: 'merge' });
    const risky = plan.overwrite.some((p) => p.losesProgress);
    say('Sauvegarde lue. Rien n’est encore écrit.', 'ok');

    confirmBox.replaceChildren(h('div', { class: 'card confirm' },
      h('h3', { class: 'confirm__title', text: 'Ce que l’import va faire' }),
      h('p', { class: 'confirm__note', text: `Sauvegarde exportée le ${dateTimeLabel(backup.exportedAt)}.` }),
      section('Profils ajoutés', plan.add, 'add'),
      section('Profils remplacés par ceux du fichier', plan.overwrite, 'overwrite'),
      section('Profils de la tablette laissés intacts', plan.kept, 'kept'),
      h('div', { class: 'confirm__actions' },
        h('button', {
          type: 'button',
          class: risky ? 'btn btn--danger' : 'btn btn--primary',
          onclick: () => (risky ? askMerge(backup, plan) : install(backup, 'merge')),
        }, h('span', { text: plan.overwrite.length ? 'Ajouter et remplacer' : 'Ajouter aux profils' })),
        h('button', { type: 'button', class: 'btn btn--danger', onclick: () => askReplace(backup) },
          h('span', { text: 'Tout remplacer' })))));
  }

  /** « Ajouter » quand la tablette est en avance : on nomme ce qui disparait, puis on demande. */
  function askMerge(backup, plan) {
    const lost = plan.overwrite.filter((p) => p.losesProgress);
    const cancel = h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => review(lastText) },
      h('span', { text: 'Annuler' }));
    confirmBox.replaceChildren(h('div', { class: 'card danger' },
      h('h3', { class: 'confirm__title', text: 'Cette tablette est plus avancée que la sauvegarde' }),
      h('ul', { class: 'confirm__list' }, lost.map((e) => profileLine(e, 'overwrite'))),
      h('p', { class: 'danger__text', text: 'La progression ci-dessus sera remplacée par celle du fichier, plus ancienne. Exportez d’abord une sauvegarde si vous voulez pouvoir revenir en arrière.' }),
      h('div', { class: 'danger__actions' }, cancel,
        h('button', { type: 'button', class: 'btn btn--danger', onclick: () => install(backup, 'merge') },
          h('span', { text: 'Oui, remplacer' })))));
    cancel.focus({ preventScroll: true });
  }

  /** « Tout remplacer » : on nomme les profils locaux qui vont etre supprimes. */
  function askReplace(backup) {
    const plan = importPlan(backup, localProfiles(), { mode: 'replace' });
    const cancel = h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => review(lastText) },
      h('span', { text: 'Annuler' }));
    confirmBox.replaceChildren(h('div', { class: 'card danger' },
      h('h3', { class: 'confirm__title', text: 'Effacer tous les profils de cette tablette ?' }),
      plan.remove.length
        ? h('ul', { class: 'confirm__list' }, plan.remove.map((e) => profileLine(e, 'remove')))
        : null,
      h('p', { class: 'danger__text', text: plan.remove.length
        ? 'Ces profils ne sont pas dans la sauvegarde : ils seront définitivement supprimés.'
        : 'Les profils présents seront remplacés par ceux de la sauvegarde.' }),
      h('div', { class: 'danger__actions' }, cancel,
        h('button', { type: 'button', class: 'btn btn--danger', onclick: () => install(backup, 'replace') },
          h('span', { text: 'Oui, tout remplacer' })))));
    cancel.focus({ preventScroll: true });
  }

  function install(backup, mode) {
    const plan = importPlan(backup, localProfiles(), { mode });
    const info = applyBackup(app.store, backup, { mode });
    app.switchProfile(info.activeProfileId);
    const parts = [];
    const s = (n) => (n > 1 ? 's' : '');
    if (plan.add.length) parts.push(`${plural(plan.add.length, 'profil')} ajouté${s(plan.add.length)}`);
    if (plan.overwrite.length) parts.push(`${plural(plan.overwrite.length, 'profil')} remplacé${s(plan.overwrite.length)}`);
    if (plan.remove.length) parts.push(`${plural(plan.remove.length, 'profil')} supprimé${s(plan.remove.length)}`);
    notice = { text: `${parts.join(', ')}.`, kind: 'ok' };
    redraw();
  }

  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    try {
      review(await chosen.text());
    } catch {
      say('Ce fichier n\'a pas pu être lu.', 'error');
    }
    file.value = '';
  });

  // --- Remise à zéro
  function askReset() {
    const cancel = h('button', { type: 'button', class: 'btn btn--secondary', onclick: redraw }, h('span', { text: 'Annuler' }));
    confirmBox.replaceChildren(h('div', { class: 'card danger' },
      h('h3', { class: 'confirm__title', text: `Effacer la progression de ${profile?.name || 'ce profil'} ?` }),
      h('p', { class: 'danger__text', text: "Tout repart de zéro : les étoiles, les niveaux ouverts, l’historique, mais aussi les points, le grade, les gommettes, le compagnon et les accessoires du coffre. Seuls le prénom et l’avatar sont conservés." }),
      h('p', { class: 'danger__text', text: 'Exportez une sauvegarde avant, si vous voulez pouvoir revenir en arrière.' }),
      h('div', { class: 'danger__actions' },
        cancel,
        h('button', {
          type: 'button',
          class: 'btn btn--danger',
          onclick: () => {
            if (profile?.id) resetProgress(app.store, profile.id);
            notice = { text: 'Progression effacée. Le profil repart de zéro.', kind: 'ok' };
            redraw();
          },
        }, h('span', { text: 'Oui, tout effacer' })))));
    cancel.focus({ preventScroll: true });
  }

  const exportPart = [
    sectionTitle('Exporter'),
    h('p', { class: 'parents__text', text: 'La sauvegarde contient tous les profils de cette tablette : prénoms, avatars, progression et historique. Les réglages de l\'appareil (thème, son) n\'en font pas partie. Rien n\'est envoyé sur Internet.' }),
    h('div', { class: 'parents__actions' },
      h('button', { type: 'button', class: 'btn btn--primary', onclick: download }, h('span', { text: 'Télécharger le fichier' })),
      h('button', { type: 'button', class: 'btn btn--secondary', onclick: copyCode }, h('span', { text: 'Copier le code' }))),
    h('label', { class: 'field-row__label', for: 'code-export', text: 'Code à recopier' }),
    code,
  ];
  // Importer et effacer écrivent dans les profils : indisponibles pendant le mode essai (#111).
  const writePart = isTrial()
    ? [h('p', { class: 'parents__text', text: 'Importer une sauvegarde et effacer la progression sont indisponibles pendant le mode essai.' })]
    : [
      sectionTitle('Importer'),
      h('p', { class: 'parents__text', text: 'Choisissez un fichier de sauvegarde, ou collez le code ci-dessous. La sauvegarde est vérifiée et résumée avant d\'écrire quoi que ce soit.' }),
      h('div', { class: 'field-row' },
        h('label', { class: 'field-row__label', for: 'fichier', text: 'Fichier' }),
        file),
      h('label', { class: 'field-row__label', for: 'code-import', text: 'Ou code copié' }),
      pasted,
      h('div', { class: 'parents__actions' },
        h('button', { type: 'button', class: 'btn btn--primary', onclick: () => review(pasted.value) },
          h('span', { text: 'Vérifier ce code' }))),
      message,
      confirmBox,

      sectionTitle('Remise à zéro'),
      h('p', { class: 'parents__text', text: 'Pour repartir de zéro sur ce profil, sans supprimer le profil lui-même.' }),
      h('div', { class: 'parents__actions' },
        h('button', { type: 'button', class: 'btn btn--ghost', onclick: askReset },
          h('span', { text: 'Effacer la progression…' }))),
    ];
  return h('div', { class: 'parents__content' }, exportPart, writePart);
}

const PANELS = {
  progres: (profile) => progressPanel(profile),
  historique: (profile) => historyPanel(profile),
  courbes: (profile) => chartPanel(profile),
  sauvegarde: (profile, app, redraw) => backupPanel(profile, app, redraw),
};

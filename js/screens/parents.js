// Espace parents (#15, #12, #13, #14) : protégé par une petite opération, à chaque visite.
// Par profil : vue d'ensemble, notions à retravailler, jeux, courbes détaillées, historique,
// sauvegarde, et gestion du profil (renommer, remettre à zéro, supprimer).
import { h } from '../core/ui/dom.js';
import { icon } from '../core/ui/icons.js';
import { avatarBadge, identityForm } from '../core/ui/avatar.js';
import { listProfiles, updateIdentity, resetProfile, deleteProfile } from '../core/profile.js';
import {
  totals, statsByGame, statsBySubject, mostMissed, historyPage, getGameProgress, weekStart,
} from '../core/history.js';
import { makeChallenge, checkChallenge } from '../core/parent-gate.js';
import { plural, formatDuration, formatDateTime, formatDate, subjectLabel } from '../core/format.js';
import { GAMES, getGameEntry } from '../games/registry.js';
import { renderProgressCharts, emptyChart } from './progress-charts.js';
import { backupPanel, notice } from './backup-panel.js';

const DAY = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 30;
const LEVELS = [1, 2, 3];
const PERIODS = [
  { weeks: 4, label: '4 semaines' },
  { weeks: 12, label: '12 semaines' },
  { weeks: 'all', label: 'Depuis le début' },
];

const gameTitle = (id) => getGameEntry(id)?.title || id;
const subjectOf = (id) => getGameEntry(id)?.subject || 'autre';

function section(id, title, ...children) {
  return h('section', { class: 'card parents-section', 'aria-labelledby': id },
    h('h2', { class: 'section-title', id, text: title }), ...children);
}

/** Tableau qui se présente en cartes sur téléphone (chaque cellule rappelle sa colonne). */
function table(columns, rows, { caption } = {}) {
  return h('table', { class: 'data-table' },
    caption && h('caption', { class: 'visually-hidden', text: caption }),
    h('thead', {}, h('tr', {}, columns.map((c) => h('th', { scope: 'col', text: c })))),
    h('tbody', {}, rows.map((cells) => h('tr', {}, cells.map((cell, i) => h('td', { dataset: { label: columns[i] } }, cell))))));
}

// --- Verrou ------------------------------------------------------------------------------------

function lockScreen(onUnlock) {
  let challenge = makeChallenge();
  const input = h('input', {
    id: 'parents-answer', class: 'text-field text-field--number', type: 'text', inputmode: 'numeric',
    autocomplete: 'off', maxlength: '3', 'aria-describedby': 'parents-error',
  });
  const label = h('label', { class: 'lock__question', for: input.id });
  const error = h('p', { id: 'parents-error', class: 'field-error', 'aria-live': 'polite' });
  const renderQuestion = () => { label.textContent = `${challenge.text} =`; };
  renderQuestion();

  const form = h('form', { class: 'lock__form', novalidate: true, onsubmit: (event) => {
    event.preventDefault();
    if (checkChallenge(challenge, input.value)) { onUnlock(); return; }
    challenge = makeChallenge();
    renderQuestion();
    input.value = '';
    error.textContent = 'Ce n\'est pas le bon résultat. Voici une autre opération.';
    input.focus();
  } },
  h('div', { class: 'lock__line' }, label, input),
  error,
  h('button', { type: 'submit', class: 'btn btn--primary' }, h('span', { text: 'Entrer' }), icon('arrowRight')));

  const el = h('div', { class: 'card parents-lock' },
    h('span', { class: 'parents-lock__icon' }, icon('lock', { size: 40 })),
    h('h1', { class: 'page-title', text: 'Espace parents' }),
    h('p', { text: 'Cet espace est réservé aux adultes. Pour entrer, calcule\u00a0:' }),
    form,
    h('a', { class: 'btn btn--ghost', href: '#/' }, icon('home'), h('span', { text: 'Retour aux jeux' })));
  return { el, focus: () => input.focus() };
}

// --- Sections ----------------------------------------------------------------------------------

function overview(profile, now) {
  const all = totals(profile);
  const week = totals(profile, { since: weekStart(now) });
  const last = profile.history.reduce((max, e) => Math.max(max, e.t), -Infinity);
  const tile = (label, value, detail) => h('div', { class: 'stat-tile' },
    h('span', { class: 'stat-tile__label', text: label }),
    h('strong', { class: 'stat-tile__value', text: value }),
    detail && h('span', { class: 'stat-tile__detail', text: detail }));
  return section('parents-overview', 'Vue d\'ensemble',
    h('div', { class: 'stat-grid' },
      tile('Parties jouées', String(all.plays)),
      tile('Temps de jeu', formatDuration(all.durationMs)),
      tile('Cette semaine', plural(week.plays, 'partie'), formatDuration(week.durationMs)),
      tile('Réussite moyenne', all.pct === null ? '—' : `${all.pct}\u00a0%`),
      tile('Dernière partie', Number.isFinite(last) ? formatDateTime(last) : '—')),
    h('p', { class: 'muted', text: `Profil créé le ${formatDate(profile.createdAt)}.` }));
}

function notions(profile, now) {
  const since = now - RECENT_DAYS * DAY;
  const list = mostMissed(profile, { since, limit: 8 });
  const recentPlays = totals(profile, { since }).plays;
  let body;
  if (list.length) {
    const max = list[0].count;
    body = h('ol', { class: 'notion-list' }, list.map((n) => h('li', { class: 'notion' },
      h('span', { class: 'notion__skill', text: n.skill }),
      h('span', { class: 'notion__bar', 'aria-hidden': 'true' }, h('span', { style: `inline-size: ${Math.round((n.count / max) * 100)}%` })),
      h('span', { class: 'notion__count', text: `${plural(n.count, 'erreur')}` }))));
  } else {
    body = h('p', { class: 'muted', text: recentPlays
      ? `Aucune erreur sur les ${RECENT_DAYS} derniers jours\u00a0: bravo\u00a0!`
      : `Pas de partie sur les ${RECENT_DAYS} derniers jours.` });
  }
  return section('parents-notions', 'Notions à retravailler',
    h('p', { class: 'muted', text: `Les notions qui ont donné le plus d'erreurs sur les ${RECENT_DAYS} derniers jours.` }),
    body);
}

function games(profile) {
  const stats = statsByGame(profile);
  const ids = [...new Set([
    ...GAMES.filter((g) => !g.demo).map((g) => g.id),
    ...Object.keys(profile.progress || {}),
    ...Object.keys(stats),
  ])];
  if (!ids.length) return section('parents-games', 'Jeux', h('p', { class: 'muted', text: 'Aucun jeu commencé pour l\'instant.' }));
  const rows = ids.map((id) => {
    const progress = getGameProgress(profile, id);
    const s = stats[id];
    const bests = h('ul', { class: 'best-list' }, LEVELS.map((level) => {
      const b = progress.best[level];
      return h('li', { text: `Niv. ${level}\u00a0: ${b ? `${b.score}/${b.total}` : '—'}` });
    }));
    return [
      h('strong', { text: gameTitle(id) }),
      subjectLabel(subjectOf(id)),
      `${progress.unlocked} / ${LEVELS.length}`,
      bests,
      String(s?.plays || 0),
      formatDuration(s?.durationMs || 0),
    ];
  });
  return section('parents-games', 'Jeux',
    table(['Jeu', 'Matière', 'Niveau ouvert', 'Meilleurs scores', 'Parties', 'Temps'], rows, { caption: 'Progression par jeu' }));
}

function evolution(profile, now) {
  const stats = statsByGame(profile);
  const gameIds = Object.keys(stats);
  const subjects = [...new Set(gameIds.map(subjectOf))];
  let period = PERIODS[1].weeks;
  let view = 'all';

  const chartsBox = h('div', { class: 'parents-charts' });
  const periodButtons = PERIODS.map((p) => h('button', {
    type: 'button', class: 'segmented__btn', onclick: () => { period = p.weeks; draw(); },
  }, p.label));
  const select = h('select', { id: 'parents-view', class: 'select-field', onchange: () => { view = select.value; draw(); } },
    h('option', { value: 'all', text: 'Tous les jeux' }),
    subjects.length > 0 && h('optgroup', { label: 'Par matière' },
      subjects.map((s) => h('option', { value: `subject:${s}`, text: subjectLabel(s) }))),
    gameIds.length > 0 && h('optgroup', { label: 'Par jeu' },
      gameIds.map((id) => h('option', { value: `game:${id}`, text: gameTitle(id) }))));

  const filterFor = (v) => {
    if (v.startsWith('subject:')) { const s = v.slice(8); return (r) => subjectOf(r.game) === s; }
    if (v.startsWith('game:')) { const g = v.slice(5); return (r) => r.game === g; }
    return () => true;
  };

  function draw() {
    periodButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(PERIODS[i].weeks === period)));
    chartsBox.replaceChildren();
    if (!gameIds.length) {
      chartsBox.append(emptyChart('Pas encore de partie\u00a0: la courbe apparaîtra après la première partie.'));
      return;
    }
    const drawn = renderProgressCharts(chartsBox, profile, { weeks: period, filter: filterFor(view), now });
    if (!drawn) chartsBox.append(emptyChart('Aucune partie sur cette période pour ce choix.'));
  }

  const bySubject = statsBySubject(profile, subjectOf);
  const subjectTable = subjects.length > 0 && h('div', { class: 'parents-subjects' },
    h('h3', { class: 'subsection-title', text: 'Par matière (depuis le début)' }),
    table(['Matière', 'Parties', 'Réussite moyenne', 'Temps'],
      subjects.map((s) => [subjectLabel(s), String(bySubject[s].plays), `${bySubject[s].pct ?? '—'}\u00a0%`, formatDuration(bySubject[s].durationMs)]),
      { caption: 'Résultats par matière' }));

  const el = section('parents-evolution', 'Évolution',
    h('div', { class: 'chart-controls' },
      h('div', { class: 'segmented', role: 'group', 'aria-label': 'Période' }, periodButtons),
      h('div', { class: 'chart-controls__view' },
        h('label', { class: 'field-label', for: select.id, text: 'Afficher' }), select)),
    chartsBox,
    subjectTable);
  // Les courbes sont dessinées une fois la section affichée (largeur réelle).
  return { el, draw };
}

function history(profile) {
  let page = 1;
  const box = h('div', { class: 'parents-history' });
  function draw() {
    const result = historyPage(profile, { page, perPage: 10 });
    page = result.page;
    if (!result.count) {
      box.replaceChildren(h('p', { class: 'muted', text: 'Aucune partie enregistrée pour l\'instant.' }));
      return;
    }
    const rows = result.items.map((e) => [
      formatDateTime(e.t),
      gameTitle(e.game),
      `Niveau ${e.level}`,
      `${e.score}/${e.total}`,
      formatDuration(e.durationMs),
      e.missed.length ? [...new Set(e.missed)].join(', ') : '—',
    ]);
    const prev = h('button', { type: 'button', class: 'btn btn--secondary', disabled: page <= 1, onclick: () => { page -= 1; draw(); } },
      icon('arrowLeft'), h('span', { text: 'Plus récentes' }));
    const next = h('button', { type: 'button', class: 'btn btn--secondary', disabled: page >= result.pages, onclick: () => { page += 1; draw(); } },
      h('span', { text: 'Plus anciennes' }), icon('arrowRight'));
    box.replaceChildren(
      table(['Date', 'Jeu', 'Niveau', 'Score', 'Durée', 'Notions ratées'], rows, { caption: 'Historique des parties' }),
      h('nav', { class: 'pager', 'aria-label': 'Pages de l\'historique' },
        prev,
        h('span', { class: 'pager__info', 'aria-live': 'polite', text: `Page ${page} sur ${result.pages} · ${plural(result.count, 'partie')}` }),
        next));
  }
  draw();
  return section('parents-history', 'Historique des parties', box);
}

/** Bouton qui demande une confirmation dans la page avant d'agir (deux temps). */
function confirmAction({ label, warning, confirmLabel, onConfirm }) {
  const box = h('div', { class: 'confirm' });
  const start = h('button', { type: 'button', class: 'btn btn--danger-ghost', onclick: ask }, h('span', { text: label }));
  function ask() {
    const yes = h('button', { type: 'button', class: 'btn btn--danger', onclick: onConfirm }, h('span', { text: confirmLabel }));
    box.replaceChildren(h('div', { class: 'confirm__panel', role: 'alertdialog', 'aria-label': label },
      h('p', { class: 'confirm__warning', text: warning }),
      h('div', { class: 'backup__row' },
        yes,
        h('button', { type: 'button', class: 'btn btn--secondary', onclick: reset }, h('span', { text: 'Annuler' })))));
    yes.focus();
  }
  function reset() { box.replaceChildren(start); start.focus(); }
  box.append(start);
  return box;
}

// --- Écran -------------------------------------------------------------------------------------

export default {
  title: 'Espace parents',
  render(view, { app }) {
    const page = h('section', { class: 'page parents' });
    view.append(page);
    let selectedId = app.profileId;
    let flash = null;   // message à afficher après une action (import, remise à zéro…)

    const lock = lockScreen(showSpace);
    page.replaceChildren(h('div', { class: 'page--narrow parents-lock-wrap' }, lock.el));
    lock.focus();

    function showSpace() {
      const profiles = listProfiles(app.store);
      if (!profiles.some((p) => p.id === selectedId)) selectedId = app.profileId;
      const profile = app.store.getProfile(selectedId);
      const now = Date.now();
      const name = profile.name || 'ce profil';

      const switcher = profiles.length > 1 && h('nav', { class: 'parents-switcher', 'aria-label': 'Profils' },
        profiles.map((p) => h('button', {
          type: 'button', class: 'parents-switcher__btn', 'aria-pressed': String(p.id === selectedId),
          onclick: () => { selectedId = p.id; showSpace(); },
        }, avatarBadge(p, { size: 's' }))));

      const evo = evolution(profile, now);
      const manage = section('parents-manage', 'Gérer le profil',
        h('div', { class: 'manage-identity' }),
        h('div', { class: 'manage-actions' },
          confirmAction({
            label: 'Remettre à zéro',
            warning: `Toute la progression de ${name} (parties, niveaux, étoiles, récompenses) sera effacée. Le prénom et l'animal sont conservés. Pense à exporter une sauvegarde avant.`,
            confirmLabel: 'Oui, tout remettre à zéro',
            onConfirm: () => {
              resetProfile(app.store, selectedId);
              flash = notice(`La progression de ${name} a été remise à zéro.`, 'ok');
              showSpace();
            },
          }),
          confirmAction({
            label: 'Supprimer le profil',
            warning: `Le profil de ${name} et toute sa progression seront supprimés de cet appareil. Pense à exporter une sauvegarde avant.`,
            confirmLabel: `Oui, supprimer ${profile.name || 'ce profil'}`,
            onConfirm: () => {
              const wasActive = selectedId === app.profileId;
              const nextActive = deleteProfile(app.store, selectedId);
              if (wasActive) app.switchProfile(nextActive);
              selectedId = app.profileId;
              flash = notice(`Le profil de ${name} a été supprimé.`, 'ok');
              showSpace();
            },
          })));
      const identityBox = manage.querySelector('.manage-identity');
      const showIdentity = () => identityBox.replaceChildren(
        h('button', { type: 'button', class: 'btn btn--secondary', onclick: editIdentity }, h('span', { text: 'Modifier le prénom ou l\'animal' })));
      function editIdentity() {
        const form = identityForm({
          name: profile.name, avatar: profile.avatar, submitLabel: 'Enregistrer',
          nameLabel: 'Prénom', avatarLabel: 'Animal', preview: false, onCancel: showIdentity,
          onSubmit(newName, avatar) {
            updateIdentity(app.store, selectedId, { name: newName, avatar });
            if (selectedId === app.profileId) app.refreshProfile();
            flash = notice('Le profil a été modifié.', 'ok');
            showSpace();
          },
        });
        identityBox.replaceChildren(form.el);
        form.focus();
      }
      showIdentity();

      const backup = section('parents-backup', 'Sauvegarde', backupPanel(app, {
        profileId: selectedId,
        onImported: (id, message) => {
          selectedId = id;
          if (id === app.profileId) app.refreshProfile();
          flash = notice(message, 'ok');
          showSpace();
        },
      }));

      page.replaceChildren(...[
        h('div', { class: 'parents-head' },
          h('h1', { class: 'page-title', text: 'Espace parents' }),
          h('a', { class: 'btn btn--ghost', href: '#/' }, icon('home'), h('span', { text: 'Fermer' }))),
        switcher || h('div', { class: 'parents-profile' }, avatarBadge(profile, { size: 'l' })),
        flash,
        overview(profile, now),
        notions(profile, now),
        games(profile),
        evo.el,
        history(profile),
        backup,
        manage,
      ].filter(Boolean));
      evo.draw();
      if (flash) flash.scrollIntoView({ block: 'center' });
      flash = null;
    }
  },
};

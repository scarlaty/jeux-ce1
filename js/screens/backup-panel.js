// Sauvegarde (#14) dans l'espace parents : exporter (fichier .json + code à copier) et importer
// (fichier ou code collé), avec aperçu et confirmation dans la page.
import { h } from '../core/ui/dom.js';
import { avatarBadge } from '../core/ui/avatar.js';
import { makeBackup, backupToJson, backupToCode, backupFileName, readBackup } from '../core/backup.js';
import { saveImportedProfile } from '../core/profile.js';
import { plural, formatDate } from '../core/format.js';

/** Message dans la page (role=status), sans boîte de dialogue native. */
export function notice(text, kind = 'info') {
  return h('p', { class: `notice notice--${kind}`, role: kind === 'error' ? 'alert' : 'status', text });
}

function download(fileName, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = h('a', { href: url, download: fileName, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text, textarea) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Presse-papiers refusé : on sélectionne le code pour une copie manuelle.
    textarea.focus();
    textarea.select();
    return false;
  }
}

let panelCount = 0;

/**
 * Panneau de sauvegarde du profil `profileId`.
 * `onImported(id)` est appelé après un import réussi (identifiant du profil écrit).
 */
export function backupPanel(app, { profileId, onImported }) {
  const uid = `backup-${++panelCount}`;
  const profile = app.store.getProfile(profileId);
  const name = profile.name || 'ce profil';

  // --- Exporter ---
  const exportStatus = h('div', { class: 'backup__status' });
  const codeBox = h('div', { class: 'backup__code', hidden: true });

  const downloadButton = h('button', { type: 'button', class: 'btn btn--primary', onclick: () => {
    const fresh = app.store.getProfile(profileId);
    download(backupFileName(fresh), backupToJson(makeBackup(fresh)));
    exportStatus.replaceChildren(notice('Le fichier de sauvegarde a été téléchargé.', 'ok'));
  } }, h('span', { text: 'Télécharger le fichier' }));

  const codeButton = h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => {
    const code = backupToCode(makeBackup(app.store.getProfile(profileId)));
    const area = h('textarea', { id: `${uid}-code`, class: 'text-area', readonly: true, rows: '4', spellcheck: 'false' });
    area.value = code;
    const copyButton = h('button', { type: 'button', class: 'btn btn--primary', onclick: async () => {
      const ok = await copyText(code, area);
      exportStatus.replaceChildren(ok
        ? notice('Code copié\u00a0! Colle-le dans une note ou un message pour le garder.', 'ok')
        : notice('La copie automatique n\'est pas possible ici\u00a0: le code est sélectionné, copie-le à la main.', 'info'));
    } }, h('span', { text: 'Copier le code' }));
    codeBox.hidden = false;
    codeBox.replaceChildren(
      h('label', { class: 'field-label', for: area.id, text: `Code de sauvegarde (${[...code].length.toLocaleString('fr-FR')} caractères)` }),
      area,
      h('div', { class: 'backup__row' }, copyButton));
  } }, h('span', { text: 'Afficher le code à copier' }));

  // --- Importer ---
  const importResult = h('div', { class: 'backup__result' });
  const fileInput = h('input', { id: `${uid}-file`, type: 'file', accept: '.json,application/json,text/plain', class: 'visually-hidden' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    let text = '';
    try { text = await file.text(); } catch { /* fichier illisible : traité comme vide */ }
    showPreview(readBackup(text));
  });
  const pasteArea = h('textarea', {
    id: `${uid}-paste`, class: 'text-area', rows: '3', spellcheck: 'false', autocomplete: 'off',
    placeholder: 'Colle ici le code de sauvegarde',
  });
  const readCodeButton = h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => showPreview(readBackup(pasteArea.value)) },
    h('span', { text: 'Lire le code' }));

  function showPreview(result) {
    if (!result.ok) {
      importResult.replaceChildren(notice(result.error, 'error'));
      return;
    }
    const { summary } = result;
    const target = app.store.getProfile(profileId);
    const targetIsEmpty = !target.name && !target.history.length && !target.weekly.length;
    const radios = [
      { value: 'add', label: 'L\'ajouter comme nouveau profil' },
      { value: 'replace', label: `Remplacer le profil de ${target.name || 'ce joueur sans prénom'} (sa progression actuelle sera effacée)` },
    ];
    const chosen = targetIsEmpty ? 'replace' : 'add';
    const fieldset = h('fieldset', { class: 'choice-list' },
      h('legend', { class: 'field-label', text: 'Que faire de cette sauvegarde\u00a0?' }),
      radios.map((r) => h('label', { class: 'choice-line' },
        h('input', { type: 'radio', name: `${uid}-mode`, value: r.value, checked: r.value === chosen }),
        h('span', { text: r.label }))));
    const backupName = summary.name || 'sans prénom';
    importResult.replaceChildren(h('div', { class: 'backup__preview' },
      avatarBadge({ name: summary.name, avatar: summary.avatar }, { size: 'l', withName: false }),
      h('div', {},
        h('p', { class: 'backup__summary', text: `Profil ${backupName}, ${plural(summary.plays, 'partie')}` }),
        summary.exportedAt && h('p', { class: 'backup__date', text: `Sauvegarde du ${formatDate(summary.exportedAt)}` })),
      fieldset,
      h('div', { class: 'backup__row' },
        h('button', { type: 'button', class: 'btn btn--primary', onclick: () => {
          const mode = fieldset.querySelector('input:checked')?.value || 'add';
          const id = saveImportedProfile(app.store, result.profile, { mode, targetId: profileId });
          importResult.replaceChildren();
          pasteArea.value = '';
          onImported?.(id, `Le profil de ${backupName} a été importé.`);
        } }, h('span', { text: 'Importer' })),
        h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => importResult.replaceChildren() },
          h('span', { text: 'Annuler' })))));
  }

  return h('div', { class: 'backup' },
    h('div', { class: 'backup__part' },
      h('h3', { class: 'subsection-title', text: 'Exporter' }),
      h('p', { class: 'muted', text: `Garde une copie de la progression de ${name} pour changer d'appareil ou la protéger d'un effacement du navigateur.` }),
      h('div', { class: 'backup__row' }, downloadButton, codeButton),
      codeBox,
      exportStatus),
    h('div', { class: 'backup__part' },
      h('h3', { class: 'subsection-title', text: 'Importer' }),
      h('p', { class: 'muted', text: 'Choisis un fichier de sauvegarde, ou colle un code. Un aperçu s\'affiche avant toute modification.' }),
      h('div', { class: 'backup__row' },
        fileInput,
        h('label', { class: 'btn btn--secondary', for: fileInput.id }, h('span', { text: 'Choisir un fichier' }))),
      h('label', { class: 'field-label', for: pasteArea.id, text: 'Ou colle le code de sauvegarde\u00a0:' }),
      pasteArea,
      h('div', { class: 'backup__row' }, readCodeButton),
      importResult));
}

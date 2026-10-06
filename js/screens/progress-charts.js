// Courbes d'évolution (#13) partagées par #/profil (version enfant) et #/parents (version détaillée).
import { h } from '../core/ui/dom.js';
import { lineChart, barChart, chartWidth } from '../core/ui/chart.js';
import { weeklySeries } from '../core/history.js';
import { formatWeek } from '../core/format.js';

export const EMPTY_CHART_TEXT = 'Joue une première partie pour voir ta courbe\u00a0!';

/** Petit dessin d'une courbe en pointillés qui monte vers une étoile. */
function emptyArt() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 70');
  svg.setAttribute('class', 'chart-empty__art');
  svg.setAttribute('aria-hidden', 'true');
  // Chaîne constante : aucune donnée variable.
  svg.innerHTML = '<path class="chart-empty__axis" d="M12 6v54h102"/>'
    + '<path class="chart-empty__line" d="M18 52 40 42l22 5 22-20 18-11"/>'
    + '<path class="chart-empty__star" d="m104 4 3 6 6.5.8-4.8 4.5 1.3 6.5-6-3.3-6 3.3 1.3-6.5-4.8-4.5 6.5-.8z"/>';
  return svg;
}

/** État vide soigné : une courbe en pointillés qui attend la première partie. */
export function emptyChart(text = EMPTY_CHART_TEXT, action = null) {
  return h('div', { class: 'chart-empty' }, emptyArt(), h('p', { class: 'chart-empty__text cursive', text }), action);
}

/**
 * Dessine dans `container` (déjà affiché, pour connaître sa largeur) la courbe du score moyen
 * et les barres du nombre de parties. Renvoie false si aucune partie n'est dans la période.
 */
export function renderProgressCharts(container, profile, {
  weeks = 8, filter, now = Date.now(), compact = false, titles = {},
} = {}) {
  const series = weeklySeries(profile, { weeks, filter, now });
  if (!series.some((s) => s.plays > 0)) return false;
  const width = chartWidth(container);
  const labels = series.map((s) => formatWeek(s.week));
  container.append(
    lineChart({
      title: titles.score || 'Score moyen par semaine (en %)',
      points: series.map((s, i) => ({ label: labels[i], value: s.pct })),
      width,
      compact,
    }),
    barChart({
      title: titles.plays || 'Nombre de parties par semaine',
      points: series.map((s, i) => ({ label: labels[i], value: s.plays })),
      width,
      compact,
    }));
  return true;
}

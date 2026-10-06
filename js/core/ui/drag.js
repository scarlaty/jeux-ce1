// Glisser-déposer : ranger des éléments dans des boîtes.
// Deux façons de faire, au doigt comme à la souris :
//  - glisser l'élément sur une boîte (pointer events) ;
//  - toucher l'élément (il se soulève), puis toucher la boîte.
// Toucher la réserve y renvoie l'élément soulevé. « Valider » quand tout est rangé.
//
// display : {
//   items:   [{ id: 'i0', text?: '12', emoji?: '🐱', label?: 'chat', cursive? }],
//   targets: [{ id: 'pair', label: 'Pairs' }],     // 'pool' est réservé (la réserve)
//   cursive?: true,
//   show?: { … }
// }
// answer : { [idÉlément]: idBoîte }
import { h, content } from './dom.js';
import { icon, badge } from './icons.js';

const POOL = 'pool';
const DRAG_THRESHOLD = 8;   // px avant de considérer qu'on glisse (sinon c'est un appui)

export function create(question, ctx) {
  const { items, targets, cursive = false } = question.display;
  const placement = new Map(items.map((it) => [it.id, POOL]));
  let selected = null;
  let locked = false;
  let drag = null;
  let suppressClick = false;

  const zones = new Map();
  const zone = (id, label) => {
    const body = h('div', { class: 'drop-zone__items' });
    const el = h('div', {
      class: `drop-zone${id === POOL ? ' drop-zone--pool' : ''}`,
      dataset: { zone: id },
      role: 'group',
      tabindex: '0',
      'aria-label': id === POOL ? 'Réserve' : `Boîte « ${label} »`,
      onclick: () => dropSelected(id),
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dropSelected(id); } },
    }, id === POOL ? null : h('span', { class: 'drop-zone__label', text: label }), body);
    zones.set(id, { el, body });
    return el;
  };

  const pool = zone(POOL, '');
  const boxes = h('div', { class: `drop-zones drop-zones--${targets.length}` }, targets.map((t) => zone(t.id, t.label)));
  const okButton = h('button', { type: 'button', class: 'btn btn--primary drag-ok', onclick: validate },
    icon('check'), h('span', { text: 'Valider' }));

  const tokens = new Map(items.map((item) => {
    const el = h('button', {
      type: 'button',
      class: `token token--drag${item.emoji && !item.text ? ' token--image' : ''}`,
      dataset: { item: item.id },
      onclick: (e) => {
        e.stopPropagation();   // ne pas déclencher la boîte qui contient l'élément
        if (suppressClick) { suppressClick = false; return; }
        if (locked) return;
        select(selected === item.id ? null : item.id);
      },
      onpointerdown: (e) => startDrag(e, item.id),
    }, content(item, { cursive }));
    return [item.id, el];
  }));

  function select(id) {
    selected = id;
    for (const [tid, el] of tokens) {
      el.classList.toggle('is-selected', tid === id);
      el.setAttribute('aria-pressed', tid === id ? 'true' : 'false');
    }
    for (const { el } of zones.values()) el.classList.toggle('is-ready', id !== null);
  }

  function place(id, zoneId) {
    placement.set(id, zoneId);
    ctx.tap?.();
    select(null);
    render();
  }

  function dropSelected(zoneId) {
    if (locked || selected === null) return;
    place(selected, zoneId);
  }

  function render() {
    for (const [id, { body }] of zones) {
      body.replaceChildren(...items.filter((it) => placement.get(it.id) === id).map((it) => tokens.get(it.id)));
    }
    const remaining = [...placement.values()].filter((z) => z === POOL).length;
    pool.classList.toggle('is-empty', remaining === 0);
    okButton.disabled = remaining > 0;
  }

  // --- Glisser avec pointer events ---------------------------------------------------------

  function startDrag(e, id) {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const el = tokens.get(id);
    const rect = el.getBoundingClientRect();
    drag = { id, el, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, dx: e.clientX - rect.left, dy: e.clientY - rect.top, ghost: null, over: null };
    el.setPointerCapture?.(e.pointerId);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', cancelDrag);
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.ghost) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < DRAG_THRESHOLD) return;
      const rect = drag.el.getBoundingClientRect();
      drag.ghost = drag.el.cloneNode(true);
      drag.ghost.classList.add('drag-ghost');
      drag.ghost.removeAttribute('id');
      drag.ghost.setAttribute('aria-hidden', 'true');
      drag.ghost.style.width = `${rect.width}px`;
      drag.ghost.style.height = `${rect.height}px`;
      document.body.append(drag.ghost);
      drag.el.classList.add('is-dragging');
      select(null);
    }
    drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)`;
    const over = zoneAt(e.clientX, e.clientY);
    if (over !== drag.over) {
      drag.over?.classList.remove('is-over');
      over?.classList.add('is-over');
      drag.over = over;
    }
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { id, ghost } = drag;
    const over = ghost ? zoneAt(e.clientX, e.clientY) : null;
    cancelDrag();
    if (ghost) {
      suppressClick = true;   // le « click » qui suit le relâchement n'est pas un appui
      setTimeout(() => { suppressClick = false; }, 0);
      if (over) place(id, over.dataset.zone);
    }
  }

  function cancelDrag() {
    if (!drag) return;
    const { el, ghost, over } = drag;
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', cancelDrag);
    el.classList.remove('is-dragging');
    over?.classList.remove('is-over');
    ghost?.remove();
    drag = null;
  }

  function zoneAt(x, y) {
    const hit = document.elementFromPoint(x, y);
    const found = hit?.closest?.('[data-zone]');
    return found && zones.has(found.dataset.zone) ? found : null;
  }

  function validate() {
    if (locked || okButton.disabled) return;
    locked = true;
    select(null);
    ctx.submit(Object.fromEntries(placement));
  }

  render();

  return {
    el: h('div', { class: 'drag' }, boxes, pool, okButton),
    showResult() {
      locked = true;
      okButton.hidden = true;
      pool.hidden = true;
      for (const item of items) {
        const el = tokens.get(item.id);
        el.disabled = true;
        const right = question.answer[item.id];
        const ok = placement.get(item.id) === right;
        el.classList.add(ok ? 'is-right' : 'is-moved');
        el.append(badge(ok ? 'right' : 'moved'));
        placement.set(item.id, right);   // on montre le bon rangement
      }
      render();
    },
    destroy() { cancelDrag(); },
  };
}

/** La correction est visible dans les boîtes : pas de texte supplémentaire. */
export function describe() {
  return null;
}

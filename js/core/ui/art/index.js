// Registre des dessins (« art ») : illustrations que les jeux demandent par description,
// sans jamais toucher au DOM eux-mêmes.
//
// Un jeu écrit dans sa question :
//   display.show = { art: { kind: 'clock', hours: 3, minutes: 30 } }
//   display.choices = [{ value: '3 h 30', art: { kind: 'clock', hours: 3, minutes: 30 } }, …]
//
// Chaque dessin vit dans `js/core/ui/art/<kind>.js` et exporte :
//   label(spec) → string   nom accessible, FONCTION PURE (pas de DOM) : sert aussi à la
//                          vérification des questions et aux tests sous node.
//   draw(spec)  → Node     le SVG (utilise `figure`/`s` de ../svg.js).
//   check?(spec, errors)   contrôles de forme facultatifs, purs (bornes, champs manquants).
//
// L'ajouter ici suffit : `content()` (dom.js) et `validateQuestion()` (core/validate.js)
// le prennent alors en compte partout — illustration, choix de QCM, éléments à ranger.
import * as baseTen from './base-ten.js';
import * as clock from './clock.js';

const registry = new Map(Object.entries({ 'base-ten': baseTen, clock }));

export function registerArt(kind, module) {
  registry.set(kind, module);
}

export function artKinds() {
  return [...registry.keys()];
}

/** Nom accessible du dessin, ou '' si le genre est inconnu. Pure : utilisable sous node. */
export function artLabel(spec) {
  const module = spec && registry.get(spec.kind);
  return module ? String(module.label(spec) || '') : '';
}

/** Problèmes de forme d'un `art` (liste vide = valide). Pure : utilisable sous node. */
export function artErrors(spec) {
  if (!spec || typeof spec !== 'object') return ['art doit être un objet'];
  const module = registry.get(spec.kind);
  if (!module) return [`dessin inconnu : ${spec.kind}`];
  const errors = [];
  if (!String(module.label(spec) || '').trim()) errors.push(`dessin « ${spec.kind} » sans nom accessible`);
  module.check?.(spec, errors);
  return errors;
}

/** Le SVG du dessin, ou null si le genre est inconnu (l'appli ne doit jamais casser). */
export function drawArt(spec) {
  const module = spec && registry.get(spec.kind);
  return module ? module.draw(spec) : null;
}

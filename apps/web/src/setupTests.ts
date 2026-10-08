import "@testing-library/jest-dom";

/**
 * jsdom n'implémente pas la capture du pointeur, que Radix appelle dès qu'un
 * clic traverse un de ses composants à gestes (le toast, qui se ferme au
 * balayage). Sans ces trois méthodes, `userEvent.click` lève une erreur non
 * gérée après des tests pourtant verts. Elles ne simulent rien : l'élément
 * ne capture jamais.
 */
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
}

/**
 * jsdom n'a pas non plus `ResizeObserver`. Radix Switch, posé **dans un
 * `<form>`**, monte une case cachée qui mesure la piste avec : sans lui, la
 * page des Paramètres plante au rendu. Un observateur qui n'observe rien —
 * aucune mise en page n'existe sous jsdom, il n'y aurait rien à rapporter.
 */
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
